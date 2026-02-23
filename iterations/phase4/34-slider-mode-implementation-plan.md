# Iteration 34: Slider mode implementation plan (1–10)

## Objective

Design and document an implementation-ready **slider input mode** for Showdown sessions that is deterministic, auditable, and fully compatible with existing swipe-based scoring behavior.

This iteration should make it easy for coding agents to implement slider mode without introducing ambiguity around:

- what slider values mean,
- how values are persisted,
- how scoring weights are derived,
- and how mixed input modes remain comparable.

## Why this matters

Slider mode adds richer preference expression than discrete swipe states, but it can also break trust if values map inconsistently or if historical swipe semantics are accidentally changed.

A strong slider-mode plan ensures:

- deterministic mapping from UI input to scoring,
- reproducible analytics and debugging,
- and backward-compatible behavior with prior phases.

---

## Scope

### In scope

- Canonical slider semantics for values `1..10`.
- Event payload/storage contract for slider responses.
- Deterministic mapping formula from `slider_value` → `derived_weight`.
- Coexistence and comparability with swipe mode and timeout behavior.
- Validation and QA requirements for boundaries, neutrality, and mixed-mode sessions.

### Out of scope

- Replacing or redefining legacy swipe action constants.
- Retroactive migration/re-interpretation of historical swipe events.
- UI theming/micro-interactions beyond what is necessary to capture slider responses.

---

## Multi-model execution strategy

> **Before starting this iteration, review:**
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../../docs/MULTI_MODEL_WORKFLOW.md)
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../../docs/models/CLAUDE_OPUS_4_6_GUIDE.md)
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../../docs/models/GPT_5_3_CODEX_GUIDE.md)
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../../docs/models/GEMINI_3_1_GUIDE.md)

### Recommended model routing

| Sub-task | Model | Why |
| --- | --- | --- |
| Define event schema, deterministic formula, and compatibility matrix | **Codex** | Strong at contract design, edge-case handling, and test matrix definition |
| Validate UX clarity for slider semantics and neutral language | **Claude** | Strong at product wording and reducing implementation ambiguity |
| Stress-test alternative interaction patterns / ergonomics (optional) | **Gemini** | Useful for extra UI flow sanity checks and fallback ideas |

---

## Repository context for the coding agent

Inspect these first:

- `CLAUDE.md` (Phase 4 slider rules + compatibility constraints)
- `iterations/09-persist-swipe-sessions-and-swipe-events.md`
- `iterations/11-incremental-taste-score-updates.md`
- `iterations/phase4/31-showdown-screen-v1-doc.md`
- `iterations/phase4/32-session-scoring-and-profile-generation.md`
- `iterations/phase4/33-session-results-compare-view.md`
- `iterations/phase4/35-phase4-hardening-checklist.md`

Likely implementation surfaces:

- Showdown round response capture flow in `app/` screens/routes.
- Session response domain types and validators in `src/` or equivalent.
- Scoring adapters/read models where `derived_weight` is consumed.
- Persistence layer for `showdown_responses` schema writes.

If paths differ, locate with:

- `rg -n "slider_1_10|slider_value|derived_weight|action_kind|timeout_skip" app src iterations CLAUDE.md`

---

## Product constraints that must remain true

1. Slider semantics are fixed: `1` strong negative, `5` neutral, `10` strong positive.
2. Raw slider value is persisted exactly as captured (`integer 1..10`).
3. Derived scoring weight is deterministic and reproducible from raw value.
4. Existing swipe-mode weight behavior remains unchanged unless explicitly routed through a compatibility adapter.
5. Round resolution still guarantees one logical response per participant per round.
6. Same inputs must always produce identical derived weights and session scores.

---

## Slider-mode contract requirements (target behavior)

### 1) Input semantics + commit behavior

Define clear capture rules for slider mode during a round:

- Participant may adjust slider while round is active.
- Exactly one committed response is stored at round close/submit.
- If no committed slider response exists before timeout, store `timeout_skip` path per session rules.

Clarify the source of truth for "final slider value" (e.g., last value at lock-in time).

### 2) Response payload schema

Ensure response model explicitly supports slider path:

- `action_kind`: `slider_rating`
- `slider_value`: integer `1..10` (required for slider events)
- `derived_weight`: number (required for scoring)
- `swipe_action`: null for slider events

Also define invalid-state protections (e.g., slider event missing slider value).

### 3) Deterministic mapping formula

Use the Phase 4 recommended mapping unless a v1 deviation is explicitly approved:

- `derived_weight = clamp(((slider_value - 5.5) / 4.5) * 2, -2, 2)`

Must specify:

- numeric precision retained for computation,
- rounding/display policy,
- neutrality handling near center,
- boundary guarantees for values 1 and 10.

### 4) Compatibility with swipe mode

Define explicit compatibility matrix for:

- `swipe_5_state`
- `slider_1_10`
- `timeout_skip`

Include how scoring pipeline consumes all three without changing historical action semantics.

### 5) Auditability and explainability

Document deterministic replay behavior:

- Given stored `slider_value`, recomputed `derived_weight` should match persisted value.
- Include mismatch-handling strategy (e.g., data integrity warning if values diverge).

---

## Implementation checklist

### A) Data contracts

- [ ] Finalize slider response schema with required/nullable fields.
- [ ] Add validation rules for slider value bounds (`1..10`).
- [ ] Define serialization contract (DB + in-memory type alignment).

### B) Mapping + scoring integration

- [ ] Implement canonical mapping helper (single source of truth).
- [ ] Ensure scoring reads `derived_weight` consistently for slider responses.
- [ ] Confirm no regression in swipe action weight constants.

### C) Edge cases

- [ ] Define behavior for stale UI events near timer cutoff.
- [ ] Define behavior for malformed/out-of-range values.
- [ ] Define timeout path when slider is never committed.

### D) QA + determinism

- [ ] Add unit fixtures for `slider_value` at 1, 5, 10.
- [ ] Add near-neutral fixtures (4, 5, 6) and assert expected sign/strength.
- [ ] Add mixed-mode session fixtures (swipe + slider + timeout).
- [ ] Verify deterministic reruns produce identical results.

### E) Handoff quality

- [ ] Provide compatibility matrix/table for input modes.
- [ ] Include one end-to-end example (capture → persist → score).
- [ ] Include explicit non-goals to avoid scope creep.

---

## Deliverables

1. Slider mode functional spec (capture semantics + states).
2. Deterministic mapping contract (formula + precision/rounding rules).
3. Input-mode compatibility matrix (swipe/slider/timeout).
4. QA matrix with deterministic fixtures and expected outputs.

---

## Acceptance criteria

1. Slider semantics are explicit and unambiguous for implementers.
2. Mapping from raw value to derived weight is deterministic and documented.
3. Existing swipe-mode scoring remains behaviorally unchanged.
4. Mixed input modes are supported without ambiguity in scoring pipeline.
5. Boundary/neutral/timeout scenarios are covered by deterministic tests.

---

## External resources (for coding agents when stuck)

### Official documentation

- React Native Slider package docs (`@react-native-community/slider`): https://github.com/callstack/react-native-slider
- React Native accessibility docs (labels/adjustable controls): https://reactnative.dev/docs/accessibility
- Expo Router docs (state + route transitions): https://docs.expo.dev/router/introduction/
- SQLite `CHECK` constraints for value bounds: https://www.sqlite.org/lang_createtable.html#ckconst
- SQLite `UPSERT` docs (if response updates are merged): https://www.sqlite.org/lang_upsert.html

### Step-by-step guides / practical references

- UX Collective articles on slider UX pitfalls (search landing): https://uxdesign.cc/search?q=slider%20ux
- Nielsen Norman Group guidance on input controls and form usability: https://www.nngroup.com/topic/forms/
- Material Design sliders guidance: https://m3.material.io/components/sliders/overview
- web.dev form controls + input ergonomics overview: https://web.dev/learn/forms/

### Books (conceptual grounding)

- *Designing Interfaces* (Jenifer Tidwell et al.) — control affordances and interaction feedback.
- *Don't Make Me Think* (Steve Krug) — reducing ambiguity in interactive controls.
- *Release It!* (Michael T. Nygard) — resilience and defensive handling of edge cases.

### GitHub repositories (pattern inspiration)

- React Native Elements slider component usage patterns: https://github.com/react-native-elements/react-native-elements
- Expo examples repo (input/state patterns): https://github.com/expo/examples
- React Hook Form (input validation ideas, even if not directly used): https://github.com/react-hook-form/react-hook-form

### Stack Overflow / discussion boards

- Stack Overflow slider questions in React Native:
  - https://stackoverflow.com/questions/tagged/react-native+slider
- Stack Overflow deterministic rounding/precision discussions:
  - https://stackoverflow.com/questions/tagged/floating-point
- React Native community discussions: https://github.com/react-native-community/discussions-and-proposals
- SQLite forum (constraint/query behavior): https://sqlite.org/forum/

### YouTube resources (targeted refreshers)

- React Native slider tutorials: https://www.youtube.com/results?search_query=react+native+slider+tutorial
- Mobile form/input UX principles: https://www.youtube.com/results?search_query=mobile+input+ux+design
- Deterministic scoring / recommendation math explainers: https://www.youtube.com/results?search_query=recommendation+score+normalization
- SQLite schema design tutorials: https://www.youtube.com/results?search_query=sqlite+schema+design+tutorial

> Use external resources as support only. Repository-local constraints in `CLAUDE.md` and iteration specs remain source-of-truth.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: slider feels inconsistent with swipe sentiment

- Re-check semantic anchors (`1`, `5`, `10`) in UI copy and tests.
- Compare derived ranges against existing swipe weight envelope.
- Add visual helper text (negative ↔ positive) without changing scoring formula.

### Problem: different codepaths produce different derived weights

- Centralize mapping into one shared helper.
- Remove duplicated ad-hoc math in UI/store/service layers.
- Add deterministic fixture assertions for every integer 1..10.

### Problem: neutral behavior causes confusion

- Ensure docs explain why neutral center uses 5 in a 1..10 scale.
- Confirm near-neutral values (4/5/6) generate expected low-magnitude outputs.
- Round only for UI display; preserve computation precision in storage or scoring path.

### Problem: timeout and slider event race near round end

- Define strict precedence rules (e.g., lock timestamp <= deadline accepted).
- Ensure only one logical response persists per participant/round.
- Add race-condition tests with deterministic clock simulation if available.

---

## Validation commands

- `rg -n "slider_1_10|slider_value|derived_weight|action_kind|timeout_skip" CLAUDE.md iterations/phase4 src app`
- `rg -n "swipe_5_state|compatibility|mapping|clamp" CLAUDE.md iterations/phase4 src app`
- `rg -n "showdown_responses|participant_id|round_index|unique" CLAUDE.md iterations/phase4 src app`

Use equivalent paths if repository layout differs.
