# Iteration 9: Persist swipe sessions and swipe events

## Objective
Record swipe interactions locally with correct action weights and session context.

## Why this matters
Reliable event capture is needed for profile accuracy and ranking adaptation.

## Scope
### In scope
- Create session start/end lifecycle.
- Persist each swipe with timestamp/action/entity/filter context.
- Centralize action-to-weight mapping.

### Out of scope
- Undo reversal and incremental score update logic.

## Implementation checklist
- [ ] Add repository functions: `startSession`, `recordSwipe`, `endSession`.
- [ ] Ensure writes are transactional and resilient to rapid interactions.
- [ ] Store action weight and optional metadata snapshot.

## Deliverables
- Durable swipe event pipeline.
- Session records linked to swipe events.

## Acceptance criteria
- Every action adds one event row.
- Action weights match spec for all states.
- No dropped events under quick repeated swipes.

## Validation commands
- `npm test -- swipe-events`
- `npm run typecheck`

## Notes for next iteration
Expose one event recording API used by all UI paths to avoid divergence.
