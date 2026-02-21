# Iteration 24: Create scoring/ranking/snapshot test suite

## Objective
Build a comprehensive, deterministic test suite around scoring/ranking/profile snapshot logic so regressions are caught early and algorithm updates remain safe to ship.

The suite should verify:
- scoring math behavior (cold + warm paths)
- ranking behavior under realistic swipe histories
- profile snapshot stability and edge-case correctness

## Why this matters
This app’s core value depends on recommendation quality and trustworthy profile outputs.
Algorithm regressions are often subtle, hard to spot in manual QA, and expensive to debug after release.

This iteration creates durable guardrails so future tuning can happen confidently.

## Scope

### In scope
- Add focused unit tests for ranking/scoring formulas and helper utilities.
- Add fixture-driven scenario tests with representative swipe histories.
- Add deterministic snapshot/contract tests for profile scoring outputs.
- Cover edge cases: sparse data, skewed actions, ties, and extreme popularity/weight inputs.
- Ensure all tests are deterministic (seeded random + stable clocks where applicable).

### Out of scope
- Visual UI snapshot testing (component rendering) beyond ranking/profile domain logic.
- End-to-end device automation.
- Product-level formula redesign (this is verification and guardrails, not major algorithm changes).

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Define test matrix and scenario coverage requirements | **Claude** | Product thinking for edge-case identification |
| Produce Task Brief with fixture personas and expected behaviors | **Claude** | Test design decomposition |
| Implement test suite, fixtures, deterministic helpers | **Codex** | Primary test authoring |
| Add regression fixtures for scoring/ranking/snapshot modules | **Codex** | Implementation of test infrastructure |

### Notes
- **Claude first**: Claude should define the test matrix (which scenarios, which edge cases, which invariants) before Codex writes the actual test code.
- Gemini is not needed (pure test logic, no spatial/UI work).

---

## Repository context for the coding agent

Before implementation, review:
- `CLAUDE.md` sections on ranking strategy (cold-start/warm-start), local-first design, and profile goals.
- Iterations `11`, `12`, `13`, `14`, `15`, and `18` for scoring, candidate selection, exploration, repetition guardrails, and snapshot jobs.
- Existing tests/utilities under the project’s current test layout (reuse conventions for fixtures/mocks/seeding).

Prefer extending existing test conventions and helper utilities rather than introducing a parallel testing style.

---

## Implementation checklist (detailed)

### 1) Map scoring/ranking surfaces to test modules
- [ ] Identify each core algorithm module and create/expand corresponding test files.
- [ ] Ensure at minimum these categories are covered:
  - score update math
  - candidate ranking order
  - exploration/repetition behavior
  - snapshot aggregation/serialization

### 2) Build reusable fixture library
- [ ] Add fixture files for representative swipe timelines:
  - brand new user (very sparse)
  - early user (10–30 events)
  - medium history (100+ mixed events)
  - polarized user (strong like/dislike clusters)
  - noisy user (high skip ratio)
- [ ] Keep fixtures human-readable with comments explaining intent.
- [ ] Provide a tiny fixture factory helper for quick scenario composition.

### 3) Add formula regression tests
- [ ] Write tests for each formula branch with explicit expected numeric outputs/tolerances.
- [ ] Include known bug-prone scenarios (ties, zero counts, negative/positive extremes).
- [ ] Validate monotonic expectations (e.g., stronger positive signals should not reduce match score unless intentionally designed).

### 4) Add ranking behavior scenario tests
- [ ] Verify deterministic ordering for fixed inputs.
- [ ] Verify cold-start behavior still mixes popularity and diversity.
- [ ] Verify warm-start prioritizes preference match while retaining bounded exploration.
- [ ] Verify repetition guardrails prevent near-duplicate over-serving.

### 5) Add profile snapshot tests
- [ ] Snapshot/contract test stable output schema for profile aggregates.
- [ ] Assert important fields exist and stay typed (tag scores, trend deltas, confidence/coverage fields if present).
- [ ] Add tests ensuring snapshot output remains consistent for fixed input history.

### 6) Determinism and reliability hardening
- [ ] Seed random sources used in ranking/exploration tests.
- [ ] Freeze/mock clock/time where timestamps influence results.
- [ ] Avoid over-broad snapshots; snapshot only stable, meaningful structures.
- [ ] Remove flaky assertions based on unordered collections by sorting explicitly.

### 7) CI fitness and maintainability
- [ ] Ensure tests run reliably in non-interactive CI.
- [ ] Add short README/comments in fixture folder explaining how to add new cases.
- [ ] Keep runtime efficient by balancing focused unit tests vs heavy scenario tests.

---

## Suggested test structure (example)

```text
src/
  ranking/
    __tests__/
      score-formulas.test.ts
      candidate-ranking.scenarios.test.ts
      exploration-guardrails.test.ts
  profile/
    __tests__/
      snapshot-contract.test.ts
      snapshot-regressions.test.ts
  test-fixtures/
    swipe-histories/
      sparse-user.json
      medium-user-mixed.json
      polarized-user.json
    README.md
```

Use your actual repository structure if different; the priority is clear separation between formula unit tests, scenario tests, and snapshot contracts.

---

## Acceptance criteria
1. Core scoring/ranking modules have deterministic regression tests with meaningful edge-case coverage.
2. Fixture-driven scenarios exist for sparse, medium, polarized, and noisy swipe histories.
3. Snapshot/contract tests protect profile output structure and key value expectations.
4. Test suite reliably catches intentional algorithm regressions.
5. Tests run consistently in CI/non-interactive environments (no flakiness from time/randomness).

---

## Validation commands
- `npm test -- scoring`
- `npm test -- ranking`
- `npm test -- snapshot`
- `npm run typecheck`
- `npm run lint`

If command filters differ in this repo, use equivalent targeted test invocations.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: ranking test order is flaky
- Ensure deterministic seed is injected wherever exploration/random sampling exists.
- Sort candidates by deterministic tie-break keys before asserting.
- Avoid depending on map/object iteration order.

### Problem: snapshot tests fail too often after harmless refactors
- Snapshot only stable, domain-relevant objects (not internal runtime metadata).
- Prefer explicit field assertions for critical values.
- Normalize non-essential fields before snapshotting.

### Problem: hard to build realistic fixtures
- Start from a compact canonical fixture and mutate with helper builders.
- Keep each fixture tied to one intent (e.g., repetition guardrail, skip-heavy behavior).
- Document expected outcomes at top of each fixture/test file.

### Problem: numeric drift in formula tests
- Use tolerances for floating-point math where appropriate.
- Assert key invariants in addition to exact numbers.
- Isolate constants in test setup so formula changes require explicit test updates.

---

## Curated resources for Claude Opus coding agent

Use this order: official docs/specs → testing strategy guides → algorithm testing references → community troubleshooting.

### Official documentation (highest priority)
1. Jest docs (test patterns, snapshots, mocks, timers):
   - https://jestjs.io/docs/getting-started
   - https://jestjs.io/docs/snapshot-testing
   - https://jestjs.io/docs/timer-mocks
2. Testing Library guiding principles (if relevant for surrounding tests):
   - https://testing-library.com/docs/guiding-principles/
3. TypeScript handbook (strict typing for fixtures/contracts):
   - https://www.typescriptlang.org/docs/
4. MDN JavaScript references (Number precision, sorting behavior):
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort

### Step-by-step guides / practical references
1. Kent C. Dodds — common testing mistakes and resilient testing mindset:
   - https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
2. Google Testing Blog — deterministic/reliable tests concepts:
   - https://testing.googleblog.com/
3. Martin Fowler — test pyramid and balanced strategy:
   - https://martinfowler.com/articles/practical-test-pyramid.html

### Books (high-value conceptual references)
1. *Unit Testing: Principles, Practices, and Patterns* (Vladimir Khorikov)
2. *xUnit Test Patterns* (Gerard Meszaros)
3. *Working Effectively with Legacy Code* (Michael Feathers)

### YouTube references (quick refreshers)
1. Search: “Jest snapshot testing best practices”
   - https://www.youtube.com/results?search_query=jest+snapshot+testing+best+practices
2. Search: “Property-based testing JavaScript fast-check tutorial”
   - https://www.youtube.com/results?search_query=property+based+testing+javascript+fast-check+tutorial
3. Search: “Testing ranking algorithms deterministic tests”
   - https://www.youtube.com/results?search_query=testing+ranking+algorithms+deterministic+tests

### High-signal GitHub repositories (reference implementations)
1. Jest (advanced examples and snapshot patterns):
   - https://github.com/jestjs/jest
2. fast-check (property-based testing for JS/TS):
   - https://github.com/dubzzz/fast-check
3. TanStack Query (excellent test strategy examples for async deterministic behavior):
   - https://github.com/TanStack/query
4. Redux Toolkit (practical unit/integration testing patterns in TS apps):
   - https://github.com/reduxjs/redux-toolkit

### Community troubleshooting resources
1. Stack Overflow (Jest):
   - https://stackoverflow.com/questions/tagged/jestjs
2. Stack Overflow (TypeScript testing):
   - https://stackoverflow.com/questions/tagged/typescript
3. Stack Overflow (algorithm + ranking discussions):
   - https://stackoverflow.com/questions/tagged/algorithm
4. Jest GitHub Discussions:
   - https://github.com/jestjs/jest/discussions
5. DEV Community testing tag:
   - https://dev.to/t/testing

---

## Notes for next iteration
When iteration 25 performance work starts, keep this test suite as a safety net and add any perf-related correctness tests where ranking behavior could shift due to optimization changes.
