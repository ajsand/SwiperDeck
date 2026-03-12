# Iteration 14G: Create sequencing evaluation, explainability, and regression harness

## 1. Objective

Add the local tooling needed to understand whether the prebuilt-deck sequencing algorithm is actually improving.

This iteration should provide:

- deterministic sequencing fixtures
- scenario tests
- explainability output for "why this card next?"
- regression protection for tuning work
- metrics around relevance, coverage, diversity, retest utility, and confidence-building

## 2. Why this matters

By this point the repo will have multiple moving parts in sequencing:

- canonical prebuilt tags
- tag state
- broad-start coverage logic
- tag-aware ranking
- anti-collapse guardrails
- retest/resurfacing

Without a dedicated harness, future tuning will silently degrade behavior and the team will not know why.

## 3. Scope

### In scope

- add deterministic local fixtures for representative sequencing scenarios
- add test helpers that produce ranked candidates plus explanation output
- add regression tests for broad start, adaptive scoring, guardrails, and retest behavior
- define metrics and acceptance checks for:
  - breadth
  - coverage
  - diversity
  - novelty
  - retest usefulness
  - confidence-building
- expose a local debug/explanation surface for next-card decisions

### Out of scope

- online experimentation
- server-side analytics
- A/B testing infrastructure
- public dashboards

### Reuse of inherited infrastructure

| Category   | What happens                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Reused     | Jest test suite, existing repository tests, swipe-session tests, local profile computation, deterministic fixtures from other repo areas |
| Refactored | Sequencing helpers should return structured explanation output instead of ad hoc internal-only reasoning                                 |
| Preserved  | The runtime app flow stays local-first; the harness is for testing and debugging, not production telemetry                               |

## 4. Multi-model execution strategy

Workflow note: execute with GPT-5.4 Extra High only.

| Step | Model              | Task                                                               |
| ---- | ------------------ | ------------------------------------------------------------------ |
| 1    | GPT-5.4 Extra High | Add deterministic sequence fixtures and scenario helpers           |
| 2    | GPT-5.4 Extra High | Add explainability models and debug output for next-card decisions |
| 3    | GPT-5.4 Extra High | Add regression tests across 14C-14F behaviors                      |
| 4    | GPT-5.4 Extra High | Document metrics and expected sequencing outcomes                  |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8, 13, and 14
- `/iterations/14c-implement-broad-start-representative-sequencing-for-prebuilt-decks.md`
- `/iterations/14d-implement-tag-aware-next-card-scoring.md`
- `/iterations/14e-add-coverage-diversity-and-anti-collapse-guardrails.md`
- `/iterations/14f-add-retest-reaffirmation-and-ambiguity-targeting-resurfacing.md`

### Current repo implementation anchors

- `__tests__/deck-swipe-session.test.ts`
- `__tests__/deck-profile-service.test.ts`
- `lib/sequence/*` once 14C-14F land
- `hooks/useDeckSwipeSession.ts`
- `types/domain/*` sequence/profile types

### Suggested file organization

```text
lib/sequence/explainSequenceDecision.ts
lib/sequence/sequenceEvaluation.ts
__tests__/fixtures/sequencing/*.json
__tests__/sequencing-regression.test.ts
__tests__/sequencing-explainability.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite deterministic query guidance
- testing-library/Jest references already used in the repo

## 6. When stuck

| Problem                                          | Resolution                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| The metrics keep turning into product analytics  | Keep this local, deterministic, and developer-facing. No online experimentation.                         |
| Explainability output is too verbose             | Standardize a compact breakdown model with component scores, applied guardrails, and the primary reason. |
| Scenario fixtures drift from real deck structure | Build fixtures from the real prebuilt taxonomy/card model rather than inventing unrelated data shapes.   |
| Tuning breaks old tests too often                | Separate hard invariants from tunable thresholds. Keep both in the harness.                              |

## 7. Implementation checklist

1. Define fixture shapes for deterministic sequence scenarios.
2. Add a reusable evaluation helper that can:
   - load a deck fixture
   - inject swipe history and tag state
   - rank candidate cards
   - return explanations and metrics
3. Add a compact explanation model containing:
   - selected card id
   - stage (`broad_start` or `adaptive`)
   - component scores
   - applied guardrails
   - retest reason if present
4. Add regression tests for:
   - representative broad start
   - tag-aware adaptive ranking
   - anti-collapse behavior
   - ambiguity-targeting resurfacing
5. Add metric assertions for:
   - facet coverage
   - tag coverage
   - rolling diversity
   - novelty floor
   - retest frequency caps
6. Document how the harness protects later profile confidence and compare quality.

## 8. Deliverables

1. Deterministic sequencing fixtures.
2. A local explainability model for next-card decisions.
3. Regression tests spanning broad start, scoring, guardrails, and retest logic.
4. A small set of local sequencing metrics and invariants.

## 9. Acceptance criteria

1. The team can run deterministic sequencing tests without any cloud dependency.
2. The app can explain why a card was chosen next in local/debug terms.
3. Regression tests exist for the key behaviors introduced in 14C-14F.
4. Metrics cover breadth, coverage, diversity, novelty, and retest behavior.
5. The harness makes later tuning safer instead of more opaque.

## 10. Definition of done evidence

| Evidence                     | Verification command                             |
| ---------------------------- | ------------------------------------------------ |
| Explainability helper exists | `ls lib/sequence/explainSequenceDecision.ts`     |
| Evaluation helper exists     | `ls lib/sequence/sequenceEvaluation.ts`          |
| Sequencing fixtures exist    | `ls __tests__/fixtures/sequencing`               |
| Regression tests exist       | `ls __tests__/sequencing-regression.test.ts`     |
| Explainability tests exist   | `ls __tests__/sequencing-explainability.test.ts` |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- sequencing-regression
npm test -- sequencing-explainability
npm test
```

## 12. Notes for next iteration

1. Iteration 15 should consume the explainable state and stability signals produced by the sequencing stack, not just raw swipe counts.
2. Future tuning work in Iterations 23-25 should extend this harness rather than bypassing it.
3. Keep the harness local-first and deterministic so profile and compare quality stay debuggable.
