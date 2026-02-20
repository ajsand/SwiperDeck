# Iteration 19: Build Profile over-time view

## Objective
Render sparkline/time-series visuals from `profile_snapshots` to show trend changes.

## Why this matters
Change-over-time makes the profile feel alive and interpretable.

## Scope
### In scope
- Add section/chart for theme trend over recent intervals.
- Support simple time windows (7d/30d/all available).
- Gracefully handle sparse snapshot history.

### Out of scope
- Predictive forecasting.

## Implementation checklist
- [ ] Build snapshot query selectors by theme/type.
- [ ] Add compact sparkline component.
- [ ] Add time-window switcher and default selection.

## Deliverables
- Profile includes over-time trend visualization.

## Acceptance criteria
- Users can view trend direction for top themes.
- No crash when only 1–2 snapshots exist.

## Validation commands
- `npm test -- profile-trends`
- `npm run lint`

## Notes for next iteration
Keep chart library footprint small for mobile performance.
