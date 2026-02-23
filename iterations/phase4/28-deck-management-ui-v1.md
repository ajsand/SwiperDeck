# Iteration 28: Deck management UI v1

## Objective

Design and document the first production-ready deck management UX for Phase 4 so users can:

- create and rename user decks
- add/remove cards from decks
- reorder deck cards deterministically
- set/clear active deck
- keep default “all/general deck” browsing behavior intact when no custom deck is active

This iteration should produce a clear implementation plan that future coding agents can execute without ambiguity.

## Why this matters

Iteration 27 established deck schema + migration foundations. Iteration 28 translates that data model into user-facing workflows that power deck curation and deck-aware swiping/showdown entry points.

A high-quality UI spec here reduces implementation churn in later iterations (29–35) and prevents regressions to existing solo swipe behavior.

## Scope

### In scope

- Deck list screen UX states and interactions.
- Create/edit/delete/archive deck flows (based on available schema semantics).
- Card membership management interactions (add/remove/reorder).
- Active deck selection UX and fallback behavior.
- Accessibility and deterministic interaction requirements.
- Edge-case behavior documentation (empty decks, deleted cards, stale active deck IDs).

### Out of scope

- Final visual polish and animation perfection.
- Showdown transport/network synchronization.
- Cloud merge/conflict resolution for deck changes.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow/model guides:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../../docs/MULTI_MODEL_WORKFLOW.md)
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../../docs/models/CLAUDE_OPUS_4_6_GUIDE.md)
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../../docs/models/GPT_5_3_CODEX_GUIDE.md)
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../../docs/models/GEMINI_3_1_GUIDE.md)

### Model routing for this iteration

| Sub-task | Model | Rationale |
| --- | --- | --- |
| Draft component tree, navigation flows, and state machine | **Codex** | Strong implementation-oriented planning across files |
| Validate UX consistency + fallback behavior | **Claude** | Strong product/interaction reasoning |
| Review accessibility + list/reorder edge cases | **Gemini** (optional) | Useful for structured UX QA pass |

### Notes

- Codex + Claude are the minimum recommended pair.
- Gemini is optional for extra review if drag/reorder logic becomes complex.

---

## Repository context for the coding agent

Before implementation, inspect:

- `CLAUDE.md` (Phase 4 intent and product constraints)
- `iterations/08-build-deck-card-ui-and-controls.md`
- `iterations/20-build-library-screen-v1.md`
- `iterations/21-build-settings-data-controls.md`
- `iterations/27-decks-data-model-and-migrations.md`
- `iterations/29-showdown-protocol-and-transport-spec.md`

Primary code areas likely impacted:

- `app/(tabs)/index.tsx` (swipe/home entry points)
- `app/(tabs)/library.tsx` (card browsing and curation context)
- navigation/router config for adding a deck management route
- deck selectors/services/state modules introduced after Iteration 27
- reusable card/list components used in existing library/deck surfaces

---

## UX requirements and constraints (target behavior)

### 1) Deck list / management entry

- Provide a visible entry point from existing navigation (Library and/or Settings).
- Deck list supports states:
  - loading
  - empty (no user decks)
  - populated
  - error (read/write failure)
- Deck rows show at least:
  - name/title
  - card count
  - active indicator (if selected)

### 2) Create/edit deck

- User can create a deck with validated title.
- User can rename/edit metadata for deck.
- Enforce predictable validation copy (e.g., empty title, duplicate title policy if applied).
- Prevent destructive loss: confirmation before delete/archive if deck contains cards.

### 3) Add/remove cards

- Provide a clear “add cards” flow from searchable/filterable catalog/library context.
- Prevent duplicate membership in same deck.
- Remove action should be explicit and reversible when feasible (e.g., temporary toast undo).

### 4) Reorder cards

- Reorder gesture/mechanism must map deterministically to `position` persistence.
- UI should reflect immediate optimistic order change.
- Persist order atomically (or robustly recover on partial failure).
- Support accessibility alternatives to drag (move up/down actions).

### 5) Active deck selection + fallback

- User can set one active deck for deck-aware flows.
- User can clear active deck and return to default all/general behavior.
- If active deck becomes invalid (deleted/missing), system gracefully falls back to default mode.
- Active deck selection must never block swiping/showdown entry.

---

## Implementation checklist

### A) Information architecture + navigation

- [ ] Define where deck management is launched from and how users return.
- [ ] Document route/screen names and params for deck list/detail/edit surfaces.
- [ ] Align route behavior with existing tabs and deep-link assumptions.

### B) Screen/state specifications

- [ ] Specify deck list states (loading/empty/populated/error).
- [ ] Specify deck detail states (no cards/cards present/reordering).
- [ ] Specify create/edit modal or screen behavior and form validation.
- [ ] Specify empty-state microcopy that explains value and next action.

### C) Interaction and persistence semantics

- [ ] Define add/remove flow with idempotent membership behavior.
- [ ] Define reorder behavior and deterministic save contract.
- [ ] Define active deck toggle/select/clear UX.
- [ ] Define optimistic updates and rollback behavior on persistence failure.

### D) Accessibility and quality bar

- [ ] Add accessible labels/hints for add/remove/reorder/select actions.
- [ ] Ensure keyboard/screen-reader alternatives for drag-only actions.
- [ ] Define tap targets and error messaging expectations.
- [ ] Include QA edge-case matrix (offline, stale IDs, empty deck activation).

---

## Deliverables

1. Deck management UI/flow spec markdown for v1.
2. Component tree + state transition notes for implementation handoff.
3. Interaction contract notes tying UI actions to deck data operations.
4. Accessibility and edge-case checklist for QA.

---

## Acceptance criteria

1. A coding agent can implement deck management UI without guessing missing flows.
2. Deck create/edit/add/remove/reorder/select behaviors are fully specified.
3. Active deck fallback behavior is explicitly defined and safe.
4. Existing non-deck browsing/swipe flow remains available at all times.
5. Accessibility requirements cover reorder and destructive actions.

---

## Validation commands

- `rg -n "deck|active deck|reorder|library" iterations/phase4 iterations app src`
- `rg -n "library|settings|tabs|router|navigation" app src`
- `rg -n "accessibilityLabel|accessibilityHint|Pressable|FlatList|SectionList" app src`

Use equivalent paths if the project layout differs.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: unclear where to put deck management in navigation

- Reuse existing tab-level patterns before introducing a new root flow.
- Prefer additive route integration with minimal disruption to current tab stack.
- Mirror patterns already used by Library/Settings for predictable UX.

### Problem: reorder UI works visually but saved order is inconsistent

- Ensure reorder operations produce a full deterministic sequence (0..n-1 or 1..n).
- Persist reordered list in a single transactional update path where possible.
- Re-query and reconcile canonical order after save to avoid drift.

### Problem: active deck state gets stale after delete/archive

- Validate active deck ID on app foreground and deck list load.
- Auto-clear invalid active deck and fallback to default all/general mode.
- Surface a non-blocking notice so behavior is understandable.

### Problem: add/remove card flows are confusing

- Keep primary action explicit (“Add to deck”, “Remove from deck”).
- Show immediate state change on card row/chip/button.
- Add concise helper copy for empty deck and no-results search cases.

### Problem: drag-and-drop accessibility gaps

- Provide secondary actions (Move up/Move down).
- Add accessibility labels/hints announcing position changes.
- Avoid drag-only critical workflows.

---

## Curated resources for coding agents (when blocked)

Use this order: official docs → practical implementation examples → troubleshooting communities.

### Official docs (highest priority)

1. React Native accessibility
   - https://reactnative.dev/docs/accessibility
2. React Native Pressable
   - https://reactnative.dev/docs/pressable
3. React Native FlatList
   - https://reactnative.dev/docs/flatlist
4. React Native SectionList
   - https://reactnative.dev/docs/sectionlist
5. React Navigation docs (if used by this repo)
   - https://reactnavigation.org/docs/getting-started
6. Expo Router docs (if used by this repo)
   - https://docs.expo.dev/router/introduction/
7. Expo SQLite docs (for local-first persistence behavior)
   - https://docs.expo.dev/versions/latest/sdk/sqlite/

### Step-by-step guides / practical implementation references

1. React Native drag-and-drop list patterns (`react-native-draggable-flatlist`)
   - https://github.com/computerjazz/react-native-draggable-flatlist
2. React Native Reanimated fundamentals (gesture/animation foundation)
   - https://docs.swmansion.com/react-native-reanimated/
3. React Native Gesture Handler docs
   - https://docs.swmansion.com/react-native-gesture-handler/
4. UX writing and form validation guidance (Nielsen Norman Group)
   - https://www.nngroup.com/topic/forms/

### Books / long-form references

1. *Refactoring UI* (Adam Wathan, Steve Schoger)
   - Practical patterns for list/detail actions and progressive disclosure
2. *Don’t Make Me Think* (Steve Krug)
   - Interaction clarity and navigation simplicity
3. *Designing Interfaces* (Jenifer Tidwell et al.)
   - Reusable UX patterns for management screens and selection workflows

### GitHub repositories and examples

1. Expo examples repository
   - https://github.com/expo/examples
2. React Navigation example app patterns
   - https://github.com/react-navigation/react-navigation/tree/main/example
3. Draggable list example implementations
   - https://github.com/computerjazz/react-native-draggable-flatlist/tree/main/Example

### YouTube tutorials

1. Expo Router crash course / routing walkthroughs
   - https://www.youtube.com/results?search_query=expo+router+tutorial
2. React Navigation v6 tutorials
   - https://www.youtube.com/results?search_query=react+navigation+v6+tutorial
3. React Native drag-and-drop list tutorials
   - https://www.youtube.com/results?search_query=react+native+drag+and+drop+flatlist
4. React Native accessibility tutorials
   - https://www.youtube.com/results?search_query=react+native+accessibility+tutorial

### Stack Overflow / discussion boards

1. React Native tag
   - https://stackoverflow.com/questions/tagged/react-native
2. Expo tag
   - https://stackoverflow.com/questions/tagged/expo
3. React Navigation tag
   - https://stackoverflow.com/questions/tagged/react-navigation
4. Expo Forums
   - https://forums.expo.dev/
5. Reactiflux Discord (community troubleshooting)
   - https://www.reactiflux.com/

---

## Definition of done for this iteration

- Deck management UX spec is complete, actionable, and implementation-ready.
- Flows are compatible with Iteration 27 schema decisions and upcoming Phase 4 tasks.
- Accessibility and fallback behavior are explicitly handled.
- Coding agents have enough repository pointers + external resources to continue independently when blocked.
