# Iteration 29: Showdown session protocol spec + transport abstraction docs

## Objective
Define a provider-agnostic realtime protocol for showdown sessions, including host/join lifecycle and timed card events.

## Why this matters
Live synchronized sessions require deterministic event semantics independent of vendor choice.

## Scope (in/out)
### In scope
- Event model and sequencing for create/join/start/tick/card/response/end.
- `ISessionTransport` abstraction boundaries.
- Session modes: `synced_order` and `paced_random`.

### Out of scope
- Backend implementation.
- Authentication/account systems.

## Multi-model execution strategy
- **Codex (primary):** draft protocol and interface contract.
- **Claude (review):** validate simplicity/privacy and failure semantics.
- **Gemini:** not required.

## Agent resources and navigation map
- Phase 4 section in `CLAUDE.md`
- `docs/MULTI_MODEL_WORKFLOW.md`
- `iterations/26-release-hardening-and-readiness-checklist.md`

## External references links
- WebSocket RFC overview: https://datatracker.ietf.org/doc/html/rfc6455

## When stuck
- Keep payloads minimal and session-scoped.
- Prefer monotonic sequence IDs + server time anchors.

## Implementation checklist
- [ ] Define `ISessionTransport` methods/events.
- [ ] Define session creation/join handshake payloads.
- [ ] Define timer tick and card broadcast contracts.
- [ ] Define participant response and timeout semantics.
- [ ] Define reconnect/leave/end behaviors.

## Deliverables
- Protocol markdown and event catalog.
- Transport abstraction contract usable by any relay provider.

## Acceptance criteria
- Enough detail exists to implement host/join/session playback without guessing.
- Spec explicitly preserves local-first and no-account constraints.

## Validation commands
- `rg -n "ISessionTransport|showdown|synced_order|paced_random" CLAUDE.md iterations/phase4`
