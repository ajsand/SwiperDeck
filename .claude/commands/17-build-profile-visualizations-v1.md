# Iteration 17: Build Profile visualizations v1

## Objective
Create initial Profile screen visuals: top themes, type affinity bars, and strong likes/dislikes lists.

## Why this matters
Profile is the product output and must feel informative, not opaque.

## Scope
### In scope
- Render chart/list components from local score tables.
- Handle no-data and low-data states cleanly.
- Keep computation lightweight using pre-aggregated tables.

### Out of scope
- Time-series charting (next iterations).

## Implementation checklist
- [ ] Add selectors to fetch top tags/types and strongest entities.
- [ ] Build reusable chart/list components.
- [ ] Add empty-state copy for first-time users.

## Deliverables
- Profile v1 screen with required visual sections.

## Acceptance criteria
- Data updates reflect recent swipes.
- Layout remains readable on small screens.

## Validation commands
- `npm test -- profile-v1`
- `npm run lint`

## Notes for next iteration
Favor simple charts first; keep APIs ready for richer visuals later.
