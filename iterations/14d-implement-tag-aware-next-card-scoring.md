# Iteration 14D: Implement tag-aware next-card scoring

## 1. Objective

Implement the main local, explainable next-card scoring logic for prebuilt decks.

The scoring function should use:

- card-level signal
- tag-level signal
- coverage state
- novelty and exploration factors

to decide which card appears next once the deck exits the broad-start phase.

## 2. Why this matters

Broad start prevents early overfitting, but it is not enough for the mature portion of the deck experience. Once the app has meaningful local signal, it should surface cards that are related, clarifying, and useful without becoming opaque.

The current repo has local profile scoring building blocks, but no dedicated next-card score with transparent component weights.

## 3. Scope

### In scope

- add a tag-aware next-card scoring function for prebuilt decks
- combine card-level priors with deck-tag-state inputs
- produce a score breakdown that explains why a card ranks where it does
- wire the scoring function into the play/session flow after broad start ends
- keep deterministic tie-breaking and test fixtures

### Out of scope

- coverage/diversity guardrails beyond the core score
- retest/resurfacing logic
- compare/report UI
- custom deck parity
- cloud or ML-driven recommendation systems

### Relationship to existing logic

| Category   | What happens                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Reused     | Broad-start stage from 14C, canonical taxonomy from 14A, deck tag state from 14B, local card affinity and swipe history |
| Refactored | The existing simple post-broad-start ordering path becomes a scored ranking pipeline                                    |
| Replaced   | Any hidden or ad hoc "pick the next card from recent signal alone" logic                                                |

## 4. Multi-model execution strategy

Workflow note: execute with GPT-5.4 Extra High only.

| Step | Model              | Task                                                                  |
| ---- | ------------------ | --------------------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Add scoring types and score-breakdown models                          |
| 2    | GPT-5.4 Extra High | Implement the tag-aware scoring function and deterministic tie-breaks |
| 3    | GPT-5.4 Extra High | Wire the scorer into the adaptive phase of the swipe flow             |
| 4    | GPT-5.4 Extra High | Add scenario tests and explanation assertions                         |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8, 13, and 14
- `/iterations/14b-add-tag-level-deck-state-and-typed-models.md`
- `/iterations/14c-implement-broad-start-representative-sequencing-for-prebuilt-decks.md`

### Current repo implementation anchors

- `hooks/useDeckSwipeSession.ts`
- `lib/profile/deckProfileService.ts`
- `lib/db/deckProfileRepository.ts`
- `lib/db/deckTagRepository.ts`
- `lib/db/deckTagStateRepository.ts` once added in 14B
- `assets/data/prebuilt-decks.json`

### Suggested file organization

```text
lib/sequence/tagAwareScoring.ts
lib/sequence/deckSequenceTypes.ts
lib/sequence/explainSequenceDecision.ts
hooks/useDeckSwipeSession.ts
__tests__/tag-aware-scoring.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite query planning docs
- existing repo profile-service and swipe-session tests

## 6. When stuck

| Problem                                           | Resolution                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The score keeps turning into a black box          | Return explicit component weights and a primary decision reason for every ranked card.           |
| Card-level and tag-level signals disagree         | Let tag-level signal drive most of the score, but keep card-level priors as a bounded component. |
| Coverage bonuses dominate too much                | Keep coverage as one component. Diversity guardrails come next in 14E.                           |
| Recent swipes overwhelm the ranking               | Add recency damping and deterministic tie-breaking.                                              |
| Temptation to fold retest into the base score now | Keep retest logic separate for 14F.                                                              |

## 7. Implementation checklist

1. Add sequence-scoring types such as:
   - `DeckCardScoreBreakdown`
   - `DeckCardScoreComponent`
   - `DeckAdaptiveSequenceDecision`
2. Define score inputs for each candidate card:
   - canonical tag links
   - deck tag state
   - card affinity/history
   - representativeness priors (`sort_order`, `popularity`)
   - recency and seen-state inputs
3. Implement score components such as:
   - `tag_affinity`
   - `coverage_bonus`
   - `novelty_bonus`
   - `representative_prior`
   - `recent_repeat_penalty`
   - `already_seen_penalty`
4. Keep the score local and deterministic.
5. Use stable tie-breaking:
   - total score
   - then `sort_order`
   - then `card.id`
6. Preserve the broad-start stage from 14C and only use the new scorer in the adaptive phase.
7. Return a human-readable reason such as:
   - `reinforce_positive_area`
   - `probe_adjacent_tag`
   - `clarify_low_coverage_tag`
8. Add scenario tests for:
   - positive tag reinforcement
   - negative tag avoidance
   - mixed-signal adjacency
   - deterministic tie cases

## 8. Deliverables

1. A tag-aware next-card scoring module for prebuilt decks.
2. Explainable score breakdowns for ranked candidates.
3. Adaptive-phase integration in the swipe session flow.
4. Tests covering core ranking behavior.

## 9. Acceptance criteria

1. Prebuilt-deck adaptive sequencing uses canonical tag state, not just raw card order.
2. The score combines card-level and tag-level inputs in a deterministic way.
3. Every selected card can expose a local score breakdown and primary reason.
4. Broad-start behavior from 14C remains intact.
5. No cloud, embeddings, or opaque ML layer is introduced.

## 10. Definition of done evidence

| Evidence                    | Verification command                     |
| --------------------------- | ---------------------------------------- | --------------------------------------------- |
| Scoring file exists         | `ls lib/sequence/tagAwareScoring.ts`     |
| Score breakdown type exists | `rg "DeckCardScoreBreakdown" lib types`  |
| Adaptive flow uses scoring  | `rg "tagAwareScoring                     | scoreCandidate" hooks/useDeckSwipeSession.ts` |
| Scoring tests exist         | `ls __tests__/tag-aware-scoring.test.ts` |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- tag-aware-scoring
npm test -- deck-swipe-session
npm test
```

## 12. Notes for next iteration

1. Iteration 14E should add coverage/diversity guardrails on top of this score, not replace it.
2. Keep the score breakdown stable because 14G will depend on it for explainability and regression testing.
3. Retest logic still needs its own explicit resurfacing path in 14F.
