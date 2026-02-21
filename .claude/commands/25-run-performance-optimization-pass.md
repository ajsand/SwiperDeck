# Iteration 25: Run performance optimization pass

## Objective
Optimize Deck responsiveness: preloading, non-blocking updates, and selector profiling.

## Why this matters
Swipe UX must feel instant; performance debt compounds quickly.

## Scope
### In scope
- Preload next 5–10 cards.
- Move expensive work off critical interaction path.
- Profile selector/query hotspots and optimize.

### Out of scope
- Premature micro-optimizations without measured impact.

## Implementation checklist
- [ ] Add card prefetch queue with configurable depth.
- [ ] Ensure swipe handlers write fast and defer heavy tasks.
- [ ] Measure render/frame timing before and after changes.

## Deliverables
- Documented performance improvements and code updates.

## Acceptance criteria
- Swipes remain smooth under typical load.
- No major UI thread stalls introduced by ranking/profile updates.

## Validation commands
- `npm test -- performance-smoke`
- `npm run lint`

## Notes for next iteration
Capture profiling notes and remaining bottlenecks for follow-up.
