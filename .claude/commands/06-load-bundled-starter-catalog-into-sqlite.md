# Iteration 6: Load bundled starter catalog into SQLite

## Objective
Implement import pipeline for bundled JSON catalog into `catalog_entities` with dedupe/upsert behavior.

## Why this matters
Deck cannot function without seed entities, and import must be repeat-safe.

## Scope
### In scope
- Add catalog JSON asset and parser.
- Add import command/service for first-run and future refresh.
- Validate required fields and defaults.

### Out of scope
- Remote catalog sync pipeline.

## Implementation checklist
- [ ] Create import function with batching for performance.
- [ ] Use upsert semantics keyed by stable `id`.
- [ ] Track import metadata (count, timestamp, version).
- [ ] Handle malformed records with logging + skip.

## Deliverables
- Bundled dataset wired into startup flow.
- Import metrics visible in logs/dev tooling.

## Acceptance criteria
- First run inserts expected row count.
- Re-run import does not create duplicates.
- Invalid rows do not crash import.

## Validation commands
- `npm test -- catalog-import`
- `npm run typecheck`

## Notes for next iteration
Document dataset schema contract for future catalog updates.
