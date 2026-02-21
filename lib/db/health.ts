import type { SQLiteDatabase } from 'expo-sqlite';

import { getDb } from './client';
import { DATABASE_VERSION } from './migrations';

type PingRow = {
  ok: number;
};

type UserVersionRow = {
  user_version: number;
};

type JournalModeRow = {
  journal_mode: string;
};

type ForeignKeysRow = {
  foreign_keys: number;
};

export interface DatabaseHealth {
  ok: boolean;
  userVersion: number;
  targetVersion: number;
  journalMode: string | null;
  foreignKeysEnabled: boolean;
}

export async function healthCheck(
  dbArg?: SQLiteDatabase,
): Promise<DatabaseHealth> {
  const db = dbArg ?? (await getDb());

  const ping = await db.getFirstAsync<PingRow>('SELECT 1 AS ok');
  if (!ping || ping.ok !== 1) {
    throw new Error('Database ping failed.');
  }

  const userVersionRow = await db.getFirstAsync<UserVersionRow>(
    'PRAGMA user_version',
  );
  const journalModeRow = await db.getFirstAsync<JournalModeRow>(
    'PRAGMA journal_mode',
  );
  const foreignKeysRow = await db.getFirstAsync<ForeignKeysRow>(
    'PRAGMA foreign_keys',
  );

  return {
    ok: true,
    userVersion: userVersionRow?.user_version ?? 0,
    targetVersion: DATABASE_VERSION,
    journalMode: journalModeRow?.journal_mode ?? null,
    foreignKeysEnabled: Boolean(foreignKeysRow?.foreign_keys),
  };
}
