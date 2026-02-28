# Deck Component Hierarchy + Accessibility Brief

> Codex-ready spec for the Deck screen component tree, prop contracts, accessibility semantics, and placeholder states.
> Companion to `docs/deck/DECK_GESTURE_LAYOUT_BRIEF.md` (gesture/layout spec).

## 1) Component Tree

```
app/(tabs)/index.tsx (DeckScreen)
│
├── DeckSurface
│   ├── [state === 'ready']
│   │   ├── DeckCard                          ← gesture-wrapped card
│   │   │   ├── Animated.View                 ← receives animated style from useDeckSwipe
│   │   │   │   ├── DeterministicTile         ← existing tile component (deck variant)
│   │   │   │   └── DeckTagsRow              ← horizontal tag chips (display-only)
│   │   │   └── DeckOverlayLabel             ← optional "YES"/"NOPE" label (during drag)
│   │   │
│   │   └── DeckActionBar                     ← 5 action buttons (OUTSIDE gesture handler)
│   │       ├── DeckActionButton (hard_no)
│   │       ├── DeckActionButton (no)
│   │       ├── DeckActionButton (skip)
│   │       ├── DeckActionButton (yes)
│   │       └── DeckActionButton (love)
│   │
│   ├── [state === 'loading']
│   │   └── DeckLoadingPlaceholder
│   │
│   ├── [state === 'empty']
│   │   └── DeckEmptyPlaceholder
│   │
│   └── [state === 'error']
│       └── DeckErrorPlaceholder
│
└── (Tab header contains filter button — outside DeckSurface entirely)
```

## 2) File Structure

```
components/
  deck/
    DeckSurface.tsx             ← orchestrator: state machine, gesture/button dispatch
    DeckCard.tsx                ← gesture-wrapped animated card (tile + tags + overlay)
    DeckTagsRow.tsx             ← horizontal scrollable tag chips
    DeckActionBar.tsx           ← row of 5 action buttons
    DeckActionButton.tsx        ← single circular action button
    DeckOverlayLabel.tsx        ← optional drag-direction label (low priority)
    DeckLoadingPlaceholder.tsx  ← loading state
    DeckEmptyPlaceholder.tsx    ← no cards available state
    DeckErrorPlaceholder.tsx    ← error state with retry
    index.ts                    ← barrel exports
hooks/
  useDeckSwipe.ts               ← pan gesture + animation logic
  useDeckSwipe.constants.ts     ← threshold constants
```

## 3) Prop Contracts

### `DeckSurface`

The top-level orchestrator that the Deck screen tab renders.

```typescript
type DeckState = 'loading' | 'ready' | 'empty' | 'error';

interface DeckSurfaceProps {
  entity: CatalogEntity | null;
  state: DeckState;
  onAction: (action: CoreSwipeAction, meta: ActionMeta) => void;
  onRetry?: () => void;
}

interface ActionMeta {
  source: 'gesture' | 'button';
}
```

**Responsibilities:**

- Renders the correct child based on `state`.
- Passes `onAction` to both `DeckCard` (gestures) and `DeckActionBar` (buttons).
- Never manages card queue or persistence — that's the screen's job.

### `DeckCard`

Presentation + gesture wrapper. Renders the visual card and handles pan interaction.

```typescript
interface DeckCardProps {
  entity: CatalogEntity;
  onSwipe: (action: CoreSwipeAction) => void;
}
```

**Responsibilities:**

- Wraps `DeterministicTile` in a `GestureDetector` via `useDeckSwipe`.
- Renders `DeckTagsRow` below the tile.
- Optionally renders `DeckOverlayLabel` during drag.
- Calls `onSwipe` after fly-off animation completes.
- Does NOT interpret what the swipe means for persistence.

### `DeckTagsRow`

Display-only horizontal tag list.

```typescript
interface DeckTagsRowProps {
  tags: string[];
}
```

**Responsibilities:**

- Renders a horizontal `ScrollView` of tag chips.
- Chips are non-interactive (display only).
- Limits visible tags to the row width; excess scrolls.

### `DeckActionBar`

Row of 5 action buttons.

```typescript
interface DeckActionBarProps {
  onAction: (action: CoreSwipeAction) => void;
  disabled?: boolean;
}
```

**Responsibilities:**

- Renders 5 `DeckActionButton` components in order: hard_no, no, skip, yes, love.
- Passes `disabled` to all buttons when the deck is mid-animation or loading.
- Does NOT know about gestures, entities, or persistence.

### `DeckActionButton`

Single circular action button.

```typescript
interface DeckActionButtonProps {
  action: CoreSwipeAction;
  onPress: () => void;
  disabled?: boolean;
}
```

**Responsibilities:**

- Renders a `Pressable` with the icon, color, and size from the 8A spec.
- Provides full accessibility props (see Section 4).
- Touch feedback: opacity on press, Android ripple.

### `DeckLoadingPlaceholder` / `DeckEmptyPlaceholder` / `DeckErrorPlaceholder`

```typescript
interface DeckErrorPlaceholderProps {
  onRetry?: () => void;
}
```

No props needed for loading/empty beyond basic styling. Error takes an optional retry callback.

---

## 4) Accessibility Requirements

### 4.1 DeckCard (card viewport)

| Property             | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| `accessibilityRole`  | `"image"`                                                      |
| `accessibilityLabel` | `"${entity.title}, ${entity.type}"`                            |
| `accessibilityHint`  | `"Swipe right to like, left to dislike, or use buttons below"` |
| `accessible`         | `true`                                                         |

The card is a single accessible unit. Screen readers should not traverse into the tile's internal layers (icon badge, gradient) — those are decorative.

Children inside the animated card container should have `importantForAccessibility="no-hide-descendants"` (Android) / `accessibilityElementsHidden={true}` (iOS) to prevent screen readers from reading gradient, icon badge, or scrim elements individually.

Exception: `DeckTagsRow` — if tags are useful context, they can be included in the card's `accessibilityLabel` as a comma-separated list (e.g., `"The Shawshank Redemption, movie, drama, prison, hope"`). Keep it short — max 5 tags in the label.

### 4.2 DeckActionButton (each of 5 buttons)

| Property             | Value                                   |
| -------------------- | --------------------------------------- |
| `accessibilityRole`  | `"button"`                              |
| `accessibilityLabel` | See table below                         |
| `accessibilityHint`  | See table below                         |
| `accessibilityState` | `{ disabled }` when `disabled === true` |
| `accessible`         | `true`                                  |

#### Label + hint per action

| Action    | `accessibilityLabel` | `accessibilityHint`                        |
| --------- | -------------------- | ------------------------------------------ |
| `hard_no` | `"Hard No"`          | `"Strongly dislike this and move to next"` |
| `no`      | `"No"`               | `"Dislike this and move to next"`          |
| `skip`    | `"Skip"`             | `"Skip without judging and move to next"`  |
| `yes`     | `"Yes"`              | `"Like this and move to next"`             |
| `love`    | `"Love"`             | `"Strongly like this and move to next"`    |

Labels use `CORE_ACTION_LABELS` from `types/domain/actions.ts` for the label value. Hints are static strings defined in `DeckActionButton`.

### 4.3 DeckActionBar (container)

| Property             | Value            |
| -------------------- | ---------------- |
| `accessibilityRole`  | `"toolbar"`      |
| `accessibilityLabel` | `"Card actions"` |

This groups the buttons semantically for screen readers.

### 4.4 Placeholder states

#### Loading

| Property             | Value                 |
| -------------------- | --------------------- |
| `accessibilityRole`  | `"progressbar"`       |
| `accessibilityLabel` | `"Loading next card"` |
| `accessibilityState` | `{ busy: true }`      |

Visual: centered spinner or pulsing placeholder. Must not be a blank screen.

#### Empty

| Property             | Value                                               |
| -------------------- | --------------------------------------------------- |
| `accessibilityRole`  | `"text"`                                            |
| `accessibilityLabel` | `"No cards available. Try adjusting your filters."` |

Visual: centered message with optional "Adjust filters" button (if filter modal exists).

#### Error

| Property             | Value                                  |
| -------------------- | -------------------------------------- |
| `accessibilityLabel` | `"Something went wrong loading cards"` |

The retry button inside:

| Property             | Value                       |
| -------------------- | --------------------------- |
| `accessibilityRole`  | `"button"`                  |
| `accessibilityLabel` | `"Retry"`                   |
| `accessibilityHint`  | `"Try loading cards again"` |

---

## 5) Focus Order (Web + Screen Readers)

### Expected traversal order

```
1. Card viewport (single accessible unit — title + type announced)
2. Hard No button
3. No button
4. Skip button
5. Yes button
6. Love button
```

This matches the visual left-to-right layout of the action bar. The card is announced first because it's the primary content; buttons are the actions the user can take on that content.

### Implementation notes

- React Native renders accessibility elements in tree order by default. Since the component tree places the card before the action bar, no manual `accessibilityOrder` manipulation is needed.
- On web, buttons should receive focus via `tabIndex={0}` (React Native Web handles this for `Pressable`). The card viewport does not need to be focusable — it's not keyboard-interactive.

---

## 6) Gesture vs Button Conflict Prevention

### Architectural rule (from 8A, restated)

```
GestureDetector wraps ONLY the card viewport.
ActionBar is a SIBLING, never a child of the gesture handler.
```

This means:

- Tapping any action button can never be captured by the pan gesture.
- Swiping on the card can never accidentally trigger a button.
- The two interaction modes are completely isolated in the component tree.

### Disabled state during animation

When a swipe is committed and the fly-off animation is running:

- `DeckActionBar` receives `disabled={true}`.
- All buttons show `accessibilityState={{ disabled: true }}`.
- A new gesture cannot start until the animation completes and the next card is loaded.

This prevents double-action issues (swiping and tapping simultaneously).

---

## 7) Tag Chips Design (Display-Only)

```typescript
interface DeckTagsRowProps {
  tags: string[];
  maxVisible?: number; // default 8
}
```

| Property           | Value                                                            |
| ------------------ | ---------------------------------------------------------------- |
| Container          | Horizontal `ScrollView`, `showsHorizontalScrollIndicator: false` |
| Chip height        | `28px`                                                           |
| Chip padding       | `8px` horizontal, `4px` vertical                                 |
| Chip background    | `rgba(255, 255, 255, 0.10)`                                      |
| Chip border radius | `14px` (fully rounded)                                           |
| Chip text          | `12px`, `rgba(255, 255, 255, 0.7)`                               |
| Chip spacing       | `6px` gap between chips                                          |
| Row margin top     | `10px` below tile                                                |
| Overflow           | Scrollable horizontally                                          |

Tags are display-only. They have `accessible={false}` individually — their content is included in the card's `accessibilityLabel` instead.

---

## 8) Callback Parity Rule

Both gesture and button paths must produce identical callback signatures:

```typescript
onAction(action: CoreSwipeAction, { source: 'gesture' | 'button' })
```

The `source` field is metadata for analytics/debugging. Iteration 09 (persistence) treats both sources identically — the action and entity ID are what matter.

This means:

- Removing gesture support (e.g., on web) does not break any data flow.
- Adding new button-only actions (phase 2) follows the same pattern.
- Tests can verify action parity by testing buttons and gestures separately against the same assertions.

---

## 9) Iteration 09 Compatibility Checklist

The Deck UI must expose these for Iteration 09 (swipe persistence):

| Need                 | How it's provided                                        |
| -------------------- | -------------------------------------------------------- |
| Current entity ID    | `DeckSurface` receives `entity: CatalogEntity`           |
| Action taken         | `onAction` callback receives `CoreSwipeAction`           |
| Session context      | Deck screen creates/manages session ID (not the surface) |
| Advance to next card | Deck screen updates `entity` prop after action callback  |

The surface is a pure presentation/interaction layer. Persistence, session management, and card queue logic belong to the Deck screen (tab route) or a dedicated state hook.
