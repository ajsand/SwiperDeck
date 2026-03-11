# Deck Browser And Detail Flow

> Introduced in Fork Iteration 12.
> Covers the first browse path for DateDeck: deck browser -> deck detail -> placeholder start CTA.

## Routes

```text
app/(tabs)/index.tsx   -> Deck browser
app/deck/[deckId].tsx  -> Deck detail screen
```

The browser is the primary entry point for the product shell. It replaces the old inline swipe placeholder on the `Decks` tab.

## Data Hooks

Two hooks power the flow:

- `useDecks()` loads all decks from the local SQLite store and exposes `decks`, `loading`, `error`, and `refresh`.
- `useDeckById(deckId)` loads one deck by ID and exposes `deck`, `loading`, `error`, and `refresh`.

Both hooks rely on `getDb()` and the Iteration 10 deck repository functions. They assume root DB initialization has already completed in `app/_layout.tsx`.

## Browser States

The deck browser must handle three first-class states before Iteration 13 loads real content:

- `loading`: shows a centered spinner and explanatory copy
- `empty`: shows "No decks yet" with a local-first placeholder message
- `error`: shows retry UI without crashing the tab shell

When data exists, the browser renders a vertical `FlatList` of `DeckBrowserCard` entries.

## Detail Screen States

The deck detail screen handles:

- `loading`: spinner + "Loading deck..."
- `not found`: a friendly message with a back action
- `error`: retry UI
- `ready`: hero area, descriptive copy, metadata chips, thresholds, and CTA

## CTA Contract

The detail screen includes a visible `Start Swiping` button so the flow is legible before swipe-session wiring exists.

In Iteration 12, the CTA intentionally shows placeholder behavior via `Alert.alert(...)`.
Iteration 14 will replace that placeholder with real deck-scoped swipe-session navigation.

## Accessibility Notes

- Browser cards use `accessibilityRole="button"` with a descriptive label and hint.
- Retry and CTA controls expose button roles and hints.
- The detail title uses a header role for screen readers.

## Iteration 13 Handoff

- The browser is expected to be empty until prebuilt decks are inserted.
- Once Iteration 13 loads decks into SQLite, both `useDecks()` and `useDeckById()` should light up without route changes.
