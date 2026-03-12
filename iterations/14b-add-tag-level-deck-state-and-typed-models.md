# Iteration 14B: Add tag-level deck state and typed models

## 1. Objective

Add the local state layer needed for tag-aware sequencing in prebuilt decks.

After this iteration, the app should be able to track deck-scoped tag state for:

- exposure count
- distinct-card coverage
- positive and negative weight
- uncertainty or ambiguity
- recency and last-seen timing

This is state/modeling infrastructure, not the final next-card ranking formula.

## 2. Why this matters

Iteration 14A gives the app a canonical vocabulary. It does not yet give the app runtime state for how each tag is performing inside a deck.

The current repo already has early profile artifacts like `deck_tag_scores`, but those are too narrow for sequencing because they do not fully answer:

- how much of a tag has been seen
- whether the tag is mixed or stable
- when it was last meaningfully touched
- whether the deck still has important coverage gaps for that tag

Without this iteration, later sequencing work would have to guess from raw swipe history on every decision.

## 3. Scope

### In scope

- add a canonical local table for deck-scoped tag state
- add row/domain types for tag state and coverage summaries
- add repository helpers for reading and writing tag state
- build a deterministic local recompute/update path from `swipe_events` plus `deck_card_tag_links`
- persist fields needed for future sequencing inputs:
  - exposure
  - coverage
  - weight
  - uncertainty
  - recency
- refactor profile/sequencing-adjacent code so it stops treating `deck_tag_scores` as the whole model
- add tests and docs

### Out of scope

- the mature next-card scoring formula
- compare/report UI
- custom/imported/community deck tag state
- cloud personalization
- ML-heavy recommendation systems

### Relationship to old code

| Category   | What happens                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Reused     | `swipe_events`, `deck_card_tag_links`, `deck_tag_taxonomy`, migration framework, current deck profile service patterns           |
| Refactored | `deck_tag_scores` becomes a narrower read model instead of the full tag-state contract                                           |
| Replaced   | Any future logic that infers tag state from flat `card.tags` or ad hoc string counts                                             |
| Preserved  | Existing swipe/session tables, `DeckCard.tags`, and current screens stay intact while the richer state layer is added underneath |

## 4. Multi-model execution strategy

Workflow note: execute this iteration with GPT-5.4 Extra High only.

| Step | Model              | Task                                                                       |
| ---- | ------------------ | -------------------------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Add the next additive migration for deck-scoped tag state                  |
| 2    | GPT-5.4 Extra High | Add typed models and repository helpers                                    |
| 3    | GPT-5.4 Extra High | Build deterministic rebuild/update logic from swipes plus canonical tags   |
| 4    | GPT-5.4 Extra High | Refactor downstream code to read tag state as the canonical runtime source |
| 5    | GPT-5.4 Extra High | Add tests and docs, then validate                                          |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8, 13, and 14
- `/iterations/14a-add-prebuilt-deck-tag-taxonomy-and-card-tag-metadata.md`
- `/iterations/15-build-deck-profile-summary-v1.md`

### Current repo implementation anchors

- `lib/db/migrations.ts`
- `lib/db/deckProfileRepository.ts`
- `lib/profile/deckProfileService.ts`
- `lib/db/deckTagRepository.ts`
- `lib/db/swipeRepository.ts`
- `types/domain/deckProfile.ts`
- `types/domain/deckTags.ts`
- `hooks/useDeckSwipeSession.ts`
- `app/deck/[deckId]/play.tsx`

### Suggested file organization

```text
lib/db/migrations.ts
lib/db/deckTagStateRepository.ts
lib/sequence/rebuildDeckTagState.ts
types/domain/deckTagState.ts
__tests__/deck-tag-state-repository.test.ts
__tests__/rebuild-deck-tag-state.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite foreign key and index docs
- local-first software references
- existing repo migration and profile tests

## 6. When stuck

| Problem                                             | Resolution                                                                                                                   |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `deck_tag_scores` already looks close enough        | Treat it as a read model, not the complete state contract. Add richer canonical tag state instead of overloading score rows. |
| Unsure whether to recompute or incrementally update | Prefer a deterministic rebuild path first. Correctness beats cleverness here.                                                |
| Distinct-card coverage seems expensive              | It is acceptable to recompute from local swipe history and canonical links in this iteration.                                |
| Temptation to include custom decks                  | Do not. This state model is for prebuilt decks only.                                                                         |
| Ambiguity feels fuzzy                               | Start with a simple explainable rule: mixed positive/negative weight plus low supporting exposure.                           |

## 7. Implementation checklist

1. Add the next additive migration after the current schema version. Unless numbering has changed again, this should land as migration `009`.
2. Create `deck_tag_state` with at least:
   - `deck_id`
   - `tag_id`
   - `exposure_count`
   - `distinct_cards_seen`
   - `positive_weight`
   - `negative_weight`
   - `skip_count`
   - `net_weight`
   - `uncertainty_score`
   - `first_seen_at`
   - `last_seen_at`
   - `last_positive_at`
   - `last_negative_at`
   - `last_retested_at`
   - `updated_at`
3. Add indexes for deck lookup, recency lookup, and uncertainty lookup.
4. Add types such as:
   - `DeckTagStateRow`
   - `DeckTagState`
   - `DeckTagCoverageSummary`
5. Add repository helpers:
   - `upsertDeckTagState`
   - `getDeckTagStateByDeckId`
   - `getDeckTagStateByTagId`
   - `replaceDeckTagStateForDeck`
6. Build `rebuildDeckTagState(db, deckId)` from:
   - `swipe_events`
   - `deck_card_tag_links`
   - canonical tag lookups
7. Decide one canonical maintenance path:
   - rebuild after each swipe/session update
   - or rebuild on demand
     Keep the choice deterministic and documented.
8. Refactor current profile/sequencing-adjacent code so any future coverage/ambiguity logic reads `deck_tag_state`.
9. Update schema/domain docs and tests.

## 8. Deliverables

1. Additive schema support for deck-scoped tag state.
2. Typed models for tag state and tag coverage.
3. Repository helpers for reading and writing tag state.
4. A deterministic rebuild/update path from local swipes plus canonical tag links.
5. Refactored downstream code that treats tag state as the runtime source of truth.

## 9. Acceptance criteria

1. The repo has a canonical local table for deck-scoped tag state.
2. Tag state is keyed by canonical `tag_id`, not free-text tag strings.
3. The state model records exposure, coverage, weight, uncertainty, and recency.
4. The state can be rebuilt deterministically from local swipe history plus canonical card-tag links.
5. The implementation is explicitly limited to prebuilt decks.
6. Existing profile/sequencing code no longer treats `deck_tag_scores` as the full tag-state contract.
7. Schema, repository, rebuild, and mapper tests pass.

## 10. Definition of done evidence

| Evidence                   | Verification command                            |
| -------------------------- | ----------------------------------------------- |
| New tag-state table exists | `rg "deck_tag_state" lib/db/migrations.ts`      |
| New domain types exist     | `ls types/domain/deckTagState.ts`               |
| New repository exists      | `ls lib/db/deckTagStateRepository.ts`           |
| Rebuild helper exists      | `rg "rebuildDeckTagState" lib -g "*.ts"`        |
| Schema docs updated        | `rg "deck_tag_state" docs/db/SCHEMA.md`         |
| Domain docs updated        | `rg "DeckTagState" docs/domain/DOMAIN_TYPES.md` |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- deck-tag-state-repository
npm test -- rebuild-deck-tag-state
npm test -- schema-check
npm test -- domain-models
npm test
```

## 12. Notes for next iteration

1. Iteration 14C should consume this state to choose representative cards during the broad-start window.
2. Keep score rows separate from runtime state so later tuning stays understandable.
3. Coverage and ambiguity should become first-class sequencing inputs next, not just profile outputs.
