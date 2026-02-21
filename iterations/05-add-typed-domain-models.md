# Iteration 5: Add typed domain models

## Objective

Create canonical TypeScript domain models, enums, and boundary mappers that mirror the SQLite schema from Iteration 04 so every layer (DB, ranking logic, UI, analytics) uses a shared, type-safe vocabulary.

## Why this matters

This iteration prevents data-shape drift. Without a single source of truth for domain types, the app will accumulate subtle bugs: inconsistent action names, nullable-field mismatches, invalid score records, and brittle feature work in later iterations.

## Scope

### In scope

- Define canonical swipe action enum/union (`hard_no`, `no`, `skip`, `yes`, `hard_yes`) plus labels/constants used across the app.
- Create typed models for:
  - catalog entities and related metadata
  - swipe sessions and swipe events
  - affinity/taste score records
  - profile snapshots and timeline points
- Add row-to-domain mapping helpers at DB boundaries.
- Add runtime-safe parsers/guards for untrusted input (external JSON, legacy rows, malformed values).
- Centralize action-to-weight constants in one reusable module.

### Out of scope

- Implementing final ranking formulas (Iterations 11–14).
- Building chart/UI rendering details (Iterations 17–20).
- Remote sync or cloud serialization contracts.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                | Model      | Rationale                                          |
| ------------------------------------------------------- | ---------- | -------------------------------------------------- |
| Define canonical types, enums, mappers, runtime guards  | **Codex**  | TypeScript type authoring is core implementation   |
| Review type completeness against Iteration 04 schema    | **Claude** | Ensure no schema fields are missed in domain types |
| Add action-to-weight constants with compile-time checks | **Codex**  | Implementation with exhaustive type checking       |

### Notes

- This is a **Codex-primary** iteration. Claude reviews type completeness after implementation.
- Gemini is not needed (no spatial/UI work).

## Agent resources and navigation map

### Source-of-truth references

- `CLAUDE.md` Section 6 (domain entities and schema intent).
- `iterations/04-create-base-database-schema-tables-and-indexes.md` (table and column names that models must mirror).
- `iterations/06-load-bundled-starter-catalog-into-sqlite.md` (upcoming import task that should consume these types).
- `iterations/README.md` for naming/sequence expectations.

### Current repo implementation anchors

- `lib/db/` migration and query modules created in Iterations 03–04 (where row shapes originate).
- Existing app/state modules under `app/` and `components/` that currently use ad-hoc object shapes.
- `tsconfig.json` strict settings (use these to drive robust types).
- `package.json` scripts (`typecheck`, `lint`) for validation.

### Suggested file organization

Prefer one central domain typing area with small focused modules instead of scattered local interfaces. Example:

- `types/domain/actions.ts` (enum/union, labels, weights, helper predicates)
- `types/domain/catalog.ts`
- `types/domain/swipes.ts`
- `types/domain/scores.ts`
- `types/domain/snapshots.ts`
- `types/domain/parsers.ts` (runtime guards/parsers)
- `types/domain/index.ts` (barrel exports)

If the project already has a `types/` convention, extend it instead of creating a parallel pattern.

### External troubleshooting and learning resources

#### Official documentation

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- TypeScript Utility Types: https://www.typescriptlang.org/docs/handbook/utility-types.html
- TypeScript Narrowing and Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- TypeScript Enums guidance: https://www.typescriptlang.org/docs/handbook/enums.html
- Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
- Zod docs (runtime validation option): https://zod.dev/

#### Step-by-step guides and practical references

- Basarat TypeScript Deep Dive (practical modeling patterns): https://basarat.gitbook.io/typescript/
- Total TypeScript guides/workshops (domain modeling and unions): https://www.totaltypescript.com/
- LogRocket guide to TypeScript type guards: https://blog.logrocket.com/how-to-use-type-guards-typescript/
- Prisma data model patterns (for entity-shape inspiration): https://www.prisma.io/docs/orm/prisma-schema/data-model

#### YouTube tutorials

- Matt Pocock / Total TypeScript channel: https://www.youtube.com/@TotalTypeScript
- Theo - t3․gg TypeScript workflow/content: https://www.youtube.com/@t3dotgg
- freeCodeCamp TypeScript full courses: https://www.youtube.com/@freecodecamp
- Search phrase for targeted help: `TypeScript domain modeling discriminated unions runtime validation`

#### Other GitHub repos to reference

- TypeScript repo examples/tests: https://github.com/microsoft/TypeScript
- Redux Toolkit TS patterns (strong typed app-domain examples): https://github.com/reduxjs/redux-toolkit
- TanStack Query TS-heavy patterns (typed boundaries/inference): https://github.com/TanStack/query
- Zod repo examples for parser design: https://github.com/colinhacks/zod

#### Stack Overflow and discussion boards

- Stack Overflow `typescript` tag: https://stackoverflow.com/questions/tagged/typescript
- Stack Overflow `zod` tag: https://stackoverflow.com/questions/tagged/zod
- Stack Overflow `expo` tag: https://stackoverflow.com/questions/tagged/expo
- TypeScript discussions: https://github.com/microsoft/TypeScript/discussions
- r/typescript subreddit: https://www.reddit.com/r/typescript/
- Expo discussions: https://github.com/expo/expo/discussions

#### Books and long-form references

- _Effective TypeScript_ by Dan Vanderkam: https://effectivetypescript.com/
- _Programming TypeScript_ by Boris Cherny: https://www.oreilly.com/library/view/programming-typescript/9781492037644/
- _TypeScript Quickly_ by Yakov Fain & Anton Moiseev: https://www.manning.com/books/typescript-quickly
- _Domain-Driven Design_ by Eric Evans (modeling principles): https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/

### When stuck

- Start from schema fidelity: map each table column from Iteration 04 to an explicit row type, then derive domain types from there.
- Prefer string-literal unions or `as const` objects for action values used in persistence; avoid numeric enums for DB-facing values.
- Keep one canonical action constant list and derive related types from it to avoid drift.
- Separate “DB row” types from “domain/view” types when nullability or field names differ.
- Use small parser/guard helpers at boundaries (seed files, JSON, unknown values) rather than trusting casts.
- If typing gets complex, introduce helper aliases incrementally (`Brand`, `Nullable<T>`, mapped utility types) and keep names explicit.

## Implementation checklist

- [ ] Add central domain typing modules for actions, catalog, swipes, scores, and snapshots.
- [ ] Define canonical swipe action value set and export strongly typed labels/metadata.
- [ ] Add shared action-to-weight mapping with compile-time completeness checks.
- [ ] Add DB row interfaces/types aligned with Iteration 04 schema naming.
- [ ] Add domain model interfaces/types consumed by business logic/UI.
- [ ] Add row-to-domain mapper helpers and (where needed) domain-to-row helpers.
- [ ] Add runtime parser/guard helpers for unknown action values and external payloads.
- [ ] Update existing imports/usages to consume central types rather than local duplicates.

## Deliverables

- Canonical typed domain model layer checked into the repository.
- Shared action constants/weights reused by DB, ranking, and UI boundaries.
- Runtime-safe parsing helpers for untrusted values.
- Reduced duplicate interface/enum definitions across the app.

## Acceptance criteria

- No duplicate swipe-action enum/union definitions remain in app code.
- Typecheck fails when an invalid action value is introduced.
- Typecheck fails when action-to-weight mapping is missing any canonical action.
- DB boundary code compiles against shared row/domain model types.
- Parsers/guards handle unknown values with explicit fallback or error behavior.

### Definition of done evidence

- Show one compile-time example where adding a new action requires updating all exhaustive mappings.
- Show at least one DB boundary (read or write) migrated to shared types.
- Document where future iterations should import canonical models from.

## Validation commands

- `npm run typecheck`
- `npm run lint`

## Notes for next iteration

Iteration 06 should import these catalog/entity types for seed ingestion so parsing + normalization logic does not invent parallel shapes.
