# Deck Action Callback Contract (Frozen for Iteration 09)

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

| Value     | Source(s)                      | Notes                    |
| --------- | ------------------------------ | ------------------------ |
| `hard_no` | Gesture (strong left), Button  |                          |
| `no`      | Gesture (normal left), Button  |                          |
| `skip`    | Button ONLY                    | Never emitted by gesture |
| `yes`     | Gesture (normal right), Button |                          |
| `love`    | Gesture (strong right), Button |                          |

All values are from `CoreSwipeAction` (`types/domain/actions.ts`). Phase 2 actions (`respect`, `curious`) are not wired in v1.

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
| `DeckCard`             | No        | No         | No                |
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

`GestureSwipeAction` = `'hard_no' | 'no' | 'yes' | 'love'` (excludes `skip`).

**Code location:** `hooks/useDeckGestures.ts`

## 7) Iteration 09 Handoff: What Persistence Needs

Iteration 09 will create a hook or service that:

1. **Creates a swipe session** when the Deck screen mounts (or first card appears).
2. **Receives the callback** from `DeckSurface.onAction`.
3. **On each action:**
   - Creates a `swipe_events` row with `session_id`, `entity_id`, `action`, `strength` (from `actionToDbStrength`), `created_at`.
   - The `entity_id` comes from the current `CatalogEntity.id` that the Deck screen passes to `DeckSurface`.
4. **Advances to the next card** after persisting (unlock the interaction lock).

The Deck screen's responsibility:

```typescript
const handleAction: DeckActionHandler = (action, meta) => {
  // Iteration 09 wires this:
  persistSwipeEvent(currentSession.id, currentEntity.id, action);
  advanceToNextCard();
};
```

### Invariants for persistence wiring

- Only emit when `entity` is non-null (the `DeckSurface` should not render the action bar or enable gestures when `state !== 'ready'`).
- The `action` value is always a valid `CoreSwipeAction` — no parsing needed at the persistence boundary.
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
