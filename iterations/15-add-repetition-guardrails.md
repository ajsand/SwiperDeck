# Iteration 15: Add repetition guardrails

## Objective
Introduce a repetition-control layer in the recommendation/deck selector so users do not see near-duplicate sequences of cards. The layer should block immediate repeats, suppress over-exposed entities/tags over a short horizon, and degrade gracefully when constraints become too strict.

## Why this matters
Even strong relevance models feel “broken” if users repeatedly see the same entity or the same category cluster. Repetition guardrails improve:
- perceived novelty and session quality,
- trust in recommendation diversity,
- engagement/retention for swipe-heavy interactions,
- compatibility with Iteration 14 exploration (exploration without repetition loops).

This iteration establishes production-safe novelty constraints before later tuning/personalization controls.

## Scope
### In scope
- Add recent-history tracking for served entity IDs (session-local and short rolling horizon).
- Block immediate repeats and near-immediate repeats using configurable windows.
- Add same-tag streak cap (or equivalent group/category cap) to avoid short-run clustering.
- Integrate guardrails into candidate-selection pipeline after eligibility/ranking and before final selection emission.
- Add fallback/degradation strategy when guardrails over-constrain candidate pool.
- Add telemetry for guardrail behavior and fallback reasons.
- Add deterministic tests that validate guardrail behavior under seeded/replayable input order.

### Out of scope
- Long-term novelty modeling across weeks/months.
- Full diversity re-ranking optimization (MMR/xQuAD) across full recommendation slate.
- Cross-device synchronized repetition history.
- Real-time adaptive threshold learning (online RL/bandits tuning).

## Core guardrail concepts
- **Recent entity window**: short rolling memory of recently shown entity IDs.
- **Hard block**: immediate exclusion of candidates that violate strict repetition policy (e.g., same ID as last served, within N recent IDs).
- **Tag streak cap**: max allowed consecutive cards sharing same primary tag/category.
- **Soft suppression (optional)**: apply score penalty before hard exclusion for partial violations when policy supports it.
- **Fallback mode**: controlled relaxation order when constraints leave no valid candidates.

## Data/contracts and integration points
### Upstream contract
- Input candidates are already filtered/ranked from previous iterations (including Iteration 13/14).
- Candidate records include stable entity ID and category/tag metadata needed by streak logic.

### Iteration 15 contract
- Add/extend a guardrail entrypoint, e.g.:
  - `applyRepetitionGuardrails(rankedCandidates, recentHistory, policyConfig) -> GuardrailResult`
- `GuardrailResult` should include:
  - selected candidate (or filtered candidate list, depending on pipeline shape),
  - guardrail metadata (`blockedByRecent`, `blockedByTagStreak`, `fallbackMode`, `historyWindowSize`),
  - optional diagnostics (`candidatePoolBefore`, `candidatePoolAfter`, `relaxationStep`).

### Downstream expectations
- Selector remains deterministic for identical inputs + seed/config.
- Guardrail decisions are observable in telemetry/logging.
- UI receives normal selected card object; guardrail internals remain transparent unless needed for debugging.

## Recommended implementation approach
1. **Define policy config with safe defaults**
   - Example knobs: `recentEntityWindow`, `maxSameTagStreak`, `allowSoftPenalty`, `fallbackRelaxationOrder`.
2. **Implement recent-history state helper**
   - Encapsulate append/read/prune behavior.
   - Keep bounded memory and deterministic ordering.
3. **Compute blocking predicates**
   - `isRecentlySeen(entityId)`
   - `violatesTagStreak(candidateTag, recentHistory)`
4. **Apply guardrails in pipeline**
   - Start with ranked candidates.
   - Remove hard-blocked items.
   - Optionally apply soft suppression for borderline cases.
5. **Fallback when pool is empty/too small**
   - Relax constraints in explicit order (e.g., relax tag streak before recent-entity hard block except immediate-repeat block).
   - Preserve invariant: never allow immediate back-to-back identical entity unless no viable alternative and policy explicitly permits emergency fallback.
6. **Emit telemetry and debug metadata**
   - Track counts and reasons (`blocked_recent`, `blocked_tag_streak`, `fallback_step`).
7. **Test deterministically**
   - Seeded/replayable inputs proving same outputs under same state and config.

## Implementation checklist
- [ ] Add repetition guardrail config constants with documented defaults.
- [ ] Implement recent-history helper/store (bounded window + query APIs).
- [ ] Add immediate-repeat hard block.
- [ ] Add N-window recent-entity exclusion.
- [ ] Add same-tag streak cap enforcement.
- [ ] Integrate guardrail evaluation into selector/recommendation pipeline.
- [ ] Implement explicit fallback relaxation order for over-constrained pools.
- [ ] Emit telemetry for guardrail decisions and fallback reasons.
- [ ] Add unit/integration tests for deterministic and edge-case behavior.

## Deliverables
- Production-ready repetition guardrail layer integrated into deck selection.
- Configurable policy knobs for repetition window and tag streak cap.
- Telemetry/logging fields for monitoring novelty protections.
- Test suite covering normal, edge, and fallback scenarios.

## Acceptance criteria
- Immediate entity repeats are blocked in normal operation.
- Short-horizon repeated entities respect configured window constraints.
- Same-tag streaks do not exceed configured cap unless explicit fallback is triggered.
- Over-constrained pools degrade gracefully with deterministic, logged fallback behavior.
- Guardrail metadata is emitted for observability and tuning.

## Definition-of-done evidence
Include in PR notes or linked artifacts:
- Reproduction showing immediate-repeat prevention in sequence simulation.
- Edge-case matrix: empty pool, single candidate, all candidates recently seen, single-tag catalog.
- Determinism proof for seeded/replayed scenario.
- Telemetry samples showing block/fallback reason fields.
- Before/after sequence example demonstrating reduced repetition clusters.

## Concrete testing requirements
- **Immediate repeat test**
  - Last shown ID must not be selected next when alternatives exist.
- **Recent window exclusion tests**
  - IDs inside configured window are excluded; IDs outside window are eligible.
- **Tag streak cap tests**
  - Consecutive same-tag cards capped at configured threshold.
- **Fallback tests**
  - When all candidates blocked, relaxation order is deterministic and logged.
- **Compatibility tests**
  - Guardrails coexist with Iteration 14 exploration and preserve candidate payload/metadata contracts.
- **Property-style sequence test (optional but recommended)**
  - Simulate long sequence and assert max repeat/streak invariants.

## File-location hints (repo navigation)
Likely implementation points:
- recommendation/deck selection orchestration modules,
- policy/config constants,
- swipe/session history persistence or in-memory session state utilities,
- recommendation-focused unit/integration test directories.

Useful search strings:
- `recentHistory`
- `repetition`
- `guardrail`
- `streak`
- `tag`
- `candidate selector`
- `selection policy`

## Resources when stuck

### YouTube tutorials
- Recommender systems diversity/novelty (search): https://www.youtube.com/results?search_query=recommender+systems+diversity+novelty
- Multi-armed bandits for recommenders (StatQuest/search): https://www.youtube.com/results?search_query=statquest+multi+armed+bandit
- Production recommendation system design walkthroughs: https://www.youtube.com/results?search_query=production+recommender+system+design

### Official docs
- Expo docs (app/runtime constraints): https://docs.expo.dev/
- React Native performance/runtime docs: https://reactnative.dev/docs/performance
- TypeScript handbook (utility types, strict typing): https://www.typescriptlang.org/docs/
- Jest docs (unit/integration test patterns): https://jestjs.io/docs/getting-started
- SQLite docs (if history persisted in DB): https://www.sqlite.org/docs.html

### Step-by-step guides / blogs
- Recommender-system metrics: diversity/novelty/serendipity: https://eugeneyan.com/writing/serendipity-and-accuracy-in-recommender-systems/
- Practical recommendation architecture patterns: https://netflixtechblog.com/tagged/recommendations
- Diversity-aware recommendation overview (MMR concept): https://www.cs.cmu.edu/~jgc/publication/The_Use_MMR_Diversity_Based_LTMIR_1998.pdf
- Building robust fallback logic in ranking systems (industry patterns): https://research.google/pubs/pub45530/

### Books
- *Recommender Systems Handbook*: https://link.springer.com/book/10.1007/978-1-4899-7637-6
- *Practical Recommender Systems* (Manning): https://www.manning.com/books/practical-recommender-systems
- *Designing Data-Intensive Applications* (fallback/state patterns): https://dataintensive.net/

### GitHub repos
- Microsoft Recommenders (evaluation + diversity examples): https://github.com/recommenders-team/recommenders
- RecBole (ranking/diversity experimentation): https://github.com/RUCAIBox/RecBole
- LensKit (recommendation research toolkit): https://github.com/lenskit/lkpy
- Cornac (recommender library with evaluation focus): https://github.com/PreferredAI/cornac

### Stack Overflow tags
- `recommendation-engine`: https://stackoverflow.com/questions/tagged/recommendation-engine
- `algorithm`: https://stackoverflow.com/questions/tagged/algorithm
- `typescript`: https://stackoverflow.com/questions/tagged/typescript
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs
- `sqlite`: https://stackoverflow.com/questions/tagged/sqlite

### Discussion boards
- Cross Validated (recommender/diversity discussions): https://stats.stackexchange.com/questions/tagged/recommender-systems
- Reddit r/recommendersystems: https://www.reddit.com/r/recommendersystems/
- Reddit r/MachineLearning: https://www.reddit.com/r/MachineLearning/
- Hacker News discussions on recommender design: https://news.ycombinator.com/

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- repetition-guardrails`
- `npm test -- recommendation`

## Notes for next iteration
Iteration 16 (filter modal controls) should expose user-configurable diversity/repetition preferences safely, without allowing settings that fully disable anti-repeat protections in normal operation.
