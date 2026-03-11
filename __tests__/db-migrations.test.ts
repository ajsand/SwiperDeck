import type { SQLiteDatabase } from 'expo-sqlite';

import { healthCheck } from '../lib/db/health';
import { initializeDatabase } from '../lib/db/index';
import { runMigrations } from '../lib/db/runMigrations';

jest.mock('@/lib/content', () => ({
  loadPrebuiltDecksIfNeeded: jest.fn().mockResolvedValue({
    status: 'skipped',
    version: 1,
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

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (txn: FakeSQLiteDatabase) => Promise<void>,
  ): Promise<void> {
    await task(this);
  }
}

describe('db migration runner', () => {
  it('initializes database on first and second app startup', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    const firstStartup = await initializeDatabase(sqliteDb);
    expect(firstStartup.ok).toBe(true);
    expect(firstStartup.userVersion).toBe(7);
    expect(firstStartup.targetVersion).toBe(7);

    const secondStartup = await initializeDatabase(sqliteDb);
    expect(secondStartup.ok).toBe(true);
    expect(secondStartup.userVersion).toBe(7);
    expect(secondStartup.targetVersion).toBe(7);
  });

  it('runs 001_init on first run and skips on second run', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    const firstRun = await runMigrations(sqliteDb);
    expect(firstRun).toEqual({
      fromVersion: 0,
      toVersion: 7,
      appliedMigrations: 7,
    });

    const secondRun = await runMigrations(sqliteDb);
    expect(secondRun).toEqual({
      fromVersion: 7,
      toVersion: 7,
      appliedMigrations: 0,
    });

    expect(db.userVersion).toBe(7);
    expect(db.foreignKeysEnabled).toBe(1);
  });

  it('returns healthy metadata after migrations', async () => {
    const db = new FakeSQLiteDatabase();
    const sqliteDb = db as unknown as SQLiteDatabase;

    await runMigrations(sqliteDb);
    const status = await healthCheck(sqliteDb);

    expect(status.ok).toBe(true);
    expect(status.userVersion).toBe(7);
    expect(status.targetVersion).toBe(7);
    expect(status.foreignKeysEnabled).toBe(true);
    expect(status.journalMode).toBe('delete');
  });
});
