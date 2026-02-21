# Iteration 16: Build filter modal controls

## Objective
Implement filter modal with media type toggles, diversity boost toggle, and mainstream slider.

## Why this matters
User controls are needed to shape candidate pool and improve trust.

## Scope
### In scope
- Create modal/sheet UI from Deck screen.
- Persist current filter state locally.
- Apply filters to candidate selector queries.

### Out of scope
- Cloud sync of preferences.

## Implementation checklist
- [ ] Build filter UI with defaults.
- [ ] Wire apply/reset actions.
- [ ] Store filter config in local DB or persistent storage.
- [ ] Ensure deck refreshes based on updated filters.

## Deliverables
- Functional filter modal integrated with deck selection.

## Acceptance criteria
- Toggled types immediately affect upcoming cards.
- Mainstream slider influences popularity weighting.

## Validation commands
- `npm test -- filters`
- `npm run typecheck`

## Notes for next iteration
Expose filter state in session metadata for analysis/debugging.
