
---

### File 2 — `iterations/06-subtasks/06B_CODEX-parse-validate-normalize-pipeline.md`

```md
# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 6B — Parse, validate, normalize starter catalog

## Objective
Implement the **front half** of the import pipeline:
- load starter catalog payload,
- parse it safely,
- validate against Iteration 05 domain models,
- normalize into canonical `CatalogEntity` + DB-row shape (without writing to DB yet).

This subtask produces a callable function returning:
- `validEntities[]` (normalized),
- `diagnostics` (counts + sample errors).

## Why this matters
Separating parse/validate/normalize from persistence:
- makes failure modes debuggable,
- keeps DB code clean,
- and allows unit testing without SQLite I/O.

## Scope
### In scope
- Implement loader for chosen bundling strategy from 6A:
  - JSON module import OR FileSystem asset read OR chunked parts.
- Implement parser:
  - JSON array OR JSONL line parser OR chunk parser.
- Validate required fields; produce actionable diagnostics:
  - row index/id, reason, offending field.
- Normalize fields (string trimming, tag normalization, popularity clamp, default tile_key).
- Output canonical normalized entities (TS typed).

### Out of scope
- DB upsert code (Iteration 6C).
- Startup wiring (Iteration 6D).

## Repo anchors (expected)
- Domain types and parsers from Iteration 05:
  - `types/domain/catalog.ts`
  - `types/domain/parsers.ts`
  - `types/domain/actions.ts` (not needed here, but don’t duplicate constants)
- Catalog asset location:
  - `assets/catalog/` (recommended)
- New pipeline modules:
  - `lib/catalog/loadStarterCatalog.ts`
  - `lib/catalog/parseCatalog.ts`
  - `lib/catalog/normalizeCatalogRecord.ts`
  - `lib/catalog/importDiagnostics.ts`

## Implementation plan
1) **Loader**
   - Implement `loadStarterCatalogSource()` which returns either:
     - `string` (file text) OR
     - `unknown` (already-parsed module JSON) OR
     - async iterator of lines/chunks.
   - Keep interface stable so we can swap JSON vs JSONL without rewriting normalizer.

2) **Parser**
   - If JSON module import: treat as `unknown` and validate it is an array.
   - If file text:
     - JSON array: `JSON.parse(text)` -> validate array
     - JSONL: split lines safely OR stream lines (preferred if available)

3) **Validate + Normalize**
   - For each record:
     - validate required fields: id/type/title
     - normalize:
       - `type` slug
       - `tags` normalization (lowercase, trim, dedupe, cap N)
       - `popularity_score` clamp [0..1]
       - `tile_key` derive if missing
       - `subtitle`, `description_short` default to `""`
       - `image_url` default `null`
       - `updated_at` set to `Date.now()` if missing
   - Collect:
     - `valid[]`
     - `skipped[]` (with reasons)

4) **Diagnostics**
   - Return:
     - `validCount`, `skippedCount`
     - `skippedSample` (cap to e.g. 25)
     - `durationMs`
     - `catalogVersion` (from 6A decision: embedded in file or hardcoded)

## Deliverables
- Loader + parser + normalizer modules.
- A single entry point:
  - `lib/catalog/prepareCatalogImport.ts`
    - returns `{ entities, diagnostics }`.

## Acceptance criteria
- Works with at least:
  - empty file handling (fails cleanly),
  - malformed JSON handling (fails cleanly),
  - mixed good/bad rows (skips bad rows, keeps importing).
- Produces deterministic output:
  - same source -> same normalized entities (except updated_at if chosen to set at import time; document it).
- No duplicated domain types: reuse Iteration 05 types/parsers.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- catalog-import` (or add a focused test file if not present)

## External references (official / high-quality)
```text
TypeScript resolveJsonModule: https://www.typescriptlang.org/tsconfig/resolveJsonModule.html
Expo FileSystem (reading local/asset files + streams): https://docs.expo.dev/versions/latest/sdk/filesystem/
Expo Metro asset import behavior (JSON is source by default): https://docs.expo.dev/guides/customizing-metro/#importing-assets