# Deck Gesture Zone Mapping + Layout Brief

> Codex-ready spec for the Deck screen layout, gesture handling, action buttons, and interaction thresholds.
> All values are final. Implement without design decisions.

## 1) Screen Layout

The Deck screen is split into two regions: a **card viewport** and an **action bar**.

```
┌─────────────────────────────────────┐
│          SafeAreaView               │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │                               │  │
│  │       CARD VIEWPORT           │  │  ~78% of available height
│  │    (gesture capture zone)     │  │
│  │                               │  │
│  │    ┌─────────────────────┐    │  │
│  │    │  DeterministicTile  │    │  │
│  │    │  (deck variant)     │    │  │
│  │    │                     │    │  │
│  │    │  + tags chips below │    │  │
│  │    └─────────────────────┘    │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │         ACTION BAR            │  │  ~22% / fixed 120px
│  │  [✕✕] [✕] [↻] [✓] [❤❤]     │  │
│  │  hno   no  skip yes  love     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Card viewport

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| Flex               | `1` (fills remaining space above action bar) |
| Horizontal padding | `16px` each side                             |
| Top padding        | `8px` (below safe area)                      |
| Bottom padding     | `8px` (above action bar)                     |
| Content alignment  | Center horizontal, center vertical           |
| Overflow           | Hidden (card cannot render outside viewport) |

The card viewport contains:

1. The `DeterministicTile` (deck variant, fills width minus padding)
2. Tags chips row below the tile (optional, scrollable horizontal, max 1 row)

### Action bar

| Property   | Value                                                           |
| ---------- | --------------------------------------------------------------- |
| Height     | Fixed `120px` (includes internal padding)                       |
| Padding    | `12px` top, `24px` bottom (accounts for bottom safe area inset) |
| Background | Matches screen background (no visible separator)                |
| Layout     | Row, `justifyContent: 'space-evenly'`, `alignItems: 'center'`   |

### Safe areas

- Use `useSafeAreaInsets()` from `react-native-safe-area-context` (already installed).
- Top safe area: applied above the card viewport.
- Bottom safe area: applied below the action bar (`paddingBottom: insets.bottom + 12`).

---

## 2) Gesture Zone Map

### Rule: gestures live in the card viewport ONLY

```
┌─────────────────────────────────────┐
│                                     │
│   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│   │   PAN GESTURE CAPTURE ZONE  │   │  ← Gesture.Pan() active here
│   │                             │   │
│   │   The entire card viewport  │   │
│   │   responds to horizontal    │   │
│   │   pan gestures.             │   │
│   │                             │   │
│   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   BUTTON-ONLY ZONE          │   │  ← No gesture handler here
│   │   (action bar)              │   │     Pressable only
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**The action bar is never wrapped in a gesture handler.** Buttons use `Pressable` directly. This eliminates gesture/button conflicts entirely.

### No dead zones within the card viewport

The full card viewport area captures pan gestures. No edge exclusions are needed because:

- The tile's icon badge (top-left) is not interactive.
- Tags chips below the tile are display-only in v1 (no tap actions).
- The filter button lives in the tab header (outside the viewport), not overlaid on the card.

---

## 3) Swipe Direction → Action Mapping

### Horizontal swipes only (v1)

| Gesture              | Condition                   | Action    | Label     |
| -------------------- | --------------------------- | --------- | --------- |
| Swipe right (normal) | Distance ≥ threshold        | `yes`     | "Yes"     |
| Swipe right (strong) | Distance ≥ strong threshold | `love`    | "Love"    |
| Swipe left (normal)  | Distance ≥ threshold        | `no`      | "No"      |
| Swipe left (strong)  | Distance ≥ strong threshold | `hard_no` | "Hard No" |

### No vertical swipe in v1

- Vertical movement (up or down) does **not** trigger any action.
- Vertical drag is constrained: the card follows horizontal movement only.
- `skip` is exclusively a button action (no gesture equivalent).

**Why:** Vertical swipe conflicts with system gestures (iOS swipe-to-go-back, Android navigation bar, pull-to-refresh patterns). Keeping gestures horizontal-only avoids platform-specific edge cases.

---

## 4) Thresholds

All thresholds are defined as constants that Codex exports from a config module.

### Distance thresholds

| Threshold               | Formula              | Approx value (375px screen) |
| ----------------------- | -------------------- | --------------------------- |
| `SWIPE_COMMIT_DISTANCE` | `screenWidth * 0.28` | ~105px                      |
| `STRONG_SWIPE_DISTANCE` | `screenWidth * 0.50` | ~188px                      |

Distance is measured as `Math.abs(translationX)` from the gesture's start point.

### Velocity threshold

| Threshold               | Value      |
| ----------------------- | ---------- |
| `SWIPE_COMMIT_VELOCITY` | `800` px/s |

If `Math.abs(velocityX) >= 800` at gesture end, commit the swipe even if distance is below `SWIPE_COMMIT_DISTANCE`. This handles "flick" gestures — fast, short strokes that clearly express intent.

### Horizontal intent filter

| Rule              | Formula                                                 |
| ----------------- | ------------------------------------------------------- |
| Horizontal intent | `Math.abs(translationX) > 1.5 * Math.abs(translationY)` |

If this condition is false at gesture end, the gesture is treated as "not a swipe" and the card snaps back. This prevents diagonal or mostly-vertical drags from accidentally committing an action.

### Action resolution at gesture end

```
if (!horizontalIntent):
  → cancel (snap back)

if (|translationX| >= STRONG_SWIPE_DISTANCE):
  → direction > 0 ? 'love' : 'hard_no'

if (|translationX| >= SWIPE_COMMIT_DISTANCE  OR  |velocityX| >= SWIPE_COMMIT_VELOCITY):
  → direction > 0 ? 'yes' : 'no'

else:
  → cancel (snap back)
```

This is a deterministic, sequential evaluation. No ambiguity.

---

## 5) Cancel / Settle Rules

### Snap back (cancel)

The card returns to its original position when:

- Gesture ends below both distance and velocity thresholds.
- Horizontal intent filter fails (drag was too vertical).
- User releases the card in the "ambiguous zone" (near center).

**Animation:** `withSpring` from `react-native-reanimated` with:

| Parameter   | Value |
| ----------- | ----- |
| `damping`   | `20`  |
| `stiffness` | `200` |
| `mass`      | `0.8` |

This produces a snappy return without excessive bounce.

### Commit (fly off)

When a swipe action is committed, the card animates off-screen in the swipe direction:

| Parameter     | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| Target X      | `screenWidth * 1.5 * direction` (+1 or -1)                        |
| Animation     | `withTiming`, `duration: 250`, `easing: Easing.out(Easing.cubic)` |
| On completion | Fire the action callback, advance to next card                    |

### During drag (live feedback)

While the user is dragging:

| Effect        | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Translation X | Follows finger 1:1 (`translationX` from gesture)                         |
| Translation Y | Clamped: `translationY * 0.15` (slight vertical give, not free movement) |
| Rotation      | `translationX / screenWidth * 8` degrees (subtle tilt)                   |
| Opacity       | Card stays at `1.0` during drag                                          |

---

## 6) Action Bar Buttons

### Layout: 5 buttons, evenly spaced

```
  [  ✕✕  ]   [  ✕  ]   [  ↻  ]   [  ✓  ]   [  ❤❤  ]
  hard_no      no        skip       yes        love
```

### Button specs

| Property   | Outer buttons (hard_no, love) | Inner buttons (no, yes)  | Center (skip)                 |
| ---------- | ----------------------------- | ------------------------ | ----------------------------- |
| Size       | `52 × 52px`                   | `48 × 48px`              | `44 × 44px`                   |
| Shape      | Circle                        | Circle                   | Circle                        |
| Background | `rgba(255,255,255,0.08)`      | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.06)`      |
| Border     | `1.5px` colored               | `1.5px` colored          | `1.5px rgba(255,255,255,0.2)` |
| Icon size  | `26px`                        | `22px`                   | `20px`                        |

### Button colors (border + icon)

| Action    | Color                           | Ionicons Icon          |
| --------- | ------------------------------- | ---------------------- |
| `hard_no` | `#EF4444` (red)                 | `close-circle-outline` |
| `no`      | `#F97316` (orange)              | `close-outline`        |
| `skip`    | `rgba(255,255,255,0.5)` (muted) | `refresh-outline`      |
| `yes`     | `#22C55E` (green)               | `checkmark-outline`    |
| `love`    | `#EC4899` (pink)                | `heart-outline`        |

### Button labels (accessibility)

Each button has:

```typescript
accessibilityRole="button"
accessibilityLabel={ACTION_LABELS[action]}  // e.g., "Love", "Skip"
```

### Touch feedback

Use `Pressable` with `android_ripple` and opacity feedback on iOS:

```typescript
<Pressable
  android_ripple={{ color: buttonColor, borderless: true }}
  style={({ pressed }) => [
    styles.button,
    pressed && { opacity: 0.6 }
  ]}
  onPress={() => onAction(action)}
/>
```

### Min touch target

All buttons meet the 44×44px minimum recommended touch target. The smallest button (skip, 44px) is exactly at the threshold.

---

## 7) Gesture Implementation Approach

### Library: `react-native-gesture-handler` + `react-native-reanimated`

Both are already transitive dependencies (via Expo Router / React Navigation). Add as direct dependencies for explicit version control:

```bash
npx expo install react-native-gesture-handler
```

`react-native-reanimated` is already a direct dependency (`~4.1.1`).

### Component hierarchy

```
<GestureHandlerRootView>         ← wrap root layout (app/_layout.tsx)
  ...
  <DeckScreen>
    <View style={cardViewport}>
      <GestureDetector gesture={panGesture}>
        <Animated.View>            ← animated card container
          <DeterministicTile />
          <TagsChipRow />          ← display-only
        </Animated.View>
      </GestureDetector>
    </View>
    <ActionBar onAction={handleAction} />  ← Pressable buttons, NO gesture handler
  </DeckScreen>
</GestureHandlerRootView>
```

### Hook: `useDeckSwipe`

Extract gesture logic into a reusable hook:

```typescript
interface UseDeckSwipeOptions {
  screenWidth: number;
  onSwipe: (action: CoreSwipeAction) => void;
}

interface UseDeckSwipeResult {
  gesture: GestureType;
  cardStyle: AnimatedStyle;
}

function useDeckSwipe(options: UseDeckSwipeOptions): UseDeckSwipeResult;
```

The hook owns:

- `useSharedValue` for `translationX`, `translationY`
- `Gesture.Pan()` configuration with `onUpdate`, `onEnd`
- Threshold evaluation logic
- Animated style computation (translate, rotate)

The Deck screen owns:

- The action callback (`onSwipe`)
- Card data management (current card, next card preloading)
- The action bar

---

## 8) Overlay Labels (Optional, Low Priority)

During drag, a faint label can appear indicating the pending action:

| Direction      | Label     | Color                    |
| -------------- | --------- | ------------------------ |
| Right (normal) | "YES"     | `#22C55E` at 40% opacity |
| Right (strong) | "LOVE"    | `#EC4899` at 40% opacity |
| Left (normal)  | "NOPE"    | `#F97316` at 40% opacity |
| Left (strong)  | "HARD NO" | `#EF4444` at 40% opacity |

- Position: centered on card, `fontSize: 32`, `fontWeight: '900'`, rotated -15°.
- Opacity scales from 0 at rest to target at threshold.
- This is **optional for v1** — buttons provide the primary feedback. Add only if implementation is trivial.

---

## 9) Web + Accessibility Fallback

### Web

- `react-native-gesture-handler` works on web but may have quirks.
- **Buttons are the primary fallback.** All 5 actions are accessible via button taps regardless of gesture support.
- On web, pointer events (mouse drag) should work via RNGH's web support, but if not, buttons cover all actions.

### Keyboard (future, not required in v1)

Reserve for later iteration:

- Arrow keys: left = `no`, right = `yes`
- `1-5` keys mapped to the 5 actions

### Screen readers

- Card viewport: `accessibilityLabel` = entity title + type.
- Card viewport: `accessibilityRole="adjustable"` or `"image"` — screen reader users interact via the action bar buttons, not gestures.
- Buttons: each has `accessibilityRole="button"` and `accessibilityLabel` from `ACTION_LABELS`.
- Swipe gestures are supplementary, not required for full functionality.

---

## 10) Action Callback Contract (for Iteration 09)

The Deck screen exposes a single callback that both gestures and buttons invoke:

```typescript
type DeckActionCallback = (action: CoreSwipeAction, entityId: EntityId) => void;
```

- Gestures call it after the fly-off animation completes.
- Buttons call it immediately on press.
- Iteration 09 will wire this callback to persist the swipe event in SQLite.

The callback receives only `CoreSwipeAction` (5 values), not full `SwipeAction` (7 values). Phase 2 actions (`respect`, `curious`) will be added as additional buttons in a future iteration — they never come from gestures.

---

## 11) Dependency Summary

| Package                          | Status                | Action                                                        |
| -------------------------------- | --------------------- | ------------------------------------------------------------- |
| `react-native-gesture-handler`   | Transitive dep        | `npx expo install react-native-gesture-handler` (make direct) |
| `react-native-reanimated`        | Direct dep (`~4.1.1`) | Already installed                                             |
| `react-native-safe-area-context` | Direct dep (`~5.6.0`) | Already installed                                             |
| `@expo/vector-icons`             | Direct dep            | Already installed (Ionicons for button icons)                 |

---

## 12) File Structure (Suggested)

```
components/
  deck/
    DeckCard.tsx              ← animated card wrapper (gesture + tile + tags)
    DeckActionBar.tsx         ← 5 action buttons
    DeckActionButton.tsx      ← single button component
    DeckOverlayLabel.tsx      ← optional swipe direction label
    index.ts                  ← barrel exports
hooks/
  useDeckSwipe.ts             ← gesture logic + animation hook
  useDeckSwipe.constants.ts   ← threshold constants
```
