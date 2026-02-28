# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 7D — Deterministic tests + snapshots + contract freeze

## Objective
Add automated coverage that proves:
- hash/token derivation is deterministic
- component renders stable output given stable inputs
- regressions in palettes or fallback rules are caught early

## Why this matters
Deterministic tiles are “visual identity”.
Tests prevent silent drift when refactoring or adjusting styling.

## Scope
### In scope
- Unit tests for 7B token utilities
- Snapshot tests (lightweight) for DeterministicTile
- Fixture matrix covering:
  - multiple tile_keys
  - multiple types
  - missing title/subtitle
  - long/unicode titles
  - unknown type fallback
- Freeze a contract doc reference (7E writes the human doc; this subtask enforces it via tests)

### Out of scope
- Visual regression tools (Storybook + screenshot diff) — optional later
- E2E tests

## Suggested test organization
- __tests__/tiles/tileTokens.test.ts
- __tests__/tiles/deterministicTile.test.tsx
- __tests__/fixtures/tiles.ts (shared fixtures)

## Snapshot strategy (keep it maintainable)
- Prefer snapshotting *token outputs* and minimal rendered trees
- Avoid huge snapshots that change for minor layout tweaks

## Deliverables
- Deterministic token tests
- Snapshot tests for key component states
- CI-safe test command target:
  - npm test -- tile
  - OR document how to run only tile tests

## Acceptance criteria
- Tests fail if:
  - palette list changes unexpectedly
  - hash algorithm changes
  - fallback label strings change unintentionally
- Tests pass consistently across runs

## Validation commands
- npm run typecheck
- npm run lint
- npm test -- tile

## External references (official / high-signal)
- Expo unit testing with Jest (jest-expo setup + snapshot tips): https://docs.expo.dev/develop/unit-testing/
- Jest snapshot testing: https://jestjs.io/docs/snapshot-testing

## When stuck
- If Jest snapshots are noisy:
  - snapshot token objects and key props instead of full trees
- If RN testing utilities are missing:
  - follow Expo’s unit testing guide (jest-expo presets)