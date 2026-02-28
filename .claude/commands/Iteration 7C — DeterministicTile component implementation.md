# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 7C — DeterministicTile component implementation

## Objective
Build the reusable UI component:
- `DeterministicTile`
- stable gradient background via expo-linear-gradient
- icon based on entity type
- robust text fallback + truncation

## Why this matters
This component becomes the default “art” for cards without licensing risk,
and must be consistent and fast across Deck and Library.

## Scope
### In scope
- Implement `components/tiles/DeterministicTile.tsx`
- Use token utilities from 7B
- Use Expo Vector Icons for icons
- Implement variant sizing:
  - deck vs library
- Implement text fallback rules and truncation

### Out of scope
- Deck card UI (Iteration 8)
- Remote image fetching/caching
- Personalized themes unrelated to tile_key

## Preconditions
- expo-linear-gradient installed (or install in this iteration)
- Expo Vector Icons available (via @expo/vector-icons)

## Suggested file structure
- lib/tiles/* (from 7B)
- lib/tiles/iconForEntityType.ts
- components/tiles/DeterministicTile.tsx
- components/tiles/TileTextFallback.tsx (optional helper)

## Component API (recommended)
DeterministicTile props:
- tileKey: string
- type: string
- title?: string | null
- subtitle?: string | null
- variant?: 'deck' | 'library'
- style?: ViewStyle
- accessibilityLabel?: string

## Rendering rules
- Background:
  - LinearGradient with derived colors
  - add a bottom scrim overlay View for text readability
- Icon:
  - resolved by entity type mapping
  - unknown type => default icon
- Title/subtitle:
  - missing title => "Unknown"
  - title truncation:
    - deck: 2 lines
    - library: 1 line
  - subtitle optional: render only if non-empty
- Performance:
  - derive tokens using useMemo
  - React.memo the tile component if helpful

## Deliverables
- DeterministicTile component implemented and exported
- Icon mapping helper implemented with fallback
- Minimal documentation comment at component top explaining determinism contract

## Acceptance criteria
- Renders without crash for:
  - missing title/subtitle
  - empty strings
  - long unicode titles
  - unknown types
- Same tileKey => identical colors/derived icon container style
- No dependence on runtime randomness/time

## Validation commands
- npm run typecheck
- npm run lint
- npm test -- tile

## External references (official / high-signal)
- Expo LinearGradient: https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- Expo Icons guide (vector icons in Expo): https://docs.expo.dev/guides/icons/
- React Native Text truncation props: https://reactnative.dev/docs/text

## When stuck
- If LinearGradient isn’t working:
  - verify expo install + correct import path per Expo docs
  - ensure you are using the Expo package (expo-linear-gradient) not an unrelated RN gradient lib
- If text truncation behaves oddly:
  - verify numberOfLines + ellipsizeMode are set together
  - in row layouts ensure the Text has constrained width