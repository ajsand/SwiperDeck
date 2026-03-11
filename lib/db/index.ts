import type { SQLiteDatabase } from 'expo-sqlite';
import { loadPrebuiltDecksIfNeeded } from '@/lib/content';

import { getDb } from './client';
import { healthCheck, type DatabaseHealth } from './health';
import { logDbError, logDbInfo } from './logger';
import { runMigrations } from './runMigrations';

export * from './catalogRepository';
export * from './client';
export * from './deckCardRepository';
export * from './deckProfileRepository';
export * from './deckRepository';
export * from './health';
export * from './logger';
export * from './migrations';
export * from './runMigrations';
export * from './swipeRepository';

export async function initializeDatabase(
  dbArg?: SQLiteDatabase,
): Promise<DatabaseHealth> {
  const db = dbArg ?? (await getDb());

  logDbInfo('App initialization started');

  try {
    await runMigrations(db);
    await loadPrebuiltDecksIfNeeded(db);
    const status = await healthCheck(db);

    logDbInfo(
      `App initialization ready. Schema version: ${status.userVersion}/${status.targetVersion}`,
    );

    return status;
  } catch (error) {
    logDbError('App initialization failed', error);
    throw error;
  }
}
