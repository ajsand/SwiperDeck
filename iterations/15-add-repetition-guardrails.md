# Iteration 15: Add repetition guardrails

## Objective
Prevent repetitive card loops by excluding recently seen entities and capping same-tag streaks.

## Why this matters
Perceived novelty is critical for a swipe app and reduces boredom.

## Scope
### In scope
- Track recent entity IDs window.
- Penalize or exclude over-represented tags in short horizon.
- Integrate guardrails into selector pipeline.

### Out of scope
- Long-term novelty modeling across weeks/months.

## Implementation checklist
- [ ] Add recent-history cache/query helper.
- [ ] Add same-tag streak cap logic.
- [ ] Add fallback strategy when guardrails over-constrain pool.

## Deliverables
- Anti-repetition layer with tests.

## Acceptance criteria
- Immediate repeats are blocked.
- Back-to-back cards avoid excessive same-tag clustering.

## Validation commands
- `npm test -- repetition-guardrails`
- `npm run lint`

## Notes for next iteration
Make guardrail thresholds configurable for later tuning.
