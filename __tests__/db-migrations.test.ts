import type { SQLiteDatabase } from 'expo-sqlite';
import { loadPrebuiltDecksIfNeeded } from '@/lib/content';

import { healthCheck } from '../lib/db/health';
import { initializeDatabase } from '../lib/db/index';
import { runMigrations } from '../lib/db/runMigrations';

jest.mock('@/lib/content', () => ({
  loadPrebuiltDecksIfNeeded: jest.fn().mockResolvedValue({
    status: 'skipped',
    version: 2,
    deckCount: 0,
    cardCount: 0,
    skippedCardCount: 0,
  }),
}));

type UserVersionRow = {
  user_version: number;
};

type JournalModeRow = {
  journal_mode: string;
};

type ForeignKeysRow = {
  foreign_keys: number;
};

type PingRow = {
  ok: number;
};

class FakeSQLiteDatabase {
  userVersion = 0;
  foreignKeysEnabled = 0;
  journalMode = 'delete';

  async execAsync(source: string): Promise<void> {
    const setVersionMatch = source.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (setVersionMatch) {
      this.userVersion = Number(setVersionMatch[1]);
    }

    if (/PRAGMA\s+foreign_keys\s*=\s*ON/i.test(source)) {
      this.foreignKeysEnabled = 1;
    }
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (/PRAGMA\s+user_version/i.test(source)) {
      return { user_version: this.userVersion } as T & UserVersionRow;
    }

    if (/PRAGMA\s+journal_mode/i.test(source)) {
      return { journal_mode: this.journalMode } as T & JournalModeRow;
    }

    if (/PRAGMA\s+foreign_keys/i.test(source)) {
      return { foreign_keys: this.foreignKeysEnabled } as T & ForeignKeysRow;
    }

    if (/SELECT\s+1\s+AS\s+ok/i.test(source)) {
      return { ok: 1 } as T & PingRow;
    }

    return null;
  }

  async getAllAsync<T>(source: string): Promise<T[]> {
    if (/PRAGMA\s+table_info/i.test(source)) {
      return [];
    }

    return [];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (txn: FakeSQLiteDatabase) => Promise<void>,
  ): Promise<void> {
    await task(this);
  }
}

class LegacyTagSchemaDatabase {
  userVersion: number;
  foreignKeysEnabled = 0;
  private tables = new Map<string, Set<string>>();

  constructor(userVersion: number) {
    this.userVersion = userVersion;
  }

  seedLegacyTable(tableName: string, columns: string[]): void {
    this.tables.set(tableName, new Set(columns));
  }

  getColumns(tableName: string): string[] {
    return Array.from(this.tables.get(tableName) ?? []);
  }

  async execAsync(source: string): Promise<void> {
    const statements = source
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    for (const statement of statements) {
      const setVersionMatch = statement.match(
        /PRAGMA\s+user_version\s*=\s*(\d+)/i,
      );

      if (setVersionMatch) {
        this.userVersion = Number(setVersionMatch[1]);
        continue;
      }

      if (/PRAGMA\s+foreign_keys\s*=\s*ON/i.test(statement)) {
        this.foreignKeysEnabled = 1;
        continue;
      }

      const createTableMatch = statement.match(
        /CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]+)\)$/i,
      );

      if (createTableMatch) {
        const [, tableName, body] = createTableMatch;
        if (!this.tables.has(tableName)) {
          const columns = body
            .split(/\r?\n/)
            .map((line) => line.trim().replace(/,$/, ''))
            .filter(
              (line) =>
                line.length > 0 &&
                !line.toUpperCase().startsWith('FOREIGN KEY') &&
                !line.toUpperCase().startsWith('PRIMARY KEY'),
            )
            .map((line) => line.split(/\s+/)[0]);

          this.tables.set(tableName, new Set(columns));
        }
        continue;
      }

      const createIndexMatch = statement.match(
        /CREATE INDEX IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)$/i,
      );

      if (createIndexMatch) {
        const [, , tableName, rawColumns] = createIndexMatch;
        const tableColumns = this.tables.get(tableName) ?? new Set<string>();
        const indexColumns = rawColumns
          .split(',')
          .map((column) => column.trim().split(/\s+/)[0].replace(/['"`]/g, ''));

        for (const column of indexColumns) {
          if (!tableColumns.has(column)) {
            throw new Error(`Error code 1: no such column: ${column}`);
          }
        }
        continue;
      }

      const dropTableMatch = statement.match(
        /DROP TABLE IF EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)/i,
      );

      if (dropTableMatch) {
        this.tables.delete(dropTableMatch[1]);
        continue;
      }

      const alterTableMatch = statement.match(
        /ALTER TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+RENAME TO\s+([A-Za-z_][A-Za-z0-9_]*)/i,
      );

      if (alterTableMatch) {
        const [, fromTable, toTable] = alterTableMatch;
        const table = this.tables.get(fromTable) ?? new Set<string>();
        this.tables.set(toTable, new Set(table));
        this.tables.delete(fromTable);
        continue;
      }
    }
  }

  async getAllAsync<T>(source: string): Promise<T[]> {
    const tableInfoMatch = source.match(
      /PRAGMA\s+table_info\s*\(\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?\s*\)/i,
    );

    if (tableInfoMatch) {
      return this.getColumns(tableInfoMatch[1]).map((name) => ({
        name,
      })) as T[];
    }

    return [];
  }

  async getFirstAsync<T>(source: string): Promise<T | null> {
    if (/PRAGMA\s+user_version/i.test(source)) {
      return { user_version: this.userVersion } as T;
    }

    return null;
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (txn: LegacyTagSchemaDatabase) => Promise<void>,
  ): Promise<void> {
    await task(this);
  }
}

describe('db migration runner', () => {
  const mockedLoadPrebuiltDecksIfNeeded = jest.mocked(
    loadPrebuiltDecksIfNeeded,
  );

  beforeEach(() => {
    mockedLoadPrebuiltDecksIfNeeded.mockReset();
    mockedLoadPrebuiltDecksIfNeeded.mockResolvedValue({
      status: 'skipped',
      version: 2,
      deckCount: 0,
      cardCount: 0,
      skippedCardCount: 0,
    });
  });

  it('initializes database on first and second app startup', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    const firstStartup = await initializeDatabase(sqliteDb);
    expect(firstStartup.ok).toBe(true);
    expect(firstStartup.userVersion).toBe(12);
    expect(firstStartup.targetVersion).toBe(12);

    const secondStartup = await initializeDatabase(sqliteDb);
    expect(secondStartup.ok).toBe(true);
    expect(secondStartup.userVersion).toBe(12);
    expect(secondStartup.targetVersion).toBe(12);
  });

  it('runs 001_init on first run and skips on second run', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    const firstRun = await runMigrations(sqliteDb);
    expect(firstRun).toEqual({
      fromVersion: 0,
      toVersion: 12,
      appliedMigrations: 12,
    });

    const secondRun = await runMigrations(sqliteDb);
    expect(secondRun).toEqual({
      fromVersion: 12,
      toVersion: 12,
      appliedMigrations: 0,
    });

    expect(db.userVersion).toBe(12);
    expect(db.foreignKeysEnabled).toBe(1);
  });

  it('returns healthy metadata after migrations', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    await runMigrations(sqliteDb);
    const status = await healthCheck(sqliteDb);

    expect(status.ok).toBe(true);
    expect(status.userVersion).toBe(12);
    expect(status.targetVersion).toBe(12);
    expect(status.foreignKeysEnabled).toBe(true);
    expect(status.journalMode).toBe('delete');
  });

  it('repairs a legacy deck_tag_scores table during migration 008', async () => {
    const db = new LegacyTagSchemaDatabase(7);
    db.seedLegacyTable('deck_tag_scores', [
      'deck_id',
      'tag',
      'score',
      'pos',
      'neg',
      'last_updated',
    ]);
    const sqliteDb = db as unknown as SQLiteDatabase;

    const result = await runMigrations(sqliteDb);

    expect(result.toVersion).toBe(12);
    expect(db.getColumns('deck_tag_facets')).toContain('id');
    expect(db.getColumns('deck_tag_taxonomy')).toContain('id');
    expect(db.getColumns('deck_card_tag_links')).toContain('card_id');
    expect(db.getColumns('deck_card_state')).toContain('card_id');
    expect(db.getColumns('deck_tag_scores')).toEqual(
      expect.arrayContaining([
        'deck_id',
        'tag_id',
        'score',
        'pos',
        'neg',
        'last_updated',
      ]),
    );
    expect(db.getColumns('deck_tag_scores')).not.toContain('tag');
  });

  it('repairs legacy tag-based profile tables for already-migrated installs', async () => {
    const db = new LegacyTagSchemaDatabase(9);
    db.seedLegacyTable('deck_tag_scores', [
      'deck_id',
      'tag',
      'score',
      'pos',
      'neg',
      'last_updated',
    ]);
    db.seedLegacyTable('deck_tag_state', [
      'deck_id',
      'tag',
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
    ]);
    const sqliteDb = db as unknown as SQLiteDatabase;

    const result = await runMigrations(sqliteDb);

    expect(result).toEqual({
      fromVersion: 9,
      toVersion: 12,
      appliedMigrations: 3,
    });
    expect(db.getColumns('deck_tag_scores')).toContain('tag_id');
    expect(db.getColumns('deck_tag_scores')).not.toContain('tag');
    expect(db.getColumns('deck_tag_state')).toContain('tag_id');
    expect(db.getColumns('deck_tag_state')).not.toContain('tag');
    expect(db.getColumns('deck_card_state')).toContain('card_id');
  });

  it('repairs installs that skipped the taxonomy migration because of legacy version numbering', async () => {
    const db = new LegacyTagSchemaDatabase(10);
    const sqliteDb = db as unknown as SQLiteDatabase;

    const result = await runMigrations(sqliteDb);

    expect(result).toEqual({
      fromVersion: 10,
      toVersion: 12,
      appliedMigrations: 2,
    });
    expect(db.getColumns('deck_tag_facets')).toContain('id');
    expect(db.getColumns('deck_tag_taxonomy')).toContain('id');
    expect(db.getColumns('deck_card_tag_links')).toContain('card_id');
    expect(db.getColumns('deck_card_state')).toContain('card_id');
  });

  it('fails initialization when bundled prebuilt content cannot be loaded', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    mockedLoadPrebuiltDecksIfNeeded.mockResolvedValueOnce({
      status: 'failed',
      version: 2,
      deckCount: 0,
      cardCount: 0,
      skippedCardCount: 0,
      error: new Error('Prebuilt deck content load failed'),
    });

    await expect(initializeDatabase(sqliteDb)).rejects.toThrow(
      'Prebuilt deck content load failed',
    );
  });
});
