# Iteration 23: Profile confidence and retest logic refinement

## 1. Objective

Refine the already-existing confidence and retest logic so profile quality becomes more stable, interpretable, and useful for later compare/report work.

This iteration is now a later-stage tuning pass, not the first introduction of confidence or retest mechanics.

It must also refine those systems in a way that stays consistent with 20B:

- session boundaries are interaction envelopes, not confidence boundaries
- stop/resume behavior across multiple deck visits must not distort deck maturity, recency, or retest timing

## 2. Why this matters

Before 14A-14G existed, Iteration 23 could have been the first place where confidence and retest became meaningful. That is no longer true.

By this point the repo should already have:

- canonical tag state
- coverage-aware sequencing
- resurfacing/retest rules
- explainability and regression harnesses
- a richer deck profile summary

Iteration 23 now exists to tune and refine those systems rather than invent them.

## 3. Scope

### In scope

- recalibrate confidence composition and thresholds
- refine stability markers and retest contribution
- improve unresolved-area handling
- tune retest frequency and priority
- validate cross-session stop/resume behavior so confidence and retest logic remain durable over time
- use the evaluation harness to validate changes

### Out of scope

- first-time introduction of tag state or retest mechanics
- major compare/report UI redesign
- custom/public deck parity guarantees
- new cloud systems

### Reuse / refactor / replace

| Category   | What happens                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Reused     | Tag state, sequencing, resurfacing, profile summary, and evaluation harness from 14A-14G and 15 |
| Refactored | Confidence formulas, stability markers, unresolved-area derivation, and retest prioritization   |
| Replaced   | Any coarse earlier heuristics that remain after the first implementation pass                   |

## 4. Downstream dependency note

This iteration now clearly builds on:

- 14B tag-level state
- 14E coverage/diversity guardrails
- 14F resurfacing/retest
- 14G evaluation harness
- 15 profile summary
- 20B navigation and session-continuity rules

That means the work here is refinement, not initial invention.

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Audit current confidence and retest outputs against the regression harness.
2. Tune formulas and thresholds.
3. Update summary surfaces if labels or readiness states need refinement.
4. Add tests and document the new rules.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8, 9, 14, and 19
- `/iterations/14b-...md` through `/iterations/14g-...md`
- `/iterations/15-build-deck-profile-summary-v1.md`
- `/iterations/20b-refine-navigation-consistency-and-cross-session-deck-swiping.md`

### Current repo implementation anchors

- `lib/profile/deckProfileService.ts`
- `types/domain/deckProfile.ts`
- `lib/sequence/retestSelection.ts`
- `lib/sequence/sequenceEvaluation.ts`
- `app/deck/[deckId]/profile.tsx`
- `__tests__/deck-profile-service.test.ts`

### Suggested file organization

```text
lib/profile/deckProfileService.ts
lib/profile/computeDeckConfidence.ts
lib/sequence/retestSelection.ts
lib/sequence/sequenceEvaluation.ts
types/domain/deckProfile.ts
__tests__/deck-profile-service.test.ts
__tests__/sequencing-regression.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- Expo SQLite docs
- React Native accessibility docs

#### Step-by-step guides

- Existing sequence/profile iteration files
- Existing repo test fixtures and schema docs

#### YouTube

- Statistical reasoning/product-metrics walkthroughs if blocked

#### GitHub repos

- `sqlite/sqlite`
- `callstack/react-native-testing-library`

#### Stack Overflow/discussion boards

- Confidence/threshold and test-fixture discussions

#### Books/long-form references

- Local-first software references
- Information architecture references for ambiguity and clustering

## 7. When stuck

| Problem                                                          | Resolution                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The iteration starts reintroducing first-pass logic from 14A-14G | Stop and refocus. This is a refinement pass, not a restart.                           |
| Confidence tuning lacks evidence                                 | Use the regression/evaluation harness from 14G rather than intuition alone.           |
| Retest keeps firing too often                                    | Lower priority and increase cooldowns before inventing new categories of resurfacing. |
| Unresolved areas disappear entirely                              | Keep them visible. Refinement should improve clarity, not hide uncertainty.           |

## 8. Implementation checklist

1. Audit the current confidence model against representative fixture decks.
2. Refine confidence inputs such as:
   - coverage thresholds
   - ambiguity penalties
   - stability bonuses from retest confirmation
3. Refine unresolved-area derivation so it better distinguishes:
   - low coverage
   - mixed signal
   - awaiting retest
4. Tune retest scheduling priorities and caps across multiple sessions, not only within one continuous visit.
5. Update labels or readiness thresholds if the new tuning justifies it.
6. Expand regression tests to capture the tuned expectations, including stop/resume timelines.

## 9. Deliverables

1. Tuned confidence and retest logic.
2. Better unresolved-area handling.
3. Updated regression tests and supporting docs.

## 10. Acceptance criteria

1. Confidence logic is clearly a refinement of the existing tag-aware system, not a new first-pass implementation.
2. Stability and ambiguity handling improve without hiding uncertainty.
3. Retest frequency and priority are better tuned.
4. Session boundaries do not incorrectly reset confidence, recency, or retest due state.
5. The evaluation harness captures the intended behavior.
6. Updated profile tests pass.

## 11. Definition of done evidence

| Evidence                 | Verification command                         |
| ------------------------ | -------------------------------------------- | --------- | -------------------------------------------- |
| Confidence logic updated | `rg "stability                               | ambiguity | coverage" lib/profile/deckProfileService.ts` |
| Retest logic updated     | `rg "cooldown                                | priority  | stability" lib/sequence/retestSelection.ts`  |
| Regression tests updated | `ls __tests__/sequencing-regression.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- deck-profile-service
npm test -- sequencing-regression
npm test
```

## 13. Notes for next iteration

1. Iteration 24 should capitalize on this stronger confidence/stability foundation to improve report quality.
2. Keep changes explainable and measurable through the harness from 14G.
3. Do not silently broaden these refinements to unsupported custom-deck cases.
4. Keep tuning aligned with 20B's rule that a resumed deck session recomputes from durable state rather than a stale queue.
