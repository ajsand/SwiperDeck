# Iteration 4: Create base database schema tables and indexes

## Objective
Add core tables from CLAUDE spec: sessions, swipes, catalog entities, affinity tables, snapshots, and indexes.

## Why this matters
Correct schema shape is required before implementing ranking/profile logic.

## Scope
### In scope
- Create normalized tables from Section 6 definitions.
- Add high-value indexes for swipe lookup and ranking reads.
- Include foreign key constraints where appropriate.

### Out of scope
- Query optimization beyond obvious index coverage.

## Implementation checklist
- [ ] Add migration SQL for all required tables.
- [ ] Add indexes for `entity_id`, `created_at`, action/state filters, and candidate selection fields.
- [ ] Validate schema with pragma/table introspection tests.

## Deliverables
- Migration file(s) creating full v1 schema.
- Documentation comment mapping tables to product features.

## Acceptance criteria
- All required tables exist after migration.
- Basic insert/select for each table works.
- Indexes are visible in SQLite metadata.

## Validation commands
- `npm test -- schema`
- `npm run typecheck`

## Notes for next iteration
Keep column naming consistent with upcoming typed models.
