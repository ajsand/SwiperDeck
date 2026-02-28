
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08D-codex-implement-controls-and-gestures-unified-dispatch.md -->

# Model: GPT-5.3 CODEX (Extra High Fast)
# Iteration 8D: Implement Deck controls + gesture hook with unified action dispatch

## Objective
Implement:
- `DeckActionBar` with all 5 required actions,
- `useDeckGestures` (or equivalent) to map swipes to actions,
- and a **single unified dispatcher** so button taps and gestures emit identical action payloads.

## Why this matters
Iteration 09 depends on a stable “action emission contract”. If gesture and button payloads differ:
- persistence code becomes complex,
- undo becomes risky,
- tests become brittle,
- and UX becomes inconsistent.

## Scope
### In scope
- Button controls for all actions (must work without gestures).
- Gesture recognition (minimum viable: horizontal swipe).
- Unified callback signature:
  - `onAction(action, meta)`
- Disabled/loading guards to prevent double-dispatch.

### Out of scope
- SQLite persistence (Iteration 09).
- Undo (Iteration 10).
- Ranking selection (Iterations 11+).

## Inputs you must respect
- Canonical action names from Iteration 05 (do not invent new action strings).
- Gemini brief outputs from Iteration 8A + 8B (zone map + thresholds + a11y).

## Required action set (example)
Use the canonical action union from Iteration 05. Typical 5-state set:
- `hard_no`, `no`, `skip`, `yes`, `love` (or `hard_yes` depending on Iteration 05)

Buttons must map to those exact values.

## Suggested files
- `features/deck/components/DeckActionBar.tsx`
- `features/deck/hooks/useDeckGestures.ts`
- `features/deck/types/deckActionPayload.ts` (optional)
- `features/deck/utils/dispatchDeckAction.ts` (recommended: pure helper)

## Unified action dispatch contract (required)
Buttons and gestures MUST call the same function, e.g.:

- `dispatchDeckAction(action, { source: 'button' | 'gesture' })`

and upstream:
- `onAction(action, meta)` prop from Deck surface.

## Gesture implementation guidance (minimum viable)
- Use `react-native-gesture-handler` + `react-native-reanimated` if already installed.
- Prefer a single Pan gesture mapped to horizontal swipes.
- Commit swipe only when thresholds are met; otherwise snap back.
- Keep action bar outside gesture detector.

If gestures are unstable on Web:
- keep gestures enabled where supported,
- but ensure button-only mode is complete.

## Implementation checklist
- [ ] Implement `DeckActionBar` with 5 buttons.
- [ ] Each button has:
  - accessibilityLabel + accessibilityHint + role=button,
  - disabled state,
  - testID for each action.
- [ ] Implement `useDeckGestures`:
  - consumes thresholds from constants,
  - returns props/handlers for gesture detector,
  - maps direction -> action.
- [ ] Ensure gestures never steal touches from the action bar.
- [ ] Add “dispatch once” guard:
  - lock dispatch while transition animation runs,
  - unlock when next card is ready (handled by parent state).
- [ ] Provide a stable action payload shape for Iteration 09:
  - `{ action, source }` (and optionally `velocity`, `distance` if you want telemetry)

## Deliverables
- Buttons dispatch actions reliably.
- Gestures dispatch the same actions with the same payload shape.
- All actions usable without gestures.

## Acceptance criteria
- Gesture path and button path call the same dispatcher.
- No duplicate dispatch occurs from a single interaction.
- Works on iOS + Android; Web at minimum supports buttons.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- deck`

## References
```txt
Expo Gesture Handler: https://docs.expo.dev/versions/latest/sdk/gesture-handler/
RNGH Pan handler docs: https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/gesture-handlers/pan-gh/
Reanimated: handling gestures: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures/
React Native Pressable: https://reactnative.dev/docs/pressable
React Native Accessibility: https://reactnative.dev/docs/accessibility