# Iteration 6: Load bundled starter catalog into SQLite

## Objective
Implement an import pipeline for the bundled starter catalog JSON so records are validated, normalized, and upserted into `catalog_entities` with repeat-safe behavior.

## Why this matters
Deck ranking and swipe UX cannot function without a local starter dataset. Import must be deterministic, idempotent, and fault-tolerant so first-run onboarding is reliable and future catalog refreshes are low risk.

## Scope
### In scope
- Add bundled starter catalog asset (`.json` or `.jsonl`) and a deterministic importer.
- Validate required fields against Iteration 05 domain models before persistence.
- Normalize source rows into canonical domain/entity row shapes.
- Execute batched transactional upserts keyed by stable `id`.
- Track import metadata (version, row counts, completed timestamp, failure diagnostics summary).
- Trigger first-run import from app startup bootstrap path without blocking UI rendering.

### Out of scope
- Remote catalog fetch/sync pipeline.
- Background scheduling or OTA catalog delivery strategy.
- Non-SQLite persistence backends.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 4.2 (bundled starter catalog product intent), Section 6 (`catalog_entities` schema contract), and backlog item 6.
- `iterations/03-create-sqlite-initialization-and-migration-framework.md` (DB open/init/migration lifecycle).
- `iterations/04-create-base-database-schema-tables-and-indexes.md` (table/index definitions and constraints this importer must satisfy).
- `iterations/05-add-typed-domain-models.md` (canonical domain types/parsers to reuse for import normalization).
- `iterations/README.md` (iteration sequencing and handoff expectations).

### Current repo implementation anchors
Inspect these locations before writing importer code so work aligns with existing conventions:
- `lib/db/` modules for database open/init/migration orchestration.
- Existing SQL helpers/query wrappers introduced in Iterations 03–04 (transaction wrappers, statement execution helpers, row mapping utilities).
- Domain types from Iteration 05 under `types/domain/*` (or equivalent location if structure differs).
- App startup bootstrap path (for example root layout/app init service) where first-run import should be triggered safely.
- `package.json` validation scripts: `typecheck`, `lint`, and any targeted import-test commands if available.

### Suggested file organization
Follow current repo conventions where possible; a likely structure for this iteration is:
- `assets/catalog/starter-catalog.json` (or `starter-catalog.jsonl` if line-delimited ingestion is preferred).
- `lib/catalog/importStarterCatalog.ts` (pipeline orchestrator: load -> parse -> normalize -> persist -> metadata).
- `lib/catalog/normalizeCatalogRecord.ts` (source row to canonical domain/entity conversion).
- `lib/db/catalogRepo.ts` (SQLite upsert/query helpers for `catalog_entities`).
- `lib/catalog/importMetadata.ts` (version/count/timestamp/error-summary tracking helpers).

### External troubleshooting and learning resources
#### Official docs
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Asset system: https://docs.expo.dev/versions/latest/sdk/asset/
- Expo FileSystem: https://docs.expo.dev/versions/latest/sdk/filesystem/
- SQLite UPSERT syntax (`ON CONFLICT`): https://www.sqlite.org/lang_upsert.html
- SQLite transactions and performance notes: https://www.sqlite.org/lang_transaction.html
- TypeScript JSON/module typing reference: https://www.typescriptlang.org/tsconfig/resolveJsonModule.html

#### Step-by-step guides
- Expo SQLite practical walkthrough: https://blog.logrocket.com/using-sqlite-with-react-native/
- Local seed/import flow patterns (React Native + SQLite): https://www.freecodecamp.org/news/use-sqlite-to-build-a-local-data-store-in-react-native/
- SQLite bulk insert/upsert patterns: https://www.sqlitetutorial.net/sqlite-upsert/

#### YouTube
- Expo channel (SQLite and local data tutorials): https://www.youtube.com/@expo
- React Native + SQLite walkthroughs (search target): `Expo SQLite seed database React Native`
- Local-first architecture talks (search target): `mobile local first architecture sqlite`

#### GitHub repos
- Expo examples: https://github.com/expo/examples
- Expo monorepo (SQLite usage references): https://github.com/expo/expo
- React Native SQLite storage examples: https://github.com/andpor/react-native-sqlite-storage

#### Stack Overflow/discussions
- Stack Overflow `expo`: https://stackoverflow.com/questions/tagged/expo
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Stack Overflow `react-native`: https://stackoverflow.com/questions/tagged/react-native
- Stack Overflow `typescript`: https://stackoverflow.com/questions/tagged/typescript
- Expo discussions: https://github.com/expo/expo/discussions

#### Books/long-form references
- *Designing Data-Intensive Applications* (import/data reliability patterns): https://dataintensive.net/
- *SQL Antipatterns* (data-shape and integrity pitfalls): https://pragprog.com/titles/bksap/sql-antipatterns/
- SQLite docs (best-practice deep reference): https://www.sqlite.org/docs.html

### When stuck
- Validate raw JSON shape first, then normalize into canonical Iteration 05 domain types.
- Keep import phases explicit and isolated: parse -> validate -> transform -> persist.
- Use batched transactions + prepared statements for throughput and reduced lock churn.
- Enforce idempotency with `INSERT ... ON CONFLICT(id) DO UPDATE`.
- Record and surface skipped-row diagnostics (row index/id + reason) without crashing whole import.
- Update import metadata atomically with import completion so partial runs are detectable.

## Implementation checklist
- [ ] Add bundled starter catalog asset and loading utility.
- [ ] Implement parse/validate/normalize pipeline using Iteration 05 domain guards/parsers.
- [ ] Implement batched upsert persistence with `ON CONFLICT(id) DO UPDATE` semantics.
- [ ] Add malformed-row skip handling and structured diagnostics output.
- [ ] Persist import metadata (`version`, `valid_count`, `skipped_count`, `completed_at`).
- [ ] Wire first-run import trigger into startup bootstrap path in a non-blocking way.
- [ ] Ensure re-import path is callable for future dataset refreshes.

## Deliverables
- Bundled starter dataset checked in and consumed by importer.
- Import service with deterministic normalization, idempotent persistence, and diagnostics.
- Metadata tracking for import version/count/timestamp/failure summary.
- Startup integration that safely triggers initial import.

## Acceptance criteria
- First run imports all valid source records and final `catalog_entities` row count equals valid source record count.
- Re-import is idempotent: no duplicate IDs are created and changed source rows update existing records.
- Malformed rows are skipped, counted, and reported in diagnostics without aborting entire import.
- Import metadata (version and completion timestamp) is persisted and queryable after success.
- Startup flow remains non-blocking and import failures are handled gracefully (error surfaced/logged, app continues).

### Definition of done evidence
- Show source valid-row count vs. inserted/updated DB row count from an import run.
- Show re-import evidence proving stable row cardinality + updated fields for changed inputs.
- Show malformed-row sample run with non-zero skipped count and captured reason output.
- Show metadata record values (`version`, `valid_count`, `skipped_count`, `completed_at`) after successful import.
- Document exact startup code path that triggers import and fallback behavior on failure.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- catalog-import` (or the repo's targeted import test command if named differently)

## Notes for next iteration
Preserve the catalog schema contract introduced here (`starter-catalog` source fields -> canonical normalized entity shape -> `catalog_entities` columns). Iteration 07 should consume this contract directly for deterministic tile rendering, and any future dataset updates should plug into `importStarterCatalog` + normalization/metadata modules rather than introducing parallel ingestion paths.
