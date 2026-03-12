import type { SQLiteDatabase } from 'expo-sqlite';
import { actionToDbStrength, type SwipeAction } from '@/types/domain';

import { migrations } from '../lib/db/migrations';
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
  '__deck_content_meta',
  'decks',
  'deck_cards',
  'deck_tag_facets',
  'deck_tag_taxonomy',
  'deck_card_tag_links',
  'swipe_sessions',
  'swipe_events',
  'deck_card_state',
  'deck_tag_state',
  'deck_tag_scores',
  'deck_card_affinity',
  'deck_profile_snapshots',
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
  __deck_content_meta: [
    'id',
    'version',
    'imported_at',
    'deck_count',
    'card_count',
  ],
  decks: [
    'id',
    'title',
    'description',
    'category',
    'tier',
    'card_count',
    'compare_eligible',
    'showdown_eligible',
    'sensitivity',
    'min_cards_for_profile',
    'min_cards_for_compare',
    'is_custom',
    'cover_tile_key',
    'created_at',
    'updated_at',
  ],
  deck_cards: [
    'id',
    'deck_id',
    'kind',
    'title',
    'subtitle',
    'description_short',
    'tags_json',
    'popularity',
    'tile_key',
    'sort_order',
    'created_at',
    'updated_at',
  ],
  deck_tag_facets: [
    'id',
    'deck_id',
    'key',
    'label',
    'description',
    'sort_order',
    'created_at',
    'updated_at',
  ],
  deck_tag_taxonomy: [
    'id',
    'deck_id',
    'facet_id',
    'slug',
    'label',
    'description',
    'sort_order',
    'created_at',
    'updated_at',
  ],
  deck_card_tag_links: [
    'card_id',
    'tag_id',
    'role',
    'created_at',
    'updated_at',
  ],
  swipe_sessions: ['id', 'deck_id', 'started_at', 'ended_at', 'filters_json'],
  swipe_events: [
    'id',
    'session_id',
    'deck_id',
    'card_id',
    'action',
    'strength',
    'created_at',
  ],
  deck_card_state: [
    'deck_id',
    'card_id',
    'presentation_count',
    'swipe_count',
    'last_presented_at',
    'last_swiped_at',
    'updated_at',
  ],
  deck_tag_state: [
    'deck_id',
    'tag_id',
    'exposure_count',
    'distinct_cards_seen',
    'positive_weight',
    'negative_weight',
    'skip_count',
    'net_weight',
    'uncertainty_score',
    'first_seen_at',
    'last_seen_at',
    'last_positive_at',
    'last_negative_at',
    'last_retested_at',
    'updated_at',
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
  deck_tag_scores: ['deck_id', 'tag_id', 'score', 'pos', 'neg', 'last_updated'],
  deck_card_affinity: [
    'deck_id',
    'card_id',
    'score',
    'pos',
    'neg',
    'last_updated',
  ],
  deck_profile_snapshots: [
    'id',
    'deck_id',
    'created_at',
    'top_tags_json',
    'top_aversions_json',
    'summary_json',
  ],
};

const REQUIRED_INDEXES: Record<string, string[]> = {
  catalog_entities: [
    'idx_catalog_entities_type',
    'idx_catalog_entities_popularity',
    'idx_catalog_entities_title',
  ],
  decks: ['idx_decks_category', 'idx_decks_tier', 'idx_decks_is_custom'],
  deck_cards: [
    'idx_deck_cards_deck_id',
    'idx_deck_cards_kind',
    'idx_deck_cards_popularity',
    'idx_deck_cards_sort_order',
  ],
  deck_tag_facets: ['idx_deck_tag_facets_deck_id'],
  deck_tag_taxonomy: [
    'idx_deck_tag_taxonomy_deck_id',
    'idx_deck_tag_taxonomy_facet_id',
    'idx_deck_tag_taxonomy_deck_slug',
  ],
  deck_card_tag_links: ['idx_deck_card_tag_links_tag_id'],
  swipe_sessions: [
    'idx_swipe_sessions_deck_id',
    'idx_swipe_sessions_started_at',
  ],
  swipe_events: [
    'idx_swipe_events_created_at',
    'idx_swipe_events_session_id',
    'idx_swipe_events_deck_id',
    'idx_swipe_events_card_id',
  ],
  deck_card_state: [
    'idx_deck_card_state_deck_id',
    'idx_deck_card_state_last_presented',
    'idx_deck_card_state_last_swiped',
  ],
  deck_tag_state: [
    'idx_deck_tag_state_deck_id',
    'idx_deck_tag_state_tag_id',
    'idx_deck_tag_state_last_seen',
    'idx_deck_tag_state_uncertainty',
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
  deck_tag_scores: [
    'idx_deck_tag_scores_deck_id',
    'idx_deck_tag_scores_score',
    'idx_deck_tag_scores_tag_id',
  ],
  deck_card_affinity: [
    'idx_deck_card_affinity_deck_id',
    'idx_deck_card_affinity_score',
  ],
  deck_profile_snapshots: [
    'idx_deck_profile_snapshots_deck_id',
    'idx_deck_profile_snapshots_created_at',
  ],
};

const LEGACY_LOVE_ACTION = 'love';
const LEGACY_DEFERRED_ACTIONS = ['respect', 'curious'] as const;
const LEGACY_DEFERRED_ACTION_SET: ReadonlySet<string> = new Set(
  LEGACY_DEFERRED_ACTIONS,
);

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

    if (/CREATE TABLE\s+swipe_events_new/i.test(source)) {
      this.applySwipeEventsRebuildMigration(source);
      return;
    }

    const dropTableRegex =
      /DROP TABLE IF EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s*;/gi;
    let dropTableMatch: RegExpExecArray | null;

    dropTableMatch = dropTableRegex.exec(source);
    while (dropTableMatch) {
      this.dropTable(dropTableMatch[1]);
      dropTableMatch = dropTableRegex.exec(source);
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
    const insertMatch = normalizedSource.match(
      /^INSERT(?: OR IGNORE)? INTO ([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i,
    );

    const values = this.normalizeParams(params);

    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map((column) => column.trim());

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

    const deleteMatch = normalizedSource.match(
      /^DELETE FROM ([A-Za-z_][A-Za-z0-9_]*) WHERE ([A-Za-z_][A-Za-z0-9_]*) = \?$/i,
    );
    if (deleteMatch) {
      const changes = this.deleteRows(
        deleteMatch[1],
        deleteMatch[2],
        values[0],
      );
      return {
        changes,
        lastInsertRowId: 0,
      };
    }

    throw new Error(`Unsupported runAsync SQL: ${source}`);
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

  private deleteRows(
    tableName: string,
    columnName: string,
    value: unknown,
  ): number {
    const table = this.getTable(tableName);
    const rowsToDelete = table.rows.filter((row) => row[columnName] === value);

    rowsToDelete.forEach((row) => {
      this.deleteRow(tableName, row);
    });

    return rowsToDelete.length;
  }

  private deleteRow(tableName: string, row: Record<string, unknown>): void {
    const table = this.getTable(tableName);
    if (!table.rows.includes(row)) {
      return;
    }

    for (const [childTableName, childTable] of this.tables.entries()) {
      const referencingForeignKeys = childTable.foreignKeys.filter(
        (foreignKey) => foreignKey.table === tableName,
      );

      for (const foreignKey of referencingForeignKeys) {
        const referencedValue = row[foreignKey.to];
        const childRows = childTable.rows.filter(
          (childRow) => childRow[foreignKey.from] === referencedValue,
        );

        if (childRows.length === 0) {
          continue;
        }

        if (foreignKey.onDelete === 'CASCADE') {
          childRows.forEach((childRow) => {
            this.deleteRow(childTableName, childRow);
          });
          continue;
        }

        throw new Error(
          `FOREIGN KEY constraint failed on delete: ${tableName}.${foreignKey.to} referenced by ${childTableName}.${foreignKey.from}`,
        );
      }
    }

    table.rows = table.rows.filter((existingRow) => existingRow !== row);
  }

  private normalizeParams(params: unknown[]): unknown[] {
    if (params.length === 1 && Array.isArray(params[0])) {
      return params[0];
    }
    return params;
  }

  private applySwipeEventsRebuildMigration(source: string): void {
    const createTableMatch = source.match(
      /CREATE TABLE\s+swipe_events_new\s*\(([\s\S]*?)\)\s*;/i,
    );

    if (!createTableMatch) {
      throw new Error(
        'Expected swipe_events_new table definition in rebuild migration.',
      );
    }

    if (this.tables.has('swipe_events_new')) {
      this.dropTable('swipe_events_new');
    }

    this.registerTable('swipe_events_new', createTableMatch[1]);

    const legacySwipeEvents = this.getTable('swipe_events').rows.map((row) => ({
      ...row,
      action:
        row.action === LEGACY_LOVE_ACTION
          ? 'strong_yes'
          : LEGACY_DEFERRED_ACTION_SET.has(String(row.action))
            ? 'skip'
            : row.action,
      strength: LEGACY_DEFERRED_ACTION_SET.has(String(row.action))
        ? 0
        : row.strength,
    }));

    legacySwipeEvents.forEach((row) => {
      this.insertRow('swipe_events_new', row, false);
    });

    this.dropTable('swipe_events');
    this.renameTable('swipe_events_new', 'swipe_events');
    this.registerIndex('idx_swipe_events_created_at', 'swipe_events');
    this.registerIndex('idx_swipe_events_session_id', 'swipe_events');
    this.registerIndex('idx_swipe_events_entity_id', 'swipe_events');
  }

  private dropTable(tableName: string): void {
    this.tables.delete(tableName);

    for (const [indexName, indexMeta] of this.indexes.entries()) {
      if (indexMeta.table === tableName) {
        this.indexes.delete(indexName);
      }
    }
  }

  private renameTable(fromName: string, toName: string): void {
    const table = this.getTable(fromName);
    this.tables.set(toName, table);
    this.tables.delete(fromName);

    for (const indexMeta of this.indexes.values()) {
      if (indexMeta.table === fromName) {
        indexMeta.table = toName;
      }
    }
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
          table: 'deck_cards',
          from: 'card_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
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

    const swipeSessionForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('swipe_sessions')",
    );
    expect(swipeSessionForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
      ]),
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

    const deckCardForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_cards')",
    );
    expect(deckCardForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
      ]),
    );
    console.info(
      `[schema] deck_cards FKs: ${deckCardForeignKeys
        .map(
          (foreignKey) =>
            `${foreignKey.from}->${foreignKey.table}.${foreignKey.to}`,
        )
        .join(', ')}`,
    );

    const deckTagFacetForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_tag_facets')",
    );
    expect(deckTagFacetForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
      ]),
    );

    const deckTagTaxonomyForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_tag_taxonomy')",
    );
    expect(deckTagTaxonomyForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'deck_tag_facets',
          from: 'facet_id',
          to: 'id',
        }),
      ]),
    );

    const deckCardTagLinkForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_card_tag_links')",
    );
    expect(deckCardTagLinkForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'deck_cards',
          from: 'card_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'deck_tag_taxonomy',
          from: 'tag_id',
          to: 'id',
        }),
      ]),
    );

    const deckTagScoreForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_tag_scores')",
    );
    expect(deckTagScoreForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'deck_tag_taxonomy',
          from: 'tag_id',
          to: 'id',
        }),
      ]),
    );

    const deckTagStateForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_tag_state')",
    );
    expect(deckTagStateForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'deck_tag_taxonomy',
          from: 'tag_id',
          to: 'id',
        }),
      ]),
    );

    const deckCardStateForeignKeys = await db.getAllAsync<ForeignKeyRow>(
      "PRAGMA foreign_key_list('deck_card_state')",
    );
    expect(deckCardStateForeignKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: 'decks',
          from: 'deck_id',
          to: 'id',
        }),
        expect.objectContaining({
          table: 'deck_cards',
          from: 'card_id',
          to: 'id',
        }),
      ]),
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
        INSERT INTO __deck_content_meta (
          id, version, imported_at, deck_count, card_count
        ) VALUES (?, ?, ?, ?, ?)
      `,
      1,
      1,
      now,
      1,
      1,
    );

    await db.runAsync(
      `
        INSERT INTO decks (
          id, title, description, category, tier, card_count, compare_eligible, showdown_eligible,
          sensitivity, min_cards_for_profile, min_cards_for_compare, is_custom, cover_tile_key,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'deck_1',
      'Movies & TV',
      'Shared taste in movies and shows.',
      'movies_tv',
      'tier_1',
      1,
      1,
      1,
      'standard',
      15,
      30,
      0,
      'deck:movies-tv',
      now,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO deck_cards (
          id, deck_id, kind, title, subtitle, description_short, tags_json, popularity, tile_key,
          sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'deck_card_1',
      'deck_1',
      'entity',
      'Before Sunrise',
      'Richard Linklater, 1995',
      'Two strangers talk all night in Vienna.',
      '["romance","conversation"]',
      0.81,
      'movie:before-sunrise',
      1,
      now,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO deck_tag_facets (
          id, deck_id, key, label, description, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'movies_tv:tone',
      'deck_1',
      'tone',
      'Tone',
      'Mood lane',
      0,
      now,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO deck_tag_taxonomy (
          id, deck_id, facet_id, slug, label, description, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'movies_tv:romance',
      'deck_1',
      'movies_tv:tone',
      'romance',
      'Romance',
      'Romance cards',
      0,
      now,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO deck_card_tag_links (
          card_id, tag_id, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'deck_card_1',
      'movies_tv:romance',
      'primary',
      now,
      now,
    );

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
          id, deck_id, started_at, ended_at, filters_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      'session_1',
      'deck_1',
      now,
      now + 1000,
      '{"types":["movie"]}',
    );

    await db.runAsync(
      `
        INSERT INTO swipe_events (
          id, session_id, deck_id, card_id, action, strength, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      'event_1',
      'session_1',
      'deck_1',
      'deck_card_1',
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

    await db.runAsync(
      `
        INSERT INTO deck_card_state (
          deck_id, card_id, presentation_count, swipe_count, last_presented_at, last_swiped_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      'deck_1',
      'deck_card_1',
      1,
      1,
      now + 1500,
      now + 2000,
      now + 5000,
    );

    await db.runAsync(
      `
        INSERT INTO deck_tag_state (
          deck_id, tag_id, exposure_count, distinct_cards_seen, positive_weight, negative_weight,
          skip_count, net_weight, uncertainty_score, first_seen_at, last_seen_at, last_positive_at,
          last_negative_at, last_retested_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'deck_1',
      'movies_tv:romance',
      1,
      1,
      1,
      0,
      0,
      1,
      0.67,
      now + 2000,
      now + 2000,
      now + 2000,
      null,
      null,
      now + 5000,
    );

    await db.runAsync(
      `
        INSERT INTO deck_tag_scores (
          deck_id, tag_id, score, pos, neg, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'deck_1',
      'movies_tv:romance',
      2.0,
      2.0,
      0,
      now + 5000,
    );

    await db.runAsync(
      `
        INSERT INTO deck_card_affinity (
          deck_id, card_id, score, pos, neg, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'deck_1',
      'deck_card_1',
      1.0,
      1.0,
      0,
      now + 5000,
    );

    await db.runAsync(
      `
        INSERT INTO deck_profile_snapshots (
          id, deck_id, created_at, top_tags_json, top_aversions_json, summary_json
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'snap_deck_1_' + (now + 6000),
      'deck_1',
      now + 6000,
      '[{"tag":"romance","score":2}]',
      '[]',
      '{"stage":"meaningful"}',
    );

    expect(await db.getAllAsync('SELECT * FROM decks')).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM deck_cards')).toHaveLength(1);
    expect(
      await db.getAllAsync('SELECT * FROM __deck_content_meta'),
    ).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM catalog_entities')).toHaveLength(
      1,
    );
    expect(await db.getAllAsync('SELECT * FROM swipe_sessions')).toHaveLength(
      1,
    );
    expect(await db.getAllAsync('SELECT * FROM swipe_events')).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM deck_card_state')).toHaveLength(
      1,
    );
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
    expect(await db.getAllAsync('SELECT * FROM deck_tag_facets')).toHaveLength(
      1,
    );
    expect(
      await db.getAllAsync('SELECT * FROM deck_tag_taxonomy'),
    ).toHaveLength(1);
    expect(
      await db.getAllAsync('SELECT * FROM deck_card_tag_links'),
    ).toHaveLength(1);
    expect(await db.getAllAsync('SELECT * FROM deck_tag_state')).toHaveLength(
      1,
    );
    expect(await db.getAllAsync('SELECT * FROM deck_tag_scores')).toHaveLength(
      1,
    );
    expect(
      await db.getAllAsync('SELECT * FROM deck_card_affinity'),
    ).toHaveLength(1);
    expect(
      await db.getAllAsync('SELECT * FROM deck_profile_snapshots'),
    ).toHaveLength(1);

    await db.runAsync(
      `
        DELETE FROM swipe_sessions
        WHERE id = ?
      `,
      'session_1',
    );

    await db.runAsync(
      `
        DELETE FROM decks
        WHERE id = ?
      `,
      'deck_1',
    );

    expect(await db.getAllAsync('SELECT * FROM decks')).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM deck_cards')).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM deck_tag_facets')).toHaveLength(
      0,
    );
    expect(
      await db.getAllAsync('SELECT * FROM deck_tag_taxonomy'),
    ).toHaveLength(0);
    expect(
      await db.getAllAsync('SELECT * FROM deck_card_tag_links'),
    ).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM deck_tag_state')).toHaveLength(
      0,
    );
    expect(await db.getAllAsync('SELECT * FROM deck_tag_scores')).toHaveLength(
      0,
    );
    expect(
      await db.getAllAsync('SELECT * FROM deck_card_affinity'),
    ).toHaveLength(0);
    expect(
      await db.getAllAsync('SELECT * FROM deck_profile_snapshots'),
    ).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM swipe_sessions')).toHaveLength(
      0,
    );
    expect(await db.getAllAsync('SELECT * FROM swipe_events')).toHaveLength(0);
    expect(await db.getAllAsync('SELECT * FROM deck_card_state')).toHaveLength(
      0,
    );

    const foreignKeyViolations = await db.getAllAsync(
      'PRAGMA foreign_key_check',
    );
    expect(foreignKeyViolations).toHaveLength(0);

    const rerun = await runMigrations(db);
    expect(rerun.appliedMigrations).toBe(0);
  });

  it('normalizes legacy swipe action rows during migration 004', async () => {
    const fakeDb = new FakeSchemaSQLiteDatabase();
    const db = fakeDb as unknown as SQLiteDatabase;
    const now = Date.now();

    for (const migration of migrations.filter(
      (candidate) => candidate.version <= 3,
    )) {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    }

    await db.runAsync(
      `
        INSERT INTO catalog_entities (
          id, type, title, subtitle, description_short, tags_json, popularity, tile_key, image_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      'entity_legacy_1',
      'movie',
      'Legacy Entity',
      'Example Subtitle',
      'Example Description',
      '["legacy"]',
      0.5,
      'tile_legacy_1',
      null,
      now,
    );

    await db.runAsync(
      `
        INSERT INTO swipe_sessions (
          id, started_at, ended_at, filters_json
        ) VALUES (?, ?, ?, ?)
      `,
      'session_legacy_1',
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
      'event_love',
      'session_legacy_1',
      'entity_legacy_1',
      LEGACY_LOVE_ACTION,
      2,
      now + 100,
    );

    await db.runAsync(
      `
        INSERT INTO swipe_events (
          id, session_id, entity_id, action, strength, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'event_respect',
      'session_legacy_1',
      'entity_legacy_1',
      LEGACY_DEFERRED_ACTIONS[0],
      actionToDbStrength('yes'),
      now + 200,
    );

    await db.runAsync(
      `
        INSERT INTO swipe_events (
          id, session_id, entity_id, action, strength, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      'event_curious',
      'session_legacy_1',
      'entity_legacy_1',
      LEGACY_DEFERRED_ACTIONS[1],
      0,
      now + 300,
    );

    const migration = migrations.find((candidate) => candidate.version === 4);
    if (!migration) {
      throw new Error('Expected migration 004 to exist.');
    }

    await migration.up(db);

    expect(await db.getAllAsync('SELECT * FROM swipe_events')).toEqual([
      {
        id: 'event_love',
        session_id: 'session_legacy_1',
        entity_id: 'entity_legacy_1',
        action: 'strong_yes',
        strength: 2,
        created_at: now + 100,
      },
      {
        id: 'event_respect',
        session_id: 'session_legacy_1',
        entity_id: 'entity_legacy_1',
        action: 'skip',
        strength: 0,
        created_at: now + 200,
      },
      {
        id: 'event_curious',
        session_id: 'session_legacy_1',
        entity_id: 'entity_legacy_1',
        action: 'skip',
        strength: 0,
        created_at: now + 300,
      },
    ]);
  });
});
