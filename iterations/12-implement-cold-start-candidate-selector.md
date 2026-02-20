# Iteration 12: Implement cold-start candidate selector

## Objective
Implement a deterministic cold-start candidate selector for users with sparse history that balances popularity and diversity across active media-type filters.

## Why this matters
Cold-start quality determines first-session retention. If recommendations are only mainstream, users churn from repetitiveness; if only diverse, users may not recognize enough cards to provide signals. This selector must provide an intentional blend that is both engaging and learnable.

## Scope
### In scope
- Detect cold-start state using a clear swipe-count threshold.
- Generate candidate pool from `catalog_entities` constrained by active type filters.
- Blend popularity-weighted sampling with diversity balancing:
  - per-type quotas
  - tag repetition caps/penalties
- Exclude recently shown entities and explicit exclusion IDs.
- Use deterministic tie-breakers and seeded randomness for reproducible tests/debugging.
- Return selector diagnostics useful for later warm-start handoff (`reason`, `bucket`, `quotaFill`).

### Out of scope
- Personalized warm-start scoring formula (Iteration 13).
- ε-greedy exploration policy (Iteration 14).
- Long-window repetition guardrails beyond the cold-start query horizon (Iteration 15).

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 1 (product principle: practical ranking behavior).
- `CLAUDE.md` Section 8.1–8.2 (candidate pool and cold-start strategy).
- `CLAUDE.md` Section 17 task #12 (exact backlog intent).
- `iterations/09-persist-swipe-sessions-and-swipe-events.md` (history source used for threshold/recent excludes).
- `iterations/10-implement-undo-last-swipe.md` (event history consistency expectations).
- `iterations/11-incremental-taste-score-updates.md` (upstream signal pipeline completed before cold-start/warm-start handoff).
- `iterations/13-implement-warm-start-ranking-formula.md` (downstream interface compatibility).
- `iterations/README.md` (dependency order and sequence constraints).

### Current repo implementation anchors
Inspect these before implementing to avoid duplicate logic:
- Catalog repository/query layer used by deck loading.
- Existing deck candidate service (if present) and filter-state model.
- Swipe history/recently-shown retrieval utilities.
- Shared deterministic utilities (seeded RNG, stable sort comparator, hash helpers).
- Test fixture factories for catalog entities and sessions.

### Suggested file organization
Use repo conventions if paths differ:
- `features/recommendation/constants/coldStartConfig.ts`
  - threshold, type quotas, popularity/diversity blend weights, default candidate limits
- `features/recommendation/service/isColdStartUser.ts`
  - pure threshold helper based on swipe-event count
- `features/recommendation/service/selectColdStartCandidates.ts`
  - main selector orchestration with deterministic sampling
- `features/recommendation/repository/candidateRepository.ts`
  - SQL queries for filtered catalog retrieval + excludes
- `__tests__/recommendation/cold-start-selector.test.ts`
  - deterministic selection behavior, diversity, and edge cases

## External troubleshooting and learning resources
Use these when implementation details are unclear.

### Official docs
- Expo SQLite API: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo SQLite usage guide: https://docs.expo.dev/guides/using-sqlite/
- SQLite window functions (useful for per-type quotas/ranking): https://www.sqlite.org/windowfunctions.html
- SQLite common table expressions (`WITH`): https://www.sqlite.org/lang_with.html
- SQLite `ORDER BY` behavior and deterministic sorting: https://www.sqlite.org/lang_select.html
- TypeScript handbook (utility + generics for selector contracts): https://www.typescriptlang.org/docs/handbook/2/generics.html

### Step-by-step guides
- SQL top-N-per-group approaches (for type quotas): https://www.sqlitetutorial.net/sqlite-window-functions/sqlite-row_number/
- Weighted random sampling overview (implementable with seeded RNG): https://en.wikipedia.org/wiki/Reservoir_sampling
- Stable sorting and comparator design in JS/TS: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
- Deterministic tests in Jest (seed/time control): https://jestjs.io/docs/mock-functions

### YouTube
- Expo channel (app data + architecture walkthroughs): https://www.youtube.com/@expo
- Hussein Nasser (database query/consistency tradeoffs): https://www.youtube.com/@hnasr
- ThePrimeagen / Jack Herrington content on deterministic TS architecture/testing: https://www.youtube.com/@jherr
- Fireship SQL refreshers for fast practical query ideas: https://www.youtube.com/@Fireship

### Books / long-form references
- *Designing Data-Intensive Applications* (sampling tradeoffs, ranking system intuition): https://dataintensive.net/
- *Recommender Systems Handbook* (cold-start and diversity concepts): https://link.springer.com/book/10.1007/978-1-4899-7637-6
- *Bandit Algorithms* (explore/exploit context for future iterations): https://tor-lattimore.com/downloads/book/book.pdf
- SQLite official documentation index: https://www.sqlite.org/docs.html

### GitHub repos
- Expo examples (SQLite + app patterns): https://github.com/expo/examples
- Expo `expo-sqlite` package source: https://github.com/expo/expo/tree/main/packages/expo-sqlite
- LensKit (recommender algorithm references): https://github.com/lenskit/lkpy
- RecBole (recommender baselines and evaluation concepts): https://github.com/RUCAIBox/RecBole
- Jest examples: https://github.com/jestjs/jest/tree/main/examples

### Stack Overflow / discussion boards
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Stack Overflow `expo-sqlite`: https://stackoverflow.com/questions/tagged/expo-sqlite
- Stack Overflow `recommendation-engine`: https://stackoverflow.com/questions/tagged/recommendation-engine
- Expo Discussions: https://github.com/expo/expo/discussions
- SQLite user forum: https://sqlite.org/forum/
- r/recommendersystems (practical model/design discussion): https://www.reddit.com/r/recommendersystems/

## Recommended implementation approach
1. **Define cold-start threshold** in config (for example: `swipeCount < 30`) and keep it tunable.
2. **Build filtered base pool query** from `catalog_entities`:
   - include only active types
   - exclude explicit IDs + recent deck history
   - pre-limit by popularity ceiling per type for efficiency
3. **Allocate per-type quotas** from requested deck size:
   - even baseline per selected type
   - distribute remainders by type pool availability
4. **Select within each type using popularity-weighted deterministic sampling**:
   - weight by normalized popularity
   - apply tag diversity penalty if same tags are already overrepresented
   - use seeded RNG so tests are reproducible
5. **Apply global deterministic tie-breakers**:
   - primary: weighted score
   - secondary: popularity
   - tertiary: stable entity ID/hash
6. **Return explain metadata** to help debugging and warm-start migration (`selectedBy`, `typeQuota`, `penaltiesApplied`).

## Implementation checklist
- [ ] Define and export `COLD_START_THRESHOLD` and quota/sampling config constants.
- [ ] Implement `isColdStartUser(swipeCount)` helper with unit tests at boundary values.
- [ ] Implement candidate repository query respecting active filters and exclusion IDs.
- [ ] Implement quota allocator for selected media types and target deck size.
- [ ] Implement deterministic weighted sampler with stable seeded randomness.
- [ ] Enforce tag diversity cap/penalty so one theme cannot dominate.
- [ ] Add deterministic tie-breaker logic and verify stable ordering across runs.
- [ ] Add tests for:
  - no-history user,
  - sparse-history user,
  - single-type filter,
  - multi-type filter,
  - small catalog edge case,
  - exhausted pool behavior.
- [ ] Ensure output contract is compatible with Iteration 13 warm-ranker handoff.

## Deliverables
- Cold-start selector service integrated into deck candidate pipeline.
- Configurable cold-start threshold and diversity controls.
- Automated deterministic tests and fixture-backed examples.

## Acceptance criteria
- Users below threshold receive a mixed deck that includes popular items across active types.
- No single type or tag dominates beyond configured caps/penalties.
- Selector results are reproducible given same seed, filters, and exclusion inputs.
- Selector gracefully degrades when candidate pool is small (returns best-effort list without crashes).
- Selector interface can be reused by warm-start pipeline without breaking changes.

## Definition of done evidence
- Show a worked example of input:
  - active filters,
  - exclusion list,
  - seed,
  - target size
  and output selected entity IDs with selection reasons.
- Show deterministic test proof that two identical runs produce identical ordered output.
- Show diversity test proof that at least `N` types appear when `N` types are enabled and catalog supports it.
- Show edge-case proof for limited catalog pools and exclusion-heavy requests.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- cold-start`
- `npm test -- recommendation`

## Notes for next iteration
Iteration 13 warm-start ranking should consume this selector as fallback or blend mode. Keep scoring/explain fields explicit so handoff to personalized ranking is transparent and easy to tune.
