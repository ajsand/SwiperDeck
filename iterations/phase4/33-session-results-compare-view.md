# Iteration 33: Session results compare view

## Objective

Design and document an implementation-ready **post-session comparison experience** that helps participants quickly understand:

- where they are similar,
- where they differ,
- and which dimensions/themes most influenced those outcomes.

This iteration should provide a deterministic, privacy-safe, and UI-ready compare-view spec that coding agents can implement with minimal ambiguity.

## Why this matters

The showdown flow only delivers value if participants can interpret results confidently.

A weak compare view creates confusion ("what does this score mean?") and trust issues ("why is my data shown this way?").

A strong compare view:

- turns raw session scoring into understandable insight,
- avoids over-sharing personal/profile history,
- and gives users a clear "payoff moment" after gameplay.

---

## Scope

### In scope

- Results screen information architecture (sections, ordering, labels, states).
- Group-level and participant-level summary definitions.
- Pairwise and group similarity/contrast metric contracts.
- Explainability requirements (how to justify each insight).
- Privacy-safe display strategy and temporary identity constraints.
- Loading, empty, error, and partial-data states for session results.

### Out of scope

- Social feed, chat, friend graph, or cross-session networking.
- Long-term identity enrichment from session behavior.
- Complex recommendation engines based on compare results.
- Public profile publishing/export UX.

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
| Define data contracts + deterministic compare metrics | **Codex** | Strong at formalizing formulas, tie-breakers, and edge-case-safe read models |
| Validate human-readable language, interpretation quality, and privacy framing | **Claude** | Strong at UX clarity and safe communication constraints |
| Critique visual hierarchy and scannability of result sections | **Gemini** (optional) | Useful for alternative layout/flow ideas and UI simplification |

---

## Repository context for the coding agent

Inspect these first:

- `CLAUDE.md` (Phase 4 intended product outcomes)
- `iterations/17-build-profile-visualizations-v1.md`
- `iterations/19-build-profile-over-time-view.md`
- `iterations/31-showdown-screen-v1-doc.md`
- `iterations/32-session-scoring-and-profile-generation.md`
- `iterations/34-slider-mode-implementation-plan.md`
- `iterations/35-phase4-hardening-checklist.md`

Likely implementation surfaces:

- Post-session routes/screens in `app/` (or equivalent feature folder).
- Session results read models and selectors in `src/`.
- Existing chart/list components from earlier profile visualization iterations.
- Session-scoped profile snapshots and aggregation outputs from Iteration 32.

If paths differ, locate with:

- `rg -n "session results|compare|similarity|contrast|showdown|session_profile|top themes" app src iterations CLAUDE.md`

---

## Product constraints that must remain true

1. Compare view must use **session-scoped data only** (no implicit all-time/profile leakage).
2. Every surfaced insight must be explainable from deterministic metrics.
3. Labels should prioritize clarity over statistical complexity for v1.
4. Display names/participant identifiers must remain privacy-safe and context-limited.
5. Missing or sparse data must degrade gracefully without misleading claims.
6. Same input session data must produce same ordered insights.

---

## Compare-view architecture requirements (target behavior)

### 1) Results information architecture

Define canonical section order (example):

1. **Session summary** (participants, rounds counted, completion status)
2. **Top group alignments** (shared strongest positives)
3. **Top group divergences** (largest disagreement dimensions)
4. **Per-participant highlights** (what each participant leaned toward)
5. **Pairwise similarity matrix/list** (A↔B scores + strongest overlap dimensions)
6. **Methodology footer** (plain-language explanation of score semantics)

### 2) Core metric contracts

Document deterministic formulas (or pseudocode) for:

- Pairwise similarity score (e.g., cosine or bounded normalized overlap).
- Contrast score (e.g., absolute delta aggregation on ranked dimensions).
- Group consensus dimensions (high support + low variance).
- Group divergence dimensions (high variance or polarity split).

For each metric, specify:

- input fields,
- normalization,
- tie-break rules,
- precision/rounding,
- minimum data thresholds required to display.

### 3) Explainability layer

Each user-facing insight must map to explicit evidence fields, such as:

- `dimension_key`
- `participant_score`
- `group_mean`
- `support_count`
- `confidence_band` (if available)

Require plain-language rendering patterns like:

- "You and Alex aligned strongly on **Sci-Fi** (high positive score for both)."
- "Biggest contrast: **Pacing** (you preferred fast, Jordan preferred slow)."

### 4) Privacy + safety constraints

- Show only temporary session identities unless explicit identity linking exists.
- Do not expose historical/global profile attributes in compare output.
- Avoid sensitive inference language (e.g., personality or demographic claims).
- If participant count is too small for safe aggregate claims, switch to reduced-detail mode.

### 5) State handling requirements

Define UI behavior for:

- loading computation state,
- partial results (some participants missing final rounds),
- empty/no-results state,
- error/retry state,
- stale session link / expired local session data.

### 6) Performance + rendering guardrails

- Prioritize ranked lists/cards over heavy interactive charts in v1.
- Use memoized selectors/read models for derived compare outputs.
- Cap section item counts (e.g., top 3–5 insights per block) for readability.

---

## Implementation checklist

### A) Data and metric contract definition

- [ ] Define canonical compare-view DTO/read-model shape.
- [ ] Define pairwise similarity formula + deterministic tie-breakers.
- [ ] Define contrast formula and thresholds for surfacing insights.
- [ ] Define group-level consensus/divergence extraction logic.

### B) UX structure and states

- [ ] Define section order and component responsibilities.
- [ ] Define loading/empty/error/partial states with copy guidance.
- [ ] Define fallback rendering for sparse data.

### C) Privacy and trust constraints

- [ ] Define temporary display-name policy for session participants.
- [ ] Confirm no historical/global profile reads are required.
- [ ] Define safe language rules to avoid over-interpretation.

### D) Validation and QA

- [ ] Add deterministic fixtures for at least 3 session archetypes (high alignment, mixed, polarized).
- [ ] Validate stable ordering for equal/near-equal metric values.
- [ ] Validate results remain reproducible across reruns.

### E) Handoff quality

- [ ] Include one end-to-end flow (session profile snapshot → compare read model → UI sections).
- [ ] Include non-goals to prevent recommender/social scope creep.
- [ ] Include integration notes for Iteration 34 (slider mode parity).

---

## Deliverables

1. Session results compare-view functional spec (sections + states + copy constraints).
2. Deterministic metric contract doc (similarity/contrast/group insights).
3. Privacy-safe rendering rules for participant identity and interpretation language.
4. QA matrix with deterministic scenarios and expected output ordering.

---

## Acceptance criteria

1. Participants can identify at least one clear similarity and one clear contrast.
2. Compare output is reproducible for identical session inputs.
3. No non-session or global profile data is shown by default.
4. Insights are backed by explicit, traceable metric fields.
5. Error/empty/partial states avoid misleading conclusions.

---

## External resources (for coding agents when stuck)

### Official documentation

- React Native performance and rendering best practices: https://reactnative.dev/docs/performance
- Expo Router documentation (route composition/state transitions): https://docs.expo.dev/router/introduction/
- SQLite aggregate functions (if computing compare metrics in SQL): https://www.sqlite.org/lang_aggfunc.html
- SQLite window functions (ranking/top-N sections): https://www.sqlite.org/windowfunctions.html
- SQLite `WITH` clause / CTEs for readable derived queries: https://www.sqlite.org/lang_with.html

### Step-by-step guides / practical engineering references

- Nielsen Norman Group — Data visualization principles for comprehension: https://www.nngroup.com/articles/data-visualization-guidelines/
- Material Design — Understanding data visualization patterns: https://m3.material.io/foundations/data-visualization/overview
- Atlassian Design System — Empty state guidance: https://atlassian.design/components/empty-state/
- UX Collective / practical comparison UX examples (search landing): https://uxdesign.cc/search?q=comparison%20ui

### Books (conceptual grounding)

- *Storytelling with Data* (Cole Nussbaumer Knaflic) — clear communication of quantitative insights.
- *Designing Interfaces* (Jenifer Tidwell et al.) — patterns for hierarchy, scanning, and progressive disclosure.
- *Designing Data-Intensive Applications* (Martin Kleppmann) — deterministic derived views and consistency patterns.

### GitHub repositories (pattern inspiration)

- Expo examples (screen architecture and state patterns): https://github.com/expo/examples
- React Native Paper (UI components and list/card patterns): https://github.com/callstack/react-native-paper
- Victory Native XL (charting options if lightweight visuals are needed): https://github.com/FormidableLabs/victory-native-xl

### Stack Overflow / discussion boards

- Stack Overflow: similarity metrics implementation discussions:
  - https://stackoverflow.com/questions/tagged/cosine-similarity
  - https://stackoverflow.com/questions/tagged/similarity
- Stack Overflow: React Native performance/list rendering:
  - https://stackoverflow.com/questions/tagged/react-native+performance
- Reddit r/reactnative for implementation trade-offs: https://www.reddit.com/r/reactnative/
- SQLite forum for query behavior clarification: https://sqlite.org/forum/

### YouTube resources (targeted refreshers)

- "Cosine similarity explained" tutorials: https://www.youtube.com/results?search_query=cosine+similarity+explained
- "React Native FlatList performance" tutorials: https://www.youtube.com/results?search_query=react+native+flatlist+performance
- "Expo Router tutorial" walkthroughs: https://www.youtube.com/results?search_query=expo+router+tutorial
- "Data visualization UX" explainers: https://www.youtube.com/results?search_query=data+visualization+ux+tutorial

> Use external resources as support only. Repository-local constraints in `CLAUDE.md` and iteration specs remain source-of-truth.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: similarity scores feel unintuitive to users

- Add plain-language explanation and a bounded scale label (e.g., 0–100).
- Show top contributing dimensions behind each pairwise score.
- Prefer fewer, higher-confidence insights over many weak signals.

### Problem: compare view over-emphasizes tiny differences

- Apply minimum effect-size threshold before surfacing contrasts.
- Include support-count gating (avoid claims from very sparse rounds).
- Collapse low-confidence contrasts into "insufficient data" messaging.

### Problem: layout becomes cluttered with >4 participants

- Switch pairwise block from full matrix to ranked "top alignments/top contrasts" lists.
- Use progressive disclosure (tap to expand participant details).
- Enforce hard caps for visible insights per section.

### Problem: participants worry about privacy

- Re-verify session-only data source usage.
- Display short privacy note: "Results shown from this session only."
- Use temporary names/aliases and avoid persistent identity hints.

---

## Validation commands

- `rg -n "session results|compare|similarity|contrast|pairwise|consensus|divergence" CLAUDE.md iterations/phase4 src app`
- `rg -n "session_profile|session snapshot|showdown|derived_weight" iterations/phase4 src app`
- `rg -n "global profile|all-time|privacy|display name|temporary" CLAUDE.md iterations/phase4 src app`

Use equivalent paths if repository layout differs.
