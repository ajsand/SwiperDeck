# Iteration 32: Session scoring + session profile generation

## Objective
Specify session-only scoring pipelines and profile snapshot outputs that never mutate global/all-time taste by default.

## Why this matters
Session insights are valuable only if privacy boundaries and profile isolation are explicit and enforced.

## Scope (in/out)
### In scope
- Session event-to-score mapping.
- Session profile tables/snapshots.
- Optional explicit opt-in export path to global profile (future gate).

### Out of scope
- Automatic global profile merges.
- Social discovery/chat features.

## Multi-model execution strategy
- **Codex (primary):** define deterministic scoring pipeline and schema.
- **Claude (review):** validate privacy/non-contamination guarantees.
- **Gemini:** not required.

## Agent resources and navigation map
- `iterations/11-incremental-taste-score-updates.md`
- `iterations/18-add-periodic-profile-snapshot-job.md`
- `iterations/24-create-scoring-ranking-snapshot-test-suite.md`
- Phase 4 scoring rules in `CLAUDE.md`

## External references links
- SQLite transactions: https://www.sqlite.org/lang_transaction.html

## When stuck
- Mirror proven Phase 1–3 scoring structure in session namespace tables.
- Keep writes atomic per card response batch.

## Implementation checklist
- [ ] Define session-scoped score tables and indexes.
- [ ] Define aggregation formulas for themes/types/tags in-session only.
- [ ] Define session profile snapshot outputs.
- [ ] Define explicit opt-in export contract (off by default).
- [ ] Define validation expectations against global profile immutability.

## Deliverables
- Scoring/profile generation plan with schema and invariants.

## Acceptance criteria
- Session profile can be computed independently from session events only.
- Default flow guarantees no global profile mutation.

## Validation commands
- `rg -n "session profile|global taste|opt-in" CLAUDE.md iterations/phase4 iterations`
