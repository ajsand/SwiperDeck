import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'tastedeck.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

export async function openDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME).catch((error) => {
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
