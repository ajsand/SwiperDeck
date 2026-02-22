# Iteration 27: Decks data model + additive migrations

## Objective
Define and document additive SQLite schema changes for system-curated decks, user custom decks, deck membership/order, and optional custom cards/entities.

## Why this matters
Phase 4 needs deck-aware candidate pools without breaking Phases 1–3 default catalog flow.

## Scope (in/out)
### In scope
- New tables/indexes/migration order for decks and deck-card relationships.
- Local-first ownership model for system vs user-created deck rows.
- Backward compatibility notes for general/all-deck behavior.

### Out of scope
- UI implementation.
- Session runtime playback logic.

## Multi-model execution strategy
- **Codex (primary):** author migration spec and compatibility notes.
- **Claude (review):** validate additive-only guarantees and privacy boundaries.
- **Gemini:** not required.

## Agent resources and navigation map
- `CLAUDE.md` (Sections 6, 16, 17 + Phase 4 addendum)
- `docs/db/MIGRATIONS.md`
- Existing migration references in `iterations/03` and `iterations/04`

## External references links
- SQLite foreign key/index guidance: https://www.sqlite.org/foreignkeys.html
- SQLite ALTER TABLE limits: https://www.sqlite.org/lang_altertable.html

## When stuck
- Prefer additive tables over altering historical Phase 1–3 tables.
- Keep deck semantics optional; default selectors must still work with no deck selected.

## Implementation checklist
- [ ] Define `decks` table (id, source_type, title, description, created_at, updated_at).
- [ ] Define `deck_cards` table with stable `position` ordering.
- [ ] Define custom entity/card linkage tables (`custom_entities`, optional `custom_entity_tags`).
- [ ] Add indexes for deck lookup/order and entity joins.
- [ ] Document migration sequencing and rollback expectations.

## Deliverables
- Markdown migration plan for all new Phase 4 deck-related tables.
- Compatibility notes proving no rip-and-replace behavior.

## Acceptance criteria
- Schema plan is additive-only.
- Deck membership + ordering can be represented deterministically.
- Custom user cards can be attached to custom decks locally.

## Validation commands
- `rg -n "deck|custom_entities|migration" CLAUDE.md docs/db/MIGRATIONS.md iterations`
