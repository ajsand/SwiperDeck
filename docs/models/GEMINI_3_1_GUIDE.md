# Gemini 3.1 Guide

> Last updated: 2026-02-20
> Role: Spatial reasoning, layout/navigation advisor, multimodal interpretation

## When to Use

- Expo Router route/group/layout planning.
- Modal/navigation strategy decisions.
- Gesture-zone and interaction-surface analysis.
- Chart and visualization layout suggestions.
- UI bug diagnosis from behavior/screenshot descriptions.

## When Not to Use

- Primary model for large code implementation.
- Data-layer algorithms, migrations, or heavy test authoring.
- Final product-tradeoff approval (use Claude).

## Required Inputs

- Current `app/` file tree and `_layout.tsx` files.
- Relevant iteration requirements and `CLAUDE.md` sections.
- Any screenshots/recordings or symptom descriptions.

## Required Outputs

- Proposed file tree or layout diagram.
- Edge cases and constraints list.
- Codex-ready implementation brief.

## Prompt Patterns

### Propose Routing Structure

```md
Given current `app/` tree and requirements:
1) propose route/group/layout structure
2) explain reasoning
3) list deep links to verify
4) list edge cases
5) output Codex-ready brief
```

### Diagnose Navigation Bug

```md
Given routes + symptom:
1) likely root cause
2) route resolution path
3) Codex-ready fix brief
4) verification steps
```

### UI Layout Critique

```md
Given screen/component structure:
1) spatial issues
2) rerender/perf risks
3) gesture conflicts
4) accessibility concerns
5) Codex-ready improvements
```

## Boundaries

| Gemini | Codex |
|---|---|
| Route/layout proposals | Route/component implementation |
| Gesture-zone mapping | Gesture handler code |
| Chart layout specification | Chart rendering and state wiring |
| Nav bug diagnosis | Nav bug fix |

Rule: Gemini defines the blueprint; Codex builds it.

## Failure Modes and Mitigations

| Failure Mode | Mitigation |
|---|---|
| Overconfident API claims | Cite docs or mark "verify" |
| Drifting into full implementation | Stop at implementation brief |
| Ignoring current structure | Read existing `app/_layout.tsx` first |
| Over-engineering | Prefer simplest structure that satisfies iteration |

## Verification Checklist

- Proposed routes follow Expo Router naming conventions.
- `_layout.tsx` placement is correct.
- Dynamic route syntax uses `[param].tsx`.
- No naming collisions with existing routes.
- Modal/sheet approach fits current Stack/Tabs setup.

## Handoff Template (Gemini -> Codex)

```md
## Implementation Brief - <Feature>
Iteration: <NN>
What to build:
Routing changes:
Component hierarchy:
Layout/gesture notes:
Edge cases:
Performance notes:
Validation steps:
```

## Example Uses

- Iteration 1: tabs + stack + deep-link verification.
- Iteration 16: filter modal routing strategy selection.
- Iteration 19: profile trend chart layout and window-switch UX.
