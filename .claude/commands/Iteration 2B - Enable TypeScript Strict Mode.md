# Iteration 2B: Enable TypeScript Strict Mode (Expo-safe)

**Intended model:** GPT-5.3 Codex Extra High Fast (implementation)

## Objective
Enable TypeScript strict mode with an Expo-friendly `tsconfig.json` so:
- repo typechecking becomes deterministic and CI-safe
- the app compiles without TypeScript errors
- future iterations inherit strictness by default

## Why this matters
Strict TypeScript catches entire classes of bugs early (null/undefined hazards, implicit anys, bad narrowing) and reduces regressions as the codebase grows.

## Scope
### In scope
- Ensure `tsconfig.json` exists and extends Expo’s base config.
- Set `compilerOptions.strict: true`.
- Add/keep only the minimal options required for Expo + React Native sanity.
- Add a `typecheck` script (typically `tsc --noEmit`) if not present already.

### Out of scope
- Broad refactors for stylistic preference
- Introducing experimental TS compiler options that create churn

## Required references
- Expo TypeScript guide (extend `expo/tsconfig.base`, enable strict).  
  https://docs.expo.dev/guides/typescript/
- TypeScript strict option reference.  
  https://www.typescriptlang.org/tsconfig/strict.html
- TSConfig reference (for any compiler flag you consider adding).  
  https://www.typescriptlang.org/tsconfig/

## Repo anchors (inspect before editing)
- `tsconfig.json` (if exists)
- `package.json` scripts (is there already `tsc`, `typecheck`?)
- App TS entrypoints: `app/_layout.tsx`, `app/(tabs)/*`, `app/details/[id].tsx`

## Implementation checklist
### 1) Ensure tsconfig base is correct
- If `tsconfig.json` does not exist:
  - Prefer generating it with Expo tooling (`npx expo customize tsconfig.json`) or create it manually.
- Ensure it extends Expo base:
  - `"extends": "expo/tsconfig.base"`

### 2) Enable strict mode
Set:
- `"compilerOptions": { "strict": true }`

Keep it minimal unless the repo needs more.

### 3) Add typecheck script
In `package.json`, add/update:
- `"typecheck": "tsc --noEmit"`

If a `tsc` script already exists, do not duplicate—standardize names per Iteration 2 plan.

### 4) Fix baseline TS errors (minimal churn)
- Fix real typing issues surfaced by `strict: true` in existing TS files.
- Prefer:
  - proper type annotations
  - safe narrowing (`if (!x) return;`)
  - optional chaining
- Avoid `any` unless absolutely required; if used, comment why.

## Deliverables
- `tsconfig.json` updated (strict enabled, Expo base extended)
- `package.json` contains a working `typecheck` command
- TypeScript compilation errors resolved for existing TS files

## Acceptance criteria
- `npm run typecheck` passes on a clean checkout.

## Validation commands
- `npm run typecheck`

## Troubleshooting (“When stuck”)
- If errors appear in config/environment files:
  - ensure ESLint environments are handled separately (Iteration 2C), but TS should focus on app TS files.
- If path aliases exist, do not break them—keep existing `paths` settings.
- If TS complains about Expo types:
  - confirm `typescript` and `@types/react` dev deps exist (Expo guide).
- If you are unsure which flags to add:
  - do not add extra strict flags beyond `strict: true` unless required.

## Notes for 2C
Record any TS pain points that might require ESLint rule adjustments (e.g., unused vars patterns).