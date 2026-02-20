# Iteration 5: Add typed domain models

## Objective
Create shared TypeScript models/enums/interfaces for entities, swipe actions, score records, and profile snapshots.

## Why this matters
Strong typing reduces mismatch between DB rows, ranking logic, and UI usage.

## Scope
### In scope
- Define canonical action enum (Hard No, No, Skip, Yes, Hard Yes).
- Define row/model types and transformation helpers.
- Add runtime-safe parsers where needed for untrusted input.

### Out of scope
- Final ranking formulas or UI wiring.

## Implementation checklist
- [ ] Add `types/` modules for catalog, events, scores, snapshots.
- [ ] Add action-to-weight constants in one shared place.
- [ ] Update imports to use central types.

## Deliverables
- Typed models checked in and used by DB and UI boundaries.

## Acceptance criteria
- No duplicate action enums across app.
- Typecheck catches invalid action values and missing fields.

## Validation commands
- `npm run typecheck`
- `npm run lint`

## Notes for next iteration
Reference these types in later iteration docs to avoid drift.
