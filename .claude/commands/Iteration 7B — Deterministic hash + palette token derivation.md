# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 7B — Deterministic hash + palette token derivation

## Objective
Implement pure deterministic utilities:
- stable hash from `tile_key`
- derive visual tokens from hash:
  - palette bucket
  - gradient direction (optional)
  - accent alpha / overlay choice (optional)
  - text color strategy (simple + stable)

This produces a reusable, testable “tile tokens” layer.

## Why this matters
If the algorithm changes accidentally, users lose visual recognition.
Keeping a pure token layer makes it easy to:
- snapshot determinism,
- freeze the contract,
- reuse across components/screens.

## Scope
### In scope
- Implement a stable string hashing function (no randomness, no locale dependence).
- Implement palette mapping:
  - hash -> palette index
  - palette -> gradient colors
- Implement type -> icon resolution helper (may be in 7C; okay to stub here if preferred)
- Add unit tests for determinism of hash + tokens

### Out of scope
- Full UI rendering component (7C)
- App integration into Deck/Library (7D)

## Repo anchors
- Iteration 05 domain types:
  - types/domain/catalog.ts (entity type string)
- Suggested new modules:
  - lib/tiles/hashTileKey.ts
  - lib/tiles/paletteFromHash.ts
  - lib/tiles/getTileTokens.ts

## Implementation guidance (non-negotiable determinism)
- No Math.random, Date.now, localeCompare, Intl formatting, or device-specific branches.
- Use a deterministic byte encoding of strings:
  - prefer TextEncoder (UTF-8) for consistent handling of unicode.

## Suggested algorithm
- Hash: FNV-1a 32-bit (fast, simple, stable in JS)
  - Iterate bytes from TextEncoder.encode(tile_key)
- Palette selection:
  - palettes: fixed array of gradient pairs/triples (frozen)
  - idx = hash % palettes.length
- Text color:
  - simplest: always white + add bottom scrim overlay (recommended)
  - OR compute luminance and choose white/black (only if you freeze the math and test fixtures)

## Deliverables
- Pure utilities:
  - hashTileKey(tileKey: string): number
  - paletteFromHash(hash: number): { colors: string[]; ... }
  - getTileTokens(tileKey: string): { hash, paletteId, colors, textColor, overlayStyleKey }
- Unit tests:
  - deterministic fixtures:
    - same tile_key => same hash/tokens
    - different tile_keys => stable differences
    - unicode tile_key determinism

## Acceptance criteria
- Same `tile_key` produces identical tokens on repeated runs.
- Tokens are stable for unicode input.
- Palette list is frozen and referenced by ID (string or index).
- Tests fail if palette list or hash logic changes unintentionally.

## Validation commands
- npm run typecheck
- npm run lint
- npm test -- tile

## External references (official / high-signal)
- MDN TextEncoder (UTF-8 deterministic bytes): https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
- Expo LinearGradient API expectations: https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- WCAG contrast guidance (if choosing dynamic text color): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

## When stuck
- Choose the robust baseline: fixed palettes that always use white text + bottom scrim.
- If tests are flaky:
  - ensure you do not rely on object key order for snapshots
  - compare primitive token fields (hash, paletteId, colors).