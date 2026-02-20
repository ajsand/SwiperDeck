# Iteration 11: Incremental taste score updates

## Objective
Implement a production-safe incremental scoring pipeline that updates materialized taste tables **on each swipe event** using deterministic delta math, instead of full historical recomputation.

## Why this matters
Incremental updates are required for responsive ranking and near real-time personalization. They reduce query cost, keep recommendation state fresh after each action, and provide the foundation for warm-start ranking (Iteration 13) and exploration logic (Iteration 14).

## Scope
### In scope
- Compute per-event deltas from action weights for:
  - `entity_affinity`
  - `taste_type_scores`
  - `taste_tag_scores`
- Apply score updates in the same transaction boundary as swipe persistence.
- Ensure `skip` behavior follows spec (neutral or minimal impact only).
- Keep formulas centralized so forward apply and undo reversal share one source of truth.
- Add tests that verify deterministic, repeatable score transitions.

### Out of scope
- Full historical backfill/recompute jobs.
- Time-decay and seasonality weighting.
- Multi-objective ranking fusion (handled in later iterations).

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 6 (data model: score tables and event relationships).
- `CLAUDE.md` Section 7.1 (action weights and tuning assumptions).
- `CLAUDE.md` Section 14 (deterministic behavior and quality expectations).
- `iterations/09-persist-swipe-sessions-and-swipe-events.md` (event write contract and ordering).
- `iterations/10-implement-undo-last-swipe.md` (reversal compatibility requirements).
- `iterations/13-implement-warm-start-ranking-formula.md` (downstream consumer of these materialized scores).
- `iterations/README.md` (ordering, dependency context).

### Current repo implementation anchors
Inspect existing modules before changing score logic:
- Swipe event recorder/service from Iteration 09.
- Undo path from Iteration 10 (must reverse identical deltas safely).
- Domain types/constants for actions, entities, tags, and media types.
- Existing SQLite transaction wrapper utilities.
- Test helpers for seeded DB fixtures and deterministic clocks/IDs.

### Suggested file organization
Use current repo conventions if paths differ:
- `features/scoring/constants/actionWeights.ts`
  - canonical action → weight mapping (single source of truth)
- `features/scoring/service/calculateSwipeDeltas.ts`
  - computes normalized delta payload for entity/type/tag targets
- `features/scoring/repository/materializedScoreRepository.ts`
  - transactional upsert/increment helpers
- `features/swipes/service/recordSwipe.ts`
  - integrate score materialization into existing swipe transaction
- `__tests__/scoring/incremental-taste-score-updates.test.ts`
  - deterministic delta and transaction integrity tests

## External troubleshooting and learning resources
Use these when blocked on implementation details or edge cases.

### Official docs
- Expo SQLite API: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo SQLite guide: https://docs.expo.dev/guides/using-sqlite/
- SQLite UPSERT syntax (`INSERT ... ON CONFLICT DO UPDATE`): https://www.sqlite.org/lang_upsert.html
- SQLite transaction semantics: https://www.sqlite.org/lang_transaction.html
- SQLite query planner/indexing basics: https://www.sqlite.org/queryplanner.html
- TypeScript handbook (narrowing + discriminated unions): https://www.typescriptlang.org/docs/handbook/2/narrowing.html

### Step-by-step guides
- SQLite upsert patterns and conflict handling: https://www.sqlitetutorial.net/sqlite-upsert/
- Deterministic testing patterns in Jest: https://jestjs.io/docs/mock-functions
- Repository/service layering in TypeScript apps (practical architecture): https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/
- Event-sourcing style delta application concepts (for incremental materialization intuition): https://martinfowler.com/eaaDev/EventSourcing.html

### YouTube
- Expo channel (React Native + data layer sessions): https://www.youtube.com/@expo
- Fireship SQLite quick references for practical SQL patterns: https://www.youtube.com/@Fireship
- Hussein Nasser (database internals, transactions, consistency): https://www.youtube.com/@hnasr
- Jack Herrington (TypeScript architecture/testing workflows): https://www.youtube.com/@jherr

### Books / long-form references
- *Designing Data-Intensive Applications* (incremental views, consistency tradeoffs): https://dataintensive.net/
- *SQL Performance Explained* (indexing and update cost intuition): https://sql-performance-explained.com/
- SQLite official docs index: https://www.sqlite.org/docs.html

### GitHub repos
- Expo examples (SQLite usage in RN apps): https://github.com/expo/examples
- Expo monorepo `expo-sqlite` package: https://github.com/expo/expo/tree/main/packages/expo-sqlite
- Jest examples and patterns: https://github.com/jestjs/jest/tree/main/examples
- TypeScript ESLint rules/reference for code quality: https://github.com/typescript-eslint/typescript-eslint

### Stack Overflow / discussion boards
- Stack Overflow `expo-sqlite`: https://stackoverflow.com/questions/tagged/expo-sqlite
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Stack Overflow `typescript`: https://stackoverflow.com/questions/tagged/typescript
- Expo Discussions: https://github.com/expo/expo/discussions
- SQLite user forum: https://sqlite.org/forum/
- Reactiflux Discord (React/TS architecture help): https://www.reactiflux.com/

## Recommended implementation approach
1. **Centralize action weights** in one exported constant map used by both apply and undo code paths.
2. **Create a pure delta calculator** that receives swipe event + content metadata and returns:
   - entity delta
   - per-type delta(s)
   - per-tag delta(s)
3. **Open one transaction** in swipe-recording flow:
   - insert swipe event
   - apply delta upserts to all materialized tables
   - commit or rollback as a single unit
4. **Use deterministic upsert statements** (`ON CONFLICT`) with additive updates, not read-modify-write loops.
5. **Implement skip logic explicitly** (weight `0` or spec-defined epsilon) and test for no-op correctness.
6. **Return a debug payload** in dev/test mode (applied deltas + touched rows) to simplify troubleshooting.

## Implementation checklist
- [ ] Define/confirm canonical action weights and export from one module.
- [ ] Implement `calculateSwipeDeltas(event, itemMetadata)` as pure deterministic logic.
- [ ] Add repository methods for atomic increment/upsert in:
  - `entity_affinity`
  - `taste_type_scores`
  - `taste_tag_scores`
- [ ] Integrate score upserts into the existing swipe event transaction boundary.
- [ ] Ensure skip action behavior matches spec (neutral/minimal) and is covered by tests.
- [ ] Ensure undo path can invert exact deltas without drift.
- [ ] Add deterministic tests for liked/disliked/superliked/skipped actions.
- [ ] Add idempotency/duplication protection tests for repeated event application.

## Deliverables
- Incremental scoring module wired into swipe persistence pipeline.
- Canonical documented delta formulas and action weight constants.
- Automated tests proving transactionality and deterministic scoring updates.

## Acceptance criteria
- Every persisted swipe updates materialized score tables within the same transaction.
- Score changes for each action type match defined formulas exactly.
- Skip behavior is explicitly neutral/minimal per spec (no accidental bias).
- No full recompute query is triggered during normal swipe handling.
- Undo/reversal path can restore prior state by applying exact inverse deltas.

## Definition of done evidence
- Show one worked example (input event + metadata → expected entity/type/tag deltas).
- Show DB before/after snapshot for a successful swipe transaction.
- Show test proof for:
  - deterministic delta math,
  - transactional atomicity,
  - skip neutrality,
  - inverse delta compatibility for undo.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- scoring`
- `npm test -- swipe`

## Notes for next iteration
Iteration 12+ candidate selection and ranking should consume only these materialized tables. Keep formulas explicit and versioned so later tuning can happen safely without hidden behavior changes.
