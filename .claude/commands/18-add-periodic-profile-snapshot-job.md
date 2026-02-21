# Iteration 18: Add periodic profile snapshot job

## Objective
Create background snapshot generation every N swipes and at daily boundary for trend analysis.

## Why this matters
Snapshots are required for over-time visuals without expensive recomputation.

## Scope
### In scope
- Define snapshot trigger conditions.
- Store compact aggregates into `profile_snapshots`.
- Ensure throttling/debounce to avoid excess writes.

### Out of scope
- Full analytics backend export.

## Implementation checklist
- [ ] Implement snapshot scheduler/hook.
- [ ] Persist snapshot payload + timestamp + metadata.
- [ ] Prevent duplicate snapshots within same interval window.

## Deliverables
- Snapshot generation integrated into swipe/update flow.

## Acceptance criteria
- Snapshots appear after threshold swipes and day rollovers.
- Duplicate window snapshots are prevented.

## Validation commands
- `npm test -- snapshot-job`
- `npm run typecheck`

## Notes for next iteration
Include version field in snapshot payload for forward compatibility.
