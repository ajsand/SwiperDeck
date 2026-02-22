# Database Schema Reference (v2)

> Canonical schema documentation for TasteDeck.
> Source of truth: migration `002_base_schema` in `lib/db/migrations.ts`.
> Schema version: **2** (`PRAGMA user_version`).

## Tables

### `catalog_entities`

Deck candidates and metadata display.

| Column              | Type    | Nullable | Notes                             |
| ------------------- | ------- | -------- | --------------------------------- |
| `id`                | TEXT    | NOT NULL | PK                                |
| `type`              | TEXT    | NOT NULL | e.g., movie, book, album          |
| `title`             | TEXT    | NOT NULL |                                   |
| `subtitle`          | TEXT    | NOT NULL | creator/year/genre                |
| `description_short` | TEXT    | NOT NULL | 1-line description                |
| `tags_json`         | TEXT    | NOT NULL | JSON array of tag strings         |
| `popularity`        | REAL    | NOT NULL | CHECK 0..1                        |
| `tile_key`          | TEXT    | NOT NULL | deterministic tile generation key |
| `image_url`         | TEXT    | NULL     | optional licensed image           |
| `updated_at`        | INTEGER | NOT NULL | Unix epoch seconds                |

### `swipe_sessions`

Session envelope for one swipe run.

| Column         | Type    | Nullable | Notes                         |
| -------------- | ------- | -------- | ----------------------------- |
| `id`           | TEXT    | NOT NULL | PK                            |
| `started_at`   | INTEGER | NOT NULL | Unix epoch seconds            |
| `ended_at`     | INTEGER | NULL     | CHECK >= started_at when set  |
| `filters_json` | TEXT    | NOT NULL | JSON object of active filters |

### `swipe_events`

Per-entity user feedback event.

| Column       | Type    | Nullable | Notes                                                    |
| ------------ | ------- | -------- | -------------------------------------------------------- |
| `id`         | TEXT    | NOT NULL | PK                                                       |
| `session_id` | TEXT    | NOT NULL | FK → swipe_sessions(id) CASCADE                          |
| `entity_id`  | TEXT    | NOT NULL | FK → catalog_entities(id) RESTRICT                       |
| `action`     | TEXT    | NOT NULL | CHECK IN: hard_no, no, skip, yes, love, respect, curious |
| `strength`   | INTEGER | NOT NULL | CHECK -2..2; see note below                              |
| `created_at` | INTEGER | NOT NULL | Unix epoch seconds                                       |

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

| Column         | Type    | Nullable | Notes                                  |
| -------------- | ------- | -------- | -------------------------------------- |
| `entity_id`    | TEXT    | NOT NULL | PK; FK → catalog_entities(id) RESTRICT |
| `score`        | REAL    | NOT NULL |                                        |
| `pos`          | REAL    | NOT NULL | CHECK >= 0                             |
| `neg`          | REAL    | NOT NULL | CHECK >= 0                             |
| `last_updated` | INTEGER | NOT NULL |                                        |

### `profile_snapshots`

Periodic taste profile snapshots for "over time" visualizations.

| Column           | Type    | Nullable | Notes              |
| ---------------- | ------- | -------- | ------------------ |
| `id`             | TEXT    | NOT NULL | PK                 |
| `created_at`     | INTEGER | NOT NULL | Unix epoch seconds |
| `top_tags_json`  | TEXT    | NOT NULL | JSON array         |
| `top_types_json` | TEXT    | NOT NULL | JSON array         |
| `summary_json`   | TEXT    | NOT NULL | JSON object        |

## Indexes (14 total)

| Index                                | Table             | Columns             | Rationale                             |
| ------------------------------------ | ----------------- | ------------------- | ------------------------------------- |
| `idx_catalog_entities_type`          | catalog_entities  | (type)              | Cold-start: filter by media type      |
| `idx_catalog_entities_popularity`    | catalog_entities  | (popularity DESC)   | Cold-start: rank by popularity        |
| `idx_catalog_entities_title`         | catalog_entities  | (title)             | Library: title search                 |
| `idx_swipe_sessions_started_at`      | swipe_sessions    | (started_at DESC)   | Library: session history              |
| `idx_swipe_events_created_at`        | swipe_events      | (created_at DESC)   | Undo: latest event; recency queries   |
| `idx_swipe_events_session_id`        | swipe_events      | (session_id)        | Session detail: events by session     |
| `idx_swipe_events_entity_id`         | swipe_events      | (entity_id)         | Scoring: entity swipe history         |
| `idx_taste_tag_scores_score`         | taste_tag_scores  | (score DESC)        | Profile: top themes chart             |
| `idx_taste_tag_scores_last_updated`  | taste_tag_scores  | (last_updated DESC) | Snapshot: recently changed tags       |
| `idx_taste_type_scores_score`        | taste_type_scores | (score DESC)        | Profile: type affinity bars           |
| `idx_taste_type_scores_last_updated` | taste_type_scores | (last_updated DESC) | Snapshot: recently changed types      |
| `idx_entity_affinity_score`          | entity_affinity   | (score DESC)        | Warm-start: match score ranking       |
| `idx_entity_affinity_last_updated`   | entity_affinity   | (last_updated DESC) | Snapshot: recently changed affinities |
| `idx_profile_snapshots_created_at`   | profile_snapshots | (created_at DESC)   | "Over time" sparkline queries         |

## Foreign Keys (3 total)

| Table           | Column     | References           | ON DELETE |
| --------------- | ---------- | -------------------- | --------- |
| swipe_events    | session_id | swipe_sessions(id)   | CASCADE   |
| swipe_events    | entity_id  | catalog_entities(id) | RESTRICT  |
| entity_affinity | entity_id  | catalog_entities(id) | RESTRICT  |

FK enforcement is enabled via `PRAGMA foreign_keys = ON` in `client.ts` (on every connection open) and `001_init` (migration).

## Column Name → TypeScript Property Mapping

For Iteration 05 typed domain models:

| SQL Column          | TS Property                 | SQL Column      | TS Property               |
| ------------------- | --------------------------- | --------------- | ------------------------- |
| `id`                | `id`                        | `session_id`    | `sessionId`               |
| `entity_id`         | `entityId`                  | `created_at`    | `createdAt`               |
| `updated_at`        | `updatedAt`                 | `started_at`    | `startedAt`               |
| `ended_at`          | `endedAt`                   | `last_updated`  | `lastUpdated`             |
| `tags_json`         | `tagsJson` / `tags`         | `filters_json`  | `filtersJson` / `filters` |
| `description_short` | `descriptionShort`          | `tile_key`      | `tileKey`                 |
| `image_url`         | `imageUrl`                  | `top_tags_json` | `topTagsJson` / `topTags` |
| `top_types_json`    | `topTypesJson` / `topTypes` | `summary_json`  | `summaryJson` / `summary` |
| `popularity`        | `popularity`                | `score`         | `score`                   |
| `pos`               | `pos`                       | `neg`           | `neg`                     |

Row types (DB boundary) keep the `_json` suffix. Domain types expose parsed arrays/objects.

## Known Forward-Compatibility Notes

**`swipe_events.strength` is INTEGER.** CLAUDE.md Section 7.1 defines `respect = +0.5` and `curious = +0.25` (fractional weights). The current CHECK constraint allows -2..2 integers only. When phase 2 actions are implemented, a migration must ALTER this column to REAL. Since SQLite doesn't support in-place column type changes, this requires a table rebuild migration. Pre-release change to REAL is recommended if no users exist yet.

## Running Schema Checks

```bash
npm test -- schema-check       # Table/column/index/FK introspection + smoke CRUD
npm test -- db-migrations      # Migration runner first-run + rerun safety
npm run typecheck              # TypeScript strict
npm run lint                   # ESLint
```
