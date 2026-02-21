# Iteration 7: Implement deterministic tile rendering

## Objective
Implement deterministic, legal-safe tile rendering driven by `tile_key`, with stable gradients, entity-type iconography, and robust text fallback behavior for all catalog cards.

## Why this matters
Card visuals are a core part of swipe UX. Deterministic tiles provide immediate, consistent visual identity without licensing risk, and they must remain stable across sessions/devices so users can build recognition and trust.

## Scope
### In scope
- Build reusable tile rendering primitives for Deck + Library usage.
- Derive gradient/background accents deterministically from `tile_key`.
- Map each entity `type` to a consistent icon fallback.
- Implement title/subtitle truncation and safe text fallback states.
- Add test coverage proving deterministic output contract.
- Document the tile generation contract so future refactors preserve backward compatibility.

### Out of scope
- Remote image fetching and caching.
- Licensed cover/poster provider integrations.
- Personalized/themed runtime palettes unrelated to `tile_key`.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Advise on visual layout, gradient strategy, icon mapping approach | **Gemini** | Visual/spatial reasoning for tile composition |
| Produce Codex-ready implementation brief for tile component | **Gemini** | Layout specification is Gemini's output |
| Implement hash utility, palette derivation, icon mapping | **Codex** | Algorithm + component implementation |
| Build reusable tile component and fallback rendering | **Codex** | UI component code |
| Add deterministic tests and snapshots | **Codex** | Test authoring |
| Review tile contract for backward compatibility | **Claude** | Spec enforcement |

### Parallel run opportunity
- Optionally run **Gemini** (visual layout brief) and **Codex** (hash/palette algorithm) in parallel. Gemini focuses on component hierarchy and visual specs; Codex focuses on the deterministic algorithm. Merge outputs before final implementation.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 1 (Product principles), especially:
  - Principle 5 (fast UX)
  - Principle 6 (legal-safe generated tiles by default)
- `CLAUDE.md` Section 4.1 (`tile_key` in entity contract).
- `CLAUDE.md` Section 5.2 Deck screen component expectations.
- `iterations/06-load-bundled-starter-catalog-into-sqlite.md` (ensures catalog rows contain `tile_key` and canonical type/title/subtitle fields consumed here).
- `iterations/README.md` for sequencing expectations and handoff continuity.

### Current repo implementation anchors
Inspect these areas first to align with existing architecture and naming:
- Card UI layer used by Deck preview/render path (likely under `app/`, `components/`, or `features/deck/`).
- Catalog entity typing from Iteration 05 (`types/domain/*` or equivalent).
- Any shared color/theme/token utilities in `lib/theme`, `constants`, or style utility modules.
- Existing test setup and snapshot conventions (`__tests__`, `*.test.ts(x)`, `jest` config).

### Suggested file organization
Use current conventions if they already differ; a typical structure is:
- `lib/tiles/hashTileKey.ts` (stable hash from `tile_key` string).
- `lib/tiles/paletteFromHash.ts` (map hash -> gradient colors/accent/text color).
- `lib/tiles/iconForEntityType.ts` (type -> icon key mapping).
- `components/tiles/DeterministicTile.tsx` (render tile visual + text fallback).
- `components/tiles/TileTextFallback.tsx` (truncation/line clamp/fallback display rules).
- `__tests__/tiles/deterministicTile.test.tsx` (determinism + fallback behavior assertions).

### External troubleshooting and learning resources
#### Official docs
- React Native styling and layout: https://reactnative.dev/docs/style
- React Native `Text` behavior and truncation props: https://reactnative.dev/docs/text
- Expo Vector Icons docs: https://docs.expo.dev/guides/icons/
- Expo LinearGradient docs: https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- JavaScript string hashing discussion (MDN + Web APIs context): https://developer.mozilla.org/
- WCAG color contrast understanding: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

#### Step-by-step guides
- Deterministic UI color generation concepts: https://www.freecodecamp.org/news/how-to-create-random-color-generators-in-javascript/
- React Native card UI patterns overview: https://blog.logrocket.com/building-react-native-app-with-react-native-paper/
- Jest snapshot testing in React Native: https://jestjs.io/docs/snapshot-testing

#### YouTube
- Expo channel (UI components + styling patterns): https://www.youtube.com/@expo
- React Native School (component architecture/search target): `React Native reusable component patterns`
- Fireship React Native UI quick patterns: https://www.youtube.com/@Fireship

#### GitHub repos
- Expo examples (visual/component references): https://github.com/expo/examples
- Callstack React Native Paper (component and theming patterns): https://github.com/callstack/react-native-paper
- Shopify Restyle (typed design-system ideas for RN): https://github.com/Shopify/restyle

#### Stack Overflow/discussions
- Stack Overflow `react-native`: https://stackoverflow.com/questions/tagged/react-native
- Stack Overflow `expo`: https://stackoverflow.com/questions/tagged/expo
- Stack Overflow `jestjs`: https://stackoverflow.com/questions/tagged/jestjs
- React Native Discussions: https://github.com/react-native-community/discussions-and-proposals/discussions
- Expo discussions: https://github.com/expo/expo/discussions

#### Books/long-form references
- *Refactoring UI* (practical visual consistency guidance): https://www.refactoringui.com/
- *Designing Interfaces* (interaction/visual hierarchy patterns): https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/
- *Web Content Accessibility Guidelines (WCAG) 2.1* as contrast/readability reference: https://www.w3.org/TR/WCAG21/

### When stuck
- Start from data contract: assert `tile_key`, `type`, `title`, `subtitle` inputs before rendering logic.
- Separate concerns clearly: hash -> palette, type -> icon, text -> fallback/truncation.
- Keep deterministic algorithm pure and side-effect-free (no current time, RNG, locale-dependent branching).
- Prefer small palette buckets with clear contrast checks over highly complex color math.
- Add fixed test fixtures for representative entity types and edge-case titles (empty, very long, unicode).
- Capture and document the exact hash/palette algorithm to avoid accidental visual identity drift later.

## Implementation checklist
- [ ] Add deterministic `tile_key` hash utility with stable output across JS runtimes.
- [ ] Implement hash-to-palette mapping with accessible text/overlay contrast.
- [ ] Implement entity type -> icon glyph mapping with sane unknown-type fallback.
- [ ] Build reusable tile component consumable by Deck and Library card surfaces.
- [ ] Implement resilient text fallback behavior (missing title/subtitle, truncation, line clamps).
- [ ] Add tests/snapshots validating determinism and fallback rendering.
- [ ] Document tile generation contract (algorithm + backward compatibility expectations).

## Deliverables
- Reusable deterministic tile component integrated into card UI paths.
- Shared helpers for hashing, palette derivation, and icon resolution.
- Automated tests proving stable outputs for stable inputs.
- Short contract documentation for future-safe iteration work.

## Acceptance criteria
- Same `tile_key` always produces identical visual tile tokens (palette/icon/text style inputs) across renders/devices.
- Unknown/missing `type` gracefully falls back to a default icon.
- Missing/overlong `title` and `subtitle` always render without layout breakage.
- Tile component is reusable in both Deck and Library contexts without duplicate logic.
- Test suite includes deterministic fixtures and catches regressions in hash/palette behavior.

### Definition of done evidence
- Show fixture matrix with `tile_key` -> derived palette/icon outputs and prove repeat consistency.
- Show screenshots or test snapshots for normal, missing-title, long-title, and unknown-type scenarios.
- Show a code comment/doc section freezing the algorithm contract for backward compatibility.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- tile`

## Notes for next iteration
Iteration 08 (Deck card UI controls) should consume this tile component as the default visual layer. Avoid introducing alternate visual generation paths; extend the deterministic tile helpers instead so card identity remains consistent across screens and future ranking/interaction iterations.
