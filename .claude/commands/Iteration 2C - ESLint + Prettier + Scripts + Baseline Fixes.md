# Iteration 2C: ESLint + Prettier + Scripts + Baseline Fixes

**Intended model:** GPT-5.3 Codex Extra High Fast (implementation)

## Objective
Configure ESLint and Prettier (Expo-compatible) and add CI-friendly scripts so:
- linting catches correctness issues early
- formatting is deterministic and consistent
- future iterations inherit these rules without per-file hacks

## Why this matters
Lint + format reduce PR noise, prevent subtle bugs (hooks deps, unused variables, unsafe patterns), and keep the repo maintainable as it scales.

## Scope
### In scope
- Set up ESLint using Expo’s recommended approach (and correct config format for the SDK version).
- Install/configure Prettier and disable ESLint rules that conflict with Prettier.
- Add/update scripts:
  - `lint`, `lint:fix`, `format`, `format:check`
- Fix baseline lint issues so `npm run lint` passes.

### Out of scope
- Heavy “style-lawyer” lint rules that slow iteration velocity
- Deep architectural linting setups that cause churn

## Primary references (use these first)
- Expo guide: Using ESLint and Prettier (SDK 53+ flat config, `npx expo lint`, recommended Prettier install).  
  https://docs.expo.dev/guides/using-eslint/
- ESLint docs: getting started + flat config concepts.  
  https://eslint.org/docs/latest/use/getting-started
- typescript-eslint: setup patterns for TS linting.  
  https://typescript-eslint.io/getting-started/
- Prettier: integrating with linters + recommended approach.  
  https://prettier.io/docs/integrating-with-linters
- Prettier install tips (CI check, ignore file).  
  https://prettier.io/docs/install

## Repo anchors (inspect before editing)
- `package.json`:
  - Expo SDK version (matters for flat vs legacy ESLint config)
  - existing scripts
  - existing lint tooling deps
- ESLint config file presence:
  - `eslint.config.js` (flat) OR `.eslintrc.*` (legacy)
- Existing TS/TSX files likely to trip lint:
  - `app/_layout.tsx`, `app/(tabs)/*`, `app/details/[id].tsx`

## Implementation checklist
### 1) ESLint scaffold (Expo-recommended)
- Run `npx expo lint` to install/configure ESLint and generate the base config file (per Expo docs).
- Confirm it created:
  - a `lint` script in `package.json`
  - `eslint.config.js` (flat config) if SDK >= 53, or legacy if older

### 2) Configure ESLint properly for TS + app environments
- Ensure the config extends Expo’s config:
  - for flat config, Expo docs reference `eslint-config-expo/flat`.
- If Node globals are needed in config files (babel/metro), follow Expo guide patterns.

### 3) Install Prettier + integration packages
Per Expo docs, install:
- `prettier`
- `eslint-config-prettier`
- (optional) `eslint-plugin-prettier`

Use Expo’s recommended install command from their guide.

### 4) Choose formatting strategy (must match 2A decision)
Preferred baseline:
- Run Prettier as a separate command (not as an ESLint rule).
- Add `eslint-config-prettier` to disable conflicting ESLint formatting rules.

### 5) Add Prettier config files
Create at repo root:
- `.prettierrc` (keep minimal; avoid overly opinionated options)
- `.prettierignore` (ignore build outputs, dist, node_modules, etc.)

### 6) Add/update scripts (CI-friendly)
In `package.json`:
- `lint` (use what Expo generates; keep stable)
- `lint:fix` (eslint fix)
- `format` (prettier write)
- `format:check` (prettier check)

Notes:
- Keep scripts deterministic.
- Prefer `prettier --check .` for CI and `prettier --write .` for local formatting.

### 7) Fix baseline lint violations
Run:
- `npm run lint`
Fix issues with minimal diffs:
- unused vars: prefix `_` or adjust patterns
- React Hooks rules: fix deps arrays or refactor
- avoid disabling rules globally unless absolutely necessary

If you must disable, do it:
- narrowly (single line/file)
- with a comment explaining why

## Deliverables
- ESLint configured and runnable locally and in CI.
- Prettier configured with deterministic output.
- package.json scripts present and working.
- Baseline lint clean.

## Acceptance criteria
- `npm run lint` passes on a clean checkout.
- `npm run format:check` (or `npm run format -- --check`) passes after formatting.
- A second run of `npm run format` produces no diff.

## Validation commands
- `npm run lint`
- `npm run lint:fix` (if needed)
- `npm run format`
- `npm run format:check`

## Troubleshooting (“When stuck”)
- If ESLint config format is confusing:
  - Check Expo SDK version.
  - Expo docs explicitly call out SDK 53+ flat config vs older legacy config.
- If ESLint/Prettier conflict:
  - Ensure `eslint-config-prettier` is applied to disable conflicting ESLint formatting rules.
  - Prefer running Prettier separately instead of as an ESLint rule.
- If `npx expo lint` seems to do nothing:
  - confirm it created a `lint` script in `package.json` and run `npm run lint` directly.
  - check Expo issues/discussions for known CLI quirks.
- If formatting touches generated files:
  - expand `.prettierignore` and rerun.

## Notes for 2D
Document any rule conflicts or intentionally deferred rules so review can confirm they’re justified.