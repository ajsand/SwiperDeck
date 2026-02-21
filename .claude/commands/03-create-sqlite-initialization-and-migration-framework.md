# Iteration 3: Create SQLite initialization and migration framework

## Objective
Implement local SQLite access with deterministic open/init flow and versioned migrations.

## Why this matters
Local-first product requirements depend on resilient on-device storage.

## Scope
### In scope
- Introduce DB module for open, migrate, and health check.
- Define migration registry and schema version table.
- Ensure migrations are idempotent and ordered.

### Out of scope
- Implementing full table set beyond migration scaffolding.

## Implementation checklist
- [ ] Create DB client module and singleton access pattern.
- [ ] Add migration runner with transaction boundaries.
- [ ] Add schema version tracking table.
- [ ] Add startup hook that runs migrations before app uses data.

## Deliverables
- Reusable DB layer with migration hooks.
- At least one smoke migration proving mechanism works.

## Acceptance criteria
- Fresh install initializes DB without manual steps.
- Re-running init does not duplicate/alter already-applied migrations unexpectedly.

## Validation commands
- `npm run typecheck`
- `npm test -- migrations`

## Notes for next iteration
Note migration naming convention and rollback strategy for future schema tasks.
