# Tile Algorithm Contract

> Defines what must remain stable for deterministic tile rendering.
> Changing anything marked **FROZEN** without a `TILE_ALGO_VERSION` bump is a breaking change.

## Version

```
TILE_ALGO_VERSION = 1
```

## 1) Algorithm Summary

### Pipeline

```
tileKey (string)
  → hashTileKey (FNV-1a 32-bit, UTF-8 bytes via TextEncoder)
  → paletteFromHash (palette index, gradient direction, overlay, accent)
  → TileTokens { hash, paletteId, colors, gradientDirection, gradientStart, gradientEnd, textColor, overlayStyleKey, accentAlpha }
```

### Hash: FNV-1a 32-bit — FROZEN

| Property       | Value                                      |
| -------------- | ------------------------------------------ |
| Algorithm      | FNV-1a (Fowler–Noll–Vo)                    |
| Bit width      | 32-bit unsigned                            |
| Offset basis   | `0x811c9dc5` (2166136261)                  |
| Prime          | `0x01000193` (16777619)                    |
| Encoding       | UTF-8 via `TextEncoder.encode()`           |
| Output         | Unsigned 32-bit integer (`>>> 0`)          |
| Multiplication | `Math.imul` (prevents JS float truncation) |

Code location: `lib/tiles/hashTileKey.ts`

**Critical:** The hash operates on raw UTF-8 bytes, not Unicode codepoints. This means `café` (precomposed) and `cafe\u0301` (decomposed) produce **different** hashes. No Unicode normalization is applied. This is intentional — `tile_key` values are stable identifiers, not user-facing search strings.

### Token derivation from hash — FROZEN

| Token               | Derivation         | Values                       |
| ------------------- | ------------------ | ---------------------------- |
| `paletteIndex`      | `hash % 8`         | 0–7                          |
| `gradientDirection` | `(hash >>> 3) % 4` | 4 directions                 |
| `overlayStyleKey`   | `(hash >>> 5) % 2` | `scrim_soft`, `scrim_medium` |
| `accentAlpha`       | `(hash >>> 7) % 3` | `0.16`, `0.20`, `0.24`       |
| `textColor`         | Constant           | `#FFFFFF` (always white)     |

Code location: `lib/tiles/paletteFromHash.ts`

## 2) Frozen Palette List — FROZEN

8 palettes. Each has a stable string ID and two hex colors `[top, bottom]`.

| Index | ID                 | Top       | Bottom    |
| ----- | ------------------ | --------- | --------- |
| 0     | `indigo_dusk`      | `#4C1D95` | `#312E81` |
| 1     | `crimson_sun`      | `#B91C1C` | `#7F1D1D` |
| 2     | `emerald_twilight` | `#065F46` | `#115E59` |
| 3     | `ocean_night`      | `#1D4ED8` | `#0F766E` |
| 4     | `amber_deep`       | `#B45309` | `#78350F` |
| 5     | `violet_storm`     | `#7E22CE` | `#4338CA` |
| 6     | `slate_mist`       | `#334155` | `#1E293B` |
| 7     | `rose_midnight`    | `#BE185D` | `#881337` |

The palette array and each entry are `Object.freeze`-d at runtime.

Code location: `lib/tiles/paletteFromHash.ts` (`TILE_PALETTES`)

### Adding new palettes

New palettes may be **appended** to the array. This changes the modulus (`hash % N`) and redistributes some entities to new palettes. This is considered a **breaking change** that requires a `TILE_ALGO_VERSION` bump.

Never reorder, replace, or remove existing palettes.

## 3) Gradient Directions — FROZEN

4 directions, selected by `(hash >>> 3) % 4`:

| Index | Key                     | Start          | End            |
| ----- | ----------------------- | -------------- | -------------- |
| 0     | `diagonal_tl_br`        | `{x:0, y:0}`   | `{x:1, y:1}`   |
| 1     | `diagonal_tr_bl`        | `{x:1, y:0}`   | `{x:0, y:1}`   |
| 2     | `vertical_top_bottom`   | `{x:0.5, y:0}` | `{x:0.5, y:1}` |
| 3     | `horizontal_left_right` | `{x:0, y:0.5}` | `{x:1, y:0.5}` |

Code location: `lib/tiles/paletteFromHash.ts` (`DIRECTION_ORDER`, `GRADIENT_DIRECTIONS`)

## 4) Type → Icon Mapping — FROZEN

Icon set: **Ionicons** via `@expo/vector-icons/Ionicons`.

| Entity Type | Icon Name                 |
| ----------- | ------------------------- |
| `movie`     | `film-outline`            |
| `tv`        | `tv-outline`              |
| `book`      | `book-outline`            |
| `podcast`   | `mic-outline`             |
| `album`     | `disc-outline`            |
| `artist`    | `musical-notes-outline`   |
| `game`      | `game-controller-outline` |
| `team`      | `people-outline`          |
| `athlete`   | `trophy-outline`          |
| `thinker`   | `bulb-outline`            |
| `place`     | `location-outline`        |
| `concept`   | `shapes-outline`          |

Fallback (any unmapped type): `help-circle-outline`

Type strings are normalized to lowercase before lookup.

Code location: `lib/tiles/iconForEntityType.ts`

### Adding new type mappings

New entries may be added without a version bump — they only affect previously-unmapped types (which were already using the fallback icon). Existing mappings must never change.

## 5) Fallback Rules — FROZEN

| Input Condition                             | Behavior                                |
| ------------------------------------------- | --------------------------------------- |
| `title` is empty, whitespace, or null       | Display `"Untitled"`                    |
| `subtitle` is empty, whitespace, or null    | Hide subtitle element entirely          |
| `type` not in icon map                      | Use `help-circle-outline` fallback icon |
| Tile renders normally in all fallback cases | Gradient and layout are unaffected      |

Code location: `components/tiles/DeterministicTile.tsx` (`normalizeTitle`, `normalizeSubtitle`)

## 6) Variant Rules — FROZEN

### `deck` variant

| Property      | Value                                                                |
| ------------- | -------------------------------------------------------------------- |
| Aspect ratio  | `3:4` (portrait)                                                     |
| Border radius | `20px`                                                               |
| Icon badge    | `40×40` circle, top-left `(16,16)`, icon `22px`                      |
| Title         | `26px` bold, max 2 lines                                             |
| Subtitle      | `15px` regular, max 1 line, `rgba(255,255,255,0.75)`                 |
| Scrim         | Bottom gradient, top offset `45%`, alpha varies by `overlayStyleKey` |
| Text padding  | `left:20 right:20 bottom:24`                                         |

### `library` variant

| Property      | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Size          | `64×64px`                                                      |
| Border radius | `12px`                                                         |
| Icon          | Centered, `28px`, no badge container                           |
| Title         | `10px` semibold, max 1 line (small label below icon area)      |
| Subtitle      | Not rendered                                                   |
| Scrim         | Flat overlay `rgba(0,0,0,0.10)` or `0.14` by `overlayStyleKey` |

Code location: `components/tiles/DeterministicTile.tsx`

## 7) Compatibility Rules

### Changes allowed WITHOUT version bump

- Adjusting non-deterministic styling (shadow, border, animation, outer margins).
- Adding new type → icon mappings for previously unmapped types.
- Changing subtitle font weight or opacity (does not affect tile identity).
- Adding new variant keys (e.g., `variant="profile"`) with independent styling.

### Changes that REQUIRE a `TILE_ALGO_VERSION` bump

- Changing the hash algorithm (FNV-1a parameters, encoding, or implementation).
- Changing any token derivation formula (modulus, bit shift, or value arrays).
- Reordering, replacing, or removing palette entries.
- Changing palette color values (hex codes).
- Changing an existing type → icon mapping.
- Changing the fallback icon or fallback title string.
- Adding or removing palette entries (changes `hash % N` distribution).

### How to bump the version

1. Increment `TILE_ALGO_VERSION` in contract and code.
2. Update all snapshot fixtures in `test-fixtures/tiles.ts`.
3. Run `npx jest --updateSnapshot` to regenerate test snapshots.
4. Document the change reason in commit message.

## 8) Test Expectations — What Must Remain Stable

### Hash fixtures (`test-fixtures/tiles.ts`)

| tileKey                                | Expected Hash |
| -------------------------------------- | ------------- |
| `movie:movie-the-shawshank-redemption` | `3687060668`  |
| `book:book-1984`                       | `3528621556`  |
| `podcast:hardcore-history`             | `1480735700`  |
| `concept:stoicism`                     | `646912148`   |
| `unicode:café`                         | `119925020`   |
| `unicode:cafe\u0301`                   | `756723148`   |
| `unicode:こんにちは`                   | `1984463008`  |

### Snapshot tests

4 Jest snapshots frozen:

| Test                                 | File                                                            |
| ------------------------------------ | --------------------------------------------------------------- |
| Palette list                         | `__tests__/tiles/__snapshots__/tileTokens.test.ts.snap`         |
| Token derivation matrix (5 keys)     | same file                                                       |
| Single hash-to-palette result        | same file                                                       |
| Component render matrix (5 fixtures) | `__tests__/tiles/__snapshots__/deterministicTile.test.tsx.snap` |

If any snapshot changes unexpectedly, the test suite fails. This is the primary drift-prevention mechanism.

### Contract constants (`TILE_CONTRACT` in fixtures)

```typescript
TILE_CONTRACT = {
  fallbackTitle: 'Untitled',
  fallbackIcon: 'help-circle-outline',
  paletteIds: [
    'indigo_dusk',
    'crimson_sun',
    'emerald_twilight',
    'ocean_night',
    'amber_deep',
    'violet_storm',
    'slate_mist',
    'rose_midnight',
  ],
};
```

Tests verify the implementation matches these constants.

## 9) Code Locations

| Module                     | Path                                                            |
| -------------------------- | --------------------------------------------------------------- |
| Hash function              | `lib/tiles/hashTileKey.ts`                                      |
| Palette + token derivation | `lib/tiles/paletteFromHash.ts`                                  |
| Token pipeline entry       | `lib/tiles/getTileTokens.ts`                                    |
| Icon mapping               | `lib/tiles/iconForEntityType.ts`                                |
| Barrel exports             | `lib/tiles/index.ts`                                            |
| Tile component             | `components/tiles/DeterministicTile.tsx`                        |
| Component barrel           | `components/tiles/index.ts`                                     |
| Test fixtures              | `test-fixtures/tiles.ts`                                        |
| Token tests                | `__tests__/tiles/tileTokens.test.ts`                            |
| Component tests            | `__tests__/tiles/deterministicTile.test.tsx`                    |
| Token snapshots            | `__tests__/tiles/__snapshots__/tileTokens.test.ts.snap`         |
| Component snapshots        | `__tests__/tiles/__snapshots__/deterministicTile.test.tsx.snap` |

## 10) Verification Commands

```bash
npx jest __tests__/tiles/     # Run tile token + component tests (11 tests, 4 snapshots)
npm run typecheck              # TypeScript strict
npm run lint                   # ESLint
```
