# Iteration 10: Implement undo last swipe

## Objective
Support undo for latest swipe by deleting/reverting latest event and restoring candidate state.

## Why this matters
Undo increases trust and prevents noisy preference data from accidental swipes.

## Scope
### In scope
- Track most recent swipe in active session.
- Remove/reverse persisted event atomically.
- Update UI and card queue after undo.

### Out of scope
- Multi-level undo history beyond latest event.

## Implementation checklist
- [ ] Add `undoLastSwipe(sessionId)` repo function.
- [ ] Reverse dependent score deltas (if already applied).
- [ ] Disable undo when no eligible event exists.
- [ ] Add telemetry/logging for undo usage.

## Deliverables
- Undo flow available in Deck UI and data layer.

## Acceptance criteria
- Undo restores prior state exactly once per latest event.
- Repeated undo does not corrupt data.

## Validation commands
- `npm test -- undo`
- `npm run lint`

## Notes for next iteration
Clarify behavior when app restarts mid-session and undo is requested.
