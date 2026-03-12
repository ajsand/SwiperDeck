# Iteration 25: Release hardening for the dating fork

## 1. Objective

Run a true release-hardening pass across the DateDeck fork.

This iteration must now explicitly include hardening work for:

- tag-aware sequencing stability
- coverage/diversity correctness
- retest correctness
- explainability/debuggability
- sensitive deck/tag safeguards
- compare/report fallback behavior under low-confidence conditions
- navigation consistency and swipe-session continuity correctness
- performance, accessibility, and release readiness

## 2. Why this matters

By Iteration 25, the fork has become much more capable than the early DateDeck shell:

- prebuilt-deck sequencing is richer and more stateful
- profile confidence has more moving parts
- compare/report flows have consent, payload, AI, and safety layers
- showdown and custom decks widen the product surface

A generic release pass would miss the new risk areas introduced by 14A-14G and the downstream compare/report stack.

## 3. Scope

### In scope

- audit sequencing correctness and regression coverage
- audit profile confidence/readiness correctness
- audit retest/resurfacing behavior
- audit sensitive deck/tag safeguards
- audit compare/report privacy, fallback, and disclosure behavior
- audit performance, accessibility, and navigation resilience
- audit persistent-tab-shell behavior versus focused live-session behavior
- audit cross-session deck stop/resume behavior so sequencing stays durable over time
- produce a real release checklist, not a catch-all bucket

### Out of scope

- major new features
- redesigning the roadmap
- optional future cloud/social features

### Reuse / refactor / replace

| Category   | What happens                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Reused     | All prior product, privacy, sequence, compare, and report infrastructure                               |
| Refactored | Weak edges, test gaps, unclear fallbacks, and release-blocking regressions discovered during hardening |
| Replaced   | Ad hoc confidence, privacy, and release assumptions that are not backed by explicit checks             |

## 4. Downstream dependency note

14A-14G materially expand the release-hardening surface area. This iteration must now explicitly validate:

- tag taxonomy correctness
- tag-state correctness
- broad-start and adaptive sequence behavior
- guardrail behavior
- resurfacing behavior
- explainability/debug tooling

It also depends on 15-24 because compare, report, custom-deck, and showdown paths must all be release-ready.

It also depends on 20B because release hardening must now verify:

- normal deck-related drill-down keeps the bottom nav visible
- live swiping is the only intentional full-screen breakout
- session boundaries do not behave like queue/reset boundaries

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Build a release checklist grouped by risk area.
2. Run audits and close the highest-risk gaps.
3. Strengthen tests, fallbacks, and docs.
4. Re-run full validation and final release checks.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 1, 11, 12, 14, 16, 18, and 19
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/15-...md` through `/iterations/24-...md`
- `/iterations/20b-refine-navigation-consistency-and-cross-session-deck-swiping.md`
- `/iterations/README.md`

### Current repo implementation anchors

- all sequencing modules under `lib/sequence/`
- `lib/profile/*`
- `lib/compare/*`
- safety policy modules
- showdown modules
- custom deck modules
- `docs/db/SCHEMA.md`
- `docs/domain/DOMAIN_TYPES.md`

### Suggested file organization

```text
docs/release/RELEASE_CHECKLIST.md
docs/release/QA_MATRIX.md
__tests__/sequencing-regression.test.ts
__tests__/compare-report-quality.test.ts
__tests__/deck-safety-policy.test.ts
__tests__/custom-deck-compare.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- Expo release/build docs
- React Native accessibility docs
- OpenAI platform docs
- Expo SQLite docs

#### Step-by-step guides

- Existing repo iteration files and test suites
- Existing schema/domain docs

#### YouTube

- Release-checklist and mobile QA walkthroughs if blocked

#### GitHub repos

- `expo/expo`
- `callstack/react-native-testing-library`
- `openai/openai-node`

#### Stack Overflow/discussion boards

- Expo release and performance discussions
- React Native accessibility discussions

#### Books/long-form references

- Privacy-by-design references
- Local-first software references

## 7. When stuck

| Problem                                                       | Resolution                                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| The iteration turns into a grab bag                           | Organize by risk area: sequence, confidence, privacy, safety, performance, accessibility, and release ops. |
| Explainability/debug output is treated as optional            | It is not optional anymore. The evolved algorithm stack needs debuggability to ship safely.                |
| Low-confidence compare/report fallback paths are under-tested | Prioritize those paths. They are where trust breaks first.                                                 |
| Sensitive deck/tag behavior is only manually checked          | Add automated checks where practical and a documented manual QA matrix for the rest.                       |
| Navigation and swipe-state bugs seem "UI-only"                | Treat them as release-blocking when they break tab persistence or cause stale queue/session behavior.      |

## 8. Implementation checklist

1. Create a release checklist covering:
   - sequencing correctness
   - confidence/readiness correctness
   - retest correctness
   - sensitive deck/tag safeguards
   - compare/report fallback behavior
   - bottom-nav persistence on normal flows
   - live-swipe exit and resume behavior
   - performance
   - accessibility
2. Audit the sequencing stack with the regression harness from 14G.
3. Audit navigation behavior so deck detail, compare, profile, history, and settings sub-screens stay inside the persistent tab shell.
4. Audit compare/report flows for:
   - consent correctness
   - payload minimization
   - AI fallback behavior
   - low-confidence messaging
5. Audit multi-session stop/resume behavior so next-card selection recomputes from durable state instead of reviving stale queue ownership.
6. Audit showdown and custom-deck flows against their policy boundaries.
7. Close the highest-risk gaps in tests, docs, and fallbacks.
8. Produce final release evidence and re-run the full suite.

## 9. Deliverables

1. A real release checklist and QA matrix.
2. Hardened sequencing, confidence, safety, and compare/report paths.
3. Strengthened regression and fallback coverage.
4. Updated docs needed for release readiness.

## 10. Acceptance criteria

1. The evolved sequencing stack is regression-protected and explainable.
2. Confidence/readiness logic behaves correctly under low-coverage and low-stability conditions.
3. Sensitive deck/tag safeguards are enforced consistently.
4. Compare/report fallbacks behave safely under failure or low-confidence conditions.
5. Navigation behavior matches 20B: normal flows keep the bottom nav, live swiping is the only intentional hide case, and exit paths are predictable.
6. Session boundaries do not cause stale queue resumes or incorrect sequencing resets.
7. Performance, accessibility, and release checks are complete.

## 11. Definition of done evidence

| Evidence                          | Verification command                          |
| --------------------------------- | --------------------------------------------- |
| Release checklist exists          | `ls docs/release/RELEASE_CHECKLIST.md`        |
| QA matrix exists                  | `ls docs/release/QA_MATRIX.md`                |
| Sequencing regression tests exist | `ls __tests__/sequencing-regression.test.ts`  |
| Safety tests exist                | `ls __tests__/deck-safety-policy.test.ts`     |
| Report quality tests exist        | `ls __tests__/compare-report-quality.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test
npm run format -- --check
```

## 13. Notes for next iteration

1. This is the end of the current DateDeck fork backlog. Any future work should start from the hardened, documented state produced here.
2. Keep new work additive and explicit about whether it extends prebuilt-only sequencing, custom deck support, or both.
3. Do not resurrect the removed phase-5 cloud/social backlog without a new fork-level product decision.
