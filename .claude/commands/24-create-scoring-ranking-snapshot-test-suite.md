# Iteration 24: Create scoring/ranking/snapshot test suite

## Objective
Expand automated tests to cover edge cases, regressions, and fixtures for scoring/ranking/snapshot logic.

## Why this matters
Algorithmic areas are high-risk and need durable regression protection.

## Scope
### In scope
- Add unit tests for all formula modules and snapshot triggers.
- Introduce fixture-driven tests for realistic swipe sequences.
- Cover sparse-data and extreme-weight edge cases.

### Out of scope
- End-to-end UI automation (later).

## Implementation checklist
- [ ] Add fixture files for representative histories.
- [ ] Add regression tests for known bug-prone scenarios.
- [ ] Ensure deterministic tests via seeded random where needed.

## Deliverables
- Robust test coverage around core recommendation math.

## Acceptance criteria
- Test suite fails on intentional formula regressions.
- Tests run reliably in CI/non-interactive mode.

## Validation commands
- `npm test`
- `npm run typecheck`

## Notes for next iteration
Keep fixtures readable and versioned as product logic evolves.
