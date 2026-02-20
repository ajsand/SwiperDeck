# Iteration 22: Add local deterministic AI-label fallback rules

## Objective
Implement rule-based labeling/summarization from computed stats without cloud calls.

## Why this matters
Product must deliver understandable profile language even when cloud AI is off.

## Scope
### In scope
- Create deterministic mapping from score patterns to human-readable labels.
- Keep labels stable across runs for same stats.
- Support positive and negative-space summaries.

### Out of scope
- Cloud LLM integration.

## Implementation checklist
- [ ] Add label rules/config for tags/types intensity.
- [ ] Generate concise local summary strings.
- [ ] Add tests for rule determinism and edge cases.

## Deliverables
- Local summary generator available by default.

## Acceptance criteria
- Same input stats produce same labels every time.
- No network call required for summaries.

## Validation commands
- `npm test -- local-labels`
- `npm run typecheck`

## Notes for next iteration
Document rule precedence so future contributors can extend safely.
