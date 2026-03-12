# Iteration 14E: Add coverage, diversity, and anti-collapse guardrails

## 1. Objective

Add explicit sequencing guardrails for prebuilt decks so the algorithm balances:

- relevance
- breadth
- category coverage
- novelty
- profile depth

The system should not just keep showing more of the same.

## 2. Why this matters

Iteration 14D gives the app a meaningful adaptive score. By itself, that score can still collapse into a narrow filter bubble if early signal is strong in one area.

This iteration adds the controls that keep the profile broad enough to remain useful, especially before compare readiness.

## 3. Scope

### In scope

- add post-score guardrails for coverage and diversity
- prevent narrow early collapse into one tag or facet
- enforce undercoverage recovery when the deck has blind spots
- keep the logic explainable and local
- add deterministic tests for anti-collapse behavior

### Out of scope

- rewriting the core ranking formula from scratch
- retest/resurfacing logic
- compare/report UI
- custom deck parity
- cloud or ML-driven personalization

### Relationship to earlier scoring

| Category   | What happens                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------- |
| Reused     | Broad-start sequencing from 14C and tag-aware scoring from 14D                               |
| Refactored | Candidate ranking becomes a two-step process: base score, then guardrail-aware rerank/filter |
| Preserved  | The score breakdown remains the core relevance engine; guardrails sit above it               |

## 4. Multi-model execution strategy

Workflow note: execute with GPT-5.4 Extra High only.

| Step | Model              | Task                                                    |
| ---- | ------------------ | ------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Add coverage/diversity guardrail types and rule helpers |
| 2    | GPT-5.4 Extra High | Layer guardrails on top of adaptive ranking             |
| 3    | GPT-5.4 Extra High | Add explanation output for the applied guardrails       |
| 4    | GPT-5.4 Extra High | Add regression tests for anti-collapse scenarios        |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8 and 14
- `/iterations/14c-implement-broad-start-representative-sequencing-for-prebuilt-decks.md`
- `/iterations/14d-implement-tag-aware-next-card-scoring.md`

### Current repo implementation anchors

- `lib/sequence/tagAwareScoring.ts`
- `lib/sequence/deckSequenceTypes.ts`
- `hooks/useDeckSwipeSession.ts`
- `lib/db/deckTagStateRepository.ts`
- `lib/db/deckTagRepository.ts`

### Suggested file organization

```text
lib/sequence/sequenceGuardrails.ts
lib/sequence/tagAwareScoring.ts
lib/sequence/explainSequenceDecision.ts
hooks/useDeckSwipeSession.ts
__tests__/sequence-guardrails.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite docs for any supporting indexes
- existing repo and new sequence test fixtures

## 6. When stuck

| Problem                                           | Resolution                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| The guardrails feel like a second scoring formula | Keep them as explicit constraints/bonuses/penalties layered on top of the core score.   |
| The system still repeats one tag too often        | Add streak caps and rolling-window penalties for primary tags and facets.               |
| Guardrails eliminate too many candidates          | Add a fallback path that relaxes the softest constraint first, then records why.        |
| Coverage quotas feel arbitrary                    | Keep them simple and deck-relative. The regression harness in 14G will tune them later. |

## 7. Implementation checklist

1. Add guardrail models such as:
   - `DeckCoverageDebt`
   - `DeckDiversityRule`
   - `DeckGuardrailDecision`
2. Compute rolling-window signals for:
   - recent primary tags
   - recent facets
   - newly explored vs already saturated areas
3. Add guardrails such as:
   - undercovered-facet boost
   - undercovered-tag boost
   - primary-tag streak cap
   - facet-repeat penalty
   - novelty floor during low-coverage stages
4. Apply guardrails after the base score from 14D.
5. Record which guardrails changed the winning candidate.
6. Add a fallback path when constraints are too strict.
7. Add tests for:
   - narrow-positive-streak collapse
   - narrow-negative-streak collapse
   - undercovered facet recovery
   - deterministic fallback selection

## 8. Deliverables

1. A guardrail layer for coverage and diversity.
2. Explanation output showing which guardrails were applied.
3. Integration into the adaptive ranking flow.
4. Regression tests for anti-collapse behavior.

## 9. Acceptance criteria

1. The algorithm no longer repeatedly narrows into one tag/facet just because recent signal is strong.
2. Undercovered areas are surfaced before compare readiness is reached.
3. Guardrails are explainable and deterministic.
4. The base tag-aware scoring function from 14D still exists and is not replaced.
5. Tests cover representative anti-collapse scenarios.

## 10. Definition of done evidence

| Evidence                      | Verification command                       |
| ----------------------------- | ------------------------------------------ | ------------ | ---------------------------------------- |
| Guardrail module exists       | `ls lib/sequence/sequenceGuardrails.ts`    |
| Adaptive flow uses guardrails | `rg "guardrail                             | coverageDebt | diversity" hooks/useDeckSwipeSession.ts` |
| Guardrail tests exist         | `ls __tests__/sequence-guardrails.test.ts` |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- sequence-guardrails
npm test -- tag-aware-scoring
npm test
```

## 12. Notes for next iteration

1. Iteration 14F should build purposeful resurfacing on top of this guardrail-aware ranking stack.
2. Coverage debt and diversity signals should become part of later explainability output.
3. Do not let retest logic bypass these guardrails without an explicit documented reason.
