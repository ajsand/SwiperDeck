# Iteration 2D: Review Config Layering + Final Verification + Docs Note

**Intended model:** Claude Opus 4.6 Max (review / tradeoffs / enforcement)

## Objective
Review Iteration 2B/2C changes for:
- correct Expo-compatible config choices (flat vs legacy ESLint)
- conflict-free ESLint/Prettier layering
- deterministic, CI-friendly scripts
- minimal, justified baseline fixes (no accidental scope creep)

Then add a short contributor note (README or CONTRIBUTING) describing the new workflow.

## Why this matters
Tooling config is easy to get “mostly working” but subtly broken:
- formatter and linter fighting
- scripts not CI-deterministic
- rules too noisy (blocks iteration velocity)
This review locks a stable baseline for Iteration 3 (SQLite + migrations).

## Scope
### In scope
- Review `tsconfig.json`, ESLint config, Prettier config, package scripts
- Verify commands work and are deterministic
- Ensure decisions match Iteration 2A brief
- Write a short doc note for future contributors (how to run lint/typecheck/format)

### Out of scope
- Rewriting the lint ruleset to be “perfect”
- Adding pre-commit hooks (optional future iteration)

## Required references
- Expo TypeScript guide: strict + Expo base config.  
  https://docs.expo.dev/guides/typescript/
- Expo ESLint + Prettier guide (flat config notes, `npx expo lint`, install commands).  
  https://docs.expo.dev/guides/using-eslint/
- Prettier “Integrating with Linters” (avoid conflicts; plugin is optional).  
  https://prettier.io/docs/integrating-with-linters
- TypeScript strict reference.  
  https://www.typescriptlang.org/tsconfig/strict.html

## Inputs required
- The diff from 2B and 2C (files changed)
- Command output logs from:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run format:check` (or chosen equivalent)

## Review checklist (must pass)
### A) TypeScript strict correctness
- `tsconfig.json` extends `expo/tsconfig.base`
- `compilerOptions.strict` is enabled
- `npm run typecheck` uses `tsc --noEmit` (or equivalent)
- No per-file `// @ts-ignore` added without rationale

### B) ESLint config correctness (flat vs legacy)
- Matches Expo SDK expectations:
  - SDK 53+ should typically use flat config (`eslint.config.js`)
- ESLint runs deterministically via `npm run lint`

### C) Prettier integration sanity
- Prettier is the source of truth for formatting.
- ESLint does not fight Prettier formatting:
  - `eslint-config-prettier` is included where appropriate.
- Formatting is deterministic:
  - second run of Prettier yields no diff

### D) Script ergonomics
- Scripts exist and are consistent:
  - `lint`, `lint:fix`, `typecheck`, `format`, `format:check`
- No scripts rely on OS-specific behavior.

### E) Scope control
- Changes are limited to tooling + minimal baseline fixes.
- No new architectural patterns introduced.

## Acceptance criteria
- `npm run lint` passes
- `npm run typecheck` passes
- `npm run format:check` passes
- Formatting is deterministic (no diff on second format run)
- A short documentation note exists with the exact commands to run

## Definition of done evidence
- Paste the outputs of lint/typecheck/format-check into iteration notes.
- List any intentionally deferred rules (if any) with rationale and planned revisit point.

## Deliverables
1) Review report:
   - ✅ what passed
   - ❌ what failed and what to change
   - “deferred rules” list (if applicable)
2) Contributor note (README or CONTRIBUTING):
   - “Before you commit, run: …”
   - “CI expects: …”

## Troubleshooting (“When stuck”)
- If ESLint and Prettier appear to overlap:
  - confirm `eslint-config-prettier` is used to disable conflicting ESLint formatting rules
  - prefer separate Prettier command rather than ESLint rule-based formatting
- If lint differs between machines:
  - ensure lockfile is committed
  - ensure scripts don’t rely on local editor settings
- If a third-party package version concern arises:
  - prefer installing via Expo tooling when the Expo docs recommend it, and keep versions pinned via lockfile.

## Notes for Iteration 3
Confirm the final baseline:
- strict TS is on
- lint + format are stable
- scripts are documented
so SQLite/migrations work begins from a clean foundation.