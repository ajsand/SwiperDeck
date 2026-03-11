# Deck Action Callback Contract (Frozen for Iteration 09)

> **Fork context (DateDeck):**
> This contract was originally written for the TasteDeck backlog where Iteration 09 was "Persist swipe sessions and swipe events." In the DateDeck fork, the iteration numbering shifted:
>
> - Fork Iteration 09 = Reframe product shell (this does not touch the action contract)
> - Fork Iteration 11 = Standardize the universal action model (`love` -> `strong_yes`; `respect` and `curious` removed)
> - Fork Iteration 14 = Refactor swipe/session logic to deck scope (persistence wiring)
>
> The contract's callback signatures, payload shapes, dispatch semantics, and statelessness invariants remain valid and frozen. Iteration 11 changes only the emitted literal values, not the callback shapes. Iteration 14 changes the persistence target from broad catalog entities to deck-scoped cards and sessions.

> Defines the stable interface between the Deck UI (Iteration 08) and the persistence layer (Iteration 09).
> Iteration 09 must wire persistence to this contract without modifying Deck components.

## 1) Callback Signature

```typescript
type DeckActionHandler = (
  action: CoreSwipeAction,
  meta: DeckActionMeta,
) => void;

interface DeckActionMeta {
  source: 'button' | 'gesture';
  velocityX?: number;
  distanceX?: number;
}
```

Both gesture and button paths invoke the same `DeckActionHandler`. The `meta` object carries optional telemetry; only `source` is guaranteed present.

**Code location:** `components/deck/deckActionPayload.ts`

## 2) Action Values

Only the 5 core actions are emitted:

| Value        | Source(s)                      | Notes                    |
| ------------ | ------------------------------ | ------------------------ |
| `hard_no`    | Gesture (strong left), Button  |                          |
| `no`         | Gesture (normal left), Button  |                          |
| `skip`       | Button ONLY                    | Never emitted by gesture |
| `yes`        | Gesture (normal right), Button |                          |
| `strong_yes` | Gesture (strong right), Button |                          |

All values are from `CoreSwipeAction` (`types/domain/actions.ts`). Legacy TasteDeck values `love`, `respect`, and `curious` are not part of the DateDeck fork's canonical action model.

## 3) Payload Shape Parity

Both paths produce the same `DeckActionPayload` shape:

```typescript
interface DeckActionPayload {
  action: CoreSwipeAction;
  source: 'button' | 'gesture';
  velocityX?: number;
  distanceX?: number;
}
```

- **Button path:** `source: 'button'`, `velocityX` and `distanceX` are `undefined`.
- **Gesture path:** `source: 'gesture'`, `velocityX` and `distanceX` are populated from gesture data.

Iteration 09 should treat both sources identically for persistence. The `source` field is metadata for analytics only.

## 4) Double-Dispatch Protection

The `dispatchDeckAction` function enforces a lock:

```typescript
function dispatchDeckAction(args: {
  action: CoreSwipeAction;
  meta: DeckActionMeta;
  onAction: DeckActionHandler;
  isLocked: boolean;
  lock: () => void;
}): DeckActionPayload | null;
```

- If `isLocked` is `true`, returns `null` and does NOT call `onAction`.
- If `isLocked` is `false`, calls `lock()` first, then dispatches.
- Gesture path: lock is acquired before fly-off animation; callback fires after animation completes.
- Button path: lock is acquired immediately on press.

The Deck screen is responsible for unlocking after the next card is loaded.

**Code location:** `components/deck/dispatchDeckAction.ts`

## 5) Statelessness Invariants

| Component              | Reads DB? | Writes DB? | Manages sessions? |
| ---------------------- | --------- | ---------- | ----------------- |
| `SwipeCard`            | No        | No         | No                |
| `DeckActionBar`        | No        | No         | No                |
| `DeckActionButton`     | No        | No         | No                |
| `DeckStatePlaceholder` | No        | No         | No                |
| `useDeckGestures` hook | No        | No         | No                |
| `dispatchDeckAction`   | No        | No         | No                |

All Deck UI components are presentation-only. They emit actions via callbacks and render props. None of them:

- create or manage swipe sessions,
- write to SQLite,
- read from global state,
- or hold entity queues.

## 6) Gesture Resolution (Pure Function)

```typescript
function resolveDeckSwipeAction(input: {
  translationX: number;
  translationY: number;
  velocityX: number;
  screenWidth: number;
}): { action: GestureSwipeAction; distanceX: number; velocityX: number } | null;
```

Returns `null` for cancelled/ambiguous gestures. Returns a resolved action for committed swipes. This function is pure (no side effects) and tested with deterministic fixtures.

`GestureSwipeAction` = `'hard_no' | 'no' | 'yes' | 'strong_yes'` (excludes `skip`).

**Code location:** `hooks/useDeckGestures.ts`

## 7) Iteration 09 Handoff: What Persistence Needs

Iteration 09 will create a hook or service that:

1. **Creates a swipe session** when the Deck screen mounts (or first card appears).
2. **Receives the callback** from `DeckSurface.onAction`.
3. **On each action:**
   - Creates a `swipe_events` row with `session_id`, `deck_id`, `card_id`, `action`, `strength` (from `actionToDbStrength`), `created_at`.
   - The `card_id` comes from the current `DeckCard.id` loaded from `deck_cards`.
   - The `deck_id` comes from the active deck-scoped swipe session.
4. **Advances to the next card** after persisting (unlock the interaction lock).

The Deck screen's responsibility:

```typescript
const handleAction: DeckActionHandler = (action, meta) => {
  // Iteration 14 wires this to the deck-scoped persistence layer:
  persistSwipeEvent(
    currentSession.id,
    currentSession.deckId,
    currentCard.id,
    action,
  );
  advanceToNextCard();
};
```

### Invariants for persistence wiring

- Only emit when the current card is non-null (the swipe surface should not render the action bar or enable gestures when `state !== 'ready'`).
- The `action` value is always a valid `CoreSwipeAction` - no parsing needed at the persistence boundary.
- `actionToDbStrength(action)` from `types/domain/actions.ts` provides the INTEGER weight for the `strength` column.

## 8) Test Coverage Summary

| Test Suite                            | Tests | What it verifies                                                                                  |
| ------------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| `dispatch-deck-action.test.ts`        | 2     | Lock blocks dispatch; unlocked path creates payload + calls handler                               |
| `deck-action-dispatch-parity.test.ts` | 3     | All 5 core actions emit from button; gesture/button payloads share shape; skip never from gesture |
| `use-deck-gestures.test.ts`           | 6     | Strong/normal swipe mapping; velocity override; diagonal/low-intent cancellation                  |
| `deck-action-bar.test.tsx`            | 3+    | Button rendering, accessibility, press callbacks                                                  |
| `deck-state-placeholder.test.tsx`     | 3+    | Loading/empty/error states, retry button                                                          |

All 50 tests pass across 13 suites.
