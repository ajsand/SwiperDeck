import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { logDbError, logDbInfo, logDbWarn } from './logger';
import { DATABASE_VERSION, migrations, type MigrationDb } from './migrations';

type UserVersionRow = {
  user_version: number;
};

export interface MigrationRunResult {
  fromVersion: number;
  toVersion: number;
  appliedMigrations: number;
}

function assertValidMigrationRegistry(): void {
  for (let i = 0; i < migrations.length; i += 1) {
    const current = migrations[i];

    if (!Number.isInteger(current.version) || current.version < 1) {
      throw new Error(
        `Invalid migration version "${current.version}" for ${current.name}. Versions must be positive integers.`,
      );
    }

    if (i === 0 && current.version !== 1) {
      throw new Error(
        `First migration must start at version 1. Found ${current.version} (${current.name}).`,
      );
    }

    if (i > 0) {
      const previous = migrations[i - 1];
      const expectedVersion = previous.version + 1;

      if (current.version !== expectedVersion) {
        throw new Error(
          `Migration versions must be contiguous. Expected ${expectedVersion} after ${previous.name}, found ${current.version} (${current.name}).`,
        );
      }
    }
  }
}

async function readUserVersion(db: MigrationDb): Promise<number> {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function writeUserVersion(
  db: MigrationDb,
  version: number,
): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

async function runInTransaction(
  db: SQLiteDatabase,
  task: (txnDb: MigrationDb) => Promise<void>,
): Promise<void> {
  if (Platform.OS !== 'web') {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await task(txn);
    });
    return;
  }

  await db.withTransactionAsync(async () => {
    await task(db);
  });
}

export async function runMigrations(
  db: SQLiteDatabase,
): Promise<MigrationRunResult> {
  assertValidMigrationRegistry();

  const fromVersion = await readUserVersion(db);
  let currentVersion = fromVersion;

  if (currentVersion > DATABASE_VERSION) {
    logDbWarn(
      `Current schema version ${currentVersion} is newer than target ${DATABASE_VERSION}. Skipping migrations.`,
    );

    return {
      fromVersion,
      toVersion: currentVersion,
      appliedMigrations: 0,
    };
  }

  if (currentVersion === DATABASE_VERSION) {
    logDbInfo(
      `Schema version ${currentVersion} is current. No migrations needed.`,
    );

    return {
      fromVersion,
      toVersion: currentVersion,
      appliedMigrations: 0,
    };
  }

  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    logDbInfo(
      `Running migration ${migration.name} (version ${currentVersion} -> ${migration.version})`,
    );

    try {
      await runInTransaction(db, async (txnDb) => {
        await migration.up(txnDb);
        await writeUserVersion(txnDb, migration.version);
      });
    } catch (error) {
      logDbError(`Migration ${migration.name} failed`, error);
      throw error;
    }

    currentVersion = migration.version;
    logDbInfo(`Migration ${migration.name} complete`);
  }

  logDbInfo(`All migrations complete. Schema version: ${currentVersion}`);

  return {
    fromVersion,
    toVersion: currentVersion,
    appliedMigrations: pendingMigrations.length,
  };
}

export const migrateDbIfNeeded = runMigrations;
