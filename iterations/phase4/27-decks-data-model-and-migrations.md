# Iteration 27: Decks data model + additive migrations

## Objective

Define and document additive SQLite schema changes for:

- system-curated decks
- user-created custom decks
- deck membership + deterministic ordering
- optional custom entities/cards that can participate in deck flows

This iteration must preserve full backward compatibility with Phases 1–3 behavior.

## Why this matters

Phase 4 introduces deck-aware candidate pools and deck management UX. Without a clean, additive schema plan, later iterations (28–35) risk breaking existing swipe/profile/library flows.

A strong migration plan here ensures:

- no destructive schema rewrites
- predictable upgrade behavior for existing users
- clear ownership boundaries (system vs user data)
- deterministic ordering for deck playback and ranking

## Scope

### In scope

- New SQLite tables/indexes for decks and membership.
- Local-first ownership model for deck rows and optional custom content.
- Migration ordering strategy (forward-only, additive).
- Compatibility notes for default/all-deck behavior when no deck is selected.
- Data constraints that reduce corruption risk (FKs, uniqueness, ordering guards).

### Out of scope

- Deck management UI implementation.
- Showdown/session runtime mechanics.
- Network sync/cross-device merge strategy.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../../docs/MULTI_MODEL_WORKFLOW.md)
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../../docs/models/CLAUDE_OPUS_4_6_GUIDE.md)
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../../docs/models/GPT_5_3_CODEX_GUIDE.md)
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../../docs/models/GEMINI_3_1_GUIDE.md)

### Model routing for this iteration

| Sub-task | Model | Rationale |
| --- | --- | --- |
| Draft normalized schema and migration sequence | **Codex** | Strong implementation detail and migration planning |
| Validate additive-only guarantees and product compatibility | **Claude** | Constraint reasoning and spec clarity |
| Review relationship/cardinality diagrams for edge cases | **Gemini** (optional) | Structured modeling and consistency checks |

### Notes

- Claude + Codex are the minimum required model pair for this iteration.
- Gemini is optional if the team wants an additional relational-model sanity pass.

---

## Repository context for the coding agent

Before implementation, review:

- `CLAUDE.md` (especially product constraints, local-first behavior, Phase 4 goals)
- `docs/db/MIGRATIONS.md` (migration conventions and execution expectations)
- `iterations/03-create-sqlite-initialization-and-migration-framework.md`
- `iterations/04-create-base-database-schema-tables-and-indexes.md`
- `iterations/05-add-typed-domain-models.md`
- `iterations/06-load-bundled-starter-catalog-into-sqlite.md`
- `iterations/09-persist-swipe-sessions-and-swipe-events.md`
- `iterations/22-add-local-deterministic-ai-label-fallback-rules.md`

Primary folders to inspect while authoring schema docs/migrations:

- `db/` or `src/db/` migration runner + SQL assets
- domain models/types for entities/cards/tags
- selectors/services currently assuming "all cards" behavior

---

## Proposed schema design constraints (target state)

Use additive tables only. Avoid changing semantics of legacy Phase 1–3 tables.

### Core tables

1. `decks`
   - `id` (PK)
   - `source_type` (`system` | `user`)
   - `slug` (nullable for user decks, unique for system decks if used)
   - `title`
   - `description` (nullable)
   - `is_archived` (default false)
   - timestamps (`created_at`, `updated_at`)

2. `deck_cards`
   - `deck_id` (FK → `decks.id`)
   - `card_id` (FK to canonical card table OR custom card bridge)
   - `position` (integer, deterministic ordering)
   - optional metadata (`added_at`, `added_by` if needed)
   - uniqueness: `(deck_id, card_id)` and `(deck_id, position)`

3. `custom_entities` (if custom cards/entities are part of Phase 4 scope)
   - `id` (PK)
   - ownership/user-local fields
   - label/description/type fields
   - timestamps

4. Optional bridge tables (only if needed by current domain model)
   - `custom_entity_tags`
   - `custom_deck_cards` or a unified polymorphic membership strategy

### Indexing expectations

- `decks(source_type, updated_at)` for list/filter UX.
- `deck_cards(deck_id, position)` for ordered reads.
- `deck_cards(card_id)` for reverse lookup/cleanup.
- Index any FK used in joins from selector paths.

### Integrity expectations

- Enforce foreign keys.
- Use `ON DELETE CASCADE` carefully for deck-local membership cleanup.
- Guard against duplicate positions per deck.
- Keep ordering gap-tolerant but deterministic (e.g., integer sequence with reindex helper).

---

## Implementation checklist

### A) Schema + migration authoring

- [ ] Define SQL for `decks` and `deck_cards` tables with explicit constraints.
- [ ] Add optional custom entity tables only if required by Phase 4 functional scope.
- [ ] Add indexes for hot query paths (deck listing, ordered card reads, joins).
- [ ] Ensure migrations are additive and forward-only.
- [ ] Document migration IDs/order and dependency assumptions.

### B) Backward-compatibility guardrails

- [ ] Document behavior when there are zero deck rows (legacy flows still work).
- [ ] Confirm existing selectors can still operate in all-deck mode.
- [ ] Avoid modifying legacy table semantics required by iterations 1–26.
- [ ] Define fallback behavior when an active deck references deleted/invalid rows.

### C) Data seeding + ownership model

- [ ] Specify how system decks are seeded (idempotent rules).
- [ ] Specify how user decks are created locally.
- [ ] Clarify update policy for seeded system decks across app versions.
- [ ] Clarify whether custom entities are exportable via existing data controls.

### D) Migration safety + rollback notes

- [ ] Document expected startup behavior if migration partially fails.
- [ ] Define transaction boundaries for each migration step.
- [ ] Provide manual recovery notes for malformed deck records.
- [ ] Capture any irreversible migration caveats in docs.

---

## Deliverables

1. A markdown migration/spec doc describing all new Phase 4 deck-related tables and indexes.
2. Additive SQL migration files aligned with existing migration framework.
3. Compatibility notes proving no rip-and-replace behavior.
4. Brief risk notes for downstream iterations (28–35) that depend on this schema.

---

## Acceptance criteria

1. Schema changes are additive-only and compatible with existing installs.
2. Deck membership + ordering can be represented deterministically.
3. System and user deck ownership boundaries are explicit.
4. Optional custom entities/cards can be linked without breaking legacy selectors.
5. Migration sequencing is documented clearly enough for automated startup migration.

---

## Validation commands

- `rg -n "deck|custom_entities|migration|foreign key|index" CLAUDE.md docs/db/MIGRATIONS.md iterations db src`
- `rg -n "CREATE TABLE|ALTER TABLE|CREATE INDEX" db src`
- `rg -n "all-deck|default deck|active deck|selector" iterations src app`

Use equivalent workspace-specific paths if this repository organizes SQL differently.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: uncertain whether to alter old tables vs add new ones

- Default to additive new tables.
- Re-read iterations 03/04 migration philosophy and Phase 4 objective.
- If a change requires rewriting Phase 1–3 semantics, treat it as out-of-scope and propose a compatibility bridge table instead.

### Problem: deck ordering becomes unstable after inserts/removals

- Enforce `(deck_id, position)` uniqueness.
- Add deterministic reorder strategy (transactional reindex pass).
- Keep selector reads explicitly ordered by `position ASC`.

### Problem: foreign key failures during migration on existing installs

- Ensure migration creates parent tables before child tables.
- Backfill/seed in transaction with FK checks enabled.
- Add preflight checks for orphaned references before enabling strict constraints.

### Problem: ambiguity between canonical cards and custom cards in membership

- Choose one explicit strategy:
  - single membership table + polymorphic reference columns, or
  - separate bridge tables with a unifying selector.
- Document trade-offs and choose the least disruptive option for current domain types.

### Problem: seeded system decks need version updates without clobbering user edits

- Separate immutable system deck identifiers from user-local decks.
- Use idempotent seed upsert policy keyed by stable system slug/id.
- Never overwrite user-owned rows during seed refresh.

---

## Curated resources for coding agents (when blocked)

Use this order: official docs/specs → practical migration guides → production examples → community troubleshooting.

### Official docs (highest priority)

1. SQLite foreign keys
   - https://www.sqlite.org/foreignkeys.html
2. SQLite CREATE TABLE
   - https://www.sqlite.org/lang_createtable.html
3. SQLite CREATE INDEX
   - https://www.sqlite.org/lang_createindex.html
4. SQLite ALTER TABLE limitations
   - https://www.sqlite.org/lang_altertable.html
5. SQLite transactions
   - https://www.sqlite.org/lang_transaction.html
6. SQLite query planner/indexing overview
   - https://www.sqlite.org/queryplanner.html

### React Native / Expo local DB references

1. Expo SQLite docs
   - https://docs.expo.dev/versions/latest/sdk/sqlite/
2. Expo app storage/filesystem context (for seed assets, if relevant)
   - https://docs.expo.dev/versions/latest/sdk/filesystem/
3. React Native architecture/performance guidance (for data-access implications)
   - https://reactnative.dev/docs/performance

### Step-by-step migration guides and articles

1. Prisma data migration patterns (conceptual guidance even outside Prisma)
   - https://www.prisma.io/dataguide/types/relational/migration-strategies
2. Flyway migration best practices (ordering/idempotency concepts)
   - https://documentation.red-gate.com/fd/migrations-184127470.html
3. Martin Fowler on evolutionary database design (principles)
   - https://martinfowler.com/articles/evodb.html

### Books / long-form references

1. *Designing Data-Intensive Applications* (Martin Kleppmann)
   - Focus: schema evolution, consistency, migration safety
2. *SQL Antipatterns* (Bill Karwin)
   - Focus: avoiding fragile relational modeling choices
3. *Refactoring Databases* (Scott Ambler & Pramod Sadalage)
   - Focus: incremental change strategies for live systems

### GitHub repositories (reference implementations)

1. Expo SQLite examples
   - https://github.com/expo/examples/tree/master/with-sqlite
2. React Native + SQLite sample app patterns
   - https://github.com/andpor/react-native-sqlite-storage/tree/master/examples
3. SQLite migration tooling examples (JS ecosystem)
   - https://github.com/kriasoft/node-sqlite/tree/master/docs

### YouTube tutorials (targeted practical walkthroughs)

1. Fireship – SQLite in 100 seconds (quick conceptual refresher)
   - https://www.youtube.com/watch?v=byHcYRpMgI4
2. freeCodeCamp SQL full course (query/index basics refresher)
   - https://www.youtube.com/watch?v=HXV3zeQKqGY
3. React Native SQLite setup/tutorial examples (search playlist)
   - https://www.youtube.com/results?search_query=react+native+sqlite+tutorial

### Stack Overflow / discussion boards

1. SQLite tag (indexing/FK/ALTER edge cases)
   - https://stackoverflow.com/questions/tagged/sqlite
2. React Native tag (device/runtime-specific data issues)
   - https://stackoverflow.com/questions/tagged/react-native
3. Expo forums (Expo SQLite/runtime migration behavior)
   - https://forums.expo.dev/
4. SQLite user forum (authoritative engine behavior clarifications)
   - https://sqlite.org/forum/

---

## Definition of done for this iteration

- Migration spec is complete, additive, and unambiguous.
- Downstream UI/runtime iterations can rely on stable deck + membership primitives.
- Coding agents have enough internal and external references to continue without guesswork when blocked.
