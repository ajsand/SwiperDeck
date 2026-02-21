# Database Migration Strategy

> Decision memo for TasteDeck SQLite schema versioning.
> Produced in Iteration 3A. Implementers: use this as the single reference for Iterations 3B–3D and beyond.

## 1) Chosen Strategy: `PRAGMA user_version`

### Decision

Use SQLite's built-in `PRAGMA user_version` (a single integer stored in the database header) to track schema version.

### Rationale

- **Expo's official pattern.** The Expo SQLite docs demonstrate `PRAGMA user_version` in the `SQLiteProvider` `onInit` callback — this is the platform-blessed approach for SDK 54.
- **No bootstrap problem.** `PRAGMA user_version` exists before any tables do. A `schema_migrations` table would require creating itself before tracking anything — an unnecessary chicken-and-egg step.
- **Minimal code.** The full runner is ~30 lines: read version, run migrations in order, write version. Less code means fewer bugs in a critical startup path.
- **Fail-fast semantics.** If migration N fails, the version stays at N-1. On next app launch, the same migration retries. No partial-application ambiguity.
- **Right fit for local-first.** TasteDeck is single-user, single-device. There is no multi-device sync, no branching migration history, no need for a per-migration audit ledger.
- **Cross-platform.** Works identically on iOS, Android, and web (Expo SQLite alpha).

### Why not `schema_migrations` table?

A tracking table would add complexity (extra table, bootstrap logic, partial-state queries) to solve problems TasteDeck doesn't have. It's appropriate for server-side databases with multiple deployers or branching schemas — not for an embedded single-user mobile database.

## 2) Migration Registry Format

### Migration ID format

```
001_init
002_base_schema
003_add_fts_index
...
```

Zero-padded three-digit prefix, underscore, short snake_case description. The numeric prefix determines execution order.

### Where migrations live

All migrations are defined in a single registry file:

```
lib/db/migrations.ts
```

Each migration is an object in an ordered array:

```typescript
export interface Migration {
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_init',
    up: async (db) => {
      await db.execAsync(`PRAGMA journal_mode = 'wal'`);
      await db.execAsync(`PRAGMA foreign_keys = ON`);
    },
  },
  // Iteration 04 adds: version 2, '002_base_schema'
  // Future iterations append here
];
```

### Why a single file with an array (not file-per-migration)?

- TasteDeck will have ~10–20 migrations total across all 26 iterations. A folder of individual files adds indirection without benefit at this scale.
- A single array makes ordering explicit and trivially verifiable.
- If the migration count ever exceeds ~30, the registry can be refactored to import from separate files while keeping the array as the source of truth.

## 3) Execution Guarantees

### Run order

Migrations execute in array order (ascending `version`). The runner compares each migration's `version` against the current `PRAGMA user_version` and skips any already applied.

### Idempotency

- Each migration's SQL should use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.
- This is a safety net, not the primary guard. The version check is the primary guard against re-execution.

### Transaction policy

Each migration runs inside `execAsync` (which runs all statements atomically for multi-statement strings) or explicit `withExclusiveTransactionAsync` for complex migrations. If any statement fails, the version is not bumped and the app surfaces the error.

Note: `withExclusiveTransactionAsync` is preferred over `withTransactionAsync` because the exclusive variant guarantees only the transaction's queries execute within its scope (avoids interleaving with other async queries).

### Error handling

- Migration failure **blocks app startup**. The `SQLiteProvider` `onInit` callback will throw, preventing children from rendering with a broken schema.
- Errors are logged with migration name and version for diagnosis.

### Logging

The runner logs to `console.info` / `console.error`:

```
[db] Running migration 001_init (version 0 → 1)
[db] Migration 001_init complete
[db] Running migration 002_base_schema (version 1 → 2)
[db] Migration 002_base_schema complete
[db] All migrations complete. Schema version: 2
```

On rerun with no pending migrations:

```
[db] Schema version 2 is current. No migrations needed.
```

## 4) Version Bump Rules

### Target version constant

```typescript
export const TARGET_VERSION = migrations[migrations.length - 1].version;
```

Derived from the registry array — no separate constant to keep in sync.

### How version advances

After each successful migration, the runner executes:

```sql
PRAGMA user_version = <migration.version>
```

This means the version advances one step at a time. If the app ships with migrations 1–5 and a user is on version 3, migrations 4 and 5 run sequentially at next startup.

### Downgrade policy

Downgrades are **not supported**. If `user_version` is higher than `TARGET_VERSION`, the runner logs a warning but does not alter the schema. This covers the case where a user installs a newer build then rolls back.

## 5) How to Add Migration N+1 (Developer Recipe)

### Step-by-step

1. **Open `lib/db/migrations.ts`.**

2. **Append a new entry** to the `migrations` array:

   ```typescript
   {
     version: 3, // increment from previous
     name: '003_add_new_table',
     up: async (db) => {
       await db.execAsync(`
         CREATE TABLE IF NOT EXISTS new_table (
           id TEXT PRIMARY KEY NOT NULL,
           value TEXT NOT NULL
         );
       `);
     },
   },
   ```

3. **Verify ordering.** The new entry's `version` must be strictly greater than all previous entries.

4. **Run the app** with a fresh database to verify:

   ```bash
   npx expo start --clear
   ```

5. **Run quality gates:**

   ```bash
   npm run typecheck
   npm run lint
   ```

6. **Verify in logs** that the new migration appears:
   ```
   [db] Running migration 003_add_new_table (version 2 → 3)
   [db] Migration 003_add_new_table complete
   ```

### Rules

- **Never modify a released migration.** Once a migration has shipped to users, it is immutable. Fix issues by adding a new corrective migration.
- **Never reorder migrations.** The version numbers and array order must be monotonically increasing.
- **Never skip version numbers.** Version 4 follows version 3. Gaps create confusion.
- **Always use IF NOT EXISTS / IF EXISTS.** Safety net for edge cases.

## 6) Integration with Expo Router

The migration runner integrates via `SQLiteProvider`'s `onInit` prop in the root layout:

```tsx
<SQLiteProvider databaseName="tastedeck.db" onInit={migrateDbIfNeeded}>
  {children}
</SQLiteProvider>
```

The `onInit` callback receives the database instance and runs the migration runner before any child component can access the database via `useSQLiteContext()`. This guarantees the schema is ready before any data-dependent rendering.

## 7) Forward Compatibility Notes

| Future Iteration          | Impact on Migrations                                             |
| ------------------------- | ---------------------------------------------------------------- |
| 04 — Base schema tables   | Adds migration `002_base_schema` with all Section 6 tables       |
| 06 — Starter catalog load | May add migration for seed data or run as a separate import step |
| 18 — Profile snapshots    | May add migration for new columns or indexes                     |
| Future — FTS search       | Would add a migration enabling FTS virtual tables                |

The `PRAGMA user_version` approach handles all of these naturally: each adds a new entry to the array with an incremented version number.
