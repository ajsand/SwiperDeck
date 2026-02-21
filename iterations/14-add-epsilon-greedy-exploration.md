# Iteration 14: Add epsilon-greedy exploration

## Objective
Add an ε-greedy selection wrapper (default 85% exploit / 15% explore) **on top of** the Iteration 13 warm-start ranking output, so the system can discover new user interests without replacing the underlying ranking formula.

## Why this matters
Warm ranking alone can over-optimize for current preferences and repeatedly surface similar entities. A controlled exploration layer helps:
- prevent local optima / recommendation echo chambers,
- collect signal on less-exposed but still-eligible entities,
- improve long-term personalization quality,
- keep deck composition fresh while preserving relevance.

This iteration is the first production-safe exploration mechanism before stronger repetition and policy guardrails in later work.

## Scope
### In scope
- Implement ε-greedy policy as a post-ranking wrapper around Iteration 13 output.
- Preserve warm ranker score payload (`finalScore`, components/explain data) through selection.
- Default to `epsilon = 0.15` (explore) and `1 - epsilon = 0.85` (exploit), configurable via constants.
- Define exploit and explore paths with explicit candidate-pool guardrails.
- Add deterministic seeded RNG utility for reproducible unit/integration tests.
- Add telemetry/logging fields: `mode`, `epsilon`, `candidatePoolSize`, `selectedEntityId`.

### Out of scope
- Replacing or re-tuning Iteration 13 warm ranking formula.
- Contextual bandits (UCB/Thompson), reinforcement-learning policies, or online-learning loops.
- Iteration 15 repetition suppression/abuse guardrails (only design for compatibility).

## Core concepts
- **Exploit**: select the top-ranked eligible candidate from warm ranker output.
- **Explore**: randomly select from a controlled non-top slice of ranked eligible candidates.
- **Epsilon (`ε`)**: probability of taking explore path on each selection event.
- **Deterministic RNG mode**: seeded pseudo-random generation in tests so selection sequences are reproducible.
- **Eligibility invariants**: exploration never bypasses existing filter constraints.

## Data/contracts and integration points
### Upstream contract (from Iteration 13)
- Input should be already ranked and filtered candidates from warm-start ranker.
- Each candidate should retain score/explain metadata (e.g., `finalScore`, `components`, `weights`, `reason` if present).

### Iteration 14 contract
- `selectCandidateWithExploration(rankedCandidates, policyConfig, rng, context?) -> SelectionResult`
- `SelectionResult` should include:
  - selected candidate (including warm-ranker score payload intact),
  - selection metadata (`mode: 'exploit' | 'explore'`, `epsilon`, `candidatePoolSize`),
  - optional diagnostics (e.g., `explorePoolSize`, `rngSample`, fallback reason).

### Downstream expectations
- Consumers should not need to know whether item came from exploit or explore for baseline rendering.
- Telemetry pipeline should ingest `mode`, `epsilon`, `candidatePoolSize`, `selectedEntityId` for observability and policy monitoring.

## Recommended implementation approach
1. **Wrap, don’t replace, warm ranker output**
   - Keep Iteration 13 ranking as source-of-truth ordering and score semantics.
2. **Introduce policy config + defaults**
   - `epsilon = 0.15`, optional min explore pool size and top exclusion parameters.
3. **Implement deterministic RNG abstraction**
   - Interface-based RNG (`nextFloat(): number`) with:
     - production implementation (`Math.random`),
     - seeded deterministic implementation for tests.
4. **Define selection flow**
   - Draw `u = rng.nextFloat()`.
   - If `u < epsilon` and explore pool is valid -> explore path.
   - Else -> exploit path.
5. **Exploit path behavior**
   - Select highest-ranked eligible candidate (index 0 after rank + filters).
6. **Explore path behavior**
   - Sample uniformly (or documented weighted strategy) from **non-top slice** of ranked eligible list.
   - Guardrails:
     - never pick items excluded by filters,
     - avoid selecting top item when explore policy says “non-top only”,
     - degrade to exploit if explore slice is empty.
7. **Small/exhausted pool handling**
   - Empty pool -> return null/none with structured reason.
   - 1-item pool -> always select the only item; mode may be reported as exploit-fallback.
   - 2-item pool -> explore can only choose non-top item if eligible; otherwise fallback.
   - Exhausted/fully filtered pool -> no selection, explicit telemetry reason.
8. **Emit telemetry/logging**
   - Required fields per attempt: `mode`, `epsilon`, `candidatePoolSize`, `selectedEntityId`.

## Implementation checklist
- [ ] Add epsilon-greedy policy config constants (default 0.15 explore).
- [ ] Implement RNG abstraction with seeded deterministic utility for tests.
- [ ] Add wrapper selector that consumes ranked candidates from Iteration 13.
- [ ] Implement exploit path: top-ranked eligible candidate.
- [ ] Implement explore path: sample from non-top eligible slice with guardrails.
- [ ] Preserve warm-ranker score/explain payload after selection.
- [ ] Add telemetry fields (`mode`, `epsilon`, `candidatePoolSize`, `selectedEntityId`).
- [ ] Implement robust edge-case fallbacks (empty/small/exhausted pools).
- [ ] Add policy-focused test suite (distribution, determinism, contracts, edge cases).

## Deliverables
- Production-ready epsilon-greedy exploration wrapper integrated into recommendation/deck selection pipeline.
- Seeded RNG utility + test harness support for deterministic exploration behavior.
- Updated telemetry contract for exploit/explore observability.
- Test suite proving policy correctness and compatibility with warm-ranker outputs.

## Acceptance criteria
- Iteration 13 warm ranker remains intact and continues to determine base ordering.
- Over large sample sizes, selection modes approximate 85/15 exploit/explore within defined tolerance.
- With fixed seed and same inputs, selection sequence is deterministic.
- Exploration selections never violate filter eligibility constraints.
- Warm-ranker score/explain payload is still available after exploration wrapper selection.
- Small/exhausted pools return deterministic, safe fallback behavior.

## Definition-of-done evidence
Provide evidence artifacts in PR description or linked test output:
- Distribution test summary showing exploit/explore ratio near target (e.g., within ±2-3% over large N).
- Determinism proof: repeated seeded runs produce identical selected ID sequence.
- Edge-case matrix output for empty, 1-item, 2-item, all-filtered, duplicate-ID scenarios.
- Contract proof that selected entity includes warm ranker scoring/explain fields unchanged.
- Telemetry sample record including `mode`, `epsilon`, `candidatePoolSize`, `selectedEntityId`.

## Concrete testing requirements
- **Statistical tolerance test**
  - Run many draws (e.g., 10k+) and assert exploit/explore split ~85/15 with bounded tolerance.
- **Determinism tests**
  - Fixed seed + same inputs => identical sequence of modes and selected IDs.
- **Edge case tests**
  - Empty list, 1-item pool, 2-item pool, all filtered candidates, duplicate IDs.
- **Contract tests**
  - Exploration selections always satisfy existing filter constraints.
- **Compatibility tests**
  - Warm-ranker score payload (`finalScore` + explain components) remains attached after wrapper selection.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Review policy design and edge cases (empty/small pools) | **Claude** | Risk assessment for exploration behavior |
| Implement epsilon-greedy wrapper, RNG abstraction | **Codex** | Core algorithmic implementation |
| Add seeded deterministic test suite | **Codex** | Test authoring with statistical verification |
| Review distribution test results against 85/15 target | **Claude** | Verify acceptance criteria |

### Notes
- Claude reviews the policy design before and after implementation.
- Gemini is not needed (pure algorithmic work with no UI component).

## File-location hints (repo navigation)
Likely implementation points are in recommendation/deck selection pipeline modules, such as:
- candidate selector services,
- ranking-to-selection orchestration layer,
- recommendation policy/config constants,
- recommendation-focused test directories.

Use search strings to navigate quickly:
- `epsilon`
- `explore`
- `exploit`
- `seeded`
- `candidate selector`
- `warm ranker`

## Resources when stuck

### YouTube tutorials
- Multi-Armed Bandits (StatQuest): https://www.youtube.com/results?search_query=statquest+multi+armed+bandit
- Epsilon-Greedy intuition: https://www.youtube.com/results?search_query=epsilon+greedy+algorithm+explained
- Exploration vs exploitation in recommenders: https://www.youtube.com/results?search_query=recommender+systems+exploration+exploitation

### Official docs
- Expo docs (runtime/platform considerations): https://docs.expo.dev/
- React Native JavaScript runtime notes (Hermes/context): https://reactnative.dev/docs/hermes
- MDN `Math.random()` behavior/details: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
- Jest docs (deterministic/repeatable testing patterns): https://jestjs.io/docs/getting-started
- Jest `expect` and matchers for statistical assertions: https://jestjs.io/docs/expect

### Step-by-step guides / blogs
- Epsilon-greedy overview (concept + practical framing): https://www.geeksforgeeks.org/machine-learning/epsilon-greedy-algorithm-in-reinforcement-learning/
- Explore-exploit in recommender systems (industry perspective): https://eugeneyan.com/writing/bandits/
- Ranking/recommender strategy references (Google ML recommendation overview): https://developers.google.com/machine-learning/recommendation

### Books
- *Bandit Algorithms* (Lattimore & Szepesvári): https://tor-lattimore.com/downloads/book/book.pdf
- *Recommender Systems Handbook*: https://link.springer.com/book/10.1007/978-1-4899-7637-6
- *Practical Recommender Systems* (Manning): https://www.manning.com/books/practical-recommender-systems

### GitHub repos
- Vowpal Wabbit contextual bandit examples: https://github.com/VowpalWabbit/vowpal_wabbit
- MABWiser (bandit policies in Python): https://github.com/fidelity/mabwiser
- Microsoft Recommenders: https://github.com/recommenders-team/recommenders
- RecBole: https://github.com/RUCAIBox/RecBole

### Stack Overflow tags
- `multi-armed-bandit`: https://stackoverflow.com/questions/tagged/multi-armed-bandit
- `recommendation-engine`: https://stackoverflow.com/questions/tagged/recommendation-engine
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs
- `typescript`: https://stackoverflow.com/questions/tagged/typescript

### Discussion boards
- Cross Validated (Stats.SE): https://stats.stackexchange.com/questions/tagged/multi-armed-bandit
- Reddit r/MachineLearning: https://www.reddit.com/r/MachineLearning/
- Reddit r/recommendersystems: https://www.reddit.com/r/recommendersystems/
- Reddit r/datascience: https://www.reddit.com/r/datascience/

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- exploration-policy`
- `npm test -- recommendation`

## Notes for next iteration
Iteration 15 guardrails (repetition suppression, safety constraints, policy caps) must be applied **after or alongside** this exploration wrapper, while preserving deterministic seeded test mode and without breaking warm-ranker score payload compatibility.
