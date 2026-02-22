# Iteration 30: QR join flow UI spec + placeholder screen

## Objective
Document QR-based in-person join UX and placeholder screens for Phase 4 implementation.

## Why this matters
Fast, low-friction local joining is central to showdown usability.

## Scope (in/out)
### In scope
- Host QR presentation states.
- Participant scan/join screens and error states.
- Placeholder copy and navigation paths.

### Out of scope
- Camera/scanner implementation.
- Realtime transport code.

## Multi-model execution strategy
- **Codex (primary):** write flow and state specs.
- **Claude (review):** tighten copy and user trust messaging.
- **Gemini:** optional later for visual refinements.

## Agent resources and navigation map
- `app/(tabs)/index.tsx`
- `app/modal.tsx`
- Phase 4 user flow section in `CLAUDE.md`

## External references links
- Expo camera/QR docs: https://docs.expo.dev/versions/latest/sdk/camera/

## When stuck
- Start with manual join code fallback state.
- Keep join flow explicitly in-person and ephemeral.

## Implementation checklist
- [ ] Define host “show QR” screen states.
- [ ] Define participant “scan QR / enter code” states.
- [ ] Define invalid/expired-session messaging.
- [ ] Define post-join waiting-room placeholder state.

## Deliverables
- Join-flow markdown with navigation/state diagrams (textual okay).

## Acceptance criteria
- End-to-end host-to-participant join path is understandable.
- Error states are actionable and non-technical.

## Validation commands
- `rg -n "QR|join|waiting" CLAUDE.md iterations/phase4`
