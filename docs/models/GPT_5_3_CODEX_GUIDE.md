# GPT-5.3 Codex Guide

> Last updated: 2026-02-20
> Role: Primary implementer, refactorer, debugger, test author

## When to Use

- Implement iteration requirements exactly.
- Add or refactor production code with minimal diff.
- Write and update tests.
- Fix typecheck/lint/test failures.
- Implement migrations and transactional data paths.

## When Not to Use

- Architecture-first planning without a Task Brief.
- High-level product tradeoff decisions (use Claude).
- Spatial/navigation design first pass (use Gemini).

## Required Inputs

- Iteration file (`iterations/<NN>-...md`).
- Relevant sections in `CLAUDE.md`.
- Existing code patterns in affected modules.
- Real scripts in `package.json`.

## Required Outputs

- Files changed with rationale.
- Commands run + pass/fail results.
- Tests added/updated.
- Notes for next iteration.

## Prompt Patterns

### Implement Iteration X Exactly

```md
Implement `iterations/<NN>-...md` with minimal diff.
Honor constraints and acceptance criteria.
Then run:

- npm run typecheck
- npm run lint
- npm test -- <pattern>
- npm run format -- --check
  Return files changed + rationale + results.
```

### Fix Failing Typecheck/Tests

```md
Given failing logs, fix minimally.
Do not refactor unrelated code.
Re-run failing commands and report.
```

### Refactor Safely

```md
Refactor <target> with:

- minimal diff
- preserved public APIs
- passing tests
- added tests for new paths
```

## Safety Rules

- Do not invent dependencies; check `package.json` first.
- Keep smallest change that satisfies the iteration.
- If schema changes, add a new migration (append-only).
- Use transactions for multi-step data writes.
- Search before creating duplicate logic.
- No Phase 1 cloud/backend additions unless explicit in iteration.

## Debug Playbook

1. Reproduce minimally.
2. Instrument targeted logs.
3. Write failing test.
4. Implement smallest fix.
5. Remove debug noise and re-validate.

## Review Checklist

- `npm run typecheck` clean.
- `npm run lint` clean.
- tests pass.
- no avoidable rerenders in gesture-critical paths.
- data writes are transactional where required.
- no out-of-scope file churn.

## Handoff Template (Codex -> Claude)

```md
## Review Request - Iteration <NN>

Summary:
Files changed:
Validation results:
Acceptance criteria evidence:
Open questions:
Next-iteration notes:
```

## Iteration-Type Quick Map

- Navigation shell: implement from Gemini brief.
- SQLite/migrations: Codex primary.
- Ranking/scoring math: Codex primary.
- Charts: Codex implements from Gemini layout spec.
- Tests and performance pass: Codex primary.
