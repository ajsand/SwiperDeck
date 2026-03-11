# Database Schema Reference (v7)

> Canonical schema documentation for the DateDeck fork.
> Source of truth: migrations `001_init` through `007_deck_profile_tables` in `lib/db/migrations.ts`.
> Schema version: **7** (`PRAGMA user_version`).

## Tables

### `catalog_entities`

Legacy broad catalog entities preserved for backward compatibility during the fork transition.

| Column              | Type    | Nullable | Notes                             |
| ------------------- | ------- | -------- | --------------------------------- |
| `id`                | TEXT    | NOT NULL | PK                                |
| `type`              | TEXT    | NOT NULL | e.g. movie, book, album           |
| `title`             | TEXT    | NOT NULL |                                   |
| `subtitle`          | TEXT    | NOT NULL | creator/year/genre                |
| `description_short` | TEXT    | NOT NULL | 1-line description                |
| `tags_json`         | TEXT    | NOT NULL | JSON array of tag strings         |
| `popularity`        | REAL    | NOT NULL | CHECK 0..1                        |
| `tile_key`          | TEXT    | NOT NULL | deterministic tile generation key |
| `image_url`         | TEXT    | NULL     | optional licensed image           |
| `updated_at`        | INTEGER | NOT NULL | Unix epoch seconds                |

### `__deck_content_meta`

Single-row metadata tracking the bundled prebuilt deck import version and counts.

| Column        | Type    | Nullable | Notes                                   |
| ------------- | ------- | -------- | --------------------------------------- |
| `id`          | INTEGER | NOT NULL | PK, constrained to `1`                  |
| `version`     | INTEGER | NOT NULL | current bundled content version         |
| `imported_at` | INTEGER | NOT NULL | Unix epoch milliseconds for last import |
| `deck_count`  | INTEGER | NOT NULL | number of prebuilt decks imported       |
| `card_count`  | INTEGER | NOT NULL | total prebuilt deck cards imported      |

### `decks`

First-class deck metadata for the DateDeck fork.

| Column                  | Type    | Nullable | Notes                                 |
| ----------------------- | ------- | -------- | ------------------------------------- |
| `id`                    | TEXT    | NOT NULL | PK                                    |
| `title`                 | TEXT    | NOT NULL | deck name shown in browse/detail UIs  |
| `description`           | TEXT    | NOT NULL | short deck summary                    |
| `category`              | TEXT    | NOT NULL | known category or custom string       |
| `tier`                  | TEXT    | NOT NULL | default `tier_1`                      |
| `card_count`            | INTEGER | NOT NULL | denormalized card count               |
| `compare_eligible`      | INTEGER | NOT NULL | SQLite boolean 0/1                    |
| `showdown_eligible`     | INTEGER | NOT NULL | SQLite boolean 0/1                    |
| `sensitivity`           | TEXT    | NOT NULL | default `standard`                    |
| `min_cards_for_profile` | INTEGER | NOT NULL | default profile threshold             |
| `min_cards_for_compare` | INTEGER | NOT NULL | default compare threshold             |
| `is_custom`             | INTEGER | NOT NULL | SQLite boolean 0/1                    |
| `cover_tile_key`        | TEXT    | NULL     | optional deterministic cover tile key |
| `created_at`            | INTEGER | NOT NULL | Unix epoch milliseconds               |
| `updated_at`            | INTEGER | NOT NULL | Unix epoch milliseconds               |

### `deck_cards`

Cards belonging to a single deck. This is the fork's primary card store going forward.

| Column              | Type    | Nullable | Notes                                  |
| ------------------- | ------- | -------- | -------------------------------------- |
| `id`                | TEXT    | NOT NULL | PK                                     |
| `deck_id`           | TEXT    | NOT NULL | FK -> decks(id) CASCADE                |
| `kind`              | TEXT    | NOT NULL | CHECK IN: entity, statement            |
| `title`             | TEXT    | NOT NULL | card headline or statement text        |
| `subtitle`          | TEXT    | NOT NULL | empty string for statement cards       |
| `description_short` | TEXT    | NOT NULL | short clarification copy               |
| `tags_json`         | TEXT    | NOT NULL | JSON array of tag strings              |
| `popularity`        | REAL    | NOT NULL | default 0.5, CHECK 0..1                |
| `tile_key`          | TEXT    | NOT NULL | deterministic tile generation key      |
| `sort_order`        | INTEGER | NOT NULL | stable fallback ordering within a deck |
| `created_at`        | INTEGER | NOT NULL | Unix epoch milliseconds                |
| `updated_at`        | INTEGER | NOT NULL | Unix epoch milliseconds                |

### `swipe_sessions`

Session envelope for one swipe run, now scoped to a specific deck.

| Column         | Type    | Nullable | Notes                                  |
| -------------- | ------- | -------- | -------------------------------------- |
| `id`           | TEXT    | NOT NULL | PK                                     |
| `deck_id`      | TEXT    | NOT NULL | FK -> `decks(id)`                      |
| `started_at`   | INTEGER | NOT NULL | Unix epoch milliseconds                |
| `ended_at`     | INTEGER | NULL     | CHECK >= started_at when set           |
| `filters_json` | TEXT    | NOT NULL | JSON object of active/deferred filters |

### `swipe_events`

Per-card user feedback event, scoped to a specific deck.

| Column       | Type    | Nullable | Notes                                        |
| ------------ | ------- | -------- | -------------------------------------------- |
| `id`         | TEXT    | NOT NULL | PK                                           |
| `session_id` | TEXT    | NOT NULL | FK -> `swipe_sessions(id)` CASCADE           |
| `deck_id`    | TEXT    | NOT NULL | FK -> `decks(id)`                            |
| `card_id`    | TEXT    | NOT NULL | FK -> `deck_cards(id)` RESTRICT              |
| `action`     | TEXT    | NOT NULL | CHECK IN: hard_no, no, skip, yes, strong_yes |
| `strength`   | INTEGER | NOT NULL | CHECK -2..2; derived from action weight      |
| `created_at` | INTEGER | NOT NULL | Unix epoch milliseconds                      |

### `taste_tag_scores`

Materialized per-tag preference scores.

| Column         | Type    | Nullable | Notes                 |
| -------------- | ------- | -------- | --------------------- |
| `tag`          | TEXT    | NOT NULL | PK                    |
| `score`        | REAL    | NOT NULL | net score (pos - neg) |
| `pos`          | REAL    | NOT NULL | CHECK >= 0            |
| `neg`          | REAL    | NOT NULL | CHECK >= 0            |
| `last_updated` | INTEGER | NOT NULL | Unix epoch seconds    |

### `taste_type_scores`

Materialized per-type preference scores. Same shape as `taste_tag_scores`.

| Column         | Type    | Nullable | Notes      |
| -------------- | ------- | -------- | ---------- |
| `type`         | TEXT    | NOT NULL | PK         |
| `score`        | REAL    | NOT NULL |            |
| `pos`          | REAL    | NOT NULL | CHECK >= 0 |
| `neg`          | REAL    | NOT NULL | CHECK >= 0 |
| `last_updated` | INTEGER | NOT NULL |            |

### `entity_affinity`

Per-entity affinity scores.

| Column         | Type    | Nullable | Notes                                   |
| -------------- | ------- | -------- | --------------------------------------- |
| `entity_id`    | TEXT    | NOT NULL | PK; FK -> catalog_entities(id) RESTRICT |
| `score`        | REAL    | NOT NULL |                                         |
| `pos`          | REAL    | NOT NULL | CHECK >= 0                              |
| `neg`          | REAL    | NOT NULL | CHECK >= 0                              |
| `last_updated` | INTEGER | NOT NULL |                                         |

### `profile_snapshots`

Periodic profile snapshots for "over time" visualizations. Legacy unscoped table; deck-scoped snapshots use `deck_profile_snapshots`.

| Column           | Type    | Nullable | Notes              |
| ---------------- | ------- | -------- | ------------------ |
| `id`             | TEXT    | NOT NULL | PK                 |
| `created_at`     | INTEGER | NOT NULL | Unix epoch seconds |
| `top_tags_json`  | TEXT    | NOT NULL | JSON array         |
| `top_types_json` | TEXT    | NOT NULL | JSON array         |
| `summary_json`   | TEXT    | NOT NULL | JSON object        |

### `deck_tag_scores`

Deck-scoped per-tag preference scores. Updated incrementally from swipe events.

| Column         | Type    | Nullable | Notes                        |
| -------------- | ------- | -------- | ---------------------------- |
| `deck_id`      | TEXT    | NOT NULL | FK -> decks(id) CASCADE      |
| `tag`          | TEXT    | NOT NULL | PK with deck_id              |
| `score`        | REAL    | NOT NULL | net score (pos - neg)        |
| `pos`          | REAL    | NOT NULL | CHECK >= 0                    |
| `neg`          | REAL    | NOT NULL | CHECK >= 0                    |
| `last_updated` | INTEGER | NOT NULL | Unix epoch milliseconds      |

### `deck_card_affinity`

Deck-scoped per-card affinity scores.

| Column         | Type    | Nullable | Notes                        |
| -------------- | ------- | -------- | ---------------------------- |
| `deck_id`      | TEXT    | NOT NULL | FK -> decks(id) CASCADE      |
| `card_id`      | TEXT    | NOT NULL | FK -> deck_cards(id) CASCADE |
| `score`        | REAL    | NOT NULL | net score (pos - neg)        |
| `pos`          | REAL    | NOT NULL | CHECK >= 0                    |
| `neg`          | REAL    | NOT NULL | CHECK >= 0                    |
| `last_updated` | INTEGER | NOT NULL | Unix epoch milliseconds      |

### `deck_profile_snapshots`

Deck-scoped profile snapshots for historical summaries.

| Column                | Type    | Nullable | Notes                        |
| --------------------- | ------- | -------- | ---------------------------- |
| `id`                  | TEXT    | NOT NULL | PK                           |
| `deck_id`             | TEXT    | NOT NULL | FK -> decks(id) CASCADE      |
| `created_at`          | INTEGER | NOT NULL | Unix epoch milliseconds      |
| `top_tags_json`       | TEXT    | NOT NULL | JSON array of TagScoreSummary |
| `top_aversions_json`  | TEXT    | NOT NULL | JSON array of TagScoreSummary |
| `summary_json`        | TEXT    | NOT NULL | JSON object                  |

## Indexes (29 total)

| Index                                | Table             | Columns               | Rationale                                   |
| ------------------------------------ | ----------------- | --------------------- | ------------------------------------------- |
| `idx_catalog_entities_type`          | catalog_entities  | (type)                | Cold-start: filter by media type            |
| `idx_catalog_entities_popularity`    | catalog_entities  | (popularity DESC)     | Cold-start: rank by popularity              |
| `idx_catalog_entities_title`         | catalog_entities  | (title)               | Legacy library/title search                 |
| `idx_decks_category`                 | decks             | (category)            | Deck browser grouping and filtering         |
| `idx_decks_tier`                     | decks             | (tier)                | Tier-based discovery and gating             |
| `idx_decks_is_custom`                | decks             | (is_custom)           | Separate prebuilt and custom deck lists     |
| `idx_deck_cards_deck_id`             | deck_cards        | (deck_id)             | Fetch all cards for one deck                |
| `idx_deck_cards_kind`                | deck_cards        | (kind)                | Filter entity vs statement cards            |
| `idx_deck_cards_popularity`          | deck_cards        | (popularity DESC)     | Candidate ordering and selection heuristics |
| `idx_deck_cards_sort_order`          | deck_cards        | (deck_id, sort_order) | Stable per-deck fallback ordering           |
| `idx_swipe_sessions_deck_id`         | swipe_sessions    | (deck_id)             | Session lookup by deck                      |
| `idx_swipe_sessions_started_at`      | swipe_sessions    | (started_at DESC)     | Session history                             |
| `idx_swipe_events_created_at`        | swipe_events      | (created_at DESC)     | Undo/latest-event and recency queries       |
| `idx_swipe_events_session_id`        | swipe_events      | (session_id)          | Session detail lookup                       |
| `idx_swipe_events_deck_id`           | swipe_events      | (deck_id)             | Deck-scoped profile and compare queries     |
| `idx_swipe_events_card_id`           | swipe_events      | (card_id)             | Card coverage and per-card lookup           |
| `idx_taste_tag_scores_score`         | taste_tag_scores  | (score DESC)          | Profile: top themes                         |
| `idx_taste_tag_scores_last_updated`  | taste_tag_scores  | (last_updated DESC)   | Snapshot: recently changed tags             |
| `idx_taste_type_scores_score`        | taste_type_scores | (score DESC)          | Profile: type affinity bars                 |
| `idx_taste_type_scores_last_updated` | taste_type_scores | (last_updated DESC)   | Snapshot: recently changed types            |
| `idx_entity_affinity_score`          | entity_affinity   | (score DESC)          | Warm-start ranking                          |
| `idx_entity_affinity_last_updated`   | entity_affinity   | (last_updated DESC)   | Snapshot: recently changed affinities       |
| `idx_profile_snapshots_created_at`   | profile_snapshots | (created_at DESC)     | "Over time" snapshot queries                |
| `idx_deck_tag_scores_deck_id`       | deck_tag_scores    | (deck_id)             | Deck-scoped tag score lookup                |
| `idx_deck_tag_scores_score`         | deck_tag_scores    | (deck_id, score DESC) | Profile affinities/aversions ranking        |
| `idx_deck_card_affinity_deck_id`    | deck_card_affinity | (deck_id)             | Deck-scoped affinity lookup                 |
| `idx_deck_card_affinity_score`      | deck_card_affinity | (deck_id, score DESC) | Top liked/disliked cards                    |
| `idx_deck_profile_snapshots_deck_id`| deck_profile_snapshots | (deck_id)         | Snapshot lookup by deck                     |
| `idx_deck_profile_snapshots_created_at` | deck_profile_snapshots | (deck_id, created_at DESC) | Latest snapshot per deck             |

## Foreign Keys (9 total)

| Table             | Column       | References             | ON DELETE |
| ----------------- | ------------ | ---------------------- | --------- |
| `deck_cards`      | `deck_id`    | `decks(id)`            | CASCADE   |
| `swipe_sessions`  | `deck_id`    | `decks(id)`            | NO ACTION |
| `swipe_events`    | `session_id` | `swipe_sessions(id)`   | CASCADE   |
| `swipe_events`    | `deck_id`    | `decks(id)`            | NO ACTION |
| `swipe_events`    | `card_id`    | `deck_cards(id)`       | RESTRICT  |
| `entity_affinity` | `entity_id`  | `catalog_entities(id)` | RESTRICT  |
| `deck_tag_scores` | `deck_id`   | `decks(id)`            | CASCADE   |
| `deck_card_affinity` | `deck_id` | `decks(id)`            | CASCADE   |
| `deck_card_affinity` | `card_id` | `deck_cards(id)`       | CASCADE   |
| `deck_profile_snapshots` | `deck_id` | `decks(id)`         | CASCADE   |

FK enforcement is enabled via `PRAGMA foreign_keys = ON` in `client.ts` and reinforced during `001_init`.

## Column Name -> TypeScript Property Mapping

| SQL Column              | TS Property                 | SQL Column              | TS Property               |
| ----------------------- | --------------------------- | ----------------------- | ------------------------- |
| `id`                    | `id`                        | `deck_id`               | `deckId`                  |
| `card_id`               | `cardId`                    | `session_id`            | `sessionId`               |
| `created_at`            | `createdAt`                 | `updated_at`            | `updatedAt`               |
| `started_at`            | `startedAt`                 | `ended_at`              | `endedAt`                 |
| `last_updated`          | `lastUpdated`               | `tags_json`             | `tagsJson` / `tags`       |
| `filters_json`          | `filtersJson` / `filters`   | `top_tags_json`         | `topTagsJson` / `topTags` |
| `top_types_json`        | `topTypesJson` / `topTypes` | `summary_json`          | `summaryJson` / `summary` |
| `description_short`     | `descriptionShort`          | `tile_key`              | `tileKey`                 |
| `image_url`             | `imageUrl`                  | `cover_tile_key`        | `coverTileKey`            |
| `card_count`            | `cardCount`                 | `sort_order`            | `sortOrder`               |
| `compare_eligible`      | `compareEligible`           | `showdown_eligible`     | `showdownEligible`        |
| `min_cards_for_profile` | `minCardsForProfile`        | `min_cards_for_compare` | `minCardsForCompare`      |
| `is_custom`             | `isCustom`                  | `category`              | `category`                |
| `tier`                  | `tier`                      | `sensitivity`           | `sensitivity`             |
| `kind`                  | `kind`                      | `popularity`            | `popularity`              |

Row types keep SQLite casing and raw JSON strings. Domain types expose camelCase properties plus parsed arrays/objects.

## Known Forward-Compatibility Notes

- `catalog_entities` remains preserved during the fork transition. It is no longer the primary card store for new DateDeck functionality, but it is intentionally not removed in Iteration 10.
- Migration `004_standardize_action_model` rebuilds `swipe_events` and normalizes legacy action rows: `love` -> `strong_yes`, `respect` -> `skip`, and `curious` -> `skip`.
- Migration `005_deck_content_meta` adds the single-row `__deck_content_meta` table so prebuilt content can be loaded once per bundled version instead of on every app start.
- Migration `006_deck_scoped_sessions` makes `deck_id` mandatory on sessions and events, replaces `entity_id` with `card_id`, and drops old unscoped dev-only swipe data in favor of the new deck-scoped model.
- Migration `007_deck_profile_tables` adds deck-scoped scoring tables: `deck_tag_scores`, `deck_card_affinity`, and `deck_profile_snapshots`. These power the deck profile summary (Iteration 15) and future compare flows.
- `swipe_events.strength` is still `INTEGER`. The current five-action model uses integer weights only.
- `decks.card_count` is denormalized by design. Writers that add or remove `deck_cards` must keep it accurate.

## Running Schema Checks

```bash
npm test -- schema-check
npm test -- db-migrations
npm test -- deck-domain-models
npm run typecheck
npm run lint
```
