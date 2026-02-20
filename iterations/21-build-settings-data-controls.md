# Iteration 21: Build Settings data controls

## Objective
Add settings for JSON export, full local data reset, and privacy/about information.

## Why this matters
App-store readiness requires user data control and clear disclosure.

## Scope
### In scope
- Build export flow for core local tables.
- Implement destructive clear-data flow with confirmation.
- Add privacy/about content screen.

### Out of scope
- Account/cloud sync settings.

## Implementation checklist
- [ ] Implement JSON export utility and share/save path.
- [ ] Add reset confirmation modal and DB wipe routine.
- [ ] Add static privacy/about content.

## Deliverables
- Settings controls functional and discoverable.

## Acceptance criteria
- Export file contains expected tables/fields.
- Clear data resets app to clean state safely.

## Validation commands
- `npm test -- settings-data-controls`
- `npm run lint`

## Notes for next iteration
Ensure irreversible actions have clear UX warnings.
