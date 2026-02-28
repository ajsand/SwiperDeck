
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08G-claude-review-action-callback-contract.md -->

# Model: CLAUDE OPUS 4.6 (Max)
# Iteration 8G: Review action callback contract for Iteration 09 compatibility

## Objective
Audit the Deck UI’s action emission contract and confirm it is:
- stable,
- stateless,
- persistence-ready for Iteration 09,
- and aligned with `CLAUDE.md` semantics.

## Why this matters
Iteration 09 will persist swipe sessions/events. If Iteration 08’s action contract is inconsistent or UI holds hidden state:
- persistence wiring will require UI rewrites,
- undo becomes harder,
- and future ranking/profile logic will drift.

## Scope
### In scope
- Review and adjust the action payload interface.
- Confirm canonical action names are used consistently.
- Confirm gesture and button paths emit identical payload shapes.
- Confirm UI does not create DB sessions/events itself.

### Out of scope
- Implementing persistence.
- Implementing undo or ranking.

## Review checklist
### 1) Canonical action names
- Verify every emitted action is from Iteration 05 canonical union.
- Verify labels/icons are UI-only and do not leak into persistence naming.

### 2) Payload structure
Confirm a single callback exists at the Deck boundary, e.g.:
- `onAction(action, meta)`
Where meta should include at least:
- `source: 'button' | 'gesture'`
Optionally allow:
- `gesture?: { dx, dy, vx, vy }` (telemetry only; not required).

### 3) Statelessness
- DeckCard must be presentation-only.
- DeckActionBar must not interpret ranking/persistence.
- Gesture hook must not mutate global state; it should only emit mapped outcomes.

### 4) Transition and double-dispatch protection
- Ensure there is an explicit “interaction lock” mechanism that prevents duplicate actions while transitioning to next card.
- Ensure disabled/loading states are respected.

### 5) Handoff notes for Iteration 09
Write a short “Handoff Contract” section that Iteration 09 can reference:
- expected callback signature,
- where action is emitted,
- and any invariants (e.g., “only emit when entity is non-null”).

## Deliverables
- A short “Contract Freeze” note added to Iteration 08 notes or a small doc section:
  - action payload shape,
  - mapping invariants,
  - and test expectations.

## Acceptance criteria
- Iteration 09 can persist events without modifying Deck components.
- Any drift between gesture/button paths is corrected before Iteration 09.

## References
```txt
React Native Pressable: https://reactnative.dev/docs/pressable
React Native Accessibility: https://reactnative.dev/docs/accessibility
Expo Gesture Handler: https://docs.expo.dev/versions/latest/sdk/gesture-handler/