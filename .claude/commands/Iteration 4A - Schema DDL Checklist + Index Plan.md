# Iteration 4A (Claude Opus 4.6) — Schema DDL Checklist + Index Plan (Pre-Implementation)

## Intended model
**Claude Opus 4.6 (Orchestrator / Spec alignment / Preflight checklist)**

## Objective
Before any SQL is written, produce a **complete, unambiguous checklist** of:
1) Required tables and columns (v1 schema from `CLAUDE.md` Section 6)
2) Required constraints (PK/FK/NOT NULL/CHECK/defaults) where clearly implied
3) Required indexes (high-value + low-risk) tied to expected query patterns
4) Naming conventions for tables/indexes that Iteration 05 typed models can mirror 1:1

This file is the “Codex-ready contract” for Subtask 4B and 4C.

## Why this matters
If the DDL drifts from the spec now, later iterations (ranking, history, undo, profile) will accumulate fragile workarounds and performance regressions. This is the single best time to catch naming/constraint/index mistakes.

## Scope
### In scope
- Translate `CLAUDE.md` Section 6 into an explicit “must create” checklist.
- Identify which foreign keys are safe to enforce now and which should be deferred.
- Define the minimal index set that supports Iterations 07–19 without over-indexing writes.
- Define the migration boundaries: “one migration to create base schema” vs “split across multiple migrations”.

### Out of scope
- Writing the actual migration code (Codex does 4B).
- Deep query plan tuning beyond obvious indexes (Iteration 25 can optimize).

## Pre-reads (repo)
- `CLAUDE.md` Section 6 (tables + columns)
- Iteration 03 migration framework docs (`docs/db/MIGRATIONS.md`)
- Iteration 04 spec (this file)
- Existing DB module and migration runner:
  - `lib/db/migrations.*`
  - `lib/db/runMigrations.*`
  - `lib/db/client.*`

## External references (first-stop when uncertain)
Official docs (preferred):
- SQLite `CREATE TABLE` (constraints: NOT NULL/CHECK/PK/FK)
- SQLite `CREATE INDEX` (composite indexes, IF NOT EXISTS)
- SQLite foreign keys (enforcement is OFF by default; must be enabled)
- SQLite type affinity (INTEGER/REAL/TEXT behavior)
- `EXPLAIN QUERY PLAN` (confirm index usage)
- Expo SQLite docs (PRAGMAs like `foreign_keys=ON`, WAL suggestions, async APIs)

Indexing fundamentals (secondary):
- Use The Index, Luke (SQLite execution plans + column order intuition)
- High Performance SQLite resources

## Required schema (MUST MATCH `CLAUDE.md` Section 6)

### Table: `catalog_entities`
Columns:
- id TEXT PRIMARY KEY
- type TEXT NOT NULL
- title TEXT NOT NULL
- subtitle TEXT NOT NULL
- description_short TEXT NOT NULL
- tags_json TEXT NOT NULL  -- JSON array string
- popularity REAL NOT NULL  -- 0..1
- tile_key TEXT NOT NULL
- image_url TEXT NULL
- updated_at INTEGER NOT NULL

Constraints:
- CHECK(popularity BETWEEN 0 AND 1)  (safe, explicit)
- Consider CHECK(type IN (...)) only if you have a fixed enum list now; otherwise defer.

Indexes:
- idx_catalog_entities_type ON catalog_entities(type)
- idx_catalog_entities_popularity ON catalog_entities(popularity DESC)
- Optional: idx_catalog_entities_title ON catalog_entities(title)

### Table: `swipe_sessions`
Columns:
- id TEXT PRIMARY KEY
- started_at INTEGER NOT NULL
- ended_at INTEGER NULL
- filters_json TEXT NOT NULL  -- JSON object/string

Constraints:
- CHECK(ended_at IS NULL OR ended_at >= started_at)  (safe)

Indexes:
- idx_swipe_sessions_started_at ON swipe_sessions(started_at DESC)

### Table: `swipe_events`
Columns:
- id TEXT PRIMARY KEY
- session_id TEXT NOT NULL
- entity_id TEXT NOT NULL
- action TEXT NOT NULL  -- hard_no, no, skip, yes, love, respect, curious
- strength INTEGER NOT NULL
- created_at INTEGER NOT NULL

Constraints:
- CHECK(action IN ('hard_no','no','skip','yes','love','respect','curious'))
- CHECK(strength BETWEEN -2 AND 2)   (if you keep integer-only in v1)
- Foreign keys:
  - FK(session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE (recommended)
  - FK(entity_id) REFERENCES catalog_entities(id) ON DELETE CASCADE/RESTRICT (choose)
Notes:
- If you choose ON DELETE CASCADE for entity_id, deleting catalog rows can wipe events. Consider RESTRICT unless you plan to delete catalog entities.

Indexes (high value):
- idx_swipe_events_created_at ON swipe_events(created_at DESC)
- idx_swipe_events_session_id ON swipe_events(session_id)
- idx_swipe_events_entity_id ON swipe_events(entity_id)
Recommended composite candidates (pick only if you expect these patterns soon):
- idx_swipe_events_session_created ON swipe_events(session_id, created_at DESC)
- idx_swipe_events_entity_created ON swipe_events(entity_id, created_at DESC)

### Table: `taste_tag_scores`
Columns:
- tag TEXT PRIMARY KEY
- score REAL NOT NULL
- pos REAL NOT NULL
- neg REAL NOT NULL
- last_updated INTEGER NOT NULL

Constraints:
- CHECK(pos >= 0 AND neg >= 0)  (safe)
- Optionally CHECK(score = pos - neg) (may be too strict if scoring evolves; defer if uncertain)

Indexes:
- idx_taste_tag_scores_score ON taste_tag_scores(score DESC)
- idx_taste_tag_scores_last_updated ON taste_tag_scores(last_updated DESC)

### Table: `taste_type_scores`
Columns:
- type TEXT PRIMARY KEY
- score REAL NOT NULL
- pos REAL NOT NULL
- neg REAL NOT NULL
- last_updated INTEGER NOT NULL

Indexes:
- idx_taste_type_scores_score ON taste_type_scores(score DESC)
- idx_taste_type_scores_last_updated ON taste_type_scores(last_updated DESC)

### Table: `entity_affinity`
Columns:
- entity_id TEXT PRIMARY KEY
- score REAL NOT NULL
- pos REAL NOT NULL
- neg REAL NOT NULL
- last_updated INTEGER NOT NULL

Constraints:
- FK(entity_id) REFERENCES catalog_entities(id) ON DELETE CASCADE/RESTRICT (choose)
Indexes:
- idx_entity_affinity_score ON entity_affinity(score DESC)
- idx_entity_affinity_last_updated ON entity_affinity(last_updated DESC)

### Table: `profile_snapshots`
Columns:
- id TEXT PRIMARY KEY
- created_at INTEGER NOT NULL
- top_tags_json TEXT NOT NULL
- top_types_json TEXT NOT NULL
- summary_json TEXT NOT NULL

Indexes:
- idx_profile_snapshots_created_at ON profile_snapshots(created_at DESC)

## Foreign key enforcement requirement (SQLite)
SQLite foreign key enforcement is commonly **off by default** and must be enabled (typically via `PRAGMA foreign_keys=ON`) on the connection lifecycle. Confirm Iteration 03 DB client does this consistently.

## Migration shape recommendation
Prefer **one migration** like `002_base_schema` that:
1) Enables or assumes PRAGMAs (foreign_keys, WAL if you use it elsewhere)
2) Creates tables in dependency order (catalog → sessions → events → scores → snapshots)
3) Creates indexes after tables
4) Uses deterministic names and `IF NOT EXISTS` to preserve idempotence

## Deliverable (Checklist Output)
Produce and commit a checklist in this file:
- [ ] Table list matches spec (7 tables)
- [ ] Column list matches spec (names + types)
- [ ] Required constraints defined (PK/NOT NULL/CHECK + safe FKs)
- [ ] Index list defined with 1-line rationale each
- [ ] Notes list: any deferred constraints or indexes + why

## Acceptance criteria
- Codex can implement 4B without guessing table/column names.
- Iteration 05 can mirror schema 1:1 in TS types without ambiguity.