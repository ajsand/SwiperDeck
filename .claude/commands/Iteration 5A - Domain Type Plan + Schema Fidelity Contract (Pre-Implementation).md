# Iteration 5A (Claude Opus 4.6) — Domain Type Plan + Schema Fidelity Contract (Pre-Implementation)

## Intended model
**Claude Opus 4.6 (Orchestrator / Spec alignment / Preflight checklist)**

## Objective
Produce a **Codex-ready contract** for Iteration 05 that:
1) Defines the **canonical domain vocabulary** (IDs, actions, table-shaped types, JSON columns)
2) Ensures 1:1 **schema fidelity** with the actual SQLite schema created in Iteration 04
3) Specifies file structure and import rules so later iterations don’t duplicate types

This subtask is “plan-first”: it prevents drift before code is written.

## Why this matters
Typed domain models are the app’s shared language. If names/actions/nullability diverge between DB, ranking, and UI, bugs become subtle and expensive.

## Scope
### In scope
- Define canonical type/module boundaries:
  - “DB Row” types (snake_case, mirrors SQLite columns)
  - “Domain” types (app vocabulary, minimal transformations)
  - “Boundary mappers/parsers” (row ↔ domain; JSON parse; runtime guards)
- Resolve the canonical swipe actions vs prior doc drift.
- Provide a “schema-to-type mapping matrix” for each table.

### Out of scope
- Writing TypeScript implementation (Codex does 5B/5C)
- Refactoring large swaths of UI (only update the minimum number of imports to prove usage)

## Pre-reads (repo)
- `CLAUDE.md` Section 6 (schema intent) and action list (core + optional)
- Iteration 04 migration SQL + schema verification output (the real source of truth)
- Iteration 03 migration runner rules (`docs/db/MIGRATIONS.md`)
- Any existing `types/` or `lib/` conventions (do not create parallel patterns)

## Canonical action decision (IMPORTANT)
There is potential drift across docs:
- Some text uses `love`
- Some iteration notes mention `hard_yes`

**Rule:** The canonical persisted action values must match the SQLite schema created in Iteration 04.
- If DB `swipe_events.action` CHECK constraint includes `love`, then canonical includes `love`.
- If it includes `hard_yes`, then canonical includes `hard_yes`.

**Compatibility strategy (recommended):**
- Canonical: match DB exactly.
- Parser: accept legacy aliases (e.g., treat `hard_yes` as `love`) and normalize to canonical on ingestion.

Also decide whether optional actions (`respect`, `curious`) are included in the canonical union now:
- Recommended: define `SwipeAction` = full set in DB (including optional)
- Define `CoreSwipeAction` = the 5-state actions used in Phase 1 UI

## File layout contract (recommended)
Prefer a single central domain typing area:

- `types/domain/actions.ts` — canonical action values, labels, weights, helpers
- `types/domain/ids.ts` — branded IDs (EntityId/SessionId/SwipeEventId/SnapshotId)
- `types/domain/catalog.ts` — entity types (+ DB row type)
- `types/domain/swipes.ts` — sessions/events types (+ DB row types)
- `types/domain/scores.ts` — taste_tag_scores / taste_type_scores / entity_affinity
- `types/domain/snapshots.ts` — profile_snapshots (+ timeline point helper)
- `types/domain/parsers.ts` — JSON parsing + runtime guards
- `types/domain/index.ts` — barrel exports

If the repo already uses `src/` or `lib/`, mirror that convention instead.

## Schema-to-type mapping matrix (fill from Iteration 04 output)
For each table, create:
- `XRow` type: matches DB columns exactly
- `X` domain type: what the app uses
- Mapping rules:
  - JSON columns: `tags_json`, `filters_json`, `top_tags_json`, `top_types_json`, `summary_json`
  - timestamps: INTEGER epoch ms -> `number`

Example template (repeat for each table):
- `catalog_entities`
  - Row: `CatalogEntityRow`
  - Domain: `CatalogEntity`
  - JSON rules: `tags_json` => `string[]` (safe parse w/ fallback)
- `swipe_events`
  - Row: `SwipeEventRow`
  - Domain: `SwipeEvent`
  - Normalize `action` via parser
- etc.

## Runtime validation choice (record decision)
Pick one:
- **No dependency**: handwritten guards for small unions and JSON parsing
- **Zod** (heavier, popular): https://zod.dev/
- **Valibot** (lighter, modular): https://valibot.dev/

**Guideline:** For RN/Expo bundle size, Valibot may be preferable, but either is acceptable if already in repo.
If adding a new dep, keep usage minimal: only validate untrusted inputs (seed JSON, unknown DB rows), not every internal object.

## Deliverables
- This file committed as the “Codex-ready plan”
- A short “Decisions” section at bottom listing:
  - canonical action set (exact strings)
  - alias normalization rules (if any)
  - chosen runtime validation approach
  - file paths where canonical types live

## Acceptance criteria
- Codex can implement without guessing action strings, row shapes, or module paths.
- Iteration 06 (catalog import) can reuse the same types/parsers with no new shapes.

## Validation checklist
- Confirm action values match actual Iteration 04 DB constraint.
- Confirm all schema tables have a planned Row + Domain type.
- Confirm JSON columns have a safe parsing strategy.

## External references (when stuck)
TypeScript official:
- Narrowing / type guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html
- Enums (and why unions/const objects often win for persisted strings): https://www.typescriptlang.org/docs/handbook/enums.html
Const assertions (`as const`) background:
- TS 3.4 release notes (const assertions): https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
Expo TS guidance:
- Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
Runtime validation:
- Zod: https://zod.dev/
- Valibot: https://valibot.dev/
Exhaustive handling tooling:
- typescript-eslint `switch-exhaustiveness-check`: https://typescript-eslint.io/rules/switch-exhaustiveness-check/