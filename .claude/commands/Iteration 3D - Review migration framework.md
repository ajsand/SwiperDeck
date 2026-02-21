# Iteration 3D (Claude Opus 4.6) — Review migration framework + document “how to add migrations”

## Intended model
**Claude Opus 4.6 (Spec Enforcer / Reviewer / Documentation)**

## Objective
Review the implemented DB + migration framework and ensure it matches:
- Iteration 03 requirements
- TasteDeck CLAUDE.md principles (local-first, performance, deterministic updates)
- Forward compatibility with Iteration 04 table creation

Then produce concise developer documentation so future agents don’t drift.

## Why this matters
This is the “guardrail” step that prevents:
- duplicate migration engines being introduced later,
- broken iteration sequencing (Iteration 04+),
- unclear “how to add migration” workflows.

## Scope
### In scope
- Review DB module API shape and naming consistency.
- Confirm migration versioning strategy matches Subtask 3A.
- Validate idempotency, determinism, and ordering.
- Validate startup gating prevents DB reads before ready.
- Write/refresh developer docs (MIGRATIONS.md + short README note).

### Out of scope
- Writing new code (except doc tweaks or tiny fixes if absolutely required).
- Adding schema tables (Iteration 04).

## Review checklist (must pass)
### 1) Deterministic migration behavior
- Migrations run in numeric order
- Only run when needed
- Rerun safe (no duplication)

### 2) Transaction safety
- Migration runner uses transaction boundaries
- No other queries interleave during migration

### 3) Observability
- Clear logs: start, per-migration, success, failure
- Failure mode blocks app flows and shows actionable error UI

### 4) Forward compatibility
- Iteration 04 can add tables by creating migrations without changing the engine

### 5) Performance sanity
- No heavy synchronous DB work on JS thread during normal use
- Init happens once at startup; later work is incremental

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 6 (Data Model) and quality guardrails
- Iteration 03 spec
- `docs/db/MIGRATIONS.md` (decision memo)
- Iteration 04 spec (next step)

### Repo anchors to inspect
- `lib/db/client.ts`
- `lib/db/migrations.ts` (or equivalent)
- `lib/db/runMigrations.ts`
- `lib/db/health.ts`
- `app/_layout.tsx` init hook

### External references (when stuck)
- Expo SQLite docs: migration example + transaction notes + Provider usage
- SQLite PRAGMA docs: semantics of `user_version` if used
- Expo Router docs: root layout + splash wrapper guidance

## Required documentation updates
1) `docs/db/MIGRATIONS.md`
- Confirm strategy is clearly stated
- Confirm step-by-step recipe to add migration N+1 exists

2) README snippet (or `docs/CONTRIBUTING.md`)
- Add “DB workflow” section:
  - `npm run start -- --clear` for fresh DB
  - where migrations live
  - how to run checks

## Deliverables
- Review notes added to Iteration 03 execution log (or a short `docs/db/MIGRATIONS_REVIEW.md`)
- Updated `docs/db/MIGRATIONS.md`
- Short contributor note in README/CONTRIBUTING

## Acceptance criteria
- Another agent can add a migration in Iteration 04 by following docs with no questions.
- Migration engine is clearly “the one true system” (no duplicates).

## Validation checklist
- Confirm first-run init and second-run no-op behavior was evidenced by logs.
- Confirm no screen reads DB before init completes.