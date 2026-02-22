# Iteration 29: Showdown protocol and transport abstraction spec (provider-agnostic)

## Objective

Design and document a production-grade, provider-agnostic realtime protocol for Showdown sessions so coding agents can implement host/join gameplay with deterministic behavior across transport providers.

This iteration should define clear contracts for:

- session lifecycle (create → join → start → run → end)
- event sequencing and idempotency
- timed card rounds and response handling
- reconnect/resume semantics
- `ISessionTransport` abstraction boundaries

## Why this matters

Iterations 27 and 28 establish deck modeling and deck-management UX. Showdown mode now needs a strict protocol contract so implementation can proceed without locking into a single vendor (WebSocket backend, Supabase Realtime, Liveblocks, etc.).

A strong protocol spec here prevents divergence across clients, simplifies QA, and enables deterministic replays/debugging.

## Scope

### In scope

- Canonical event catalog and payload schema guidance.
- Sequence and ordering model (`sessionSeq`, timestamps, causality assumptions).
- Host/join handshake and membership state transitions.
- Round timing events (`round_start`, `tick`, `round_close`) and timeout behavior.
- Response submission contract (including dedupe/idempotency keys).
- Session modes and mode-specific expectations:
  - `synced_order`
  - `paced_random`
- `ISessionTransport` interface responsibilities and failure semantics.
- Reconnect, late join, leave, host disconnect, and session termination behavior.

### Out of scope

- Final backend provider implementation.
- Full authentication/account architecture.
- Production cryptographic protocol design.
- Camera/QR rendering UI details (covered in Iteration 30).

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
| Draft event catalog + transport interface | **Codex** | Strong at implementation-ready contracts and edge-case enumeration |
| Validate UX/failure semantics and copy clarity | **Claude** | Strong product reasoning and user-facing error framing |
| Stress-test protocol matrix / race conditions | **Gemini** (optional) | Useful for structured scenario QA |

---

## Repository context for the coding agent

Inspect these before writing the spec:

- `CLAUDE.md` (Phase 4 gameplay and product constraints)
- `iterations/phase4/27-decks-data-model-and-migrations.md`
- `iterations/phase4/28-deck-management-ui-v1.md`
- `iterations/phase4/30-qr-join-flow-ui-spec.md`
- `iterations/phase4/31-showdown-screen-v1-doc.md`
- `iterations/phase4/32-session-scoring-and-profile-generation.md`
- `iterations/phase4/33-session-results-compare-view.md`
- `iterations/phase4/34-slider-mode-implementation-plan.md`
- `iterations/phase4/35-phase4-hardening-checklist.md`

Primary implementation surfaces likely impacted:

- showdown session services/state modules under `src/` (or equivalent project structure)
- shared realtime/transport abstraction layer (`ISessionTransport` + adapters)
- session host/join orchestration code (triggered by UI screens from iterations 30/31)
- event normalization, validation, and telemetry/logging utilities

If exact paths differ, locate with `rg -n "showdown|session transport|realtime|websocket|join code" src app iterations`.

---

## Protocol requirements and constraints (target behavior)

### 1) Session identity + membership

- Session must include a unique short join code and canonical session ID.
- Membership model should define host + participants with stable participant IDs.
- Server/relay authority over canonical membership list is preferred.
- Host controls session phase transitions (lobby → active → completed).

### 2) Event ordering + idempotency

- All authoritative events include monotonic `sessionSeq`.
- Client-originated mutable actions include idempotency keys.
- Consumers must ignore duplicate or stale events safely.
- Spec should define how clients recover ordering gaps.

### 3) Timed rounds

- `round_start` includes round/card context and server time anchor.
- `tick` semantics must be explicit (frequency, optionality, drift tolerance).
- `round_close` is authoritative and determines accepted late responses policy.
- Timeout outcomes are deterministic and explicitly represented.

### 4) Responses + scoring handoff

- Participant responses are acknowledged with accepted/rejected reason codes.
- Re-submission policy is explicit (allowed or denied) with deterministic behavior.
- Round completion events expose enough data for iteration 32 scoring pipeline.

### 5) Failure semantics

- Define reconnect window and replay strategy for dropped clients.
- Define host disconnect behavior (session pause/end/host migration policy).
- Define participant leave/kick semantics and visibility rules.
- Define terminal end reasons (normal completion, host-ended, inactivity, fatal error).

### 6) Privacy + local-first constraints

- Session payloads should be minimal and scoped to gameplay needs.
- No unnecessary personal identifiers in event payloads.
- If anonymous mode is used, define display-name collision handling.

---

## Implementation checklist

### A) Event catalog

- [ ] Define canonical events and directionality (client→server, server→client, broadcast).
- [ ] Provide payload field tables with required/optional markers.
- [ ] Define error code taxonomy for join/start/submit/reconnect failures.

### B) Transport abstraction

- [ ] Define `ISessionTransport` methods (`connect`, `join`, `publish`, `subscribe`, `disconnect`, etc.).
- [ ] Define lifecycle callbacks and typed event envelopes.
- [ ] Define transport-agnostic reconnect/backoff expectations.

### C) Session modes

- [ ] Specify differences between `synced_order` and `paced_random`.
- [ ] Clarify which fields are mode-specific and which are invariant.
- [ ] Add examples for one complete round in each mode.

### D) Reliability rules

- [ ] Add idempotency and dedupe contract with examples.
- [ ] Add out-of-order handling and replay/catch-up strategy.
- [ ] Add host failover policy decision (explicitly yes/no in v1).

### E) Developer handoff quality

- [ ] Include sequence diagrams (textual is acceptable).
- [ ] Include a state machine table for session phases and transitions.
- [ ] Include a “known non-goals” section to prevent overbuild.

---

## Deliverables

1. Protocol spec markdown with complete event catalog.
2. `ISessionTransport` abstraction contract docs suitable for adapter implementation.
3. End-to-end lifecycle flow notes (host + participant).
4. Failure and recovery matrix for QA and future hardening.

---

## Acceptance criteria

1. A coding agent can implement showdown host/join/session flow without guessing missing protocol behavior.
2. Event sequencing, dedupe, and timeout behavior are unambiguous.
3. Transport abstraction is provider-neutral and implementation-ready.
4. Reconnect and terminal-state behaviors are explicitly documented.
5. Spec remains aligned with local-first/no-account product constraints.

---

## Validation commands

- `rg -n "showdown|session|transport|synced_order|paced_random" CLAUDE.md iterations/phase4 docs`
- `rg -n "ISessionTransport|realtime|websocket|join" src app docs iterations`
- `rg -n "round_start|tick|round_close|idempotency|sessionSeq" iterations/phase4`

Use equivalent paths if repository layout differs.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: can’t decide if server or client is authoritative for round timing

- Make server/relay authoritative for round open/close boundaries.
- Treat client timers as display hints only.
- Use server time anchors for deterministic close behavior.

### Problem: duplicate submissions/race conditions appear in tests

- Require idempotency keys on response actions.
- Process “first accepted write wins” (or explicitly documented alternative).
- Return deterministic rejection reasons for duplicates/late submissions.

### Problem: reconnect behavior is unclear

- Define replay from last acknowledged `sessionSeq`.
- Include snapshot sync event for fast recovery.
- Add explicit reconnect timeout after which full rejoin is required.

### Problem: transport API leaks provider details

- Keep `ISessionTransport` minimal and event-envelope based.
- Move provider quirks to adapter layer only.
- Avoid exposing provider-specific channel/topic primitives in core domain.

### Problem: mode-specific logic causes protocol branching chaos

- Keep base event schema invariant where possible.
- Add mode-specific optional fields instead of separate event families.
- Document mode branching in one comparison table.

---

## Curated resources for coding agents (when blocked)

Use this order: official specs/docs → practical architecture examples → community troubleshooting.

### Official documentation (highest priority)

1. WebSocket Protocol RFC 6455
   - https://datatracker.ietf.org/doc/html/rfc6455
2. MDN WebSocket API guide
   - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
3. Socket.IO docs (event semantics + acks reference)
   - https://socket.io/docs/v4/
4. Supabase Realtime docs (if evaluating provider adapters)
   - https://supabase.com/docs/guides/realtime
5. Liveblocks docs (multiplayer state patterns)
   - https://liveblocks.io/docs
6. Expo networking/runtime context docs
   - https://docs.expo.dev/

### Step-by-step guides / practical references

1. Ably: Designing realtime protocols and pub/sub architecture patterns
   - https://ably.com/topic/pub-sub
2. Pusher Channels protocol/events concepts
   - https://pusher.com/docs/channels/
3. Martin Kleppmann resources on distributed systems consistency/event ordering
   - https://martin.kleppmann.com/
4. AWS architecture blogs on WebSocket reliability/backpressure patterns
   - https://aws.amazon.com/blogs/

### GitHub repositories to study

1. Colyseus (multiplayer room/state synchronization patterns)
   - https://github.com/colyseus/colyseus
2. boardgame.io (turn/session protocol ideas)
   - https://github.com/boardgameio/boardgame.io
3. Socket.IO examples repo
   - https://github.com/socketio/socket.io/tree/main/examples

### YouTube tutorials / talks

1. Hussein Nasser – WebSocket protocol and realtime architecture explainers
   - https://www.youtube.com/@hnasr
2. Fireship – WebSockets in 100 Seconds (quick conceptual refresher)
   - https://www.youtube.com/watch?v=1BfCnjr_Vjg
3. GOTO Conferences talks on distributed systems & event-driven design
   - https://www.youtube.com/@GOTO-

### Books / long-form references

1. *Designing Data-Intensive Applications* — Martin Kleppmann
   - Event ordering, consistency, and fault tolerance principles.
2. *Release It!* — Michael T. Nygard
   - Reliability patterns, backpressure, circuit breakers, operational hardening.
3. *Building Microservices (2nd Ed.)* — Sam Newman
   - Messaging contracts, resilience, and evolutionary architecture.

### Community troubleshooting resources

1. Stack Overflow (`websocket`, `socket.io`, `supabase-realtime`, `react-native` tags)
   - https://stackoverflow.com/questions/tagged/websocket
2. DEV Community realtime/websocket discussions
   - https://dev.to/t/websocket
3. Reddit discussions (`r/reactnative`, `r/webdev`, `r/distributedsystems`)
   - https://www.reddit.com/r/reactnative/

---

## Definition of done (iteration 29)

- Showdown protocol spec is implementation-ready for Iterations 30–33.
- `ISessionTransport` contract can support at least two potential providers without interface changes.
- Failure and timing semantics are explicit enough for deterministic QA test case authoring.
