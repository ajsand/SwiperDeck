import type { SQLiteDatabase } from 'expo-sqlite';

export type MigrationDb = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export interface Migration {
  version: number;
  name: string;
  up: (db: MigrationDb) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_init',
    up: async (db) => {
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS __healthcheck (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          last_checked_at INTEGER NOT NULL
        );

        INSERT OR IGNORE INTO __healthcheck (id, last_checked_at)
        VALUES (1, CAST(strftime('%s', 'now') AS INTEGER));
      `);
    },
  },
];

export const DATABASE_VERSION =
  migrations.length > 0 ? migrations[migrations.length - 1].version : 0;
