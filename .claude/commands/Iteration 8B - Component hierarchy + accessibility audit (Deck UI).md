
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08B-gemini-component-hierarchy-accessibility-audit.md -->

# Model: GEMINI 3.1
# Iteration 8B: Component hierarchy + accessibility audit (Deck UI)

## Objective
Provide a Codex-ready **component hierarchy** and **accessibility checklist** for the Deck screen so:
- gestures + buttons coexist cleanly,
- every action is usable without gestures,
- and screen readers/keyboard navigation are supported.

## Why this matters
Deck is the core UX loop. If accessibility and hierarchy aren’t correct now:
- future iterations will patch around broken semantics,
- tests will be brittle,
- and app store review risk increases.

## Scope
### In scope
- Proposed component tree and prop contracts.
- Accessibility labels/roles/hints for action buttons and state placeholders.
- Focus order guidance and touch target sizing guidance.
- Guidance for Web keyboard interactions and screen reader clarity.

### Out of scope
- Writing implementation code.
- Styling polish beyond layout-level recommendations.

## Inputs to read first
- `CLAUDE.md` Sections 3.1, 5.2, 12.2, 14.1
- Iteration 05 canonical action types (names must not drift)
- Iteration 07 deterministic tile component contract

## Deliverable
A “Codex-ready brief” containing:
1. Component tree (with file suggestions)
2. Props/interfaces (names + responsibilities)
3. Accessibility requirements for each interactive element
4. Placeholder semantics (loading/empty/error)
5. Web and keyboard notes

## Recommended component tree (example)
Codex can adjust paths but should keep responsibilities the same:

- `DeckScreen`
  - `DeckSurface`
    - `DeckCard` (presentation only: tile + text + tags)
    - `DeckActionBar` (buttons only)
    - `DeckStatePlaceholder` (loading/empty/error)
  - `DeckFilterButton` (optional; should not be inside gesture detector)
  - (later) `UndoButton` (Iteration 10)

## Prop contract recommendations (must be stable for Iteration 09)
- `DeckSurface` receives:
  - `entity: CatalogEntity | null`
  - `state: 'loading' | 'ready' | 'empty' | 'error'`
  - `onAction(action: SwipeAction, meta: { source: 'gesture' | 'button' })`
  - `onRetry?()`
- `DeckCard` should NOT mutate state; it renders.
- `DeckActionBar` should NOT interpret ranking/persistence; it calls `onAction`.

## Accessibility requirements (must be explicit)
Action buttons (all 5):
- `accessibilityRole="button"`
- `accessibilityLabel` includes action + short explanation (ex: “Like” / “Dislike”)
- `accessibilityHint` clarifies effect (ex: “Records preference and advances to next card”)
- `accessibilityState={{ disabled: boolean }}` when disabled/loading
- Touch target sizing: ensure practical minimum size (Codex can pick, but it must be consistent)

Deck state placeholders:
- Loading: announce loading state; avoid “blank screen”
- Empty: provide “Adjust filters” or “Reload catalog” suggestion
- Error: provide retry button with clear label

Keyboard/Web:
- Ensure action buttons can receive focus and press via keyboard on web.
- Ensure the focus order matches visual order.

Screen reader order:
- Card title should be read before tags list to avoid confusion.
- Avoid reading long tag lists before primary metadata.

## Conflict avoidance (gesture vs buttons)
- DeckActionBar should not be inside the pan gesture detector.
- Any top overlay buttons (filter/settings) must be outside gesture detector OR excluded.

## Acceptance criteria for this brief
- Codex can implement without guessing accessibility labels/hints.
- Every interactive element has explicit a11y semantics.
- Button-only mode is fully functional.

## References
```txt
React Native Accessibility guide: https://reactnative.dev/docs/accessibility
React Native Pressable: https://reactnative.dev/docs/pressable
React Native Testing overview (accessibility-friendly testing patterns): https://reactnative.dev/docs/testing-overview
Expo Router testing notes: https://docs.expo.dev/router/reference/testing/