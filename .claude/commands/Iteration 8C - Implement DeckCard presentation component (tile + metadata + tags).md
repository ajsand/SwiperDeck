
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08C-codex-implement-deckcard-presentation.md -->

# Model: GPT-5.3 CODEX (Extra High Fast)
# Iteration 8C: Implement DeckCard presentation component (tile + metadata + tags)

## Objective
Implement the **pure presentation** component for a Deck card:
- deterministic tile (Iteration 07),
- title/subtitle/type,
- tags chips/list,
- robust truncation and missing-field fallback,
- and no persistence or ranking logic.

## Why this matters
Codex needs a stable, reusable card renderer so:
- Deck interactions remain smooth and consistent,
- Library can reuse it later,
- and the swipe/persistence layers can change without UI rewrites.

## Scope
### In scope
- `DeckCard` UI component and supporting subcomponents for text/tags.
- Deterministic tile integration (no alternative art paths).
- Fallback behavior for null/empty/long strings.
- testIDs for key elements to support Iteration 08F tests.

### Out of scope
- Gesture handling (Subtask 8D).
- Action buttons (Subtask 8D).
- Placeholder states (Subtask 8E).

## Dependencies
- Iteration 05: `CatalogEntity` type + canonical fields.
- Iteration 07: deterministic tile component/helpers.

## Implementation notes
- Keep `DeckCard` pure: props in, UI out.
- Avoid reading from DB or global state.
- Keep render cheap (no heavy computations inside render).
- Use `Text` truncation props consistently (e.g., `numberOfLines`, `ellipsizeMode`).

## Suggested files
- `features/deck/components/DeckCard.tsx`
- (optional) `features/deck/components/TagChips.tsx`
- (optional) `features/deck/components/CardMetaText.tsx`

## Implementation checklist
- [ ] Accept `entity: CatalogEntity` as prop.
- [ ] Render deterministic tile using `tile_key` + `type` + `title`.
- [ ] Render title (required) with safe fallback if missing (e.g., “Untitled”).
- [ ] Render subtitle if present; hide cleanly if missing.
- [ ] Render type label (optional, but helpful for clarity).
- [ ] Render tags list/chips with cap (e.g., show first N + “+X”).
- [ ] Add `testID`s:
  - `deck-card`
  - `deck-card-title`
  - `deck-card-subtitle`
  - `deck-card-tags`

## Deliverables
- `DeckCard` renders correctly across:
  - missing subtitle,
  - missing tags,
  - very long title,
  - unicode titles.
- No runtime warnings or layout breakage.

## Acceptance criteria
- Rendering does not depend on gestures/buttons.
- Deterministic tile is always used.
- Titles/subtitles never overflow or crash layout.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- deck` (or the repo’s equivalent test target)

## References
```txt
React Native Text (truncation/numberOfLines): https://reactnative.dev/docs/text
React Native Style basics: https://reactnative.dev/docs/style