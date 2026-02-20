# Iteration 8: Build Deck card UI and controls

## Objective
Implement card viewport with metadata/tags and accessible 5-state action buttons in addition to swipe gestures.

## Why this matters
This is the primary user interaction surface and must be clear and fast.

## Scope
### In scope
- Build single-card UI component with title/subtitle/tags.
- Wire action controls for all required states including Skip.
- Add loading/empty/error placeholders.

### Out of scope
- Persisting swipe results (handled next iteration).

## Implementation checklist
- [ ] Create card layout component.
- [ ] Add gesture support and button fallback.
- [ ] Add focus/ARIA labels for accessibility.
- [ ] Add prefetch placeholder for upcoming card.

## Deliverables
- Deck screen renders interactive card and action controls.

## Acceptance criteria
- All 5 actions are visible and trigger callbacks.
- UI remains usable without gestures (buttons only).

## Validation commands
- `npm run typecheck`
- `npm test -- deck-ui`

## Notes for next iteration
Keep UI logic stateless where possible so recording layer can plug in cleanly.
