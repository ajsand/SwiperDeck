# Iteration 31: Showdown screen v1 (timed playback + response capture)

## Objective

Design and document an implementation-ready Showdown gameplay screen for Phase 4, including deterministic per-round timing, response capture, lock behavior, and timeout handling.

This iteration should give coding agents enough state detail to implement the first working end-to-end round loop without guessing behavior.

## Why this matters

The Showdown screen is the highest-pressure interaction in the app: users must respond quickly while the system guarantees fairness and deterministic data capture.

If timing and input locking are ambiguous, Phase 4 will produce inconsistent outcomes, duplicate writes, and poor trust in multiplayer results.

## Scope

### In scope

- Full round lifecycle states for a participant device:
  - pre-round ready
  - active countdown
  - response captured + locked
  - timeout auto-capture
  - transition to next round
- Deterministic timer rules (`secondsPerCard`) and UI anchors.
- Response capture contract for both input modes:
  - `swipe_5_state`
  - `slider_1_10`
- Timeout behavior using `timeout_skip` neutral action.
- Minimal host/participant divergence where relevant for display.
- Buffering and idempotency guidance for transient transport instability.

### Out of scope

- Final motion/animation polish.
- Full production-grade transport reliability internals.
- Final results ranking/comparison UI (Iteration 33).
- Session scoring/profile aggregation logic (Iteration 32).

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
| Define deterministic state machine + timer anchors | **Codex** | Strong at finite state logic and implementation handoff |
| Refine UX wording for fast, low-error responses | **Claude** | Strong at concise, user-centered copy |
| Stress-test unusual interaction sequences | **Gemini** (optional) | Useful for broad edge-case brainstorming |

---

## Repository context for the coding agent

Inspect these first:

- `CLAUDE.md` (Phase 4 Showdown requirements and invariants)
- `iterations/phase4/29-showdown-protocol-and-transport-spec.md`
- `iterations/phase4/30-qr-join-flow-ui-spec.md`
- `iterations/phase4/32-session-scoring-and-profile-generation.md`
- `iterations/phase4/33-session-results-compare-view.md`
- `iterations/phase4/34-slider-mode-implementation-plan.md`
- `iterations/phase4/35-phase4-hardening-checklist.md`
- `iterations/08-build-deck-card-ui-and-controls.md`

Likely implementation surfaces:

- Expo Router screens under `app/` for gameplay route(s)
- Shared visual primitives in `components/`
- Showdown/session orchestration in `src/` (transport, timer, response persistence)
- Local data access layer for `showdown_*` writes

If paths differ, locate with:

- `rg -n "showdown|secondsPerCard|round_index|timeout_skip|slider_1_10|swipe_5_state" app src iterations CLAUDE.md`

---

## Product constraints that must remain true

Derived from Phase 4 requirements in `CLAUDE.md`:

1. Each participant must have **exactly one stored response per round**.
2. If no valid input is submitted before deadline, persist `timeout_skip`.
3. Timer behavior must be deterministic and tied to session timeline, not ad-hoc local drift.
4. Slider mode stores both raw `slider_value` and deterministic `derived_weight` (defined in Iteration 34 / CLAUDE spec).
5. Session gameplay data remains session-scoped and compatible with `showdown_*` table invariants.

---

## UX/state requirements (target behavior)

### 1) Round lifecycle state machine

Define and document this baseline state sequence:

1. `round_pending` (card payload known, not yet interactive)
2. `round_active` (timer running, input enabled)
3. `response_locked` (first valid response accepted; further edits blocked)
4. `round_timeout_locked` (auto-captured timeout)
5. `round_complete_waiting` (await transition barrier)
6. loop to next round or `session_complete`

For each state, specify:

- visible UI regions
- enabled controls
- event listeners
- allowed transitions
- persistence side effects

### 2) Timer semantics

- Timer source of truth should be session schedule anchor + per-round duration.
- Client countdown display is derived from anchor and current time.
- Input closes at deterministic deadline, not after render lag.
- Late input is rejected locally and/or at transport boundary with deterministic UX messaging.
- Visual urgency states (normal / warning / critical) should be threshold-based and documented.

### 3) Input mode capture rules

#### Swipe mode (`swipe_5_state`)

- First valid swipe/tap action during `round_active` is accepted.
- Persist action once, then lock control state immediately.
- Ignore further interactions for current round.

#### Slider mode (`slider_1_10`)

- Participant may adjust slider while active.
- A submit action (or explicit lock rule if auto-submit design is chosen) records the final value once.
- At lock, preserve:
  - raw slider value
  - derived deterministic scoring weight contract reference

### 4) Timeout behavior

- If no valid response at deadline:
  - persist `action_kind = timeout_skip`
  - set locked state immediately
  - show clear “Timed out” local feedback
- Ensure timeout path and manual response path are mutually exclusive and race-safe.

### 5) Transition behavior between rounds

- After lock, show short deterministic inter-round state.
- Prevent stale gesture carryover into next card.
- Ensure new round resets control state, timer display, and card-specific temporary UI.

### 6) Failure/degraded handling (v1-safe)

At minimum specify behavior for:

- transient network/transport disconnect during round
- late acknowledgement after local lock
- duplicate delivery/replay from transport layer

Guideline:

- prioritize local deterministic lock UX
- queue/send idempotent response payload keyed by (`session_id`, `participant_id`, `round_index`)
- never create >1 logical response for the same participant+round

---

## Implementation checklist

### A) State machine and timeline

- [ ] Define finite states, allowed transitions, and terminal conditions.
- [ ] Define event triggers (`timer_started`, `input_received`, `deadline_hit`, `ack_received`, `round_advanced`).
- [ ] Define one canonical deadline computation path.

### B) UI contract

- [ ] Define required regions: header/timer, card surface, response controls, lock/status banner.
- [ ] Define control enabled/disabled matrix per state.
- [ ] Define loading and degraded-state copy.

### C) Data/transport contract mapping

- [ ] Map each user action/state transition to outbound event shape.
- [ ] Define idempotency key strategy for response submissions.
- [ ] Define local buffer/retry semantics for transient failures.

### D) Timeout and race handling

- [ ] Define precedence when input and timeout occur nearly simultaneously.
- [ ] Define late-event reconciliation rule (UI + persistence contract).
- [ ] Define telemetry/log points for debugging timer drift and duplicate events.

### E) Handoff quality

- [ ] Include textual sequence diagrams for one round per input mode.
- [ ] Include explicit non-goals to avoid premature optimization.
- [ ] Include QA acceptance matrix for normal + edge paths.

---

## Deliverables

1. Showdown screen v1 functional spec markdown.
2. Deterministic state machine diagram/table with event mapping.
3. Input-mode-specific capture rules (swipe + slider) with timeout/race resolution.
4. QA checklist covering normal, timeout, and transient failure conditions.

---

## Acceptance criteria

1. Every round yields exactly one logical response per participant (`swipe_action`, `slider_rating`, or `timeout_skip`).
2. Timer and lock behavior are deterministic and explainable from spec alone.
3. Swipe and slider mode capture rules are explicit and non-conflicting.
4. Late/duplicate event handling prevents double-recording.
5. Spec cleanly aligns with Iteration 29 transport assumptions and Phase 4 constraints in `CLAUDE.md`.

---

## Validation commands

- `rg -n "secondsPerCard|timeout_skip|round_index|showdown_responses" CLAUDE.md iterations/phase4 src app`
- `rg -n "swipe_5_state|slider_1_10|derived_weight" CLAUDE.md iterations/phase4 src`
- `rg -n "session_id, participant_id, round_index|uniqueness|idempot" iterations/phase4 CLAUDE.md`

Use equivalent paths if repository layout differs.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: timer feels inconsistent across devices

- Anchor countdown to session timestamps, not local “setInterval-only” assumptions.
- Recompute remaining time from anchor on each render tick.
- Document tolerance window and lock behavior at boundary.

### Problem: duplicate responses appear in logs or DB attempts

- Apply idempotency key = (`session_id`, `participant_id`, `round_index`).
- Treat repeated submissions for same key as no-op updates in transport/persistence layer.
- Keep UI locked after first accepted local response.

### Problem: user submits exactly at the deadline

- Define and document exact boundary rule (`<= deadline` accepted, `> deadline` rejected, or equivalent).
- Apply same rule in UI gating and backend/transport validation.
- Add explicit QA case for millisecond-boundary submissions.

### Problem: slider mode introduces ambiguity around “final value”

- Require explicit commit event (tap submit) or clearly documented auto-lock rule.
- Persist one final canonical value at lock time.
- Ensure visual lock state confirms captured value.

### Problem: reconnection occurs mid-round

- Keep local locked response visible immediately.
- Retry same idempotent payload until ack or round expiry policy ends.
- Do not reopen controls after local lock.

---

## Curated resources for coding agents (when blocked)

Use this order: official docs/specs → reputable implementation guides → open-source examples → community troubleshooting.

### 1) Official documentation (highest priority)

1. Expo Router docs (screen organization, navigation lifecycle)
   - https://docs.expo.dev/router/introduction/
2. React Native Gesture Handler docs (swipe/gesture ergonomics)
   - https://docs.swmansion.com/react-native-gesture-handler/docs/
3. React Native Reanimated docs (deterministic UI-thread-driven interactions)
   - https://docs.swmansion.com/react-native-reanimated/
4. React Native performance overview
   - https://reactnative.dev/docs/performance
5. React Navigation docs (focus events, screen lifecycle patterns)
   - https://reactnavigation.org/docs/getting-started
6. SQLite documentation (transactional guarantees + uniqueness constraints)
   - https://www.sqlite.org/lang_transaction.html
   - https://www.sqlite.org/lang_createtable.html

### 2) Step-by-step implementation guides

1. Expo guide index (routing, navigation, device APIs)
   - https://docs.expo.dev/guides/
2. React Native docs for handling gestures and interactions
   - https://reactnative.dev/docs/handling-touches
3. Web.dev guide on resilient realtime UX concepts (applies to transport degradation patterns)
   - https://web.dev/reliable/

### 3) YouTube tutorials (practical walkthroughs)

1. Expo official channel (Router + architecture walkthroughs)
   - https://www.youtube.com/@ExpoDev
2. React Native Europe talks (state management, perf, interaction design)
   - https://www.youtube.com/@ReactNativeEU
3. Software Mansion talks/demos (Gesture Handler + Reanimated patterns)
   - https://www.youtube.com/@swmansion

> Tip: prioritize recent videos aligned with your RN/Expo version before copying APIs.

### 4) Books / long-form references

1. *Designing Data-Intensive Applications* (Martin Kleppmann)
   - Use chapters on consistency/idempotency/event ordering to reason about round response guarantees.
2. *Release It!* (Michael T. Nygard)
   - Use resilience patterns for timeout, retries, and degraded transport handling.
3. *React Native in Action* (Nader Dabit)
   - Useful for practical RN screen/state implementation patterns (version-check APIs before use).

### 5) Open-source repositories for reference patterns

1. Expo examples monorepo
   - https://github.com/expo/examples
2. React Navigation examples
   - https://github.com/react-navigation/react-navigation/tree/main/example
3. Software Mansion gesture-handler examples
   - https://github.com/software-mansion/react-native-gesture-handler/tree/main/example
4. Reanimated examples
   - https://github.com/software-mansion/react-native-reanimated/tree/main/apps/common-app

### 6) Stack Overflow / discussion boards / community channels

1. Stack Overflow (tag triage for RN/Expo timing + gesture issues)
   - https://stackoverflow.com/questions/tagged/react-native
   - https://stackoverflow.com/questions/tagged/expo
2. Expo Discussions
   - https://github.com/expo/expo/discussions
3. React Native Discussions
   - https://github.com/react-native-community/discussions-and-proposals/discussions
4. Reactiflux Discord (fast community feedback)
   - https://www.reactiflux.com/

### 7) Repository-local references (always check first)

1. `CLAUDE.md` Phase 4 sections (`showdown_sessions`, `showdown_round_cards`, `showdown_responses`, invariants)
2. `iterations/phase4/29-showdown-protocol-and-transport-spec.md`
3. `iterations/phase4/30-qr-join-flow-ui-spec.md`
4. `iterations/phase4/34-slider-mode-implementation-plan.md`
5. Existing card interaction patterns in `iterations/08-build-deck-card-ui-and-controls.md`

