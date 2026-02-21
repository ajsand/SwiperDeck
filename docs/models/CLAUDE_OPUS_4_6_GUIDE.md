# Claude Opus 4.6 Guide

> Last updated: 2026-02-20
> Role: Orchestrator, planner, reviewer, spec enforcer

## When to Use

- Iteration decomposition and planning.
- Design/tradeoff memos.
- Review against acceptance criteria.
- Risk identification and test-gap detection.

## When Not to Use

- Bulk implementation across many files.
- Heavy debugging of failing runtime code.
- Primary author for migrations, ranking code, or tests.

## Required Inputs

- `CLAUDE.md` relevant sections.
- current iteration file in `iterations/`.
- current repo state and changed files.

## Required Outputs

- File-level plan.
- Constraints checklist tied to `CLAUDE.md`.
- Task Brief for Codex/Gemini.
- Review verdict with concrete findings.

## Prompt Patterns

### Orchestrate Iteration X

```md
Read `iterations/<NN>-...md` and relevant `CLAUDE.md` sections.
Produce:

1. file-level plan
2. model routing
3. risks/edge cases
4. Codex-ready Task Brief
5. validation checklist
   Do not implement code.
```

### Review Changes

```md
Review this diff against:

- iteration acceptance criteria
- CLAUDE.md principles
  Return:
- pass/fail checklist
- likely bugs
- test gaps
- performance risks
- approve/request changes
```

### Design Decision Memo

```md
Decision: <topic>
Options: 2-3
Compare by: scope, risk, speed, CLAUDE.md alignment
Recommend one minimal viable path.
```

## Failure Modes and Mitigations

| Failure Mode                             | Mitigation                                     |
| ---------------------------------------- | ---------------------------------------------- |
| Over-specifying implementation internals | Plan at boundaries, not exact code internals   |
| Architecture astronauting                | Enforce iteration scope and minimal path       |
| Hallucinating repo state                 | Read actual files first                        |
| Missing existing logic                   | Search first before proposing new abstractions |

## Quality Gates

- Scoped to this iteration only.
- Acceptance criteria are measurable.
- Validation commands use real scripts from `package.json`.
- Risks include correctness, performance, and migration impact where relevant.

## Verification Checklist

- `npm run typecheck`
- `npm run lint`
- `npm test` (or targeted pattern)
- `npm run format -- --check`

## Handoff Template (Claude -> Codex/Gemini)

```md
## Task Brief - <Title>

Iteration: <NN>
Assigned model: <Codex|Gemini>

Problem:
Constraints:
Files:
Acceptance criteria:
Non-goals:
Risks:
Validation commands:
```

## Iteration 1 Example

For `01-bootstrap-app-shell`:

- Claude defines constraints, acceptance checks, and routes spatial planning to Gemini.
- Gemini owns the tab + stack routing brief (including deep-link behavior).
- Codex implements missing wiring/placeholders.
- Claude reviews final result against acceptance criteria.
