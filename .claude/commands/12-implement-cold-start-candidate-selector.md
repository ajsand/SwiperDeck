# Iteration 12: Implement cold-start candidate selector

## Objective
Build selector for new users: popularity-weighted and diversity-balanced across selected media types.

## Why this matters
Good cold-start prevents early churn and avoids narrow recommendation loops.

## Scope
### In scope
- Build candidate query for users with sparse history.
- Mix mainstream/popular items with type diversity.
- Respect active type filters.

### Out of scope
- Personalized match scoring for warm users.

## Implementation checklist
- [ ] Define cold-start threshold (e.g., <N swipes).
- [ ] Implement sampler with per-type quotas.
- [ ] Add deterministic tie-break and exclusion list support.

## Deliverables
- Cold-start selector module + tests.

## Acceptance criteria
- New user deck contains multiple types/tags.
- Highly popular items appear but do not dominate completely.

## Validation commands
- `npm test -- cold-start`
- `npm run typecheck`

## Notes for next iteration
Keep selector interface compatible with warm-start ranker handoff.
