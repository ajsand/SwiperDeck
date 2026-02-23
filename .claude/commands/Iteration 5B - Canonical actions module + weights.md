# Iteration 5B (GPT-5.3 Codex) — Canonical actions module + weights with exhaustive compile-time checks

## Intended model
**GPT-5.3 Codex (Primary Implementer)**

## Objective
Implement the canonical swipe action definitions used everywhere in TasteDeck:
- canonical action strings (must match DB)
- labels/metadata for UI
- action-to-weight constants in one place
- helpers: predicates/parsers/normalizers
- compile-time exhaustiveness: adding an action forces updating weights/labels

## Why this matters
Actions are the “atoms” of the recommendation system. If action strings drift (e.g., `hard_no` vs `hardNo`), you’ll corrupt scoring, ranking, history, and analytics.

## Scope
### In scope
- Create `types/domain/actions.ts` (and `types/domain/index.ts` barrel export if needed)
- Define:
  - `SwipeAction` union (full set matching DB CHECK constraint)
  - `CoreSwipeAction` union (Phase 1 five-state)
  - UI label map for both (if needed)
  - `ACTION_WEIGHTS` mapping with exhaustive typing
- Provide runtime helpers:
  - `isSwipeAction(x: unknown): x is SwipeAction`
  - `parseSwipeAction(x: unknown): SwipeAction | null` (or throws)
  - Optional: `normalizeSwipeAction(x: unknown): SwipeAction` accepting legacy aliases

### Out of scope
- Implementing ranking/updates logic (later iterations)
- Creating DB queries (only types/helpers)

## Inputs you MUST read first
- `iterations/05-subtasks/05A-domain-type-plan-and-schema-fidelity-CLAUDE.md`
- Iteration 04 DDL / constraint list for `swipe_events.action`
- If the DB currently stores only the 5-state actions, keep optional actions defined but unused.

## Implementation details / guidelines
- Prefer **string literal unions** or `as const` objects over TS enums for persisted values.
- Use compile-time checks:
  - `const ACTIONS = [...] as const; type SwipeAction = (typeof ACTIONS)[number];`
  - `const ACTION_WEIGHTS = { ... } satisfies Record<SwipeAction, number>;`
- If optional actions have fractional weights later, either:
  - keep weights as `number` and store scaled integers in DB OR
  - plan a future migration to REAL for `strength`
Do not change DB schema here; just type it consistently.

## Suggested exports
- `ACTIONS` (readonly tuple)
- `CORE_ACTIONS`
- `SwipeAction`, `CoreSwipeAction`
- `ACTION_LABELS` (Record<SwipeAction, string>)
- `ACTION_WEIGHTS` (Record<SwipeAction, number>)
- `isSwipeAction`, `parseSwipeAction`, `normalizeSwipeAction`
- `assertNever(x: never): never` helper for exhaustive switches

## Deliverables
- `types/domain/actions.ts` added and used as the single source of truth.
- At least one existing file updated to import `SwipeAction` from this module (proves adoption).

## Acceptance criteria
- No duplicate action union/enum remains elsewhere.
- Typecheck fails if:
  - a new action is added but weights/labels aren’t updated
  - an invalid action string is used in code
- Runtime parser safely handles unknown input.

## Validation commands
- `npm run typecheck`
- `npm run lint`

## External references (when stuck)
- TypeScript narrowing/type guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Const assertions: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html
- Exhaustive switch lint rule: https://typescript-eslint.io/rules/switch-exhaustiveness-check/
Runtime validation options:
- Zod: https://zod.dev/
- Valibot: https://valibot.dev/