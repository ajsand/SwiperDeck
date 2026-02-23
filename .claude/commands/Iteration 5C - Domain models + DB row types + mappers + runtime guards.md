# Iteration 5C (GPT-5.3 Codex) — Domain models + DB row types + row↔domain mappers + runtime guards/parsers

## Intended model
**GPT-5.3 Codex (Primary Implementer)**

## Objective
Create canonical TypeScript domain models that mirror the SQLite schema (Iteration 04), plus boundary mapping and runtime-safe parsers so:
- DB boundary code consumes/produces strongly-typed rows
- app logic/UI uses stable domain models
- untrusted JSON/rows cannot silently corrupt state

## Why this matters
This prevents data-shape drift and makes later iterations (catalog import, swipes, scoring, ranking, snapshots) safer and faster to implement.

## Scope
### In scope
- Define **Row types** (snake_case, table columns) for all Iteration 04 tables.
- Define **Domain types** for app usage.
- Implement row→domain mappers (and domain→row where needed).
- Implement safe JSON parsing for JSON-string columns:
  - `tags_json`, `filters_json`, `top_tags_json`, `top_types_json`, `summary_json`
- Implement runtime guards/parsers:
  - action parsing via `types/domain/actions.ts`
  - JSON parsing with fallback behavior
  - optionally Zod/Valibot schemas if chosen in 5A

### Out of scope
- Ranking/scoring logic (later)
- UI rendering (later)
- Remote sync serialization (future)

## Inputs you MUST read first
- `iterations/05-subtasks/05A-domain-type-plan-and-schema-fidelity-CLAUDE.md`
- Iteration 04 schema (actual migration SQL + schema checks)
- `types/domain/actions.ts` from Subtask 5B

## Suggested file structure
- `types/domain/ids.ts` (optional branded IDs)
- `types/domain/catalog.ts`
- `types/domain/swipes.ts`
- `types/domain/scores.ts`
- `types/domain/snapshots.ts`
- `types/domain/parsers.ts`
- `types/domain/index.ts`

## Schema fidelity rule
Every SQLite table/column from Iteration 04 must have:
- Row type with exact column names
- Domain type (may rename fields ONLY if mapper exists and it’s justified)
Prefer minimal transformation: the less mapping, the less drift.

## Mapping rules (recommended)
### Timestamps
- Store as `INTEGER` epoch ms in DB → `number` in domain.
- Do not use `Date` objects in domain unless you’re consistent everywhere.

### JSON columns
- DB stores TEXT JSON.
- Domain stores parsed structures:
  - tags: `string[]`
  - filters: `Record<string, unknown>` or a typed filter object
  - snapshot payloads: typed summary objects (even if v1 uses `unknown`)

Implement safe parse:
- `safeJsonParse<T>(text: string, fallback: T): T`
- if parse fails: fallback + optionally log in dev

### Numeric columns
- SQLite may return numbers as JS `number`.
- Keep types as `number` (not `bigint`) unless needed.
- `popularity` should be `number` with 0..1 (enforced via schema CHECK).

## Required types (must cover all v1 tables)
- catalog_entities: `CatalogEntityRow`, `CatalogEntity`
- swipe_sessions: `SwipeSessionRow`, `SwipeSession`
- swipe_events: `SwipeEventRow`, `SwipeEvent`
- taste_tag_scores: `TasteTagScoreRow`, `TasteTagScore`
- taste_type_scores: `TasteTypeScoreRow`, `TasteTypeScore`
- entity_affinity: `EntityAffinityRow`, `EntityAffinity`
- profile_snapshots: `ProfileSnapshotRow`, `ProfileSnapshot`

## Runtime validation approach
Use the choice recorded in 5A:
- If “no dep”: implement small guards manually for unions/arrays.
- If Zod: define schemas and `.safeParse` at untrusted boundaries.
  - Docs: https://zod.dev/
- If Valibot: define schemas and validate at boundaries.
  - Docs: https://valibot.dev/

Guideline: validate ONLY untrusted inputs:
- bundled catalog JSON (Iteration 06)
- action strings coming from unknown sources
- DB rows if there’s any chance of legacy/corruption

## Deliverables
- Canonical domain typing modules committed.
- Row↔domain mapping helpers committed.
- At least one DB read or write boundary updated to use Row types + mappers (proof of adoption).

## Acceptance criteria
- No duplicate ad-hoc interfaces for these entities remain in code.
- Typecheck fails when a DB row is missing a required field.
- JSON parsing never throws in production paths (fallback or explicit error).

## Validation commands
- `npm run typecheck`
- `npm run lint`

## External references (when stuck)
TypeScript official:
- Narrowing/type guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Utility types: https://www.typescriptlang.org/docs/handbook/utility-types.html
Expo TS guide:
- https://docs.expo.dev/guides/typescript/
Runtime schema validation:
- Zod: https://zod.dev/
- Valibot: https://valibot.dev/
React+TS troubleshooting:
- https://react-typescript-cheatsheet.netlify.app/docs/basic/troubleshooting/types