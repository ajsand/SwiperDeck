# Iteration 14A: Add prebuilt deck tag taxonomy and card-tag metadata

## 1. Objective

Introduce a normalized, versioned tag taxonomy for prebuilt decks only so later sequencing work can reason about:

- sub-areas within a deck
- tag coverage
- tag-level signal
- retest targets
- better compare/profile structure

This iteration adds:

1. Canonical deck tag taxonomy tables.
2. Card-to-tag assignment metadata for all shipped prebuilt cards.
3. Validation and authoring rules for that metadata.
4. A non-destructive prebuilt reload path that preserves deck-scoped swipe history.

This iteration does not implement ranking logic yet.

## 2. Why this matters

`DeckCard.tags` is currently too loose for sequencing. It is useful for UI chips, but not for explainable algorithmic decisions. Free-text tags drift, do not represent stable within-deck structure, and make coverage, ambiguity, and retest logic unreliable.

This iteration creates a canonical vocabulary for prebuilt decks before the recommendation stack grows more complex.

## 3. Scope

### In scope

- add `deck_tag_facets`, `deck_tag_taxonomy`, and `deck_card_tag_links`
- add branded IDs and typed models for facets, tags, and card-tag links
- add `assets/data/prebuilt-deck-taxonomies.json`
- extend `assets/data/prebuilt-decks.json` so every shipped prebuilt card has canonical `tag_assignments`
- preserve `DeckCard.tags` as a display projection
- refactor `lib/content/loadPrebuiltDecks.ts` away from destructive prebuilt deletes
- bump bundled prebuilt content version and reimport safely
- add taxonomy validation and integrity tests
- update schema/domain docs

### Out of scope

- next-card ranking or sequencing heuristics
- custom/imported/community deck taxonomy
- cloud personalization or server-side taxonomy management
- AI tagging
- UI redesigns

### Relationship to old TasteDeck code

| Category   | What happens                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reused     | JSON content loading pattern from `docs/catalog/STARTER_CATALOG_CONTRACT.md`, migration framework, branded ID helpers, deck/deck-card repositories |
| Refactored | `loadPrebuiltDecks.ts`, `contentVersion.ts`, `validateDeck.ts`, and the meaning of `DeckCard.tags`                                                 |
| Replaced   | The old implicit "distinct tag strings from cards" model for prebuilt decks                                                                        |
| Preserved  | `catalog_entities`, `swipe_sessions`, `swipe_events`, and the current swipe UI flow                                                                |

## 4. Multi-model execution strategy

Workflow note: the repo now uses GPT-5.4 Extra High only.

| Step | Model              | Task                                                                                                |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Claim migration `007_prebuilt_deck_tag_taxonomy` and renumber downstream profile migration to `008` |
| 2    | GPT-5.4 Extra High | Add taxonomy tables, IDs, types, and repositories                                                   |
| 3    | GPT-5.4 Extra High | Add the bundled taxonomy file and card-level assignments                                            |
| 4    | GPT-5.4 Extra High | Refactor the prebuilt loader to upsert in place                                                     |
| 5    | GPT-5.4 Extra High | Add tests and docs, then validate                                                                   |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 5, 8, 13, and 14
- `/iterations/13-ship-mvp-prebuilt-decks.md`
- `/iterations/14-refactor-swipe-and-session-logic-to-deck-scope.md`
- `/docs/catalog/STARTER_CATALOG_CONTRACT.md`

### Current repo implementation anchors

- `assets/data/prebuilt-decks.json`
- `lib/content/validateDeck.ts`
- `lib/content/loadPrebuiltDecks.ts`
- `lib/content/contentVersion.ts`
- `lib/db/migrations.ts`
- `lib/db/deckCardRepository.ts`
- `lib/profile/deckProfileService.ts`
- `types/domain/decks.ts`
- `types/domain/deckProfile.ts`
- `__tests__/load-prebuilt-decks.test.ts`
- `__tests__/prebuilt-deck-integrity.test.ts`
- `__tests__/schema-check.test.ts`

### Suggested file organization

```text
assets/data/prebuilt-decks.json
assets/data/prebuilt-deck-taxonomies.json
lib/content/validateDeck.ts
lib/content/validateDeckTaxonomy.ts
lib/content/loadPrebuiltDecks.ts
lib/content/contentVersion.ts
lib/db/migrations.ts
lib/db/deckTagRepository.ts
types/domain/ids.ts
types/domain/deckTags.ts
__tests__/validate-deck-taxonomy.test.ts
__tests__/prebuilt-deck-taxonomy-integrity.test.ts
__tests__/deck-tag-repository.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite foreign key docs
- SQLite index docs
- JSON Schema references for validation patterns
- SKOS / controlled vocabulary references

## 6. When stuck

| Problem                                               | Resolution                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The loader currently deletes prebuilt decks           | Replace that behavior. Stable deck/card IDs now matter because swipe history is deck-scoped. |
| `DeckCard.tags` looks good enough                     | Keep it for UI only. Canonical tag tables become the algorithmic source of truth.            |
| A card seems to need many tags                        | Use exactly one `primary` tag and at most two additional assignments.                        |
| The taxonomy starts drifting into sentiment labels    | Stop. Tags should describe themes or sub-areas, not reactions or algorithm state.            |
| A change would require renaming shipped deck/card IDs | Do not do that in this iteration. This is metadata-only.                                     |

## 7. Implementation checklist

1. Renumber the current downstream profile migration from `007` to `008`.
2. Add migration `007_prebuilt_deck_tag_taxonomy` with:
   - `deck_tag_facets`
   - `deck_tag_taxonomy`
   - `deck_card_tag_links`
3. Add `DeckTagFacetId`, `DeckTagId`, and `DeckTagRole`.
4. Add `types/domain/deckTags.ts`.
5. Create `assets/data/prebuilt-deck-taxonomies.json`.
6. Update `assets/data/prebuilt-decks.json` so each prebuilt card includes canonical `tag_assignments`.
7. Enforce authoring rules:
   - every card has exactly one `primary`
   - every card has 1 to 3 assignments
   - every `tag_id` resolves inside the same deck
   - display tags normalize to canonical tag slugs
8. Add `validateDeckTaxonomy.ts`.
9. Refactor `loadPrebuiltDecks.ts` to upsert instead of deleting all prebuilt rows.
10. Bump `PREBUILT_DECK_VERSION` from `1` to `2`.
11. Add repository, integrity, migration, and mapper tests.
12. Update `docs/db/SCHEMA.md` and `docs/domain/DOMAIN_TYPES.md`.

## 8. Deliverables

1. Migration `007_prebuilt_deck_tag_taxonomy`.
2. Canonical taxonomy tables and types.
3. Bundled taxonomy JSON for all shipped prebuilt decks.
4. Card-level canonical tag assignments for all shipped prebuilt cards.
5. Non-destructive prebuilt content reload.
6. Validation, tests, and updated docs.

## 9. Acceptance criteria

1. The repo contains `deck_tag_facets`, `deck_tag_taxonomy`, and `deck_card_tag_links`.
2. Every shipped prebuilt deck defines canonical facets and tags.
3. Every shipped prebuilt card has canonical tag assignments with exactly one `primary`.
4. `DeckCard.tags` still exists for UI display, but canonical tables are the algorithmic source of truth.
5. Prebuilt content reload no longer wipes existing swipe history.
6. No existing shipped deck IDs or card IDs change.
7. Schema, domain, loader, and integrity tests pass.

## 10. Definition of done evidence

| Evidence                                | Verification command                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| New migration exists                    | `rg "007_prebuilt_deck_tag_taxonomy" lib/db/migrations.ts` |
| Downstream profile migration renumbered | `rg "008_deck_profile_tables" lib/db/migrations.ts`        |
| Taxonomy file exists                    | `ls assets/data/prebuilt-deck-taxonomies.json`             |
| New tag types exist                     | `ls types/domain/deckTags.ts`                              |
| New tag repository exists               | `ls lib/db/deckTagRepository.ts`                           |
| New validator exists                    | `ls lib/content/validateDeckTaxonomy.ts`                   |
| Card assignments added                  | `rg "tag_assignments" assets/data/prebuilt-decks.json`     |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- validate-deck-taxonomy
npm test -- prebuilt-deck-taxonomy-integrity
npm test -- load-prebuilt-decks
npm test -- schema-check
npm test
```

## 12. Notes for next iteration

1. Iteration 14B should treat canonical `tag_id`s as the runtime vocabulary for deck-scoped tag state.
2. Iteration 14C should use primary tags and facets to drive broad-start representative sequencing.
3. Iteration 15 must stop building profile summaries from free-text tag strings.
