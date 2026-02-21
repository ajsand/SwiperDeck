# Multi-Model Workflow - TasteDeck

> Last updated: 2026-02-20
> Applies to: Iterations 01-26

## Purpose

Define how Claude, Codex, and Gemini are used in Cursor when executing TasteDeck iteration tasks.

This workflow assumes models do not collaborate live; use model selection up front, and run parallel prompts only when uncertainty is high.

## Model Roles

| Model | Primary Role | Secondary Role |
|---|---|---|
| Claude Opus 4.6 | Orchestrate, decompose, review, enforce spec | Design memos and risk analysis |
| GPT-5.3 Codex | Primary implementation and refactors | Debugging, tests, migrations |
| Gemini 3.1 | Spatial/layout/navigation reasoning | UI behavior diagnosis and chart layout guidance |

## Model Selection Rubric (0-3)

Score each attribute by model, sum totals, pick highest score.

Tie-breakers:
- If implementation heavy -> Codex.
- If architecture/tradeoff heavy -> Claude.
- If navigation/layout/gesture heavy -> Gemini.

| Task Attribute | Claude | Codex | Gemini |
|---|---:|---:|---:|
| Implementation complexity | 1 | 3 | 1 |
| Refactor risk | 2 | 3 | 1 |
| Spatial/layout/navigation | 1 | 2 | 3 |
| Algorithmic reasoning | 2 | 3 | 1 |
| Debugging | 1 | 3 | 2 |
| Documentation writing | 3 | 1 | 1 |
| Product/tradeoff thinking | 3 | 1 | 2 |

## Iteration-Type Decision Table

| Iteration Type | Recommended Model(s) |
|---|---|
| Navigation shell | Claude orchestration + Gemini (spatial plan) -> Codex (implement) |
| SQLite migrations/schema | Codex, Claude review |
| Ranking and scoring math | Codex, Claude formula review |
| UI cards and gestures | Codex, Gemini layout audit |
| Charts and profile visuals | Gemini layout brief -> Codex |
| Test suites | Codex |
| Performance pass | Codex + Gemini rerender audit |
| Release hardening | Claude checklist + Codex fixes + Gemini nav audit |

## When to Run Parallel Models

Run 2 models in parallel when:
- architecture choice is ambiguous,
- UI/gesture behavior has competing designs,
- there are multiple valid ranking approaches.

Evaluate outputs with this rubric:
- correctness,
- minimal diff,
- CLAUDE.md alignment,
- test coverage,
- performance risk.

## Task Execution Protocol

1. Read context:
   - `CLAUDE.md`
   - current `iterations/<NN>-...md`
   - relevant code
2. Plan:
   - file list,
   - schema impacts,
   - risks.
3. Implement in small scoped changes.
4. Validate with real scripts:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test` (or targeted pattern)
   - `npm run format -- --check`
5. Verify acceptance criteria and write handoff notes.

Note for Iteration 01: lint/typecheck/test scripts are introduced in Iteration 02, so use `npm run start` smoke checks.

## Task Brief Template

```md
## Task Brief - <Title>

Iteration: <NN>
Assigned model: <Claude|Codex|Gemini>

### Problem Statement
<what and why>

### Constraints (from CLAUDE.md)
- Local-first
- Compute-first, AI-second
- Keep iteration scope tight

### Files to touch
- <path>: <reason>

### Acceptance Criteria
1. ...
2. ...

### Non-goals
- ...

### Risks
- ...

### Validation
- npm run typecheck
- npm run lint
- npm test -- <pattern>
```

## Stop Conditions (Ask Human)

- Breaking architecture decisions.
- Spec conflicts between iteration doc and `CLAUDE.md`.
- App-store/privacy policy interpretation questions.
- Large refactor outside current iteration scope.

## Anti-Drift Rules

- Search before creating new logic.
- Keep changes scoped to current iteration.
- Do not add cloud/backend behavior in Phase 1 unless the iteration explicitly calls for it.
- Follow existing patterns and file conventions.

## References

- `CLAUDE.md`
- `iterations/README.md`
- `docs/models/CLAUDE_OPUS_4_6_GUIDE.md`
- `docs/models/GPT_5_3_CODEX_GUIDE.md`
- `docs/models/GEMINI_3_1_GUIDE.md`
- Expo Router docs: https://docs.expo.dev/router/introduction/
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- React Navigation concepts: https://reactnavigation.org/docs/getting-started
