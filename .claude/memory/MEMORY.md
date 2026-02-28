# TasteDeck Project Memory

## Project State
- **Current iteration:** 5A complete (domain type contract), 5B/5C next
- **Schema version:** 2 (7 tables, 14 indexes, 3 FKs)
- **Framework:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9 strict

## Key Paths
- Migration DDL: `lib/db/migrations.ts`
- Schema docs: `docs/db/SCHEMA.md`
- Migration docs: `docs/db/MIGRATIONS.md`
- Domain contract: `docs/domain/ITERATION_5A_CONTRACT.md`
- Iteration commands: `.claude/commands/Iteration 5*.md`
- DB public API: `lib/db/index.ts`
- tsconfig path alias: `@/*` -> root

## Conventions
- `lib/` for runtime modules, `types/` for type definitions (planned)
- Barrel exports from `index.ts` in each module
- Tests in `__tests__/` at project root
- Quality scripts: `typecheck`, `lint`, `lint:fix`, `format`, `schema:check`

## Decisions (Iteration 5A)
- Canonical actions: hard_no, no, skip, yes, love, respect, curious (7 total)
- Core actions (Phase 1): hard_no, no, skip, yes, love (5)
- Runtime validation: handwritten guards, no Zod/Valibot
- Branded IDs: EntityId, SessionId, SwipeEventId, SnapshotId
- Domain types: `types/domain/{actions,ids,catalog,swipes,scores,snapshots,parsers,index}.ts`
- DB strength is INTEGER; `actionToDbStrength()` rounds weights; REAL migration for Phase 2
- No alias normalization; unknown actions -> undefined
