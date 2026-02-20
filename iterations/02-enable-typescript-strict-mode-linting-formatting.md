# Iteration 2: Enable TypeScript strict mode + linting + formatting

## Objective
Harden code quality with strict TypeScript, ESLint, and Prettier configuration and scripts.

## Why this matters
Strict static checks reduce regression risk as iterative work scales.

## Scope
### In scope
- Set `strict: true` and tighten compiler options.
- Configure ESLint + Prettier with project scripts.
- Add CI-friendly commands for lint/typecheck.

### Out of scope
- Refactoring unrelated feature code to satisfy optional style preferences.

## Implementation checklist
- [ ] Update `tsconfig.json` strictness flags.
- [ ] Add/update `.eslintrc*` and `.prettierrc*`.
- [ ] Add `lint`, `lint:fix`, `typecheck`, `format` scripts.
- [ ] Resolve baseline violations so commands pass.

## Deliverables
- Config files checked in.
- Commands are documented in README or a short contributor note.

## Acceptance criteria
- `npm run lint` and `npm run typecheck` pass on a clean checkout.
- Formatting command is deterministic (second run yields no diff).

## Validation commands
- `npm run lint`
- `npm run typecheck`
- `npm run format -- --check`

## Notes for next iteration
Capture any intentionally deferred lint rules in comments with rationale.
