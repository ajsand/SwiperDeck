# Iteration 1D: Review + Verification (Spec Enforcement)

## Objective
Review the implementation from 1C for:
- alignment with CLAUDE.md Navigation requirements
- correct Expo Router conventions
- working tab navigation and deep linking
- minimal scope (no extra features sneaking in)

## Why this matters
Early navigation bugs become expensive later (breaking deep links, modals, future screens).
This review is the guardrail before Iteration 2 introduces lint/typecheck/tests.

## Scope
### In scope
- Verify file structure and route conventions.
- Verify default tab and navigation behavior.
- Verify dynamic route + deep linking works.
- Identify any drift from CLAUDE.md or the iteration plan.

### Out of scope
- Styling feedback beyond “placeholder is readable.”
- Performance profiling (later iteration).
- Refactors unrelated to routing correctness.

## Model execution strategy
### Preferred model
**Claude Opus 4.6 Max** (review / spec enforcement)

## Inputs required
- The 1C diff (files touched + changes).
- Manual test notes from Codex (how deep link was validated).
- Current file tree under `app/`.

## Review checklist (must pass)
### A) File-based routing correctness
- `app/_layout.tsx` exists and exports default component.
- `app/(tabs)/_layout.tsx` exists and exports default Tabs layout.
- Tab screens exist and are correctly named (Deck should map to `index` unless intentionally different).
- No extraneous non-route components under `app/`.

### B) Default route correctness
- App launches into Deck tab.
- Deck is “index” route inside tabs (or a redirect is intentionally documented).

### C) Dynamic route correctness
- Dynamic detail route exists (`details/[id].tsx` or chosen equivalent).
- Reads route param with `useLocalSearchParams`.
- Renders without error for `example-id`.

### D) Deep-link sanity
- Web: direct navigation to `/details/example-id` loads correct screen.
- In-app: link from Deck navigates to the same route.

### E) Scope control
- No DB code.
- No ranking logic.
- No new dependencies unless unavoidable and documented.

## Acceptance criteria
- All checks above pass.
- Any deviations are documented as:
  - what changed
  - why
  - how it affects later iterations

## Validation steps (manual)
1) Run web dev server:
   - `npm run start -- --web` (or repo equivalent)
2) Confirm:
   - Deck shows first
   - all 4 tabs reachable
3) Click Deck -> details link; confirm it renders
4) Paste `/details/example-id` into web URL bar; confirm it renders

## Deliverable
A short Review Report:
- ✅ Passed items
- ❌ Failed items (if any) + exact fixes required
- Notes for Iteration 2 (naming conventions, file paths, any special router settings used)