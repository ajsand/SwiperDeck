# (MODEL: Gemini 3.1) Iteration 7A — Visual brief + tile composition spec

## Objective
Produce a **Codex-ready visual/layout brief** for the deterministic tile system:
- tile composition rules (icon placement, typography, spacing),
- gradient strategy and overlay rules,
- responsive behavior for Deck vs Library contexts,
- accessibility/contrast requirements,
- edge-case rendering rules (missing/long titles, unknown types).

## Why this matters
Codex can implement quickly when the component hierarchy and layout invariants are explicit.
This subtask prevents “UI churn” and locks in a stable, reusable tile design across screens.

## Scope
### In scope
- Specify deterministic tile layout for:
  - Deck card hero tile (primary visual)
  - Library list/grid tile (smaller variant)
- Define how gradients are applied (direction, stops, overlay)
- Define icon mapping approach and default fallback icon
- Define text truncation/line-clamp rules and fallback text states
- Define contrast/readability rules (must remain legible on any gradient)

### Out of scope
- Implementing actual code
- Fetching remote images or licensed posters

## Inputs / contract assumptions (from CLAUDE.md)
Tile component inputs:
- tile_key (string, required)
- type (string, required but may be unknown/unmapped)
- title (string, may be empty/missing)
- subtitle (string, may be empty/missing)
- optional tags (not required for tile)

Determinism:
- Same tile_key => same derived tokens (palette bucket, gradient choices, accent, etc.)

## Layout spec (deliverable)
Provide a layout spec that Codex can implement without redesign decisions.

### Tile variants
Define two variants (same algorithm, different sizing):
1) `variant="deck"`:
   - Recommended size: width: 100%, aspectRatio ~ 1.35–1.6 (choose one)
   - Large icon, more text space, optional subtitle line
2) `variant="library"`:
   - Recommended size: 56–72px square (choose range)
   - Small icon, 1-line title max, subtitle optional

### Composition (recommended)
- Container: rounded corners (12–20px), overflow hidden
- Background: LinearGradient (2–3 stops max)
- Optional readability overlay:
  - subtle dark scrim from bottom (for text contrast)
- Icon:
  - pinned top-left or top-right (choose one)
  - icon inside a semi-transparent pill/circle for separation
- Text:
  - Title: bold/semibold, truncated
  - Subtitle: smaller, truncated or omitted in small variant
- Empty state behavior:
  - If title missing => show "Unknown" (or "Untitled")
  - If subtitle missing => hide subtitle line entirely

### Truncation rules
Use React Native Text truncation:
- Title:
  - deck: numberOfLines={2}, ellipsizeMode="tail"
  - library: numberOfLines={1}, ellipsizeMode="tail"
- Subtitle:
  - deck: numberOfLines={1}
  - library: optional (if included, numberOfLines={1} but may be hidden)

### Icon mapping approach (high-level)
Use Expo Vector Icons:
- Use a single icon set consistently (Ionicons / MaterialCommunityIcons / Feather)
- Map entity `type` -> icon name
- Unknown type -> default icon (e.g., "help-circle" / "shapes")

Provide a mapping table for the planned types in CLAUDE.md:
- movie, tv, book, podcast, album, artist, game, team, athlete, thinker, place, concept, etc.

### Contrast/readability rules (must state explicitly)
- Ensure text remains readable regardless of gradient colors:
  - either choose palettes that always support white text,
  - or compute a contrast-safe text color and add scrim when needed.
- Target at least WCAG AA contrast for normal text (4.5:1 guidance). (Reference only; mobile UI still benefits from this rule-of-thumb.)

## Deliverable
Create a single brief doc for Codex:
- `docs/tiles/TILE_VISUAL_BRIEF.md`

Must include:
- variant specs
- exact padding/font sizes recommendations
- icon placement
- truncation rules
- fallback rules
- accessibility notes

## Acceptance criteria
- Brief is unambiguous (Codex can implement without guessing sizes/placement).
- Includes edge-case behaviors and variant rules.
- Includes icon mapping table + fallback.

## External references (official / high-signal)
- Expo LinearGradient: https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- Expo Icons guide: https://docs.expo.dev/guides/icons/
- React Native Text (numberOfLines/ellipsizeMode): https://reactnative.dev/docs/text
- WCAG contrast guidance (rule-of-thumb): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

## When stuck
- Prefer simplicity: 2-color gradient + bottom scrim + white text is the most robust baseline.
- If layout feels “off” across devices:
  - lock to aspectRatio for deck variant
  - keep library variant square
- Avoid fancy dynamic typography; stable truncation beats clever scaling.