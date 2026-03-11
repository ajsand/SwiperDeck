# Multi-Model Workflow - DateDeck Fork

> Last updated: 2026-03-09
> Applies to: Fork Iterations 09-25

## Purpose

Define how Claude Opus 4.6 and GPT-5.4 are used in Cursor when executing DateDeck fork iterations.

This workflow follows `CLAUDE.md` Section 16. Models do not share live context; choose the right model for each stage, then hand off intentionally.

## Model Roles

| Model           | Primary Role                                                   | Secondary Role                           |
| --------------- | -------------------------------------------------------------- | ---------------------------------------- |
| Claude Opus 4.6 | Creative thinking, architecture reasoning, planning, review    | Spec refinement, risk analysis, docs     |
| GPT-5.4         | Implementation, refactors, migrations, UI coding, tests, fixes | Integration work and validation followup |

## Selection Guidance

Use Claude Opus 4.6 for:

- iteration planning and decomposition
- architecture tradeoffs
- spec refinement
- risk analysis
- review for product drift
- documentation generation

Use GPT-5.4 for:

- implementation
- refactors
- schema and migration work
- UI coding
- tests
- bug fixing
- integration work

## Iteration Execution Flow

1. Claude reads `CLAUDE.md`, the current iteration file, and the current codebase state.
2. Claude defines scope and explicitly states what is being reused, refactored, or replaced from old TasteDeck work.
3. GPT-5.4 implements only the scoped iteration work.
4. GPT-5.4 runs validation and fixes any introduced issues.
5. Claude reviews the result for tone, scope discipline, and fork alignment.

## Task Execution Protocol

1. Read context:
   - `CLAUDE.md`
   - current `iterations/<NN>-...md`
   - relevant code
2. State whether the task is:
   - reusing old TasteDeck code
   - refactoring old TasteDeck code
   - replacing old TasteDeck code
3. List:
   - files to touch
   - schema impacts
   - UI contract impacts
   - risks
4. Implement in small, scoped changes.
5. Validate with real scripts:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run format -- --check`
   - `npm test`
6. Verify acceptance criteria and leave short notes for the next iteration.

## Stop Conditions (Ask Human)

- Spec conflicts between the iteration file and `CLAUDE.md`
- Architecture changes that clearly exceed current iteration scope
- Privacy, consent, or safety questions that require product judgment
- Large refactors that would affect multiple future iterations

## Anti-Drift Rules

- Keep the fork deck-first, not universal-profile-first.
- Keep the app local-first unless the iteration explicitly scopes a compare/report export flow.
- Treat AI as summarization only, never as diagnosis or matchmaking.
- Preserve working infrastructure when practical: app shell, SQLite foundation, strict typing, deterministic tiles, and deck UI contracts.
- Keep changes tightly scoped to the current iteration.

## References

- `CLAUDE.md`
- `iterations/README.md`
- Expo Router docs: https://docs.expo.dev/router/introduction/
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- React Navigation concepts: https://reactnavigation.org/docs/getting-started
