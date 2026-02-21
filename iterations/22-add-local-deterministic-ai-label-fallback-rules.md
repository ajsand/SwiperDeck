# Iteration 22: Add local deterministic AI-label fallback rules

## Objective
Implement a production-ready, fully local, deterministic labeling/summarization pipeline that converts computed profile statistics into human-readable preference labels and short summaries **without any cloud calls**.

## Why this matters
This iteration preserves a core product promise from `CLAUDE.md`: users always get understandable profile insight even when optional cloud AI features are disabled.

It also improves:
- **Trust** (explanations are consistent and inspectable)
- **Latency** (instant local generation)
- **Privacy** (no network transfer needed)
- **Testability** (deterministic outputs can be snapshot-verified)

## Scope

### In scope
- Deterministic mapping from score patterns to labels and summary text.
- Rule precedence/priority model so overlapping rules resolve consistently.
- Positive-space and negative-space language (what user likes + tends to avoid).
- Config-driven thresholds to make tuning easier.
- Unit/snapshot tests for determinism and edge cases.

### Out of scope
- Cloud LLM prompts, completions, or fallback orchestration.
- Personalized natural-language generation beyond deterministic templates.
- Multi-locale translation system (English-only baseline unless already present).

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Design rule precedence model and template system | **Claude** | Product thinking for label language and priority |
| Produce Task Brief with rule contract and example personas | **Claude** | Decomposition and constraint specification |
| Implement rule engine, label generator, summary templates | **Codex** | Core implementation of deterministic pipeline |
| Wire into profile/library surfaces | **Codex** | UI integration |
| Add fixture-driven determinism and precedence tests | **Codex** | Test authoring |

### Notes
- **Claude first**: Claude should design the rule precedence model (priority, tie-breaking, conflict groups) and produce example label outputs for representative personas before Codex implements.
- Gemini is not needed (this is rule-based logic, not spatial/layout work).

---

## Repository context for the coding agent

Before implementation, review these areas for alignment:
- `CLAUDE.md` sections defining local-first behavior, scoring, profile interpretation, and optional cloud summary posture.
- Existing scoring/ranking/profile modules from prior iterations (`11`, `13`, `14`, `17`, `18`, `19`, `20`, `21`) to reuse computed metrics rather than re-deriving them.
- Existing test conventions (snapshot style, fixture placement, naming patterns) in the current repo.

Use **already-computed profile state** as input whenever possible. Avoid duplicate scoring logic inside label generation.

---

## Implementation checklist (detailed)

### 1) Define deterministic input contract
- [ ] Create/confirm a strongly typed input shape (e.g., normalized scores, confidence/signal indicators, sample counts).
- [ ] Document expected ranges and meaning for each metric.
- [ ] Add a guard path for sparse/cold-start profiles.

### 2) Build rule configuration + precedence
- [ ] Create rule sets for:
  - high-affinity tags/types
  - low-affinity/avoidance signals
  - balance/diversity descriptors
  - confidence qualifiers (strong signal vs early estimate)
- [ ] Encode precedence explicitly (e.g., higher severity first, then score delta, then lexical tie-breaker).
- [ ] Ensure deterministic ordering (stable sort / explicit comparator).

### 3) Generate deterministic labels
- [ ] Implement `generateLocalProfileLabels(...)` (or equivalent) returning structured labels.
- [ ] Use canonical IDs/keys for labels to prevent text-only coupling.
- [ ] Keep wording concise and product-safe (no speculative claims).

### 4) Generate deterministic summary text
- [ ] Implement `generateLocalProfileSummary(...)` from selected labels.
- [ ] Compose from templates with strict ordering rules.
- [ ] Include positive + negative-space phrasing when signal supports it.
- [ ] Provide fallback summary for sparse/noisy data.

### 5) Wire into profile/library surfaces
- [ ] Replace/augment previous summary path so local deterministic summary is always available.
- [ ] Ensure UI behavior is unchanged when cloud summary is off/unavailable.
- [ ] Avoid blocking UI thread (perform lightweight compute or memoized selector path).

### 6) Testing + fixtures
- [ ] Add fixture-driven tests for representative personas (e.g., broad explorer, niche specialist, contradictory signals, cold-start).
- [ ] Add determinism test: same input → same output across repeated runs.
- [ ] Add precedence test: overlapping rules resolve predictably.
- [ ] Add snapshot/contract tests to protect text regressions.

---

## Suggested rule-system contract (example)

```ts
export interface LocalLabelRule {
  id: string;
  domain: 'tag' | 'type' | 'meta';
  polarity: 'positive' | 'negative' | 'neutral';
  minScore?: number;
  maxScore?: number;
  minSamples?: number;
  priority: number;
  templateKey: string;
}
```

Guidance:
- Keep `priority` numeric and explicit.
- Use deterministic tie-breakers: `priority DESC`, then `abs(score) DESC`, then `id ASC`.
- Keep templates in a dedicated module (not scattered in components).

---

## Acceptance criteria
1. Identical profile input always produces identical label IDs and summary text.
2. Summary generation requires no network access and works fully offline.
3. Rule precedence is documented and validated by tests.
4. Sparse/cold-start input returns safe, sensible fallback wording.
5. UI surfaces consuming summaries remain stable and readable.

---

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- local-labels`
- `npm test -- profile-summary`

If these test targets do not yet exist, add focused tests in this iteration.

---

## Troubleshooting playbook (when agent gets stuck)

### Common issue: nondeterministic output order
- Ensure all candidate labels are sorted with explicit comparator fields.
- Avoid reliance on object key insertion order for final output.
- Freeze fixture input and avoid mutation during generation.

### Common issue: contradictory labels shown together
- Add conflict groups/exclusion logic (e.g., “strongly prefers X” should suppress weaker conflicting variants).
- Enforce max labels per section and priority cutoffs.

### Common issue: weak profiles produce overconfident language
- Gate strong wording by sample count/signal confidence thresholds.
- Use fallback qualifiers (“early signal”, “still learning preferences”).

### Common issue: summary drift after scoring tweaks
- Keep summary generator separated from scorer internals with stable adapter contract.
- Refresh fixtures when score semantics intentionally change.

---

## Curated resources for Claude Opus coding agent

Use in this order: official docs/specs → deterministic rule-engine references → implementation examples → community troubleshooting.

### Official documentation (highest priority)
1. TypeScript handbook (narrowing, unions, utility types for robust rule contracts):
   - https://www.typescriptlang.org/docs/
2. JavaScript `Array.prototype.sort` determinism considerations and comparator rules (MDN):
   - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
3. Jest docs for snapshot and table-driven tests:
   - https://jestjs.io/docs/getting-started
4. Expo / React Native architecture references if wiring touches app surfaces:
   - https://docs.expo.dev/
   - https://reactnative.dev/docs/getting-started

### Step-by-step guides / practical tutorials
1. Rule engine pattern overview (for configuration-driven deterministic decisions):
   - https://martinfowler.com/bliki/RulesEngine.html
2. Table-driven test patterns in JS/TS:
   - https://jestjs.io/docs/api#testeachtablename-fn-timeout
3. Clean architecture for domain rules and pure functions:
   - https://github.com/goldbergyoni/nodebestpractices

### YouTube references (implementation walkthroughs)
1. Search: “TypeScript rule engine”, “deterministic JavaScript sorting”, “Jest snapshot testing best practices”
   - https://www.youtube.com/results?search_query=typescript+rule+engine
   - https://www.youtube.com/results?search_query=deterministic+javascript+sorting
   - https://www.youtube.com/results?search_query=jest+snapshot+testing+best+practices
2. Search: “React Native architecture pure functions domain layer”
   - https://www.youtube.com/results?search_query=react+native+clean+architecture+domain+layer

### High-signal GitHub repositories (reference implementations)
1. json-rules-engine (reference for declarative rule design ideas):
   - https://github.com/CacheControl/json-rules-engine
2. Casbin examples (policy/rule precedence inspiration):
   - https://github.com/casbin/casbin
3. Jest repository/examples for test design patterns:
   - https://github.com/jestjs/jest

### Community troubleshooting resources
1. Stack Overflow (TypeScript rules/patterns):
   - https://stackoverflow.com/questions/tagged/typescript
2. Stack Overflow (Jest snapshots/testing):
   - https://stackoverflow.com/questions/tagged/jestjs
3. Stack Overflow (React Native/Expo integration):
   - https://stackoverflow.com/questions/tagged/react-native
   - https://stackoverflow.com/questions/tagged/expo
4. Expo Discussions:
   - https://github.com/expo/expo/discussions
5. Reddit / discussion boards for implementation tradeoffs:
   - https://www.reddit.com/r/reactnative/
   - https://www.reddit.com/r/typescript/

### Books / long-form references
1. *Refactoring* (Martin Fowler) — extracting deterministic domain logic from UI code.
2. *Domain-Driven Design Distilled* (Vernon) — modeling clear domain language and rule boundaries.
3. *Designing Data-Intensive Applications* (Kleppmann) — consistency mindset for deterministic pipelines.
4. *Grokking Simplicity* (Normand) — functional, predictable transformations.

---

## Definition of done
- Local deterministic label + summary generation is implemented and used by profile surfaces.
- Rule precedence and tie-break logic are explicit, documented, and tested.
- Determinism tests pass for repeated execution with identical fixtures.
- Sparse-profile fallback messaging is safe and user-friendly.
- No cloud/network dependency exists for baseline summary output.

## Notes for next iteration
Iteration 23 introduces optional cloud summary toggle behavior. Keep local deterministic summary path as default/fallback, and ensure cloud augmentation (if enabled) does not break deterministic local baseline.
