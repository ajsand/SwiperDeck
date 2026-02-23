# Iteration 5D (Claude Opus 4.6) — Review type completeness + drift prevention + docs handoff

## Intended model
**Claude Opus 4.6 (Reviewer / Spec enforcer / Documentation)**

## Objective
Review the implemented domain types (5B/5C) to ensure:
- schema fidelity with Iteration 04 (no missing columns)
- canonical action set matches DB constraint
- weights/labels/mappers are exhaustive and centralized
- boundary parsing strategy is safe and consistent
Then produce a short “how to use domain types” doc for later iterations.

## Why this matters
Iteration 05 is the last cheap point to prevent long-term drift. Once ranking/UI logic grows, duplicate shapes become extremely costly.

## Scope
### In scope
- Compare Row types to Iteration 04 schema output (tables + columns).
- Confirm no duplicate swipe action definitions remain.
- Confirm action-to-weight map is exhaustive (compile-time).
- Confirm JSON parsing strategy is consistent across modules.
- Add documentation for imports and extension patterns.

### Out of scope
- Writing ranking logic
- UI feature changes beyond minimal import cleanup

## Review checklist (must pass)
### 1) Schema fidelity
- Every table has Row + Domain types.
- Row types match DB column names exactly (snake_case).
- JSON columns have safe parse helpers and do not throw.

### 2) Canonical actions
- Action union matches DB CHECK constraint list exactly.
- If there were legacy aliases, normalization rules are explicit and tested.

### 3) Exhaustive mappings
- Weights and labels cover all SwipeAction values.
- Any switch on SwipeAction is exhaustive (prefer no `default`).
- Optional: ensure ESLint rule `switch-exhaustiveness-check` is enabled (if appropriate).

### 4) Boundary mappers
- There is a clear boundary layer:
  - DB row types do not leak into UI
  - Domain types are used by scoring/ranking/UI

## Documentation deliverable
Create `docs/domain/DOMAIN_TYPES.md` with:
- Where canonical types live (paths)
- Import examples (actions/entities/events)
- How to add a new action safely (steps)
- How to add a new DB column safely (schema → row type → mapper → domain type)

## Acceptance criteria
- Iteration 06 (catalog import) can use the catalog types + JSON parsers directly.
- Any future change to actions forces updating weights + labels at compile-time.

## Validation checklist
- Run:
  - `npm run typecheck`
  - `npm run lint`
- Spot-check at least one DB boundary file uses shared Row types and mappers.

## External references (when stuck)
- TS type guards/narrowing: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TS enums (tradeoffs vs unions): https://www.typescriptlang.org/docs/handbook/enums.html
- `as const` background: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
- Exhaustiveness lint rule: https://typescript-eslint.io/rules/switch-exhaustiveness-check/
- Zod: https://zod.dev/
- Valibot: https://valibot.dev/