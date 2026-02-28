# (MODEL: Claude Opus 4.6 Max) Iteration 7E — Backward compatibility tile contract review + documentation

## Objective
Write and enforce the **tile algorithm contract** so future refactors do not break determinism.

This is the “spec freeze” step:
- define what must never change without explicit migration/version bump,
- document palettes/icon mapping/versioning,
- review Codex implementation against CLAUDE.md principles.

## Why this matters
Users will recognize tiles by color + icon pairing. Changing these silently breaks trust.
A written contract prevents accidental drift.

## Scope
### In scope
- Document:
  - hash algorithm choice (name + output size)
  - how tile_key is encoded (UTF-8 / TextEncoder)
  - palette set (IDs + color stops) and how selection works
  - icon mapping table (type -> icon name)
  - fallback behaviors (unknown type, missing title)
  - variant rules (deck vs library sizing constraints)
- Specify compatibility rules:
  - what changes are “allowed” without bump
  - what changes require a `TILE_ALGO_VERSION` bump
- Review Codex outputs from 7B/7C/7D for spec alignment and performance constraints

### Out of scope
- UI redesign
- Remote images

## Deliverables
- Contract doc:
  - docs/tiles/TILE_CONTRACT.md
Must include:
1) Algorithm summary
2) Frozen palette list (IDs)
3) Type->icon mapping table
4) Fallback rules
5) Versioning rules
6) Test expectations (what must remain stable)

## Acceptance criteria
- TILE_CONTRACT.md exists, is explicit, and references:
  - where the code lives (lib/tiles/*, components/tiles/*)
  - where tests live (__tests__/tiles/*)
- The contract matches actual implementation or flags deltas as TODO with risk notes.

## External references (official / high-signal)
- MDN TextEncoder: https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
- Expo LinearGradient: https://docs.expo.dev/versions/latest/sdk/linear-gradient/
- Expo Icons guide: https://docs.expo.dev/guides/icons/
- WCAG contrast guidance: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

## When stuck
- Prefer stability over “prettier colors”.
- If palettes are debated:
  - pick fewer palettes and lock them; you can add new palettes only with a version bump.
- If icon mapping is debated:
  - lock a default set and treat unknown types as a first-class fallback.