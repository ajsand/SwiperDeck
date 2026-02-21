# Iteration 11: Incremental taste score updates

## Objective
Update affinity and taste score tables incrementally on each swipe instead of full recompute.

## Why this matters
Incremental materialization keeps UI fast and profile near real-time.

## Scope
### In scope
- Compute per-swipe deltas for entity, type, and tag score tables.
- Write updates transactionally with event recording.
- Handle skip-neutral behavior correctly.

### Out of scope
- Snapshot aggregation over long history (later task).

## Implementation checklist
- [ ] Implement delta calculator using action weights.
- [ ] Upsert into `entity_affinity`, `taste_type_scores`, `taste_tag_scores`.
- [ ] Ensure skip produces neutral/minimal update per spec.

## Deliverables
- Incremental score updater integrated into swipe pipeline.

## Acceptance criteria
- After each swipe, score tables change as expected.
- No full-table recomputation occurs on normal swipes.

## Validation commands
- `npm test -- scoring-deltas`
- `npm run typecheck`

## Notes for next iteration
Document formulas and constants for future tuning iterations.
