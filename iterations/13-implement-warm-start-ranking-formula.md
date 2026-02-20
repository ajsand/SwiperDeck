# Iteration 13: Implement warm-start ranking formula

## Objective
Create personalized ranking using normalized blend of popularity, match score, and novelty.

## Why this matters
Warm-start personalization is core product value once taste signals exist.

## Scope
### In scope
- Compute match score from affinity/tag/type signals.
- Blend with popularity and novelty weights from spec.
- Normalize score output for comparability.

### Out of scope
- Exploration policy and repetition guardrails (next tasks).

## Implementation checklist
- [ ] Implement rank function returning score + explain terms.
- [ ] Add parameterized weights in config constants.
- [ ] Add tests for deterministic ranking order and edge cases.

## Deliverables
- Warm ranker service integrated with candidate pipeline.

## Acceptance criteria
- Users with history see shifted ordering toward inferred preferences.
- Ranker still returns valid scores when sparse data exists.

## Validation commands
- `npm test -- warm-ranker`
- `npm run lint`

## Notes for next iteration
Include simple score explain output to support profile transparency later.
