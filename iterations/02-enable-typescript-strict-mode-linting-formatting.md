# Iteration 2: Enable TypeScript strict mode + linting + formatting

## Objective
Harden code quality with strict TypeScript, ESLint, and Prettier configuration and scripts.

## Why this matters
Strict static checks reduce regression risk as iterative work scales, especially before database, ranking, and UI complexity are added in later iterations.

## Scope
### In scope
- Set `strict: true` and tighten compiler options for Expo/React Native TypeScript workflows.
- Configure ESLint + Prettier with project scripts and conflict-free rule layering.
- Add CI-friendly commands for lint/typecheck/format checks.
- Establish baseline conventions that future iterations must follow.

### Out of scope
- Refactoring unrelated feature code to satisfy optional style preferences.
- Introducing heavy architectural lint rule sets that block delivery velocity.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Configure tsconfig, ESLint, Prettier; fix baseline violations | **Codex** | Tooling configuration is implementation work |
| Add package.json scripts (`lint`, `typecheck`, `format`) | **Codex** | Script setup is straightforward implementation |
| Review config decisions if ESLint/Prettier conflict arises | **Claude** | Tradeoff analysis for config layering |

### Notes
- This is a **Codex-primary** iteration. No spatial/layout work; Gemini is not needed.
- Claude should review only if there are ambiguous config conflicts between ESLint and Prettier.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 1 (Product Principles: quality + stability), Section 17 (iterative sequence), and quality guardrail themes throughout the document.
- `iterations/README.md` for sequencing and consistency across iteration files.

### Current repo implementation anchors
- `tsconfig.json`: compiler strictness and Expo TypeScript defaults.
- `package.json`: scripts to add/update (`lint`, `lint:fix`, `typecheck`, `format`, and optionally `format:check`).
- `app/` TypeScript files (starting with `app/_layout.tsx` and `app/(tabs)/*.tsx`): baseline files that must remain type-clean after stricter checks.
- Root config files you may add/update:
  - `.eslintrc.js` / `.eslintrc.cjs` / `eslint.config.js`
  - `.prettierrc`, `.prettierignore`, `.eslintignore`

### External troubleshooting and learning resources
- Official docs:
  - TypeScript `strict` and TSConfig reference: https://www.typescriptlang.org/tsconfig#strict
  - TypeScript handbook (everyday types + narrowing): https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  - Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
  - Expo linting guide: https://docs.expo.dev/guides/using-eslint/
  - ESLint docs (new/flat + legacy config concepts): https://eslint.org/docs/latest/
  - eslint-config-prettier (turning off formatting-conflicting rules): https://github.com/prettier/eslint-config-prettier
  - Prettier docs/options: https://prettier.io/docs/en/

- Step-by-step guides:
  - TypeScript + ESLint + Prettier setup walkthrough (official TS-ESLint docs): https://typescript-eslint.io/getting-started/
  - Prettier + ESLint integration explainer: https://prettier.io/docs/en/integrating-with-linters.html
  - React Native + ESLint practical guide (React Native docs/community): https://reactnative.dev/docs/typescript

- Video walkthroughs (YouTube):
  - TypeScript official channel/resources: https://www.youtube.com/@TypeScript
  - Expo channel setup videos: https://www.youtube.com/@expo
  - Search phrase for targeted help: `Expo TypeScript strict mode ESLint Prettier setup`

- Reference repositories:
  - Expo examples (real-world config patterns): https://github.com/expo/examples
  - Expo monorepo (current lint/type practices): https://github.com/expo/expo
  - typescript-eslint monorepo (config examples/issues): https://github.com/typescript-eslint/typescript-eslint

- Community Q&A and discussion boards:
  - Stack Overflow (`typescript`, `eslint`, `prettier`, `expo` tags):
    - https://stackoverflow.com/questions/tagged/typescript
    - https://stackoverflow.com/questions/tagged/eslint
    - https://stackoverflow.com/questions/tagged/prettier
    - https://stackoverflow.com/questions/tagged/expo
  - ESLint Discussions: https://github.com/eslint/eslint/discussions
  - TypeScript Discussions: https://github.com/microsoft/TypeScript/discussions
  - Expo Discussions: https://github.com/expo/expo/discussions

- Books / long-form references:
  - *Effective TypeScript* by Dan Vanderkam (practical strict-mode patterns): https://effectivetypescript.com/
  - *Programming TypeScript* by Boris Cherny: https://www.oreilly.com/library/view/programming-typescript/9781492037644/

### When stuck
- Start with TypeScript strictness first (`strict: true`) and resolve surfaced issues before layering additional ESLint strictness.
- Keep ESLint focused on correctness and maintainability; avoid noisy stylistic rules already handled by Prettier.
- If ESLint and Prettier conflict, ensure `eslint-config-prettier` is applied last in extends/config sequence.
- Ensure scripts are deterministic and CI-safe (`--max-warnings=0` where appropriate).
- Prefer incremental tightening: establish a clean baseline now, then add stricter rules in future iterations only when needed.

## Implementation checklist
- [ ] Update `tsconfig.json` strictness flags (minimum: `strict: true`; optionally explicit strict sub-flags if needed).
- [ ] Add/update ESLint config for Expo + TypeScript compatibility.
- [ ] Add/update Prettier config and ignore files.
- [ ] Add scripts in `package.json`: `lint`, `lint:fix`, `typecheck`, `format` (and optionally `format:check`).
- [ ] Resolve baseline violations so lint/typecheck pass on a clean checkout.
- [ ] Document commands in `README.md` or contributor note.

## Deliverables
- Config files checked in and discoverable at repo root.
- Package scripts available for local dev and CI pipelines.
- Short documentation note describing expected workflow (`lint` before commit, `format` for style consistency).

## Acceptance criteria
- `npm run lint` and `npm run typecheck` pass on a clean checkout.
- Formatting command is deterministic (second run yields no diff).
- New TypeScript files in later iterations inherit strict settings without per-file overrides.

### Definition of done evidence
- Paste command outputs for lint/typecheck/format-check into task execution notes.
- If any lint rules are intentionally deferred, list each rule and rationale in the iteration notes.

## Validation commands
- `npm run lint`
- `npm run typecheck`
- `npm run format -- --check`

## Notes for next iteration
Record any deferred strictness/rule decisions so Iteration 03 (SQLite + migration framework) begins from a stable, enforced code-quality baseline.
