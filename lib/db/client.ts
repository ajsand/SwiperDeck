import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'datedeck.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function openDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync(`
        PRAGMA foreign_keys = ON;
      `);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

export async function getDb(): Promise<SQLiteDatabase> {
  return openDb();
}

export async function closeDb(): Promise<void> {
  if (!dbPromise) {
    return;
  }

  const db = await dbPromise;
  await db.closeAsync();
  dbPromise = null;
}
