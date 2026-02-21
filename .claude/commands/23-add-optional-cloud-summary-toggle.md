# Iteration 23: Add optional cloud summary toggle

## Objective
Add opt-in setting to request cloud summary from aggregate stats payload only (no raw swipe history).

## Why this matters
Bounded AI usage requirement must be enforced technically and in UX.

## Scope
### In scope
- Add toggle in Settings with explicit privacy copy.
- Build payload from aggregates (tags/types/top likes/dislikes/trends).
- Gate network call behind opt-in and failure fallback to local labels.

### Out of scope
- Sending raw swipe events to cloud.

## Implementation checklist
- [ ] Define cloud payload schema and serializer.
- [ ] Add network client with timeout/retry policy.
- [ ] Persist user consent setting and default OFF.

## Deliverables
- Optional cloud summary path with local fallback.

## Acceptance criteria
- With toggle OFF, zero cloud summary requests are made.
- With toggle ON, payload excludes raw event history.

## Validation commands
- `npm test -- cloud-summary-toggle`
- `npm run lint`

## Notes for next iteration
Log payload size and redact sensitive fields in debug output.
