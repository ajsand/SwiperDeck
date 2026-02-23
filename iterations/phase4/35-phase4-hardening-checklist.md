# Iteration 35: Phase 4 hardening checklist

## Objective

Produce an implementation-ready **hardening checklist + verification plan** for Phase 4 (decks + showdown + slider) so coding agents can ship reliably under timing, reconnection, and privacy constraints.

This iteration should eliminate ambiguity around:

- what failure modes are expected,
- which fallbacks are deterministic,
- how event integrity is preserved under retries/duplicates,
- and how session-scoped privacy is enforced from capture to teardown.

## Why this matters

Phase 4 introduces distributed timing behavior (host + participants), ephemeral join flows, and mixed response modes (swipe + slider + timeout). These increase risk for:

- race conditions near round boundaries,
- stale or duplicated submissions,
- inconsistent score computation under reconnects,
- and accidental over-retention of session data.

A strong hardening plan reduces production regressions, simplifies QA, and gives agents explicit decision rules when reality differs from happy-path assumptions.

---

## Scope

### In scope

- Timer drift tolerances and deterministic round-closing behavior.
- Reconnect and late-join semantics for hosts/participants.
- Idempotency rules for round responses and event replay.
- Offline/degraded mode expectations (read/write boundaries).
- Privacy/data lifecycle requirements for session artifacts.
- Validation matrix for high-risk edge cases.

### Out of scope

- New user-facing feature expansion beyond Phase 4 requirements.
- Backend provider-specific micro-optimizations.
- Re-architecting previously accepted Phase 1–3 domain contracts.

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
| Define failure taxonomy, idempotency contract, and deterministic fallback matrix | **Codex** | Strong at state-machine rigor, invariant writing, and testability constraints |
| Challenge assumptions around UX trust, error copy, and privacy default behavior | **Claude** | Strong at human-readable risk framing and conservative safety defaults |
| Review degraded-state UI patterns (retry banners, stale status indicators) | **Gemini** (optional) | Helpful for visual-state organization and alternatives |

---

## Repository context for the coding agent

Inspect these first:

- `CLAUDE.md` (Phase 4 constraints and intended behavior)
- `iterations/26-release-hardening-and-readiness-checklist.md`
- `iterations/phase4/29-showdown-protocol-and-transport-spec.md`
- `iterations/phase4/30-qr-join-flow-ui-spec.md`
- `iterations/phase4/31-showdown-screen-v1-doc.md`
- `iterations/phase4/32-session-scoring-and-profile-generation.md`
- `iterations/phase4/34-slider-mode-implementation-plan.md`

Likely implementation surfaces:

- Showdown round/timer orchestration in `app/` routes/screens.
- Transport/session coordination layer in `src/` (or equivalent).
- Response persistence + scoring read models for idempotent application.
- Local storage teardown/data retention jobs tied to session lifecycle.

If paths differ, locate with:

- `rg -n "drift|reconnect|idempot|timeout|round_close|session_end|privacy|retention|duplicate" app src iterations CLAUDE.md`

---

## Hardening invariants that must remain true

1. **Single-resolution invariant:** each participant contributes at most one logical response per round after idempotency normalization.
2. **Deterministic close invariant:** round closure always uses a single canonical clock decision path (no split-brain close results).
3. **Replay safety invariant:** reprocessing the same event set yields the same persisted round/session outcome.
4. **Mode parity invariant:** swipe, slider, and timeout responses are all valid and comparable via documented scoring contracts.
5. **Privacy boundary invariant:** compare/results views stay session-scoped and do not leak non-session profile history.
6. **Lifecycle invariant:** session artifacts respect explicit retention/deletion policy once session expires or is terminated.

---

## Hardening requirements (target behavior)

### 1) Time synchronization and round boundaries

Define canonical timing strategy:

- authoritative source for round start/close (host or protocol-defined authority),
- allowed drift tolerance window,
- behavior when client clock deviates beyond threshold,
- deterministic ordering for near-boundary submissions.

Document what happens for events that arrive:

- just before close,
- exactly at close timestamp,
- after close but before ack,
- after session-end finalization.

### 2) Reconnect, late join, and continuity rules

Specify behavior for:

- participant disconnect during active round,
- host reconnect with partially committed round state,
- late joiner entering mid-session,
- reconnect after session close.

Include state-resync contract:

- what snapshot is authoritative,
- what client-local pending events can be retried,
- when pending events must be discarded to preserve determinism.

### 3) Idempotency and duplicate-event handling

Define canonical dedup key shape (example dimensions):

- `session_id`, `round_index`, `participant_id`, `response_mode`, `client_event_id`.

Must specify:

- first-write-wins vs last-write-wins policy,
- whether retries mutate existing payload,
- audit/logging behavior when duplicate with mismatched payload appears,
- guarantees for exactly-once **logical effect** despite at-least-once transport.

### 4) Offline and degraded operation

Clarify explicit behavior under degraded connectivity:

- host offline before/after round start,
- participant offline submission attempts,
- local queueing and retry boundaries,
- safe UX messaging for unsynced state.

Define hard stop conditions where app should fail closed instead of guessing.

### 5) Privacy, retention, and teardown

Define lifecycle states for session data:

- active,
- completed (results available),
- expired,
- deleted/purged.

Specify:

- what is stored locally and for how long,
- what is displayed in results after expiration,
- explicit user/admin actions that trigger purge,
- logs/telemetry redaction requirements for participant/session identifiers.

### 6) Observability and operator diagnostics

Define minimum instrumentation for hardening validation:

- drift correction events,
- reconnect attempts + outcomes,
- duplicate suppression counts,
- timeout-rate metrics,
- session close race counters.

Include privacy-safe logging rules (no raw sensitive payload leakage).

---

## Implementation checklist

### A) Reliability contract definition

- [ ] Define timer authority and drift tolerance policy.
- [ ] Define deterministic round-close ordering and boundary rules.
- [ ] Define reconnect/late-join state machine and allowed transitions.

### B) Data integrity and idempotency

- [ ] Define dedup key and duplicate resolution policy.
- [ ] Define replay-safe persistence semantics for round responses.
- [ ] Define mismatch-handling behavior for conflicting duplicate payloads.

### C) Degraded-mode behavior

- [ ] Define offline queue/retry policy and expiry.
- [ ] Define fail-closed conditions for unsafely stale state.
- [ ] Define UX copy/status signals for sync uncertainty.

### D) Privacy + lifecycle hardening

- [ ] Define session data retention and purge schedule.
- [ ] Define identity-minimization rules in results/logging.
- [ ] Validate session-scoped-only data exposure in compare flows.

### E) Verification and QA matrix

- [ ] Add drift test scenarios (low/high skew, boundary submissions).
- [ ] Add reconnect tests (participant/host, mid-round and post-close).
- [ ] Add duplicate-event tests (exact duplicate, conflicting duplicate).
- [ ] Add teardown tests (expired/deleted session visibility + purge behavior).

### F) Handoff quality

- [ ] Include explicit non-goals to prevent feature creep.
- [ ] Include one end-to-end failure walkthrough (disconnect + retry + recover).
- [ ] Include expected logs/metrics table for debugging production incidents.

---

## Deliverables

1. Phase 4 hardening checklist with invariant-based requirements.
2. Risk register with severity, likelihood, detection signal, and mitigation.
3. Deterministic fallback matrix for timing/reconnect/duplicate/offline scenarios.
4. QA verification matrix with reproducible edge-case scenarios.

---

## Acceptance criteria

1. High-risk timing/reconnect/duplicate failure modes have explicit deterministic behavior.
2. Idempotency strategy prevents multiple logical responses per participant per round.
3. Privacy and retention boundaries are enforceable and testable.
4. QA can execute the matrix without unstated assumptions.
5. Re-running same event sequences produces identical session outcomes.

---

## External resources (for coding agents when stuck)

### Official documentation

- Expo Router docs (navigation/state transitions): https://docs.expo.dev/router/introduction/
- React Native AppState docs (foreground/background behavior): https://reactnative.dev/docs/appstate
- React Native NetInfo (connectivity awareness): https://github.com/react-native-netinfo/react-native-netinfo
- SQLite transactions + locking behavior: https://www.sqlite.org/lang_transaction.html
- SQLite constraints and conflict handling (`ON CONFLICT`): https://www.sqlite.org/lang_conflict.html
- SQLite date/time functions (expiry/retention helpers): https://www.sqlite.org/lang_datefunc.html

### Step-by-step guides / practical references

- AWS Builders Library — Timeouts, retries, and backoff with jitter: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- Google SRE Book — Handling overload and cascading failures: https://sre.google/sre-book/addressing-cascading-failures/
- Microsoft distributed systems patterns catalog (retry/circuit/idempotency context): https://learn.microsoft.com/azure/architecture/patterns/
- OWASP Mobile Application Security Testing Guide (privacy + data storage checks): https://mas.owasp.org/MASTG/
- NIST Privacy Framework (data lifecycle framing): https://www.nist.gov/privacy-framework

### Books (conceptual grounding)

- *Designing Data-Intensive Applications* (Martin Kleppmann) — consistency, replay, and event integrity concepts.
- *Release It!* (Michael T. Nygard) — production hardening and resilience patterns.
- *Site Reliability Engineering* (Beyer et al.) — reliability objectives and incident learnings.
- *Web Application Security* (Andrew Hoffman) — practical privacy/security controls applicable to mobile-connected apps.

### GitHub repositories (pattern inspiration)

- TanStack Query (retry/cache/sync ideas transferable to client state): https://github.com/TanStack/query
- Expo examples (network + lifecycle handling patterns): https://github.com/expo/examples
- RxDB (offline-first sync pattern inspiration): https://github.com/pubkey/rxdb
- react-native-offline (connectivity queueing patterns): https://github.com/rgommezz/react-native-offline

### Stack Overflow / discussion boards

- Stack Overflow (idempotency): https://stackoverflow.com/questions/tagged/idempotency
- Stack Overflow (distributed systems retries/timeouts): https://stackoverflow.com/questions/tagged/distributed-system
- Stack Overflow (React Native networking/reconnect): https://stackoverflow.com/questions/tagged/react-native+networking
- SQLite forum (locking/transaction edge cases): https://sqlite.org/forum/
- Reddit r/reactnative (pragmatic failure-state handling): https://www.reddit.com/r/reactnative/

### YouTube resources (targeted refreshers)

- Distributed systems retries/idempotency explainers: https://www.youtube.com/results?search_query=idempotency+distributed+systems
- Clock drift and synchronization fundamentals: https://www.youtube.com/results?search_query=clock+drift+synchronization+distributed+systems
- Mobile offline-first architecture walkthroughs: https://www.youtube.com/results?search_query=mobile+offline+first+architecture
- React Native reconnect/network state tutorials: https://www.youtube.com/results?search_query=react+native+netinfo+tutorial
- Privacy by design and data minimization talks: https://www.youtube.com/results?search_query=privacy+by+design+software+engineering

> Use external references as support only. Repository-local constraints in `CLAUDE.md` and iteration specs remain source-of-truth.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: submissions near timer cutoff produce inconsistent outcomes

- Choose one authoritative close-time source and document precedence over client-local timestamps.
- Add deterministic ordering rule for tie timestamps (e.g., server-received order + stable fallback key).
- Add fixture tests for `t_close - ε`, `t_close`, `t_close + ε`.

### Problem: duplicate submissions corrupt round totals

- Enforce dedup key at persistence boundary.
- Record duplicate suppression metrics.
- If duplicate payload conflicts, keep canonical winner and emit integrity warning.

### Problem: reconnect causes stale UI state

- Require snapshot rehydration on reconnect before accepting new local actions.
- Block irreversible actions until sync state is confirmed.
- Show explicit "syncing" or "state restored" indicators.

### Problem: privacy risk from lingering session data

- Define strict retention window + purge trigger.
- Ensure compare/result views return safe empty/expired state after purge.
- Remove or hash sensitive identifiers in diagnostic logs.

### Problem: disagreement among models on fallback behavior

- Prefer deterministic, fail-closed behavior over optimistic but ambiguous recovery.
- Align with Phase 4 constraints and existing iteration contracts.
- Document decision rationale in checklist notes for future maintainers.

---

## Validation commands

- `rg -n "drift|reconnect|idempot|duplicate|retention|privacy|timeout" CLAUDE.md iterations/phase4`
- `rg -n "showdown|session|round|slider|timeout" app src`
