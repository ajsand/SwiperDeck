# Iteration 4B (GPT-5.3 Codex) — Implement base schema migration (tables + constraints + indexes)

## Intended model
**GPT-5.3 Codex (Primary Implementer)**

## Objective
Implement the **full v1 schema** from `CLAUDE.md` Section 6 as **one ordered migration** compatible with the Iteration 03 migration runner:
- Create tables
- Add constraints (PK/NOT NULL/CHECK/FK where safe)
- Create indexes with clear naming
- Keep SQL deterministic + idempotent

## Why this matters
This is the storage foundation for ranking, history, undo, profile, and snapshots. Any mismatch now creates compounding rework.

## Scope
### In scope
- Add one migration entry (e.g., `002_base_schema`) into the existing registry.
- Use deterministic SQL with explicit ordering.
- Ensure foreign key constraints are defined (and enforced by PRAGMA policy established in Iteration 03).
- Add indexes listed in Subtask 4A.

### Out of scope
- Seed/catalog import (Iteration 06)
- Ranking queries (Iterations 11–14)
- Visualization query tuning (Iteration 25)

## Inputs you MUST read first
- `iterations/04-subtasks/04A-schema-ddl-checklist-CLAUDE.md` (the checklist contract)
- `docs/db/MIGRATIONS.md` (migration rules + versioning strategy)
- Existing migration runner contract:
  - how it identifies schema version
  - whether it uses PRAGMA user_version or schema_migrations table
- Existing DB client PRAGMA behavior:
  - does it enable `PRAGMA foreign_keys=ON` at open?
  - does it set WAL journal mode?

## Implementation guidelines (SQLite specifics)
- Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` for idempotence.
- Ensure FK tables exist before referencing them.
- Use integer timestamps (epoch ms) as `INTEGER` columns.
- Remember SQLite uses type affinity; define columns with INTEGER/REAL/TEXT for clarity.
- Prefer explicit `CHECK(...)` constraints only where rules are stable.

## Suggested migration layout (single migration)
Inside the migration’s SQL (or per-statement list), group DDL blocks:

1) Catalog tables
2) Session + event tables
3) Affinity/state tables
4) Snapshot tables
5) Index declarations

Add comments above each block mapping it to product needs.

## Required DDL targets (must match Subtask 4A)
- catalog_entities
- swipe_sessions
- swipe_events
- taste_tag_scores
- taste_type_scores
- entity_affinity
- profile_snapshots
Plus all indexes chosen in Subtask 4A.

## Constraints policy
- Enforce these now:
  - PKs and NOT NULLs where specified
  - CHECK on popularity range
  - CHECK on swipe_events.action enum
  - FK(session_id → swipe_sessions.id)
  - FK(entity_id → catalog_entities.id)
- Any uncertain constraints should be noted in migration comments as “deferred”.

## Foreign key enforcement
If Iteration 03 did NOT already enable FK enforcement consistently:
- Add a connection init step (preferred in DB client, not in migration).
- Avoid relying on “one-time PRAGMA” inside migration if the app can open new connections later.

## Deliverables
- One migration committed and registered correctly.
- DDL comments mapping tables to app features.
- Index names consistent and stable.

## Acceptance criteria
- Running migrations on a clean DB produces all tables + indexes.
- Re-running migrations does not duplicate or error.
- FK constraints are present in schema metadata.
- Index metadata shows expected indexes exist.

## Definition of done evidence
- Provide introspection output (via 4C scripts/tests):
  - list of tables created
  - list of indexes created per table
  - FK list for swipe_events (and entity_affinity if applicable)

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run start -- --clear`
- Run the schema verification checks added in Subtask 4C (script or tests).