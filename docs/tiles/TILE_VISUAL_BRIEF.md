# Tile Visual Brief

> Layout, styling, and composition spec for TasteDeck's deterministic tile system.
> Codex-ready: implement without design decisions. All dimensions, colors, and rules are final.

## Component: `DeterministicTile`

### Props

```typescript
interface DeterministicTileProps {
  tileKey: string;
  type: string;
  title: string;
  subtitle?: string;
  variant: 'deck' | 'library';
}
```

### Determinism contract

Same `tileKey` always produces the same visual output. The tile derives all visual tokens (palette, gradient direction, icon) deterministically from the `tileKey` string via the hash utility (Iteration 7B). No randomness, no device-specific branches.

---

## Variant: `deck`

The hero tile shown in the swipe deck. Full-width, tall, prominent.

### Dimensions

| Property      | Value                                       |
| ------------- | ------------------------------------------- |
| Width         | `100%` of parent                            |
| Aspect ratio  | `3 : 4` (0.75 width:height, i.e., portrait) |
| Border radius | `20px`                                      |
| Overflow      | `hidden`                                    |

### Layer stack (bottom to top)

```
1. LinearGradient background    (fills entire tile)
2. Bottom scrim overlay         (readability layer)
3. Type icon badge              (top-left corner)
4. Text block                   (bottom-left, over scrim)
   ├── Title
   └── Subtitle (optional)
```

### Background gradient

- Component: `expo-linear-gradient` (`LinearGradient`)
- Direction: top-to-bottom (`start={0,0}` `end={0,1}`)
- Colors: 2-stop gradient from the deterministic palette (derived from `tileKey` hash)
- The palette provides `[colorTop, colorBottom]`

### Bottom scrim overlay

A translucent dark gradient that ensures text is always readable regardless of palette:

| Property  | Value                               |
| --------- | ----------------------------------- |
| Position  | Absolute, bottom 0, full width      |
| Height    | `55%` of tile height                |
| Gradient  | Transparent → `rgba(0, 0, 0, 0.55)` |
| Direction | Top-to-bottom                       |

### Type icon badge

| Property   | Value                               |
| ---------- | ----------------------------------- |
| Position   | Absolute, `top: 16px`, `left: 16px` |
| Container  | `40 × 40px` rounded circle          |
| Background | `rgba(255, 255, 255, 0.20)`         |
| Icon size  | `22px`                              |
| Icon color | `#FFFFFF`                           |
| Alignment  | Centered in circle                  |

### Title text

| Property       | Value                                 |
| -------------- | ------------------------------------- |
| Position       | Bottom-left, inside padded text block |
| Font size      | `26px`                                |
| Font weight    | `700` (bold)                          |
| Color          | `#FFFFFF`                             |
| Line height    | `32px`                                |
| Max lines      | `2`                                   |
| Ellipsize mode | `tail`                                |
| Letter spacing | `0.2px`                               |

### Subtitle text

| Property       | Value                       |
| -------------- | --------------------------- |
| Position       | Below title, same padding   |
| Font size      | `15px`                      |
| Font weight    | `400` (regular)             |
| Color          | `rgba(255, 255, 255, 0.75)` |
| Line height    | `20px`                      |
| Max lines      | `1`                         |
| Ellipsize mode | `tail`                      |
| Margin top     | `4px` below title baseline  |

### Text block padding

| Edge   | Value  |
| ------ | ------ |
| Left   | `20px` |
| Right  | `20px` |
| Bottom | `24px` |

---

## Variant: `library`

Compact tile for list/grid display in the Library screen.

### Dimensions

| Property      | Value    |
| ------------- | -------- |
| Width         | `64px`   |
| Height        | `64px`   |
| Border radius | `12px`   |
| Overflow      | `hidden` |

### Layer stack (bottom to top)

```
1. LinearGradient background    (fills entire tile)
2. Subtle scrim overlay         (lighter than deck)
3. Type icon                    (centered)
```

Title and subtitle are **not rendered inside the library tile** — they appear as adjacent text in the list row. The tile is a pure visual thumbnail.

### Background gradient

Same algorithm as deck variant (same palette from same `tileKey`), scaled to the smaller surface.

### Scrim overlay

| Property   | Value                               |
| ---------- | ----------------------------------- |
| Position   | Absolute, full tile                 |
| Background | `rgba(0, 0, 0, 0.10)` (very subtle) |

### Type icon (centered)

| Property   | Value                |
| ---------- | -------------------- |
| Position   | Centered (both axes) |
| Icon size  | `28px`               |
| Icon color | `#FFFFFF`            |

No badge container in library variant — just the icon.

---

## Icon Mapping Table

Use `@expo/vector-icons` with the **Ionicons** set. It ships with Expo, covers all needed glyphs, and has consistent visual weight.

| Entity Type | Ionicons Name             | Glyph Reference |
| ----------- | ------------------------- | --------------- |
| `movie`     | `film-outline`            | Film strip      |
| `tv`        | `tv-outline`              | Television      |
| `book`      | `book-outline`            | Open book       |
| `podcast`   | `mic-outline`             | Microphone      |
| `album`     | `disc-outline`            | Vinyl disc      |
| `artist`    | `musical-notes-outline`   | Music notes     |
| `game`      | `game-controller-outline` | Game pad        |
| `team`      | `people-outline`          | Group of people |
| `athlete`   | `trophy-outline`          | Trophy          |
| `thinker`   | `bulb-outline`            | Light bulb      |
| `place`     | `location-outline`        | Map pin         |
| `concept`   | `shapes-outline`          | Abstract shapes |

### Fallback icon

Any `type` not in the mapping table uses:

| Fallback | `help-circle-outline` |

This is a neutral "?" circle that clearly signals "unknown type" without breaking the layout.

### Implementation

```typescript
import Ionicons from '@expo/vector-icons/Ionicons';

const TYPE_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  movie: 'film-outline',
  tv: 'tv-outline',
  book: 'book-outline',
  podcast: 'mic-outline',
  album: 'disc-outline',
  artist: 'musical-notes-outline',
  game: 'game-controller-outline',
  team: 'people-outline',
  athlete: 'trophy-outline',
  thinker: 'bulb-outline',
  place: 'location-outline',
  concept: 'shapes-outline',
};

const FALLBACK_ICON = 'help-circle-outline';

function getIconName(type: string): keyof typeof Ionicons.glyphMap {
  return TYPE_ICON_MAP[type] ?? FALLBACK_ICON;
}
```

---

## Color Palettes

A frozen array of curated gradient pairs. Each pair is chosen for:

- visual distinctiveness from neighbors,
- reliable white text contrast (all dark-enough for white text + scrim),
- no neon/fluorescent tones (eye comfort during rapid swiping).

### Palette array (16 entries)

| Index | Top Color | Bottom Color | Feel             |
| ----- | --------- | ------------ | ---------------- |
| 0     | `#1a1a2e` | `#16213e`    | Deep navy        |
| 1     | `#0f3460` | `#533483`    | Indigo-purple    |
| 2     | `#2c3e50` | `#3498db`    | Steel blue       |
| 3     | `#1b4332` | `#2d6a4f`    | Forest green     |
| 4     | `#3c1642` | `#610345`    | Dark plum        |
| 5     | `#1b3a4b` | `#065a60`    | Deep teal        |
| 6     | `#4a1942` | `#6b2737`    | Burgundy rose    |
| 7     | `#2b2d42` | `#8d99ae`    | Slate gray       |
| 8     | `#003049` | `#d62828`    | Navy-to-crimson  |
| 9     | `#14213d` | `#fca311`    | Midnight gold    |
| 10    | `#1d3557` | `#457b9d`    | Ocean blue       |
| 11    | `#264653` | `#2a9d8f`    | Coastal teal     |
| 12    | `#2d0036` | `#6a0572`    | Royal purple     |
| 13    | `#1a1423` | `#c84b31`    | Charcoal ember   |
| 14    | `#0b132b` | `#1c2541`    | Almost black     |
| 15    | `#2c061f` | `#374045`    | Dark maroon-gray |

Selection: `paletteIndex = hash(tileKey) % 16`

The palette array is **frozen** — changing it invalidates visual consistency for all existing entities. Append new palettes only; never reorder or replace.

---

## Edge Cases

### Missing or empty title

| Condition                             | Behavior                                    |
| ------------------------------------- | ------------------------------------------- |
| `title` is empty string or whitespace | Display `"Untitled"` in the title position  |
| `title` is very long (100+ chars)     | Truncated by `numberOfLines={2}` + ellipsis |

### Missing subtitle

| Condition                     | Behavior                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| `subtitle` is empty/undefined | Hide the subtitle `Text` element entirely (no empty space) |

### Unknown entity type

| Condition                   | Behavior                                  |
| --------------------------- | ----------------------------------------- |
| `type` not in icon mapping  | Use fallback icon `help-circle-outline`   |
| Tile still renders normally | Gradient, text, and layout are unaffected |

### Very short title (1–3 chars)

No special handling. The text renders at its natural size within the padded block. No minimum-width enforcement.

---

## Accessibility

### Contrast

- **All palettes use dark gradient tones.** Combined with the bottom scrim (`rgba(0,0,0,0.55)`), white title text consistently achieves WCAG AA contrast (4.5:1+).
- Subtitle uses `rgba(255,255,255,0.75)` which meets WCAG AA for large text (3:1+) against the scrim.

### Screen readers

The tile should be wrapped in an accessible container:

```typescript
accessibilityLabel={`${title}, ${type}`}
accessibilityRole="image"
```

The icon is decorative (conveyed by the label) and should have `importantForAccessibility="no"` or equivalent.

### Touch targets

The tile itself is not directly tappable — it's a visual child of the card or list row, which handles touches. No separate touch target needed on the tile.

---

## Dependency Requirements

| Package                | Status            | Notes                                                |
| ---------------------- | ----------------- | ---------------------------------------------------- |
| `expo-linear-gradient` | **Needs install** | `npx expo install expo-linear-gradient`              |
| `@expo/vector-icons`   | Already installed | Ionicons available via `@expo/vector-icons/Ionicons` |

---

## Component File Structure

```
components/
  tiles/
    DeterministicTile.tsx        — main component (deck + library variants)
    TileIconBadge.tsx            — icon badge subcomponent (deck variant)
    TileTextBlock.tsx            — title + subtitle subcomponent (deck variant)
lib/
  tiles/
    hashTileKey.ts               — FNV-1a hash (7B)
    palettes.ts                  — frozen palette array
    iconMap.ts                   — type→icon mapping + fallback
    getTileTokens.ts             — hash→palette→tokens pipeline (7B)
```

---

## Quick Reference: Deck Tile Anatomy

```
┌──────────────────────────────┐
│  ┌──────┐                    │  ← gradient top color
│  │ icon │                    │
│  └──────┘                    │
│                              │
│                              │
│                              │  ← gradient blends
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← scrim begins (55% height)
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│  ░ Title Text Here That     ░│
│  ░ May Wrap to Two Lines    ░│
│  ░ Subtitle · One Line      ░│  ← gradient bottom + scrim
└──────────────────────────────┘
     ↑ 20px padding each side
```
