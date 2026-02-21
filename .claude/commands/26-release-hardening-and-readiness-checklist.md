# Iteration 26: Release hardening and readiness checklist

## Objective
Finalize stability, offline behavior, error boundaries, empty states, and launch readiness checklist.

## Why this matters
Final polish ensures reliable app-store quality and predictable user experience.

## Scope
### In scope
- Add top-level error boundaries and recoverable UI states.
- Validate offline-first behaviors and startup resilience.
- Complete checklist for nav/storage/privacy/readiness.

### Out of scope
- New product scope/features.

## Implementation checklist
- [ ] Add global and screen-level error boundaries.
- [ ] Validate offline flows manually and with smoke tests.
- [ ] Add release checklist doc with sign-off boxes.

## Deliverables
- Hardened app behavior and release checklist artifact.

## Acceptance criteria
- No broken core flow (Deck/Profile/Library/Settings) in smoke run.
- Offline mode still supports swiping and profile viewing after initial catalog load.

## Validation commands
- `npm test`
- `npm run typecheck`
- `npm run lint`

## Notes for next iteration
Tag unresolved risks explicitly so they are not lost before release.
