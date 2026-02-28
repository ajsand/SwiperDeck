
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08E-codex-add-loading-empty-error-placeholders.md -->

# Model: GPT-5.3 CODEX (Extra High Fast)
# Iteration 8E: Add loading/empty/error placeholders for Deck state transitions

## Objective
Implement Deck state placeholders that are:
- visually and semantically clear,
- accessibility-friendly,
- and resilient (no blank screen / no crashes).

States:
- loading,
- empty,
- recoverable error.

## Why this matters
Deck is stateful even before persistence:
- catalog may not be imported yet,
- filters may yield no candidates,
- runtime errors can happen.
If the UI doesn’t handle this cleanly, Iteration 09 wiring becomes painful and user trust drops.

## Scope
### In scope
- `DeckStatePlaceholder` component with explicit states.
- Retry affordance for recoverable errors.
- “Empty deck” affordance: adjust filters / reset filters (UI-only hook).
- Accessibility semantics for screen readers.

### Out of scope
- Actual retry logic beyond invoking a callback.
- Import pipeline fixes (Iteration 06).
- Ranking/candidate logic (Iterations 11+).

## Suggested files
- `features/deck/components/DeckStatePlaceholder.tsx`
- `features/deck/types/deckState.ts` (optional)

## Placeholder behavior contract
`DeckSurface` (or parent) controls:
- `state: 'loading' | 'ready' | 'empty' | 'error'`
- optional `errorMessage`
- `onRetry()`
- `onOpenFilters()` (optional)

## Implementation checklist
- [ ] Loading: show spinner + short message.
- [ ] Empty: show “No cards found” + suggestions:
  - adjust filters,
  - broaden types.
- [ ] Error: show error title + message + Retry button.
- [ ] Add accessibility:
  - ensure placeholder message is readable by screen readers.
- [ ] Add testIDs:
  - `deck-placeholder-loading`
  - `deck-placeholder-empty`
  - `deck-placeholder-error`
  - `deck-placeholder-retry`

## Deliverables
- Placeholder component integrated into Deck rendering path.
- No “white screen” when deck is not ready.

## Acceptance criteria
- Loading/empty/error show reliably without throwing.
- Retry callback is invoked when pressed.
- All placeholders are screen-reader friendly.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- deck`

## References
```txt
React Native Accessibility: https://reactnative.dev/docs/accessibility
React Native Pressable: https://reactnative.dev/docs/pressable