# Iteration 32: Session scoring + session profile generation

## Objective

Design and document an implementation-ready, **session-scoped** scoring pipeline and profile generation flow that computes meaningful showdown insights without mutating global/all-time taste by default.

This iteration should let coding agents implement session analytics deterministically, with strict privacy boundaries and clear future opt-in export hooks.

## Why this matters

Phase 4 introduces multi-participant gameplay where users expect immediate, interpretable results.

If session scoring is mixed with global profile writes, the product risks:

- accidental long-term preference contamination,
- difficult-to-debug scoring drift,
- privacy and trust regressions.

A clean separation between **session profile** and **global profile** is therefore a non-negotiable architecture constraint.

## Scope

### In scope

- Deterministic mapping from showdown responses to **session-local score deltas**.
- Session-only aggregation and snapshot generation (themes/types/tags/metadata dimensions as defined in the repository schema).
- Session profile read models used by results UI (Iteration 33).
- Explicit, disabled-by-default export pathway design (future gated flow).
- Validation rules that prove no implicit global profile mutation occurs.

### Out of scope

- Automatic global profile merges.
- Social graph, friend discovery, chat, or cross-session identity enrichment.
- Production-grade experimentation framework for alternate scoring formulas.

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
| Define deterministic session scoring pipeline + table contracts | **Codex** | Strong at schema + algorithm consistency |
| Validate privacy boundaries, default-off export semantics | **Claude** | Strong at policy clarity and user trust framing |
| Brainstorm edge-case handling (timeouts, duplicates, missing cards) | **Gemini** (optional) | Broad divergence and failure-path ideation |

---

## Repository context for the coding agent

Inspect these first:

- `CLAUDE.md` (Phase 4 constraints and scoring intent)
- `iterations/11-incremental-taste-score-updates.md`
- `iterations/18-add-periodic-profile-snapshot-job.md`
- `iterations/24-create-scoring-ranking-snapshot-test-suite.md`
- `iterations/29-showdown-protocol-and-transport-spec.md`
- `iterations/31-showdown-screen-v1-doc.md`
- `iterations/33-session-results-compare-view.md`
- `iterations/34-slider-mode-implementation-plan.md`
- `iterations/35-phase4-hardening-checklist.md`

Likely implementation surfaces:

- Session persistence models and migrations in `src/` and/or `db/`.
- Showdown response ingestion pipeline (round events → normalized response rows).
- Existing global taste/profile update paths from earlier iterations (use as reference, not as default write target).
- Results query/read-model layer consumed by post-session UI.

If paths differ, locate with:

- `rg -n "showdown|session_profile|taste|snapshot|global|export|derived_weight|timeout_skip" src app iterations CLAUDE.md`

---

## Product constraints that must remain true

1. **Session profile derivation uses only session events for that `session_id`.**
2. **Default gameplay flow performs zero global/all-time profile writes.**
3. Scoring is deterministic for identical ordered inputs (same events => same profile output).
4. Timeout and neutral actions must produce predictable, documented effect (including no-op where appropriate).
5. Export/merge into global profile requires explicit opt-in path and audit-friendly boundary.
6. Aggregates must be reproducible from persisted raw response + card metadata associations.

---

## Scoring architecture requirements (target behavior)

### 1) Session event ingestion contract

- Consume finalized per-round response records (already de-duplicated by participant + round).
- Normalize to canonical scoring input tuple, e.g.:
  - `session_id`
  - `participant_id`
  - `card_id`
  - `input_mode` (`swipe_5_state` / `slider_1_10`)
  - raw action/value
  - deterministic scoring weight (native or derived)
  - timestamp / round index

### 2) Dimension contribution mapping

Define deterministic score contribution rules for all configured dimensions attached to a card (themes/types/tags/etc.).

For each response:

- map weight to signed delta,
- apply metadata multipliers/normalizers if defined,
- accumulate into session-local aggregates,
- track denominator/support counts for confidence/strength interpretation.

### 3) Session profile snapshot generation

At minimum produce a snapshot shape that includes:

- participant/session identity,
- top positive and negative dimensions,
- optional confidence/support metrics,
- generation timestamp + versioned scoring policy identifier,
- provenance pointers (event count, round coverage, filter context if relevant).

### 4) Isolation boundary vs global profile

- Session scoring writes only to session-scoped tables/models.
- Any code path that can mutate global taste must be blocked behind explicit export action/flag.
- Export contract (future) should be fully specified but disabled by default.

### 5) Idempotency + recomputation semantics

- Re-running session profile build for same immutable input must be safe.
- Duplicate transport events must not inflate aggregates.
- Define whether snapshots are append-only versions or upsert-per-policy-version.

### 6) Failure/degraded handling (v1-safe)

Specify deterministic behavior for:

- partial response sets (participant leaves early),
- timeout-heavy sessions,
- mixed input modes,
- delayed writes / retry replay,
- schema/version mismatch between scoring policy and stored snapshots.

---

## Implementation checklist

### A) Data model and invariants

- [ ] Define/confirm session-scoped score aggregate tables and indexes.
- [ ] Define snapshot table/read model for per-participant session profile output.
- [ ] Enforce uniqueness/idempotency keys to avoid duplicate contribution writes.
- [ ] Document constraints that guarantee no default writes to global profile tables.

### B) Scoring algorithm contract

- [ ] Define canonical response → weight → dimension delta pipeline.
- [ ] Define neutral/timeout handling explicitly.
- [ ] Define rounding/precision policy for reproducibility.
- [ ] Version the scoring policy used for snapshot generation.

### C) Isolation and export boundary

- [ ] Define an explicit export API/command contract (disabled by default).
- [ ] Define user-consent and guard conditions for export eligibility.
- [ ] Define audit fields that record if/when export occurs.

### D) Validation + QA matrix

- [ ] Add deterministic fixture examples covering swipe + slider inputs.
- [ ] Add edge-case cases (all timeout, duplicate events, participant dropout).
- [ ] Add immutability checks proving global profile unchanged in default session flow.

### E) Handoff quality

- [ ] Include one end-to-end textual sequence diagram (events → aggregates → snapshot).
- [ ] Include non-goals to prevent scope creep.
- [ ] Include compatibility notes for Iteration 33 results consumption.

---

## Deliverables

1. Session scoring pipeline spec (inputs, transforms, outputs, invariants).
2. Session profile snapshot schema/read-model contract.
3. Isolation boundary spec proving default non-mutation of global profile.
4. Optional export contract design (future gate, off by default).
5. QA acceptance matrix with deterministic example scenarios.

---

## Acceptance criteria

1. Session profile can be fully computed from session data only.
2. Default session flow performs no global taste/profile mutation.
3. Scoring output is deterministic across reruns with identical input.
4. Duplicate/replayed events do not double-count contributions.
5. Snapshot outputs are sufficient for Iteration 33 compare-view requirements.

---

## External resources (for coding agents when stuck)

### Official documentation

- SQLite transactions and atomicity: https://www.sqlite.org/lang_transaction.html
- SQLite conflict resolution (`ON CONFLICT`, idempotent upserts): https://www.sqlite.org/lang_conflict.html
- SQLite UPSERT syntax: https://www.sqlite.org/lang_UPSERT.html
- Expo Router docs (for integration points in app routes): https://docs.expo.dev/router/introduction/
- React Native performance overview (if profile rendering stalls on large snapshots): https://reactnative.dev/docs/performance

### Step-by-step guides / practical engineering references

- Martin Fowler — Event Sourcing (useful for thinking about replay-safe deterministic rebuilds): https://martinfowler.com/eaaDev/EventSourcing.html
- Martin Fowler — CQRS (useful for separating write model from session results read model): https://martinfowler.com/bliki/CQRS.html
- GitHub Engineering blog index (search for data consistency/idempotency writeups): https://github.blog/engineering/

### Books (conceptual grounding)

- *Designing Data-Intensive Applications* (Martin Kleppmann) — chapters on derived data, streams, and consistency.
- *Database Internals* (Alex Petrov) — storage/query behaviors relevant to repeatable aggregation and indexing.

### GitHub repositories (pattern inspiration)

- Supabase examples (SQLite/Postgres-style upsert + profile modeling patterns): https://github.com/supabase/supabase/tree/master/examples
- Expo examples (route/data flow references): https://github.com/expo/examples

### Q&A and discussion boards

- Stack Overflow: SQLite upsert/idempotency patterns:
  - https://stackoverflow.com/questions/tagged/sqlite+upsert
  - https://stackoverflow.com/questions/tagged/idempotency
- Reddit r/reactnative (practical implementation discussions): https://www.reddit.com/r/reactnative/
- SQLite forum (authoritative engine behavior clarifications): https://sqlite.org/forum/

### YouTube resources (targeted refreshers)

- "Expo Router" tutorials (search results): https://www.youtube.com/results?search_query=expo+router+tutorial
- "SQLite UPSERT" walkthroughs (search results): https://www.youtube.com/results?search_query=sqlite+upsert+tutorial
- "Event sourcing explained" overviews (search results): https://www.youtube.com/results?search_query=event+sourcing+explained

> Use these as implementation aids; repository-local constraints in `CLAUDE.md` and iteration docs remain source-of-truth.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: session scores unexpectedly change between runs

- Verify deterministic ordering and stable rounding policy.
- Ensure duplicate events are deduped before aggregation.
- Confirm scoring policy version was not changed between runs.

### Problem: global profile appears modified after session

- Trace write paths and assert session pipeline targets only session-scoped tables.
- Search for shared helper functions reused from global taste updates.
- Add explicit guard that blocks global writes unless export flag/action is present.

### Problem: slider and swipe sessions produce incomparable outputs

- Confirm both modes resolve to canonical deterministic weight scale.
- Store raw input + derived weight for auditability.
- Validate neutral mapping consistency (`timeout_skip` / neutral slider).

### Problem: results view lacks enough context

- Extend session snapshot with support/confidence and top-contributor metadata.
- Keep output explainable (dimension, score, support count), not opaque composites.

---

## Validation commands

- `rg -n "session_profile|session snapshot|showdown|derived_weight|timeout_skip" CLAUDE.md iterations/phase4 src app`
- `rg -n "global profile|all-time|export|opt-in|consent" CLAUDE.md iterations src app`
- `rg -n "ON CONFLICT|UPSERT|idempot|unique\(" src db migrations iterations`

Use equivalent paths if repository layout differs.
