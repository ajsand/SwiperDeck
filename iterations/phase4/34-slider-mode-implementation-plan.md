# Iteration 34: Slider mode implementation plan (1–10)

## Objective
Define slider input mode behavior, storage shape, and deterministic mapping to scoring weights with compatibility safeguards.

## Why this matters
Slider mode adds richer expression while preserving existing swipe-weight logic and comparability.

## Scope (in/out)
### In scope
- Slider value semantics (1 strong negative, 5 neutral, 10 strong positive).
- Raw value persistence and derived-weight mapping function.
- Coexistence with swipe-based actions.

### Out of scope
- Replacing previous action-weight model.
- Retrofitting historic swipe data.

## Multi-model execution strategy
- **Codex (primary):** define mapping + storage contract.
- **Claude (review):** verify compatibility and product clarity.
- **Gemini:** not required.

## Agent resources and navigation map
- `iterations/09-persist-swipe-sessions-and-swipe-events.md`
- `iterations/11-incremental-taste-score-updates.md`
- Phase 4 input-mode rules in `CLAUDE.md`

## External references links
- Min-max normalization reference: https://en.wikipedia.org/wiki/Feature_scaling

## When stuck
- Keep one canonical deterministic mapping function.
- Store both raw slider value and derived weight for auditability.

## Implementation checklist
- [ ] Define slider event payload schema.
- [ ] Define mapping formula and rounding policy.
- [ ] Define compatibility path with existing `action`-based scoring.
- [ ] Define unit-test cases for boundaries and neutrality.

## Deliverables
- Slider mode design doc and compatibility matrix.

## Acceptance criteria
- Mapping is deterministic and documented.
- Existing swipe scoring remains unchanged unless explicitly routed through compatibility adapter.

## Validation commands
- `rg -n "slider|1-10|derived weight" CLAUDE.md iterations/phase4 iterations`
