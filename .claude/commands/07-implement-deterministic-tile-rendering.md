# Iteration 7: Implement deterministic tile rendering

## Objective
Create deterministic visual tiles from `tile_key` using gradient, entity-type icon, and fallback text.

## Why this matters
Legal-safe art is required by default and must be visually consistent.

## Scope
### In scope
- Build reusable tile component/helper.
- Deterministically derive colors/style from key hash.
- Include accessibility labels and fallback behavior.

### Out of scope
- External image fetching/licensing integration.

## Implementation checklist
- [ ] Add hash-to-palette utility.
- [ ] Map entity type to icon glyph.
- [ ] Render title/subtitle truncation fallback.
- [ ] Add snapshot/unit tests for deterministic output.

## Deliverables
- Tile component ready for Deck and Library previews.

## Acceptance criteria
- Same `tile_key` yields same tile every render/device.
- Missing/long titles still render gracefully.

## Validation commands
- `npm test -- tile`
- `npm run lint`

## Notes for next iteration
Record palette generation algorithm so future changes remain backward compatible.
