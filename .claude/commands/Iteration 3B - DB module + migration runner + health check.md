# Iteration 3B (GPT-5.3 Codex) — Implement DB module + migration runner + health check

## Intended model
**GPT-5.3 Codex (Primary Implementer)**

## Objective
Implement a reusable SQLite layer for TasteDeck:
- deterministic `open → migrate → ready` flow
- ordered, versioned migrations
- idempotent re-runs
- health check helper for “DB ready” gating
- lightweight logging for migration lifecycle

## Why this matters
TasteDeck is local-first. Every later feature (catalog, swipes, profile) depends on DB stability.
A robust migration runner prevents schema drift and unsafe upgrades.

## Scope
### In scope
- Add/confirm `expo-sqlite` dependency and runtime compatibility.
- Implement DB client module (singleton open).
- Implement migration registry (ordered list).
- Implement migration runner (transactional).
- Implement health check API (`SELECT 1`, simple PRAGMA read, etc.).
- Add at least one **smoke migration** that proves first-run init + rerun safety.

### Out of scope
- Creating the full table set (Iteration 04).
- Catalog import/seed (Iteration 06).
- Sync/backend (future).

## Multi-model execution strategy
- Codex does the implementation.
- If any design ambiguity remains, consult `docs/db/MIGRATIONS.md` from Subtask 3A.

## Implementation constraints / guidance
- Prefer async APIs (`openDatabaseAsync`, `execAsync`, `runAsync`, `getFirstAsync`).
- Avoid heavy synchronous DB work on JS thread unless necessary.
- Treat web support as “best effort” if enabled (expo-sqlite web is alpha and needs additional bundler/server headers).
- Migrations must be deterministic + idempotent:
  - strictly ordered numeric IDs,
  - do nothing if already at target version,
  - use transaction boundaries for multi-statement upgrades.

## Suggested folder structure (create if absent)
- `lib/db/client.ts` — open/close helpers + singleton
- `lib/db/migrations.ts` — ordered registry + target version
- `lib/db/runMigrations.ts` — runner logic
- `lib/db/health.ts` — readiness checks
- `lib/db/index.ts` — public exports
- `lib/db/logger.ts` (optional) — thin logging wrapper

If you choose different paths, document them in iteration notes.

## Migration registry design (example)
Implement a registry like:

- `DATABASE_VERSION = <number>`
- `migrations: Array<{ version: number; name: string; up: (db) => Promise<void> }>`

Rules:
- migrations sorted by `version`
- versions are integers (1..N)
- each `up` is deterministic SQL

## Migration versioning strategy
Follow the strategy decided in Subtask 3A.
If Subtask 3A chose PRAGMA:
- read: `PRAGMA user_version`
- write: `PRAGMA user_version = <DATABASE_VERSION>`

If Subtask 3A chose tracking table:
- create `schema_migrations` table in `001_init`
- insert executed migration IDs transactionally

## Migration runner requirements
- Read current version
- If already up to date: exit cleanly
- Otherwise:
  - run each needed migration in order
  - wrap in transaction
  - bump version after success
- Fail fast on error and surface clear logs

Transaction note:
- If using `withTransactionAsync`, ensure no other queries can run while migrations are executing.
- If you need exclusivity, consider `withExclusiveTransactionAsync` on native (not supported on web).

## Smoke migration (required)
Create `001_init` migration that:
- sets WAL journaling mode if desired
- creates a minimal “schema metadata” object (either PRAGMA bump or tracking table)
- creates a tiny table like `__healthcheck` (optional) or runs `SELECT 1`

The point is to prove:
- first app run executes migration
- second app run does not re-run or duplicate

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 6 (Data Model) and Iteration 03 spec
- `docs/db/MIGRATIONS.md` (from Subtask 3A)
- Iteration 04 spec (forward compatibility)

### Current repo anchors
- `package.json` (deps + scripts)
- `app/_layout.tsx` (startup boundary)
- `tsconfig.json` strict mode (Iteration 02 baseline)

### External troubleshooting and learning resources
- Expo SQLite docs (async APIs, provider, transactions, security notes, web setup)
- SQLite PRAGMA docs (`user_version`, journal modes, WAL)
- Community patterns: migration registries (Knex/TypeORM) for conceptual reference

YouTube search phrases:
- `expo sqlite openDatabaseAsync execAsync migrateDbIfNeeded`
- `sqlite pragma user_version migrations`

## Implementation checklist
- [ ] Add/confirm `expo-sqlite` installed via `npx expo install expo-sqlite` (or ensure package.json already has it)
- [ ] Implement `lib/db/client.ts` with `getDb()` / `openDb()` singleton
- [ ] Implement migration registry (`lib/db/migrations.ts`)
- [ ] Implement runner (`lib/db/runMigrations.ts`) with:
  - version read
  - ordered execution
  - transaction boundaries
  - clear logs
- [ ] Implement `healthCheck()` (`lib/db/health.ts`)
- [ ] Add smoke migration `001_init`
- [ ] Ensure rerun safety (no duplicate execution on second start)

## Deliverables
- DB module committed under `lib/db/*`
- Smoke migration works on fresh install + rerun
- Developer note: “How to add migration N+1” (link to `docs/db/MIGRATIONS.md`)

## Acceptance criteria
- Fresh install initializes DB automatically.
- Re-running init does not duplicate schema state.
- Migration order is deterministic across restarts.
- Failures surface actionable logs.

## Definition of done evidence
- Paste first-run log output showing migration executed.
- Paste second-run output showing no duplicate execution.
- Note the database version after init.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run start -- --clear`