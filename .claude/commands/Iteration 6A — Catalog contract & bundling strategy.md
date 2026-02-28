# (MODEL: Claude Opus 4.6 Max) Iteration 6A — Catalog contract & bundling strategy

## Objective
Define the **starter catalog contract** and a **safe bundling/loading strategy** (JSON vs JSONL vs chunked files) that:
- matches `CLAUDE.md` Section 4 (Entity structure),
- is reliable on mobile memory constraints,
- and is compatible with Expo + Metro + the planned SQLite importer.

## Why this matters
If the starter catalog format/loading approach is wrong, import becomes flaky (startup crashes, memory spikes, long blocks), and later iterations get locked into a bad pipeline.

This subtask produces the decisions Codex will implement in 6B/6C/6D.

## Scope
### In scope
- Decide the starter catalog file format:
  - `starter-catalog.json` (array of entities),
  - OR `starter-catalog.jsonl` (one JSON object per line),
  - OR chunked `starter-catalog.part-*.json` files.
- Decide how the app will load the file:
  - import as JSON module (TS `resolveJsonModule`) **vs**
  - treat as an **asset** and read it via FileSystem (preferred for large payloads) **vs**
  - hybrid (dev uses module import; prod uses asset).
- Define the canonical “source row” schema and its mapping to `catalog_entities` (SQLite row).

### Out of scope
- Writing importer code (6B/6C).
- Adding DB tables beyond what’s needed for import metadata (6C covers metadata mechanics).

## Deliverable
A short **Decision Memo** (1–2 pages max) saved in:
- `docs/catalog/STARTER_CATALOG_CONTRACT.md`

It must include:
1) chosen file format + why,
2) chosen loading approach + why,
3) “source row” schema (fields, types),
4) normalization rules (required/optional defaults),
5) constraints (max size guidance, row count, tag limits),
6) versioning strategy for catalog updates (string/semver or integer).

## Decision guidance (high-signal constraints)
- Metro treats `.json` as **source code** (bundled), not a file asset. Large JSON imports can increase bundle size and memory use. Prefer FileSystem/asset approach for bigger catalogs.  
- Expo FileSystem supports file operations and provides streaming primitives via `FileHandle` / streams in newer APIs; if the catalog grows, JSONL + streaming parse is the safest direction.
- For SQLite bulk import: use prepared statements + transaction batching; avoid per-row SQL string concatenation.

## Required contract (must match CLAUDE.md)
Each entity must normalize into:
- `id: string` (stable; required; unique)
- `type: string` (enum-ish; required)
- `title: string` (required)
- `subtitle: string` (required but can be empty string)
- `description_short: string` (required but can be empty string)
- `tags: string[]` (required; can be empty; must be JSON-serializable)
- `popularity_score: number` (0..1; required; clamp)
- `tile_key: string` (required; deterministic; default derivation allowed)
- `image_url?: string | null` (optional; default null)
- `updated_at: number` (unix ms; required; set at import time if missing)

## Normalization rules (define explicitly)
- Trim strings.
- `type`: lowercase slug (`movie`, `book`, `podcast`, etc.).
- `tags`: lowercase, trim, de-dupe, max N tags per entity (suggest 12–20).
- `popularity_score`: clamp to [0, 1]; if missing default to 0.25 (or chosen default).
- `tile_key`: if absent, derive from stable hash of (`type|id|title`) and persist the derived value.
- Reject rows missing `id`, `type`, or `title`.

## Recommended size strategy (choose one)
Pick ONE option and document it:

### Option A — Small catalog (fastest to ship)
- `starter-catalog.json` with <= ~2–3MB compressed, <= 20k rows
- Loaded as a JSON module import (simple)
- Risk: large JSON module imports can crash/slow startup as size grows.

### Option B — Medium/large catalog (recommended)
- `starter-catalog.jsonl` (or chunked parts)
- Stored as an asset (possibly using `.txt` or `.jsonl` extension so Metro treats it like an asset when configured)
- Read with FileSystem and parsed incrementally (line-by-line)
- More work now, scales better.

### Option C — Chunked JSON parts (pragmatic middle)
- `starter-catalog.part-01.json`, `part-02.json` ...
- Each part is a smaller JSON array
- Sequentially parse/import each part, yielding between chunks to keep UI responsive.

## Acceptance criteria
- Decision memo exists and is unambiguous.
- Includes: chosen format + loading + versioning + normalization + constraints.
- Defines “done” for importer compatibility:
  - every source record can be deterministically normalized into the canonical entity shape,
  - importer can skip malformed rows without aborting.

## Validation
- Review memo against `CLAUDE.md` Section 4 and Section 6.
- Verify the contract maps 1:1 to `catalog_entities` columns.

## External references (official / high-quality)
```text
Expo SQLite docs (prepared statements, bulk ops): https://docs.expo.dev/versions/latest/sdk/sqlite/
Expo FileSystem docs (streams/FileHandle): https://docs.expo.dev/versions/latest/sdk/filesystem/
Expo Asset docs (Asset.fromModule / downloadAsync): https://docs.expo.dev/versions/latest/sdk/asset/
Expo Metro: importing assets (JSON is source by default): https://docs.expo.dev/guides/customizing-metro/#importing-assets
TypeScript resolveJsonModule: https://www.typescriptlang.org/tsconfig/resolveJsonModule.html
SQLite UPSERT (ON CONFLICT DO UPDATE): https://sqlite.org/lang_upsert.html
SQLite Transactions: https://sqlite.org/lang_transaction.html

Relevant cautionary thread (large JSON import crash example):
https://github.com/expo/expo/issues/18365