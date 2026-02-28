import type { SQLiteDatabase } from 'expo-sqlite';
import { actionToDbStrength, type SwipeAction } from '@/types/domain';

import { runMigrations } from '../lib/db/runMigrations';

type SqliteMasterRow = {
  name: string;
  type: 'table' | 'index';
};

type TableInfoRow = {
  name: string;
  pk: number;
};

type IndexListRow = {
  name: string;
};

type ForeignKeyRow = {
  table: string;
  from: string;
  to: string;
  on_delete: string;
};

type ForeignKeySpec = {
  from: string;
  table: string;
  to: string;
  onDelete: string;
};

type TableSchema = {
  columns: string[];
  primaryKeys: string[];
  foreignKeys: ForeignKeySpec[];
  rows: Array<Record<string, unknown>>;
};

const REQUIRED_TABLES = [
  'catalog_entities',
  'swipe_sessions',
  'swipe_events',
  'taste_tag_scores',
  'taste_type_scores',
  'entity_affinity',
  'profile_snapshots',
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  catalog_entities: [
    'id',
    'type',
    'title',
    'subtitle',
    'description_short',
    'tags_json',
    'popularity',
    'tile_key',
    'image_url',
    'updated_at',
  ],
  swipe_sessions: ['id', 'started_at', 'ended_at', 'filters_json'],
  swipe_events: [
    'id',
    'session_id',
    'entity_id',
    'action',
    'strength',
    'created_at',
  ],
  taste_tag_scores: ['tag', 'score', 'pos', 'neg', 'last_updated'],
  taste_type_scores: ['type', 'score', 'pos', 'neg', 'last_updated'],
  entity_affinity: ['entity_id', 'score', 'pos', 'neg', 'last_updated'],
  profile_snapshots: [
    'id',
    'created_at',
    'top_tags_json',
    'top_types_json',
    'summary_json',
  ],
};

const REQUIRED_INDEXES: Record<string, string[]> = {
  catalog_entities: [
    'idx_catalog_entities_type',
    'idx_catalog_entities_popularity',
    'idx_catalog_entities_title',
  ],
  swipe_sessions: ['idx_swipe_sessions_started_at'],
  swipe_events: [
    'idx_swipe_events_created_at',
    'idx_swipe_events_session_id',
    'idx_swipe_events_entity_id',
  ],
  taste_tag_scores: [
    'idx_taste_tag_scores_score',
    'idx_taste_tag_scores_last_updated',
  ],
  taste_type_scores: [
    'idx_taste_type_scores_score',
    'idx_taste_type_scores_last_updated',
  ],
  entity_affinity: [
    'idx_entity_affinity_score',
    'idx_entity_affinity_last_updated',
  ],
  profile_snapshots: ['idx_profile_snapshots_created_at'],
};

class FakeSchemaSQLiteDatabase {
  userVersion = 0;
  foreignKeysEnabled = 0;
  journalMode = 'delete';

  private tables = new Map<string, TableSchema>();
  private indexes = new Map<string, { name: string; table: string }>();

  async execAsync(source: string): Promise<void> {
    const setVersionMatch = source.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (setVersionMatch) {
      this.userVersion = Number(setVersionMatch[1]);
    }

    if (/PRAGMA\s+foreign_keys\s*=\s*ON/i.test(source)) {
      this.foreignKeysEnabled = 1;
    }

    const createTableRegex =
      /CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)\s*;/gi;
    let createTableMatch: RegExpExecArray | null;

    createTableMatch = createTableRegex.exec(source);
    while (createTableMatch) {
      this.registerTable(createTableMatch[1], createTableMatch[2]);
      createTableMatch = createTableRegex.exec(source);
    }

    const createIndexRegex =
      /CREATE INDEX IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*?)\)\s*;/gi;
    let createIndexMatch: RegExpExecArray | null;

    createIndexMatch = createIndexRegex.exec(source);
    while (createIndexMatch) {
      this.registerIndex(createIndexMatch[1], createIndexMatch[2]);
      createIndexMatch = createIndexRegex.exec(source);
    }

    const healthInsertRegex = /INSERT OR IGNORE INTO __healthcheck[\s\S]*?;/gi;
    let healthInsertMatch: RegExpExecArray | null;

    healthInsertMatch = healthInsertRegex.exec(source);
    while (healthInsertMatch) {
      this.applyLiteralInsert(healthInsertMatch[0]);
      healthInsertMatch = healthInsertRegex.exec(source);
    }
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const normalizedSource = source.replace(/\s+/g, ' ').trim();
    const match = normalizedSource.match(
      /^INSERT(?: OR IGNORE)? INTO ([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i,
    );

    if (!match) {
      throw new Error(`Unsupported runAsync SQL: ${source}`);
    }

    const tableName = match[1];
    const columns = match[2].split(',').map((column) => column.trim());
    const values = this.normalizeParams(params);

    if (values.length !== columns.length) {
      throw new Error(
        `Column/value mismatch for ${tableName}. Expected ${columns.length}, got ${values.length}.`,
      );
    }

    const row: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      row[column] = values[index];
    });

    const inserted = this.insertRow(
      tableName,
      row,
      /INSERT OR IGNORE/i.test(source),
    );

    return {
      changes: inserted ? 1 : 0,
      lastInsertRowId: inserted ? 1 : 0,
    };
  }

  async getAllAsync<T>(source: string): Promise<T[]> {
    if (/FROM\s+sqlite_master/i.test(source)) {
      const rows: SqliteMasterRow[] = [];

      for (const tableName of this.tables.keys()) {
        if (!tableName.startsWith('sqlite_')) {
          rows.push({ name: tableName, type: 'table' });
        }
      }

      for (const indexMeta of this.indexes.values()) {
        if (!indexMeta.name.startsWith('sqlite_')) {
          rows.push({ name: indexMeta.name, type: 'index' });
        }
      }

      return rows as T[];
    }

    const tableInfoMatch = source.match(
      /PRAGMA\s+table_info\s*\(\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*\)/i,
    );
    if (tableInfoMatch) {
      const tableName = tableInfoMatch[1];
      const table = this.getTable(tableName);
      const rows: TableInfoRow[] = table.columns.map((name) => ({
        name,
        pk: table.primaryKeys.includes(name) ? 1 : 0,
      }));
      return rows as T[];
    }

    const indexListMatch = source.match(
      /PRAGMA\s+index_list\s*\(\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*\)/i,
    );
    if (indexListMatch) {
      const tableName = indexListMatch[1];
      const rows: IndexListRow[] = Array.from(this.indexes.values())
        .filter((indexMeta) => indexMeta.table === tableName)
        .map((indexMeta) => ({ name: indexMeta.name }));
      return rows as T[];
    }

    const foreignKeyListMatch = source.match(
      /PRAGMA\s+foreign_key_list\s*\(\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*\)/i,
    );
    if (foreignKeyListMatch) {
      const tableName = foreignKeyListMatch[1];
      const table = this.getTable(tableName);
      const rows: ForeignKeyRow[] = table.foreignKeys.map((foreignKey) => ({
        table: foreignKey.table,
        from: foreignKey.from,
        to: foreignKey.to,
        on_delete: foreignKey.onDelete,
      }));
      return rows as T[];
    }

    if (/PRAGMA\s+foreign_key_check/i.test(source)) {
      const rows: Array<Record<string, unknown>> = [];

      for (const [tableName, table] of this.tables.entries()) {
        table.rows.forEach((row, rowIndex) => {
          table.foreignKeys.forEach((foreignKey, foreignKeyIndex) => {
            const value = row[foreignKey.from];
            if (value === null || value === undefined) {
              return;
            }

            const parent = this.tables.get(foreignKey.table);
            const parentExists = parent
              ? parent.rows.some(
                  (parentRow) => parentRow[foreignKey.to] === value,
                )
              : false;

            if (!parentExists) {
              rows.push({
                table: tableName,
                rowid: rowIndex + 1,
                parent: foreignKey.table,
                fkid: foreignKeyIndex,
              });
            }
          });
        });
      }

      return rows as T[];
    }

    const selectAllMatch = source.match(
      /SELECT\s+\*\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i,
    );
    if (selectAllMatch) {
      const tableName = selectAllMatch[1];
      const table = this.getTable(tableName);
      return table.rows.map((row) => ({ ...row })) as T[];
    }

    throw new Error(`Unsupported getAllAsync SQL: ${source}`);
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (/PRAGMA\s+user_version/i.test(source)) {
      return { user_version: this.userVersion } as T;
    }

    if (/PRAGMA\s+foreign_keys/i.test(source)) {
      return { foreign_keys: this.foreignKeysEnabled } as T;
    }

    if (/PRAGMA\s+journal_mode/i.test(source)) {
      return { journal_mode: this.journalMode } as T;
    }

    if (/SELECT\s+1\s+AS\s+ok/i.test(source)) {
      return { ok: 1 } as T;
    }

    const rows = await this.getAllAsync<T>(source);
    return rows.length > 0 ? rows[0] : null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (txn: FakeSchemaSQLiteDatabase) => Promise<void>,
  ): Promise<void> {
    await task(this);
  }

  private registerTable(tableName: string, body: string): void {
    if (this.tables.has(tableName)) {
      return;
    }

    const columns: string[] = [];
    const primaryKeys: string[] = [];
    const foreignKeys: ForeignKeySpec[] = [];

    body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .forEach((line) => {
        const cleanedLine = line.replace(/,$/, '').trim();

        if (cleanedLine.toUpperCase().startsWith('FOREIGN KEY')) {
          const foreignKeyMatch = cleanedLine.match(
            /FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)(?:\s*ON DELETE\s+([A-Z ]+))?/i,
          );
          if (foreignKeyMatch) {
            foreignKeys.push({
              from: foreignKeyMatch[1].trim(),
              table: foreignKeyMatch[2].trim(),
              to: foreignKeyMatch[3].trim(),
              onDelete: foreignKeyMatch[4]?.trim().toUpperCase() ?? 'NO ACTION',
            });
          }
          return;
        }

        const columnMatch = cleanedLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+/);
        if (!columnMatch) {
          return;
        }

        const columnName = columnMatch[1];
        columns.push(columnName);
        if (/PRIMARY KEY/i.test(cleanedLine)) {
          primaryKeys.push(columnName);
        }
      });

    this.tables.set(tableName, {
      columns,
      primaryKeys,
      foreignKeys,
      rows: [],
    });
  }

  private registerIndex(name: string, table: string): void {
    this.indexes.set(name, { name, table });
  }

  private applyLiteralInsert(statement: string): void {
    const normalized = statement.replace(/\s+/g, ' ').trim();
    if (!/^INSERT OR IGNORE INTO __healthcheck/i.test(normalized)) {
      return;
    }

    this.insertRow(
      '__healthcheck',
      {
        id: 1,
        last_checked_at: Date.now(),
      },
      true,
    );
  }

  private insertRow(
    tableName: string,
    row: Record<string, unknown>,
    ignoreDuplicates: boolean,
  ): boolean {
    const table = this.getTable(tableName);

    if (this.foreignKeysEnabled === 1) {
      for (const foreignKey of table.foreignKeys) {
        const value = row[foreignKey.from];
        if (value === null || value === undefined) {
          continue;
        }

        const parent = this.tables.get(foreignKey.table);
        const parentExists = parent
          ? parent.rows.some((parentRow) => parentRow[foreignKey.to] === value)
          : false;

        if (!parentExists) {
          throw new Error(
            `FOREIGN KEY constraint failed: ${tableName}.${foreignKey.from} -> ${foreignKey.table}.${foreignKey.to}`,
          );
        }
      }
    }

    if (table.primaryKeys.length > 0) {
      const duplicateExists = table.rows.some((existingRow) =>
        table.primaryKeys.every((primaryKey) => {
          return existingRow[primaryKey] === row[primaryKey];
        }),
      );

      if (duplicateExists) {
        if (ignoreDuplicates) {
          return false;
        }
        throw new Error(
          `UNIQUE constraint failed on ${tableName}(${table.primaryKeys.join(',')})`,
        );
      }
    }

    table.rows.push({ ...row });
    return true;
  }

  private normalizeParams(params: unknown[]): unknown[] {
    if (params.length === 1 && Array.isArray(params[0])) {
      return params[0];
    }
    return params;
  }

  private getTable(tableName: string): TableSchema {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table not found: ${tableName}`);
    }
    return table;
  }
}

describe('schema introspection + smoke CRUD', () => {
  it('verifies required tables, columns, indexes, and foreign keys', async () => {
    const fakeDb = new FakeSchemaSQLiteDatabase();
    const db = fakeDb as unknown as SQLiteDatabase;

    await runMigrations(db);

    const sqliteMaster = await db.getAllAsync<SqliteMasterRow>(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%';",
    );

    const tableNames = new Set(
      sqliteMaster.filter((row) => row.type === 'table').map((row) => row.name),
    );

    REQUIRED_TABLES.forEach((tableName) => {
      expect(tableNames.has(tableName)).toBe(true);
    });
    console.info(
      `[schema] tables: ${Array.from(tableNames).sort().join(', ')}`,
    );

    for (const [tableName, requiredColumns] of Object.entries(
      REQUIRED_COLUMNS,
    )) {
      const tableInfo = await db.getAllAsync<TableInfoRow>(
        `PRAGMA table_info('${tableName}')`,
      );
      const columnNames = new Set(tableInfo.map((column) => column.name));

      requiredColumns.forEach((columnName) => {
        expect(columnNames.has(columnName)).toBe(true);
      });
    }

    for (const [tableName, requiredIndexes] of Object.entries(
      REQUIRED_INDEXES,
    )) {
      const indexes = await db.getAllAsync<IndexListRow>(
        `PRAGMA index_list('${tableName}')`,
      );
      const indexNames = new Set(indexes.map((indexRow) => indexRow.name));

      requiredIndexes.forEach((indexName) => {
        expect(indexNames.has(indexName)).toBe(true);
      });
      console.info(
        `[schema] indexes ${tableName}: ${Array.from(indexNames)
          .sort()
          .join(', ')}`,
      );
    }

    const swipeEventForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('swipe_events')",
    );
    expect(swipeEventForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'swipe_sessions',
          from: 'session_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'catalog_entities',
          from: 'entity_id',
          to: 'id',
        }),
      ]),
    );
    console.info(
      `[schema] swipe_events FKs: ${swipeEventForeignKeys
        .map(
          (foreignKey) =>
            `${foreignKey.from}->${foreignKey.table}.${foreignKey.to}`,
        )
        .join(', ')}`,
    );

    const affinityForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('entity_affinity')",
    );
    expect(affinityForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'catalog_entities',
          from: 'entity_id',
          to: 'id',
        }),
      ]),
    );
    console.info(
      `[schema] entity_affinity FKs: ${affinityForeignKeys
        .map(
          (foreignKey) =>
            `${foreignKey.from}->${foreignKey.table}.${foreignKey.to}`,
        )
        .join(', ')}`,
    );

    const foreignKeysEnabled = await db.getFirstAsync<{ foreign_keys: number }>(
      'PRAGMA foreign_keys',
    );
    if (foreignKeysEnabled?.foreign_keys !== 1) {
      throw new Error(
        'Expected PRAGMA foreign_keys = 1 on active connection; FK enforcement is disabled.',
      );
    }
  });

  it('runs smoke CRUD and passes foreign_key_check', async () => {
    const fakeDb = new FakeSchemaSQLiteDatabase();
    const db = fakeDb as unknown as SQLiteDatabase;
    const now = Date.now();
    const eventAction: SwipeAction = 'yes';

    await runMigrations(db);

    await db.runAsync(
      `
        INSERT INTO catalog_entities (
          id, type, title, subtitle, description_short, tags_json, popularity, tile_key, image_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'entity_1',
      'movie',
      'Example Entity',
      'Example Subtitle',
      'Example Description',
      '["drama","story"]',
      0.8,
      'tile_entity_1',
      null,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO swipe_sessions (
          id, started_at, ended_at, filters_json
        ) VALUES (?, ?, ?, ?)
      `,
      'session_1',
      now,
      now + 1000,
      '{"types":["movie"]}',
    );

    await db.runAsync(
      `
        INSERT INTO swipe_events (
          id, session_id, entity_id, action, strength, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'event_1',
      'session_1',
      'entity_1',
      eventAction,
      actionToDbStrength(eventAction),
      now + 2000,
    );

    await db.runAsync(
      `
        INSERT INTO taste_tag_scores (
          tag, score, pos, neg, last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'drama',
      1.0,
      1.0,
      0,
      now + 3000,
    );

    await db.runAsync(
      `
        INSERT INTO taste_type_scores (
          type, score, pos, neg, last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'movie',
      1.0,
      1.0,
      0,
      now + 3000,
    );

    await db.runAsync(
      `
        INSERT INTO entity_affinity (
          entity_id, score, pos, neg, last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'entity_1',
      1.0,
      1.0,
      0,
      now + 3000,
    );

    await db.runAsync(
      `
        INSERT INTO profile_snapshots (
          id, created_at, top_tags_json, top_types_json, summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'snapshot_1',
      now + 4000,
      '["drama"]',
      '["movie"]',
      '{"summary":"example"}',
    );

    expect(await db.getAllAsync('SELECT * FROM catalog_entities')).toHaveLength(
      1,
    );
    expect(await db.getAllAsync('SELECT * FROM swipe_sessions')).toHaveLength(
      1,
    );
    expect(await db.getAllAsync('SELECT * FROM swipe_events')).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM taste_tag_scores')).toHaveLength(
      1,
    );
    expect(
      await db.getAllAsync('SELECT * FROM taste_type_scores'),
    ).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM entity_affinity')).toHaveLength(
      1,
    );
    expect(
      await db.getAllAsync('SELECT * FROM profile_snapshots'),
    ).toHaveLength(1);

    const foreignKeyViolations = await db.getAllAsync(
      'PRAGMA foreign_key_check',
    );
    expect(foreignKeyViolations).toHaveLength(0);

    const rerun = await runMigrations(db);
    expect(rerun.appliedMigrations).toBe(0);
  });
});
