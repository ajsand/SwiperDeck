# Iteration 1: Bootstrap app shell

## Objective
Set up the Expo Router app skeleton with bottom tabs for Deck, Profile, Library, and Settings, plus stack support for detail screens.

## Why this matters
A stable navigation shell is the foundation for all later feature work and prevents layout churn.

## Scope
### In scope
- Initialize or standardize Expo Router file structure under `app/`.
- Add tab navigator with 4 required tabs and placeholder screens.
- Add stack layout for future detail routes and modals.
- Ensure tabs are reachable on iOS/Android/web where supported.

### Out of scope
- Building business logic for ranking or persistence.
- Final visual polish.

## Implementation checklist
- [ ] Create base route files (`app/(tabs)/deck`, `profile`, `library`, `settings`).
- [ ] Configure tab labels/icons and sane defaults.
- [ ] Add minimal placeholder content and loading-safe components.
- [ ] Add stack wrappers for future detail pages.

## Deliverables
- Navigation file structure committed.
- App launches directly into Deck tab.
- No red-screen/router resolution errors.

## Acceptance criteria
- User can switch among all 4 tabs without crash.
- Deep-link route resolution works for at least one nested detail path.

## Validation commands
- `npm run lint`
- `npm run typecheck`
- `npm test -- --watch=false`

## Notes for next iteration
Document any route naming conventions introduced so next tasks follow the same pattern.
