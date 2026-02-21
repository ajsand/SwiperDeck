# Iteration 3A (Claude Opus 4.6) — Choose migration versioning strategy (table vs PRAGMA)

## Intended model
**Claude Opus 4.6 (Orchestrator / Architecture Decision Maker)**

## Objective
Choose and document a single, consistent migration versioning strategy for TasteDeck’s local SQLite database:
- **Option A:** `PRAGMA user_version` (single integer schema version)
- **Option B:** `schema_migrations` tracking table (per-migration rows)

This decision must be made **before** implementing the migration runner so Iteration 04 can safely add tables without refactoring.

## Why this matters
SQLite schema evolution is inevitable (new tables, indexes, columns). A deterministic migration framework prevents:
- schema drift between devices,
- corrupted partial upgrades,
- “works on my phone” storage bugs,
- costly refactors when the schema grows.

## Scope
### In scope
- Evaluate the two strategies against TasteDeck requirements (local-first, Expo runtime).
- Decide on **one** strategy.
- Produce a short **Decision Memo** (1–2 pages max) committed into the repo.

### Out of scope
- Implementing the migration runner (Subtask 3B).
- Wiring startup hook (Subtask 3C).
- Creating the full table set (Iteration 04).

## Decision criteria (use these to choose)
Evaluate each strategy on:

1) **Simplicity / reliability**
- How easy is it to implement correctly with Expo SQLite async APIs?
- How hard is it to keep deterministic?

2) **Extensibility**
- Can we add migrations 6 months later without pain?
- Can we track partial progress if a migration fails?

3) **Debuggability**
- Can we tell what version a user is on, and why?

4) **Platform constraints**
- Does it work on iOS/Android reliably?
- What about web support (alpha for expo-sqlite)?

5) **Iteration roadmap fit**
- Iteration 04 adds many tables.
- Iteration 06 loads a starter catalog.
- Iteration 18 adds snapshots jobs.

## Recommendation template (fill this out)
Create `docs/db/MIGRATIONS.md` with:

### 1) Chosen strategy
- Decision: PRAGMA user_version OR schema_migrations table
- Rationale summary (3–6 bullets)

### 2) Migration file/registry format
Define:
- Migration ID format: `001_init`, `002_add_indexes`, etc.
- Where migrations live (e.g., `lib/db/migrations/` or `lib/db/migrations.ts`)
- How they register (array registry, map, or file-per-migration)

### 3) Execution guarantees
Define:
- Run order (sorted by numeric id)
- Idempotency policy (IF NOT EXISTS, guard clauses, version checks)
- Transaction policy (exclusive vs non-exclusive)
- Logging policy (start/success/failure)

### 4) Version bump rules
Define:
- When to update the target version constant
- How to ensure old installs are upgraded correctly

### 5) How to add a migration N+1 (developer recipe)
Include exact steps (copy/paste style):
1. Create migration entry
2. Register it
3. Run app with `--clear` or equivalent
4. Verify version updated

## Default suggestion (if no strong preference emerges)
Use **PRAGMA user_version** if:
- You want the smallest, least-bug-prone approach,
- You’ll run migrations at startup before any other DB queries,
- You’re okay with a single “schema version” integer rather than a per-migration ledger.

Use a **schema_migrations table** if:
- You want a persistent ledger of executed migrations,
- You anticipate complex branching or partial migration debugging.

## Repo anchors (read before deciding)
- `CLAUDE.md` Section 6 (Data Model)
- Iteration 03 and Iteration 04 task specs (forward compatibility)
- `app/_layout.tsx` (startup boundary)
- Any existing `lib/db/*` scaffolding (if already created)

## External references (when stuck)
- Expo SQLite docs: migration example using `PRAGMA user_version`
- SQLite PRAGMA reference: what `user_version` is
- Expo Router root-layout constraints (avoid returning `null` from root; use splash screen gating)

YouTube / walkthrough search phrases:
- `expo sqlite migrateDbIfNeeded pragma user_version`
- `expo router splash screen preventAutoHideAsync initialization`

## Deliverables
- `docs/db/MIGRATIONS.md` committed, containing:
  - Chosen strategy + rationale
  - Migration registry format
  - How to add migration N+1 recipe
- Decision summary in Iteration notes (bulleted)

## Acceptance criteria
- A future implementer can build the migration runner without ambiguity.
- Iteration 04 can create tables without changing the migration approach.

## Validation checklist
- Ensure the decision memo is consistent with:
  - local-first + offline constraints
  - Expo SQLite async APIs
  - TasteDeck “compute-first” philosophy (no network dependency)