# Iteration 31: Showdown screen v1 (timed playback + response capture) — doc plan

## Objective
Define the first implementation plan for the timed showdown card screen and response capture behavior.

## Why this matters
This is the core interactive surface of Phase 4 and must remain deterministic under timing pressure.

## Scope (in/out)
### In scope
- Card playback timeline and per-card timer behavior.
- Input capture rules for swipe and slider modes.
- Timeout behavior (`timeout_skip` neutral action).

### Out of scope
- Final animations.
- Production transport reliability code.

## Multi-model execution strategy
- **Codex (primary):** define deterministic UI/state machine.
- **Claude (review):** assess clarity and edge cases.
- **Gemini:** optional only for high-fidelity layout notes.

## Agent resources and navigation map
- Existing deck card UI docs: `iterations/08-build-deck-card-ui-and-controls.md`
- Phase 4 showdown flow in `CLAUDE.md`

## External references links
- Human interface timing guidance (general): https://material.io/design/usability/accessibility.html

## When stuck
- Prioritize deterministic state machine over styling details.
- Record response on first valid input, then lock card state.

## Implementation checklist
- [ ] Define screen states: intro, active card, card-locked, inter-card transition, session end.
- [ ] Define timer start/end anchors and guardrails.
- [ ] Define response capture for both input modes.
- [ ] Define timeout auto-record logic.
- [ ] Define local buffering for transient disconnects.

## Deliverables
- Showdown screen functional specification document.

## Acceptance criteria
- Each card results in exactly one stored action per participant.
- Timeout behavior is deterministic and session-scoped.

## Validation commands
- `rg -n "timeout_skip|secondsPerCard|showdown" CLAUDE.md iterations/phase4`
