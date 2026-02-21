# Iteration 4: Create base database schema tables and indexes

## Objective
Implement the full v1 relational schema defined in `CLAUDE.md` Section 6, including core domain tables, affinity/profile tables, session/event logs, and supporting indexes needed for ranking and analytics reads.

## Why this matters
This iteration is the storage foundation for all subsequent behavior (ranking, swiping history, profile evolution, undo, and visualization features). If table shape, constraints, or index strategy are wrong now, later iterations will accumulate fragile workarounds and performance regressions.

## Scope
### In scope
- Create normalized v1 tables specified in `CLAUDE.md` (catalog entities, swipe/session tracking, affinity/profile state, snapshots).
- Add pragmatic indexes for frequent read/write patterns expected by upcoming iterations.
- Apply foreign key constraints and `NOT NULL`/`CHECK` constraints where they are clearly implied by the domain.
- Ensure migration SQL is deterministic and compatible with Iteration 03 migration runner.
- Add schema introspection checks to confirm tables/indexes exist as intended.

### Out of scope
- Advanced query-plan tuning beyond obvious high-value indexes.
- Data import/seed logic (Iteration 06).
- Ranking formula implementation (Iterations 11–14).
- Profile visualization queries (Iterations 17–19).

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Review schema DDL against CLAUDE.md Section 6 before implementation | **Claude** | Ensure table/column/index alignment with spec |
| Implement migration SQL with tables, indexes, constraints | **Codex** | Primary implementation of schema DDL |
| Add schema introspection checks and tests | **Codex** | Verification code is implementation work |

### Notes
- **Claude first**: Claude should verify the schema design against `CLAUDE.md` Section 6 and produce a checklist of required tables/columns/indexes before Codex implements.
- Gemini is not needed (no spatial/UI work).

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 6 (data model + schema intent), and any naming conventions used there.
- `iterations/03-create-sqlite-initialization-and-migration-framework.md` (migration runner contract you must plug into).
- `iterations/05-add-typed-domain-models.md` (upcoming typed model alignment; choose names/types that are TS-friendly).
- `iterations/README.md` for sequencing expectations.

### Current repo implementation anchors
- `lib/db/migrations.ts` (or equivalent from Iteration 03): add next ordered migration entry.
- `lib/db/runMigrations.ts` (or equivalent): confirm migration id/version ordering assumptions.
- Existing DB helper utilities in `lib/db/` (transaction wrappers, open client helpers, pragma helpers).
- `package.json` scripts used for validation (schema checks, typecheck).

If the Iteration 03 implementation used different file paths, follow that established pattern instead of introducing a parallel framework.

### Suggested schema organization approach
Keep schema readable by grouping DDL in logical blocks inside the migration SQL:
1. Catalog/master entity tables
2. Session + swipe event tables
3. Affinity/profile state tables
4. Snapshot/history tables
5. Index declarations

Use comments above each block to map it back to product capabilities (deck rendering, ranking reads, profile timeline, etc.).

### External troubleshooting and learning resources
#### Official docs
- SQLite docs landing page: https://www.sqlite.org/docs.html
- SQLite `CREATE TABLE` reference: https://www.sqlite.org/lang_createtable.html
- SQLite `CREATE INDEX` reference: https://www.sqlite.org/lang_createindex.html
- SQLite foreign key docs: https://www.sqlite.org/foreignkeys.html
- SQLite datatype rules/affinity: https://www.sqlite.org/datatype3.html
- SQLite query planner overview: https://www.sqlite.org/optoverview.html
- SQLite `EXPLAIN QUERY PLAN`: https://www.sqlite.org/eqp.html
- Expo SQLite API docs (runtime behavior constraints): https://docs.expo.dev/versions/latest/sdk/sqlite/

#### Step-by-step guides and practical references
- SQLBolt interactive SQL/index refreshers: https://sqlbolt.com/
- SQLite Tutorial (tables, indexes, constraints): https://www.sqlitetutorial.net/
- Use The Index, Luke! (indexing fundamentals, composite index intuition): https://use-the-index-luke.com/
- High Performance SQLite resources (query/index mental model): https://highperformancesqlite.com/

#### YouTube tutorials
- Hussein Nasser (DB indexing/query planner intuition): https://www.youtube.com/@hnasr
- Fireship SQL/SQLite quick refreshers: https://www.youtube.com/@Fireship
- freeCodeCamp SQL full courses (constraint/index fundamentals): https://www.youtube.com/@freecodecamp
- Search phrase for targeted help: `SQLite schema design foreign keys composite indexes mobile app`

#### Other GitHub repos to reference
- Expo SQLite package source/examples: https://github.com/expo/expo/tree/main/packages/expo-sqlite
- PocketBase schema/migration examples (SQLite-heavy patterns): https://github.com/pocketbase/pocketbase
- TypeORM migration examples (ordered SQL migrations pattern): https://github.com/typeorm/typeorm/tree/master/test/functional/migrations
- Prisma SQLite schema examples (domain modeling ideas): https://github.com/prisma/prisma-examples

#### Stack Overflow and discussion boards
- Stack Overflow `sqlite` tag: https://stackoverflow.com/questions/tagged/sqlite
- Stack Overflow `database-design` tag: https://stackoverflow.com/questions/tagged/database-design
- Stack Overflow `expo-sqlite` tag: https://stackoverflow.com/questions/tagged/expo-sqlite
- SQLite forum: https://sqlite.org/forum/
- DBA Stack Exchange (schema/index design discussions): https://dba.stackexchange.com/
- Expo discussions: https://github.com/expo/expo/discussions

#### Books and long-form references
- *SQL Antipatterns* by Bill Karwin: https://pragprog.com/titles/bksap1/sql-antipatterns-volume-1/
- *Designing Data-Intensive Applications* by Martin Kleppmann: https://dataintensive.net/
- *High Performance SQLite* by Aaron Francis: https://highperformancesqlite.com/
- *Using SQLite* by Jay A. Kreibich: https://www.oreilly.com/library/view/using-sqlite/9781449394592/

### When stuck
- Start from access patterns, not table-first intuition: identify expected reads/writes from Iterations 07–19, then shape indexes accordingly.
- Use conservative constraints: strict enough to protect integrity, but avoid premature over-constraint that blocks legitimate product behavior.
- Prefer explicit naming (`*_id`, `created_at`, `updated_at`, `session_id`, `entity_id`) to reduce ambiguity for Iteration 05 typed models.
- For uncertain index decisions, create only clearly justified indexes now and note candidates for later query-plan verification.
- Keep migration idempotence and determinism first; avoid runtime-generated DDL.

## Implementation checklist
- [ ] Add next migration file/entry for v1 base schema creation.
- [ ] Create required core tables from `CLAUDE.md` Section 6 (catalog, sessions, swipes, affinity/profile, snapshots).
- [ ] Add primary keys and foreign keys consistent with entity relationships.
- [ ] Add `NOT NULL`, default values, and `CHECK` constraints where domain rules are explicit.
- [ ] Add high-value indexes for:
  - [ ] swipe lookup by `session_id`, `entity_id`, and chronological fields
  - [ ] candidate/ranking reads (state/action filters + score/sort keys)
  - [ ] snapshot/history retrieval by profile/session + time
- [ ] Add schema verification checks (table/index existence introspection).
- [ ] Add concise migration comments mapping schema groups to product features.

## Deliverables
- Migration SQL (or migration registry entry) that creates full v1 base schema.
- Index set that supports upcoming ranking/profile iterations without over-indexing writes.
- Developer-facing schema notes/comments tying tables to domain behavior.

## Acceptance criteria
- All required v1 tables are created after running migrations on a clean DB.
- Foreign keys and key constraints are active and valid.
- Required indexes are present in SQLite metadata and named consistently.
- Basic CRUD smoke path works for each table category (catalog/session/swipe/affinity/snapshot).
- Schema naming is consistent with planned TypeScript domain models in Iteration 05.

### Definition of done evidence
- Provide SQL introspection output in execution notes (examples: `sqlite_master`, pragma table/index lists).
- Document each created index with one-line rationale tied to an expected query pattern.
- List any deferred index candidates and why they were postponed.

## Validation commands
- `npm test -- schema`
- `npm run typecheck`

## Notes for next iteration
Iteration 05 should mirror this schema 1:1 in typed domain models. If any naming ambiguity remains (especially around affinity and snapshot semantics), resolve it now or leave explicit notes in migration comments so model typing does not drift.
