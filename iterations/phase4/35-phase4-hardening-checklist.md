# Iteration 35: Hardening checklist for Phase 4

## Objective
Document reliability, privacy, and edge-case hardening requirements specific to decks + showdown + slider workflows.

## Why this matters
Realtime timing, ephemeral joins, and mixed input modes introduce failure modes not covered by Phases 1–3 alone.

## Scope (in/out)
### In scope
- Timer drift and synchronization tolerances.
- Reconnect and late-join handling.
- Session privacy and local data lifecycle checks.

### Out of scope
- New feature expansion beyond Phase 4.
- Backend provider-specific optimization.

## Multi-model execution strategy
- **Codex (primary):** produce checklist and verification matrix.
- **Claude (review):** challenge assumptions and risk coverage.
- **Gemini:** optional if UI error-state coverage needs layout review.

## Agent resources and navigation map
- `iterations/26-release-hardening-and-readiness-checklist.md`
- `docs/MULTI_MODEL_WORKFLOW.md`
- Phase 4 constraints in `CLAUDE.md`

## External references links
- NTP/drift background (conceptual): https://en.wikipedia.org/wiki/Clock_drift

## When stuck
- Bias toward deterministic fallback behavior over perfect sync.
- Keep privacy defaults conservative (session-scoped only).

## Implementation checklist
- [ ] Define timer drift tolerance and correction strategy.
- [ ] Define reconnect recovery and idempotent response handling.
- [ ] Define offline/degraded behavior expectations for host and participant.
- [ ] Define privacy/data-retention checklist for session artifacts.
- [ ] Define QA matrix for edge cases (timeouts, duplicate events, session end races).

## Deliverables
- Phase 4 hardening checklist and risk register.

## Acceptance criteria
- Checklist covers realtime, data integrity, and privacy boundaries.
- Validation matrix is actionable for QA execution.

## Validation commands
- `rg -n "drift|reconnect|privacy|timeout" CLAUDE.md iterations/phase4`
