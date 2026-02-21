# Iteration 13: Implement warm-start ranking formula

## Objective

Implement a deterministic warm-start ranking service that personalizes candidate ordering by combining:

- user-preference match score,
- global popularity,
- novelty/freshness,
  with normalized output and explainable score components.

## Why this matters

Warm-start ranking is where personalization becomes visible to users. Once swipe-derived taste signals exist, this layer should meaningfully shift ordering toward inferred preferences while preserving quality and variety. A reliable formula here directly affects engagement, trust, and long-term retention.

## Scope

### In scope

- Compute per-candidate `matchScore` from user taste profile and candidate attributes (tags, media type, optional latent affinity dimensions available in repo).
- Compute or retrieve `popularityScore` from existing aggregate stats.
- Compute `noveltyScore` (e.g., inverse exposure/frequency or freshness proxy already available).
- Blend scores using configurable weights from constants/config.
- Normalize final score into a stable comparable range (recommended: `0..1`).
- Return transparent explain output per candidate (`components`, `weights`, `finalScore`).
- Ensure deterministic ranking/tie-breakers for reproducible tests.

### Out of scope

- ε-greedy exploration policy (Iteration 14).
- Repetition suppression windows/guardrails (Iteration 15).
- UI-level explanation rendering (later profile/transparency iterations).

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                      | Model      | Rationale                            |
| ------------------------------------------------------------- | ---------- | ------------------------------------ |
| Design decision memo: normalization strategy for match scores | **Claude** | Tradeoff analysis for formula design |
| Review formula weights against CLAUDE.md Section 8.3          | **Claude** | Spec enforcement for scoring formula |
| Implement ranker service, scoring components, normalization   | **Codex**  | Core algorithmic implementation      |
| Add deterministic tests with explicit numeric expectations    | **Codex**  | Test authoring                       |

### Parallel run opportunity

- If normalization approach is uncertain (min-max vs z-score vs percentile), Claude can produce a design decision memo while Codex implements the scoring infrastructure. Merge once Claude's recommendation is finalized.

### Notes

- **Claude first**: Claude should verify the `0.45*pop + 0.40*match + 0.15*novel` formula and sparse-profile fallback behavior before Codex implements.
- Gemini is not needed (pure algorithmic work).

## Agent resources and navigation map

### Source-of-truth references

- `CLAUDE.md` Section 1 (product intent for practical recommender behavior).
- `CLAUDE.md` Section 8.3+ (warm-start ranking/personalization expectations).
- `CLAUDE.md` Section 17 task #13 (backlog intent and constraints).
- `iterations/11-incremental-taste-score-updates.md` (upstream profile signal generation).
- `iterations/12-implement-cold-start-candidate-selector.md` (fallback/handoff contract from cold-start path).
- `iterations/14-add-epsilon-greedy-exploration.md` (next-step compatibility expectations).
- `iterations/24-create-scoring-ranking-snapshot-test-suite.md` (future snapshot guarantees to design for now).
- `iterations/README.md` (dependency sequence and ordering discipline).

### Current repo implementation anchors

Review existing code before adding new modules:

- Taste profile aggregates/repository produced in Iteration 11.
- Candidate pipeline output contract from Iteration 12.
- Any scoring helper utilities (normalization, clamping, deterministic sort/hash helpers).
- Existing config/constants patterns for recommendation settings.
- Test fixture factories for swipe history, profiles, and catalog entities.

### Suggested file organization

Follow repo conventions if exact paths differ:

- `features/recommendation/constants/warmStartConfig.ts`
  - default weights, normalization constants, sparse-profile fallbacks
- `features/recommendation/service/computeMatchScore.ts`
  - profile × candidate affinity calculation
- `features/recommendation/service/computeNoveltyScore.ts`
  - novelty/freshness scoring helper
- `features/recommendation/service/rankWarmStartCandidates.ts`
  - blend + normalization + explain contract + stable ordering
- `__tests__/recommendation/warm-start-ranker.test.ts`
  - deterministic order, sparse data behavior, edge cases

## External troubleshooting and learning resources

Use these when implementation details are unclear.

### Official docs

- TypeScript handbook (narrow types, generics, utility patterns): https://www.typescriptlang.org/docs/
- Expo SQLite docs (if score inputs come from local SQL): https://docs.expo.dev/versions/latest/sdk/sqlite/
- SQLite expression/reference docs (for pre-scoring queries): https://www.sqlite.org/lang_expr.html
- SQLite math/date functions (freshness calculations): https://www.sqlite.org/lang_datefunc.html
- MDN `Array.sort` and comparator guidance (deterministic tie-breakers): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

### Step-by-step guides

- Practical score normalization strategies (min-max, z-score discussion): https://developers.google.com/machine-learning/crash-course/linear-regression/feature-scaling
- Weighted scoring model basics: https://en.wikipedia.org/wiki/Weighted_sum_model
- Recommender-system ranking intuition and evaluation overview: https://developers.google.com/machine-learning/recommendation
- Deterministic and table-driven Jest tests: https://jestjs.io/docs/getting-started

### YouTube

- StatQuest (clear ranking/scoring intuition): https://www.youtube.com/@statquest
- Google Developers ML/Recommender playlists: https://www.youtube.com/@GoogleDevelopers
- Hussein Nasser (backend ranking/query tradeoffs): https://www.youtube.com/@hnasr
- Fireship (quick SQL/TS refreshers): https://www.youtube.com/@Fireship

### Books / long-form references

- _Recommender Systems Handbook_ (ranking and hybrid scoring concepts): https://link.springer.com/book/10.1007/978-1-4899-7637-6
- _Practical Recommender Systems_ (implementation-focused ranking patterns): https://www.manning.com/books/practical-recommender-systems
- _Designing Data-Intensive Applications_ (robustness and deterministic system behavior): https://dataintensive.net/
- _Interpretable Machine Learning_ (explainability concepts for score breakdowns): https://christophm.github.io/interpretable-ml-book/

### GitHub repos

- Microsoft Recommenders (ranking examples/patterns): https://github.com/recommenders-team/recommenders
- RecBole (ranking and recommender baselines): https://github.com/RUCAIBox/RecBole
- LensKit (classic recommender experimentation): https://github.com/lenskit/lkpy
- Jest examples (test structure patterns): https://github.com/jestjs/jest/tree/main/examples

### Stack Overflow / discussion boards

- Stack Overflow `recommendation-engine`: https://stackoverflow.com/questions/tagged/recommendation-engine
- Stack Overflow `ranking`: https://stackoverflow.com/questions/tagged/ranking
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Cross Validated (Stats.SE) recommender questions: https://stats.stackexchange.com/questions/tagged/recommender-systems
- Reddit r/recommendersystems: https://www.reddit.com/r/recommendersystems/
- Expo discussions (runtime/storage specifics): https://github.com/expo/expo/discussions

## Recommended implementation approach

1. **Define input contract** for warm ranking:
   - user profile/taste vector,
   - candidate list from selector,
   - optional context (time, session info).
2. **Compute component scores** per candidate:
   - `matchScore`: affinity similarity from tags/types/signals,
   - `popularityScore`: normalized global popularity,
   - `noveltyScore`: penalize overexposed or stale items.
3. **Handle sparse-profile fallback**:
   - if profile confidence is low, reduce match weight and increase popularity/novelty contribution.
4. **Blend with configurable weights**:
   - `finalRaw = wMatch*match + wPopularity*popularity + wNovelty*novelty`.
5. **Normalize and clamp final score**:
   - ensure consistent range (`0..1`) and avoid NaN/Infinity propagation.
6. **Apply deterministic ordering**:
   - primary `finalScore` desc,
   - secondary `matchScore` desc,
   - tertiary stable `entityId` comparator.
7. **Emit explain payload**:
   - component values, weights used, optional fallback reason.

## Implementation checklist

- [ ] Create warm-start ranking config with explicit default weights.
- [ ] Implement `computeMatchScore` using existing profile and candidate features.
- [ ] Implement popularity and novelty normalization helpers.
- [ ] Implement weighted blend + normalization + clamping in ranker service.
- [ ] Add deterministic tie-breaker comparator.
- [ ] Return explain contract for each ranked candidate.
- [ ] Add tests for:
  - clear preference shift (rank order changes with profile),
  - sparse profile fallback,
  - zero/empty signals,
  - identical scores tie-breaking,
  - malformed numeric guardrails (NaN/undefined handling).
- [ ] Verify compatibility with Iteration 12 input and Iteration 14 exploration wrapper.

## Deliverables

- Warm-start ranker service integrated into recommendation candidate pipeline.
- Configurable scoring weights and normalization strategy.
- Deterministic tests covering ranking behavior and edge conditions.
- Explainable per-candidate score breakdown contract.

## Acceptance criteria

- Users with sufficient history see ordering shifts aligned with inferred preferences.
- Final scores are valid and comparable across candidates (no NaN/Infinity).
- Ranking remains deterministic for same inputs and seed/context.
- Sparse or noisy profile data degrades gracefully (still returns useful ordering).
- Explain payload clearly shows why an item ranked where it did.

## Definition of done evidence

- Show one concrete example where ranking differs between:
  - neutral/sparse profile and
  - strong-preference profile,
    with component-score breakdown.
- Show deterministic proof: repeated runs with identical inputs produce identical ordered IDs.
- Show robustness proof for empty/sparse signals and malformed numeric inputs.

## Validation commands

- `npm run typecheck`
- `npm run lint`
- `npm test -- warm-start`
- `npm test -- recommendation`

## Notes for next iteration

Iteration 14 (ε-greedy exploration) should wrap this warm-ranker output rather than replace it. Keep ranker output explicit (`finalScore`, `components`, `reason`) so exploration can safely perturb top-N while preserving explainability.
