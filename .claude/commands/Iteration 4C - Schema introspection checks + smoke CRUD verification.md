# Iteration 4C (GPT-5.3 Codex) — Schema introspection checks + smoke CRUD verification

## Intended model
**GPT-5.3 Codex (Verification Implementer)**

## Objective
Add deterministic schema verification that confirms:
- all required tables exist
- all required indexes exist and are correctly named
- foreign keys are declared (and enforcement is enabled)
- minimal CRUD smoke works across table categories (catalog/session/swipe/affinity/snapshot)

This should be runnable in CI or locally as a single command.

## Why this matters
Without automated introspection checks, schema drift is easy:
- missing index → slow ranking/history queries later
- wrong column name/type → typed models drift (Iteration 05)
- FK enforcement misconfigured → silent integrity bugs

## Scope
### In scope
- Add a “schema check” function/script/test that uses SQLite metadata APIs:
  - `sqlite_master`
  - `PRAGMA table_info(table)`
  - `PRAGMA index_list(table)`
  - `PRAGMA foreign_key_list(table)`
- Add a smoke CRUD path that inserts and reads:
  - 1 catalog entity
  - 1 swipe session
  - 1 swipe event
  - 1 score row (tag/type/affinity)
  - 1 profile snapshot

### Out of scope
- Full integration test suite (Iteration 24)
- Query plan tuning (Iteration 25)

## Implementation approach options (choose one)
### Option A — Jest/Vitest style test (preferred if test runner exists)
- Add `tests/schema.test.ts`
- Use expo-sqlite in a test environment if supported OR abstract DB layer to run in Node.
Notes:
- If you cannot run expo-sqlite directly in Node tests, prefer Option B.

### Option B — Node script invoked by npm script (most robust)
- Add `scripts/checkSchema.ts` that runs in app runtime context OR via a lightweight harness.
- It should open DB, run migrations, run introspection queries, and exit with non-zero on failure.

Pick whichever matches repo reality; do not invent a second test framework.

## Required checks (must enforce)
### 1) Tables exist
Assert these exist:
- catalog_entities
- swipe_sessions
- swipe_events
- taste_tag_scores
- taste_type_scores
- entity_affinity
- profile_snapshots

Implementation: query `sqlite_master`:
- SELECT name, type FROM sqlite_master WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%';

### 2) Column shape sanity
For each table, verify required columns exist (names only is OK for v1).
Use `PRAGMA table_info('table_name')`.

### 3) Index existence
For each table, verify required indexes exist by name.
Use `PRAGMA index_list('table_name')`.

### 4) Foreign keys declared
For swipe_events:
- verify FK to swipe_sessions and catalog_entities exists
Use `PRAGMA foreign_key_list('swipe_events')`.

For entity_affinity:
- verify FK to catalog_entities exists if implemented

### 5) Foreign key enforcement enabled
Verify `PRAGMA foreign_keys` returns 1 on the active connection.
Then run:
- `PRAGMA foreign_key_check;`
and assert it returns zero rows after the smoke inserts.

Important: In SQLite, `PRAGMA integrity_check` does not necessarily surface FK errors; use `foreign_key_check`.

### 6) Smoke CRUD
Insert minimal rows in dependency order:
1) catalog_entities
2) swipe_sessions
3) swipe_events (must reference existing session/entity)
4) taste_* tables and entity_affinity
5) profile_snapshots

Then perform one SELECT for each to confirm reads.

Rollback or clean up if needed, but a fresh DB is fine for this iteration.

## Deliverables
- A single runnable check (test or script) that fails loudly on schema mismatch.
- A short note in iteration execution notes describing how to run it.

## Acceptance criteria
- After `--clear`, running migrations then schema checks passes.
- Re-running schema checks passes.
- If a required index is removed, check fails.
- If FK enforcement is off, check fails with actionable output.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run start -- --clear`
- `npm test -- schema` OR `npm run schema:check` (whichever your repo uses)