# Iteration 14: Add epsilon-greedy exploration

## Objective
Apply 85/15 exploit/explore policy on top of warm ranking selection.

## Why this matters
Exploration avoids overfitting and uncovers new interests.

## Scope
### In scope
- Integrate stochastic selector over ranked candidates.
- Default to 85% exploit, 15% explore with configurable constants.
- Log selection mode for debugging.

### Out of scope
- Advanced contextual bandit algorithms.

## Implementation checklist
- [ ] Add RNG-safe selection utility (testable with seeded random).
- [ ] Mark each selected card as exploit/explore.
- [ ] Add fallback when candidate pool is small.

## Deliverables
- Exploration-aware deck selection logic.

## Acceptance criteria
- Over large sample, mode ratio approximates 85/15.
- Exploration picks are still filter-compliant and not random garbage.

## Validation commands
- `npm test -- exploration-policy`
- `npm run typecheck`

## Notes for next iteration
Seedable randomness is required for reliable automated tests.
