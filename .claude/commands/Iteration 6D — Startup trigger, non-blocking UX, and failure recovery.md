
---

### File 4 — `iterations/06-subtasks/06D_CODEX-startup-trigger-nonblocking-ux-and-recovery.md`

```md
# (MODEL: GPT-5.3 Codex Extra High Fast) Iteration 6D — Startup trigger, non-blocking UX, and failure recovery

## Objective
Wire catalog import into app startup so that:
- migrations run first,
- catalog import runs once when needed (or on version change),
- UI remains responsive (non-blocking),
- failure is handled gracefully with retry and diagnostics visibility.

## Why this matters
“Local-first” only works if first-run bootstrap is dependable. If import blocks the UI thread or fails silently, onboarding and the Deck experience collapse.

## Scope
### In scope
- Add a startup orchestration layer:
  - `initDbAndCatalog()` or similar.
- Decide gating behavior:
  - show a lightweight “Preparing catalog…” screen/state until import completes,
  - OR allow app to render but Deck/Profile show “Catalog not ready” empty state.
- Add failure handling:
  - log error
  - store last_error_json in metadata (from 6C)
  - show retry UI (button)
- Ensure it works on:
  - iOS / Android
  - web (where supported)

### Out of scope
- OTA catalog updates or background scheduling.
- Fancy progress UI.

## Repo anchors
- `app/_layout.tsx` (or your root layout/init boundary)
- DB init hook from Iteration 03
- Import functions from 6B + 6C
- Metadata read helper:
  - `getCatalogImportState()` to check version/completion

## Implementation plan
1) **Catalog readiness contract**
   - Define a single readiness selector:
     - `isCatalogReady(): Promise<boolean>`
     - True if import state exists AND version matches current shipped version.

2) **Startup orchestration**
   - On app mount:
     - `await runMigrations()`
     - `if !ready -> prepare + import`
   - Ensure you do not start import before migrations.

3) **Non-blocking behavior**
   - If import is heavy:
     - break into batches and `await` a micro-yield between batches.
   - Keep UI showing a stable loading state.

4) **Recovery**
   - If import fails:
     - display “Import failed” + retry button
     - keep app navigable (Settings should still work; allow “Clear data” later).

5) **Deep link safety**
   - If user deep-links into Deck/Profile while import running:
     - those screens must handle “catalog not ready” without crashing.

## Deliverables
- Startup init module:
  - `lib/startup/bootstrap.ts` exporting `bootstrapApp()`
- Root layout wiring calling `bootstrapApp()`
- A minimal “catalog not ready / importing” UI path:
  - either a gate screen or empty state components

## Acceptance criteria
- Fresh install:
  - DB migrations run,
  - catalog import runs once,
  - Deck renders after import.
- Subsequent app starts:
  - import is skipped when version matches.
- Import failure:
  - produces visible error state + retry.
- No red-screen errors during startup and tab navigation.

## Validation commands
- `npm run start -- --clear`
- Manual checks:
  - cold start (first install behavior)
  - app restart (import skipped)
  - simulate failure (temporarily break catalog file path) and confirm retry UI

## External references (official / high-quality)
```text
Expo SQLite docs (usage, prepared statements, WAL example): https://docs.expo.dev/versions/latest/sdk/sqlite/
Expo FileSystem docs (file operations + streams): https://docs.expo.dev/versions/latest/sdk/filesystem/
Expo Asset docs (downloadAsync/localUri patterns): https://docs.expo.dev/versions/latest/sdk/asset/