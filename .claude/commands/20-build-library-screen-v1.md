# Iteration 20: Build Library screen v1

## Objective
Implement Library with segmented Liked/Disliked/Skipped views and type/date filtering.

## Why this matters
History review improves transparency and enables correction workflows.

## Scope
### In scope
- Build segmented UI and list rendering.
- Query by swipe action category plus filters.
- Add empty states and basic pagination/virtualization.

### Out of scope
- Full text/semantic search (phase 2).

## Implementation checklist
- [ ] Add segmented control with 3 buckets.
- [ ] Add filter controls for type/date.
- [ ] Implement list item with entity metadata + timestamp.

## Deliverables
- Functional Library v1 experience.

## Acceptance criteria
- User can switch buckets and see corresponding events.
- Filters narrow results correctly.

## Validation commands
- `npm test -- library-v1`
- `npm run typecheck`

## Notes for next iteration
Design list item API to support future reclassify/remove actions.
