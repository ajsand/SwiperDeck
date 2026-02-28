# Starter Catalog Contract

> Decision memo for TasteDeck starter catalog format, loading, and normalization.
> Produced in Iteration 6A. Implementers (6B/6C/6D): use this as the single reference.

## 1) Chosen File Format: Single JSON Array

### Decision

Ship the starter catalog as a single file:

```
assets/data/starter-catalog.json
```

Containing a top-level JSON array of entity objects:

```json
[
  { "id": "movie-the-shawshank-redemption", "type": "movie", "title": "The Shawshank Redemption", ... },
  { "id": "book-1984", "type": "book", "title": "1984", ... },
  ...
]
```

### Rationale

- **Target size: 5k–10k entities, ~1–3 MB uncompressed.** At this scale, a single JSON file is fast to parse (< 500ms on modern devices) and well under the threshold where incremental parsing would justify the added complexity.
- **Metro bundles `.json` as source code** — this means the parsed array is available instantly via `require()` / `import` with zero async I/O. For a starter catalog that every fresh install needs, this is the simplest and fastest path.
- **No FileSystem dependency.** The `expo-file-system` package is not currently installed. Adding it solely for catalog loading is unnecessary overhead at this catalog size.
- **TypeScript `resolveJsonModule` works out of the box.** The Expo tsconfig base supports JSON imports. We get compile-time existence checking for free.
- **De-risked by constraints.** The catalog is bounded (see Section 5). If it ever exceeds ~5 MB or ~25k rows, the format should be migrated to chunked JSON or JSONL with FileSystem streaming — but that's a future concern, not a Phase 1 concern.

### Why not JSONL or chunked files?

- **JSONL** requires FileSystem streaming or manual line-by-line parsing. This adds complexity, a new dependency (`expo-file-system`), and Metro asset configuration — all for a catalog that fits comfortably in a single JSON parse.
- **Chunked JSON** adds orchestration logic (file discovery, sequencing, error recovery per chunk). Justified at 50k+ entities; overkill at 5k–10k.
- **Both are valid upgrade paths** if the catalog grows. The normalization and import pipeline (6B/6C) will be designed so switching the source format only changes the reader, not the validator or SQLite writer.

## 2) Chosen Loading Approach: JSON Module Import

### Decision

```typescript
import starterCatalog from '@/assets/data/starter-catalog.json';
```

The catalog is loaded synchronously as a bundled JSON module. No FileSystem, no async fetch, no asset download.

### How it works at runtime

1. Metro bundles `starter-catalog.json` into the JS bundle at build time.
2. At import, the JS runtime returns the already-parsed array.
3. The import pipeline (6C) iterates over the array, normalizes each entry, and inserts into SQLite via batched prepared statements.

### When to migrate away from this approach

If any of these become true:

- Catalog exceeds ~5 MB uncompressed (would bloat the JS bundle noticeably).
- Catalog exceeds ~25k rows (parse time could approach 1s on low-end devices).
- Catalog needs to be updated without an app update (requires server fetch, not bundled).

At that point, switch to `expo-asset` + `expo-file-system` to load from a sidecar file.

## 3) Source Row Schema

Each object in the JSON array must conform to this shape. The importer (6B) validates and normalizes each row before SQLite insertion.

### Required fields

| Field   | Type     | Required | Notes                                                  |
| ------- | -------- | -------- | ------------------------------------------------------ |
| `id`    | `string` | Yes      | Stable unique identifier. Reject row if missing/empty. |
| `type`  | `string` | Yes      | Entity type slug. Reject row if missing/empty.         |
| `title` | `string` | Yes      | Display title. Reject row if missing/empty.            |

### Optional fields (with defaults)

| Field               | Type             | Default          | Notes                                            |
| ------------------- | ---------------- | ---------------- | ------------------------------------------------ |
| `subtitle`          | `string`         | `""`             | Creator/year/genre. Trim.                        |
| `description_short` | `string`         | `""`             | 1-line description. Trim.                        |
| `tags`              | `string[]`       | `[]`             | Themes/genres/topics. Normalize per rules below. |
| `popularity_score`  | `number`         | `0.3`            | Clamp to [0, 1].                                 |
| `tile_key`          | `string`         | derived          | See derivation rule below.                       |
| `image_url`         | `string \| null` | `null`           | Optional licensed image URL.                     |
| `updated_at`        | `number`         | import timestamp | Unix epoch seconds.                              |

### TypeScript interface (source shape, pre-normalization)

```typescript
interface StarterCatalogEntry {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  description_short?: string;
  tags?: string[];
  popularity_score?: number;
  tile_key?: string;
  image_url?: string | null;
  updated_at?: number;
}
```

This is the _input_ shape. After normalization, it maps 1:1 to `CatalogEntityRow` (the DB row type from `types/domain/catalog.ts`).

## 4) Normalization Rules

### Strings

- Trim all string fields.
- `type`: lowercase. e.g., `"Movie"` → `"movie"`.
- `id`: preserve as-is after trim (case-sensitive, must be non-empty).
- `title`: preserve as-is after trim (must be non-empty).
- `subtitle`, `description_short`: default to `""` if missing or not a string.

### Tags

- Must be an array of strings. Non-string elements are filtered out.
- Each tag: trim, lowercase, collapse whitespace.
- De-duplicate (preserve first occurrence order).
- Max **15 tags per entity**. Truncate excess silently.
- Empty tags (after trim) are filtered out.

### Popularity

- Must be a finite number.
- Clamp to `[0, 1]`: `Math.max(0, Math.min(1, value))`.
- If missing, non-numeric, or NaN: default to `0.3` (slightly below median; avoids artificially inflating unknown entities).

### Tile Key

- If present and non-empty after trim: use as-is.
- If absent: derive deterministically from `type` and `id`:

```typescript
function deriveTileKey(type: string, id: string): string {
  return `${type}:${id}`;
}
```

This produces a stable, unique key suitable for deterministic tile generation (Iteration 07). No hash is needed — the `type:id` pair is already unique and deterministic.

### Image URL

- If present and is a non-empty string: use as-is.
- Otherwise: `null`.

### Updated At

- If present and is a positive finite number: use as-is.
- Otherwise: set to the import timestamp (`Math.floor(Date.now() / 1000)` for epoch seconds).

### Rejection Rules

Skip the row entirely (do not insert) if any of these are true:

- `id` is missing, not a string, or empty after trim.
- `type` is missing, not a string, or empty after trim.
- `title` is missing, not a string, or empty after trim.

Log a warning for each skipped row with its index and `id` (if available). Do not abort the import — continue processing remaining rows.

## 5) Size and Content Constraints

| Constraint             | Value              | Rationale                                  |
| ---------------------- | ------------------ | ------------------------------------------ |
| Max file size          | ~5 MB uncompressed | Keeps JS bundle reasonable                 |
| Max row count          | 20,000             | Bounded per CLAUDE.md Section 4.2          |
| Min row count          | 500                | Enough for meaningful cold-start diversity |
| Target row count       | 5,000–10,000       | Good balance of diversity and bundle size  |
| Max tags per entity    | 15                 | Prevents tag explosion in score tables     |
| Max title length       | 200 chars          | Truncate with `...` if exceeded            |
| Max subtitle length    | 200 chars          | Truncate with `...` if exceeded            |
| Max description length | 500 chars          | Truncate with `...` if exceeded            |

### Type distribution guideline

The catalog should cover all entity types defined in `ENTITY_TYPES` (`types/domain/catalog.ts`). Recommended rough distribution:

| Type           | Target % | Approx count (at 5k) |
| -------------- | -------- | -------------------- |
| movie          | 15%      | 750                  |
| book           | 15%      | 750                  |
| tv             | 10%      | 500                  |
| album / artist | 15%      | 750                  |
| podcast        | 8%       | 400                  |
| game           | 8%       | 400                  |
| team / athlete | 10%      | 500                  |
| thinker        | 7%       | 350                  |
| place          | 7%       | 350                  |
| concept        | 5%       | 250                  |

This ensures cold-start diversity across all type categories.

## 6) Catalog Versioning Strategy

### Version field

The catalog carries a version string in a metadata wrapper at import time (not in the JSON file itself). The importer records this in a lightweight metadata mechanism.

### Version format

Simple integer version:

```
CATALOG_VERSION = 1
```

Stored in the `__healthcheck` table or a new `__catalog_meta` single-row table:

```sql
CREATE TABLE IF NOT EXISTS __catalog_meta (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  version INTEGER NOT NULL,
  imported_at INTEGER NOT NULL,
  row_count INTEGER NOT NULL
);
```

### Version check at startup

1. Read `__catalog_meta.version`.
2. Compare to `CATALOG_VERSION` constant in code.
3. If DB version < code version (or row doesn't exist): run import.
4. If DB version >= code version: skip import.

This prevents re-importing the same catalog on every app launch while allowing catalog updates to be picked up when the app ships a new version.

## 7) Mapping to `catalog_entities` Table

| Source Field        | Normalization                    | DB Column           | DB Type          |
| ------------------- | -------------------------------- | ------------------- | ---------------- |
| `id`                | trim                             | `id`                | TEXT PK          |
| `type`              | trim, lowercase                  | `type`              | TEXT NOT NULL    |
| `title`             | trim, truncate 200               | `title`             | TEXT NOT NULL    |
| `subtitle`          | trim, truncate 200, default `""` | `subtitle`          | TEXT NOT NULL    |
| `description_short` | trim, truncate 500, default `""` | `description_short` | TEXT NOT NULL    |
| `tags`              | normalize array, JSON.stringify  | `tags_json`         | TEXT NOT NULL    |
| `popularity_score`  | clamp [0,1], default 0.3         | `popularity`        | REAL NOT NULL    |
| `tile_key`          | trim or derive `type:id`         | `tile_key`          | TEXT NOT NULL    |
| `image_url`         | string or null                   | `image_url`         | TEXT NULL        |
| `updated_at`        | number or import timestamp       | `updated_at`        | INTEGER NOT NULL |

Every source field maps to exactly one `catalog_entities` column. No schema changes are needed for Iteration 06.

## 8) Import Pipeline Shape (for 6B/6C/6D)

```
starter-catalog.json
  → JSON module import (synchronous parse)
  → validate + normalize each entry (6B)
    → skip malformed rows with warning
  → batch SQLite INSERT OR REPLACE via prepared statement (6C)
    → 100–500 rows per transaction batch
  → record import metadata in __catalog_meta (6C)
  → trigger at startup if catalog version is stale (6D)
    → non-blocking: show deck loading state during import
    → failure: log error, allow app to function with empty/partial catalog
```

## 9) File Location

```
assets/
  data/
    starter-catalog.json    ← the catalog file
```

Import via:

```typescript
import starterCatalogData from '@/assets/data/starter-catalog.json';
```

The `@/` path alias resolves to the project root per `tsconfig.json`.
