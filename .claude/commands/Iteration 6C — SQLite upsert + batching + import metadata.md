
---

### File 3 — `iterations/06-subtasks/06C_CODEX-sqlite-upsert-batching-and-import-metadata.md`

```md
# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 6C — SQLite upsert + batching + import metadata

## Objective
Implement the **persistence half** of the import pipeline:
- batched transactional **UPSERT** into `catalog_entities`,
- import metadata tracking (version, counts, timestamps, last error summary),
- repeat-safe behavior (idempotent re-import).

## Why this matters
Import must be fast enough for real devices and resilient enough for repeated runs:
- you will re-import on app updates and catalog refreshes,
- you must avoid duplicates,
- and failures must be diagnosable without bricking the app.

## Scope
### In scope
- Add `catalog_entities` upsert repo with prepared statements.
- Use transaction batching (e.g., 250–1000 rows per transaction, tune).
- Add import metadata storage:
  - either a small SQLite table (preferred),
  - or a single-row “kv” table if you already have one.
- Implement `importStarterCatalogToDb(entities, diagnostics)` that:
  - writes to DB,
  - writes metadata atomically (or “commit only on success” semantics),
  - returns summary.

### Out of scope
- Remote fetch pipeline.
- Background scheduling beyond “trigger once on startup” (6D).
- Query-plan tuning beyond obvious indexes.

## Preconditions
- Iteration 03 migration runner exists.
- Iteration 04 created `catalog_entities` table.
- Iteration 05 provides canonical entity types.
- Iteration 6B can produce `entities[]` + `diagnostics`.

## DB metadata strategy (pick one and implement)
### Option A (recommended): dedicated metadata table
Add a migration in this iteration:
- `catalog_import_state`
  - `id TEXT PRIMARY KEY` (constant like `starter`)
  - `version TEXT NOT NULL`
  - `valid_count INTEGER NOT NULL`
  - `skipped_count INTEGER NOT NULL`
  - `completed_at INTEGER NOT NULL`
  - `last_error_json TEXT NULL`

Pros: simple, queryable, repeat-safe.

### Option B: embed metadata elsewhere
Only if your schema already has a general key/value table.

## Implementation plan
1) **DB repo**
   - `lib/db/catalogRepo.ts`
     - `upsertEntities(db, entities, batchSize)`
     - uses prepared statement:
       - `INSERT INTO catalog_entities (...) VALUES (...)`
       - `ON CONFLICT(id) DO UPDATE SET ...`
     - finalize statements properly.

2) **Batching**
   - Use `withTransactionAsync` or `withExclusiveTransactionAsync` to ensure atomic batch writes.
   - Choose batch size; yield between batches to keep UI responsive when called from JS thread.

3) **Metadata write**
   - On successful import: write/replace metadata row.
   - On failure: write `last_error_json` (and do NOT advance completed_at).

4) **Idempotency**
   - Ensure re-import does not change row counts unexpectedly.
   - When inputs change, existing IDs update fields deterministically.

## Deliverables
- Upsert repo with prepared statement(s).
- Import metadata table + migration (if Option A).
- Import function:
  - `lib/catalog/importStarterCatalogToDb.ts`
- Minimal “import summary” logging (counts + duration).

## Acceptance criteria
- First import: `catalog_entities` count == valid entity count.
- Re-import: count stays stable; changed rows update correctly.
- Metadata is persisted and queryable after import.
- Import is transactional per batch (no half-written batches).

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- catalog-import` (or add a DB-backed test)

## External references (official / high-quality)
```text
Expo SQLite docs (openDatabaseAsync, execAsync, prepared statements, WAL note): https://docs.expo.dev/versions/latest/sdk/sqlite/
SQLite UPSERT syntax (ON CONFLICT DO UPDATE, excluded.*): https://sqlite.org/lang_upsert.html
SQLite Transactions (BEGIN/COMMIT behavior, single-writer constraint): https://sqlite.org/lang_transaction.html
SQLite conflict clause details: https://sqlite.org/lang_conflict.html