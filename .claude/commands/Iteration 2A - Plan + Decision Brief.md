# Iteration 2A: Plan + Decision Brief (Strict TS / ESLint / Prettier)

**Intended model:** Claude Opus 4.6 Max (orchestrator / decision brief / conflict resolution)

## Objective
Produce a Codex-ready plan and decision brief for enabling:
- TypeScript `strict: true` (Expo/React Native-safe)
- ESLint + Prettier (conflict-free layering)
- CI-friendly scripts: `lint`, `typecheck`, `format`, `format:check` (or equivalent)

This subtask does **no implementation**—it locks decisions so Iteration 2B/2C can execute with minimal churn.

## Why this matters
Quality gates established early prevent later “fix a thousand papercuts” when database, ranking, and UI complexity scale.

## Scope
### In scope
- Inspect repo state and choose the correct configuration approach:
  - Expo SDK version implications (ESLint flat config vs legacy config)
  - tsconfig baseline + strict toggle
  - lint vs format responsibilities (ESLint for correctness; Prettier for formatting)
- Produce a Task Brief with:
  - exact files to create/edit
  - exact scripts to add
  - “baseline violations” strategy (fix now vs defer with rationale)

### Out of scope
- Actually editing config files (Codex does 2B/2C)
- Large refactors that aren’t required to get clean lint/typecheck baseline

## Required pre-reads (repo + docs)
### Repo inspection checklist
- [ ] Read `/CLAUDE.md` Section 13 (Quality Guardrails) and Section 17 (iteration order).
- [ ] Inspect `package.json`:
  - Expo SDK version (important for ESLint config format)
  - existing scripts (`lint`, `typecheck`, `format`, `tsc`, etc.)
  - existing devDependencies (eslint/prettier already present?)
- [ ] Inspect whether these exist:
  - `tsconfig.json`
  - `eslint.config.js` (flat config) vs `.eslintrc.*` (legacy)
  - `.prettierrc*`, `.prettierignore`
- [ ] Identify baseline TypeScript files most likely to surface errors:
  - `app/_layout.tsx`, `app/(tabs)/*`, `app/details/[id].tsx`

### External references (agent should use these first)
- Expo TypeScript guide (extend `expo/tsconfig.base`, enable `strict`). https://docs.expo.dev/guides/typescript/
- Expo ESLint + Prettier guide:
  - SDK 53+: flat config default
  - `npx expo lint` creates `eslint.config.js` extending `eslint-config-expo/flat`
  - recommended prettier install command. https://docs.expo.dev/guides/using-eslint/
- TypeScript strict option reference: https://www.typescriptlang.org/tsconfig/strict.html
- typescript-eslint getting started (flat + legacy patterns): https://typescript-eslint.io/getting-started/
- Prettier integrating with linters (how to avoid conflicts): https://prettier.io/docs/integrating-with-linters
- ESLint getting started (CLI behavior, config basics): https://eslint.org/docs/latest/use/getting-started

## Critical decisions to lock (write them down)
### Decision 1 — ESLint config style: flat vs legacy
Expo docs: SDK 53+ uses flat config by default; SDK 52 and earlier uses legacy config. Decision must match repo’s Expo SDK. (Check `package.json`.)  
Outcome should be one of:
- Flat config: `eslint.config.js` (preferred if SDK >= 53)
- Legacy config: `.eslintrc.cjs` / `.eslintrc.js` (only if needed)

### Decision 2 — How Prettier runs
Pick one:
A) **Preferred**: Prettier as a separate formatter command (`prettier --check .`, `prettier --write .`), while ESLint focuses on correctness and uses `eslint-config-prettier` to disable conflicting style rules.
B) Optional: run Prettier as an ESLint rule via `eslint-plugin-prettier` (can be noisy; only do if the repo explicitly wants it).

### Decision 3 — Strictness scope
Minimum required: `compilerOptions.strict = true` (Expo encourages this for stricter type checking).  
If additional strict flags are proposed, justify them and keep changes minimal.

## Deliverable: Task Brief for Codex (fill-in template)
> Codex should be able to implement Iteration 2 without guessing.

### Problem statement
Enable strict TypeScript + ESLint + Prettier with CI-friendly scripts so `npm run lint` and `npm run typecheck` pass on a clean checkout.

### Constraints
- Keep changes scoped to tooling + minimal baseline fixes.
- Do not add “opinionated” style rules already covered by Prettier.
- Prefer Expo-recommended approaches when available.

### Files to create/edit (expected)
- `tsconfig.json` (or update)
- `eslint.config.js` OR `.eslintrc.*` (choose based on Decision 1)
- `.prettierrc` (or `.prettierrc.json`) + `.prettierignore`
- Optional: `.editorconfig`
- `package.json` scripts

### Scripts to add/update (expected names)
- `lint` (CI-friendly, ideally fails on warnings if desired)
- `lint:fix`
- `typecheck` (usually `tsc --noEmit`)
- `format` (prettier write)
- `format:check` (prettier check)

### Baseline fix policy
- Fix real issues surfaced by strict TS and lint.
- If a rule causes widespread non-critical churn, document and defer it explicitly.

### Acceptance checklist
- `npm run lint` passes
- `npm run typecheck` passes
- `npm run format:check` passes (or `npm run format -- --check` if that’s your chosen API)
- Formatting is deterministic (second run yields no diff)

## “When stuck” decision guide
- If ESLint setup is confusing: default to Expo docs approach:
  - run `npx expo lint` for baseline scaffold
  - then add Prettier integration
- If rules conflict: ensure `eslint-config-prettier` is applied last and keep Prettier as separate script.
- If TypeScript errors explode: tighten slowly—confirm tsconfig extends Expo base first, then flip `strict: true`.

## Handoff to Iteration 2B/2C
Provide:
- final decisions (flat vs legacy, prettier strategy)
- exact files/scripts list
- any repo-specific quirks discovered (existing scripts, config files, SDK version)