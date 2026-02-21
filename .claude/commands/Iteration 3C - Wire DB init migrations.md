# Iteration 3C (GPT-5.3 Codex) — Wire DB init/migrations into Expo Router startup

## Intended model
**GPT-5.3 Codex (Primary Implementer)**

## Objective
Ensure migrations run **before** any DB-dependent UI flows:
- initialize DB at app startup
- block deck/profile/library reads until migrations complete
- present a safe loading UI (or splash gating) during init
- surface clear error state if migration fails

## Why this matters
If screens render and query DB before migrations complete:
- you’ll get runtime errors,
- partial schema reads,
- corrupt or inconsistent state.

TasteDeck requires local-first offline reliability, so the initialization boundary must be deterministic.

## Scope
### In scope
- Add a startup hook in `app/_layout.tsx` (or a dedicated provider) that:
  - opens DB
  - runs migrations
  - sets “DB ready” state
- Ensure no screen queries DB before ready.
- Add minimal fallback UI while initializing.
- Add minimal fatal error UI if init fails.

### Out of scope
- Full app styling/polish
- Feature logic (catalog, swipes, ranking)

## Implementation patterns (choose one)
### Pattern A — Root initialization gate (recommended)
- In `app/_layout.tsx`, run `initDb()` in an effect.
- Render `<Slot />` only after DB ready.
- Use Expo Router’s splash screen wrapper or a simple loading component.

### Pattern B — SQLiteProvider + Suspense (optional)
- Use `SQLiteProvider` with `onInit={migrateDbIfNeeded}` and `useSuspense`.
- This can simplify gating, but ensure your DB module still exists for non-React usage.

Pick one and stick with it.

## Constraints / pitfalls
- Avoid returning `null` from root layout during initialization unless you fully understand Expo Router constraints.
- If using transactions, ensure no other async DB queries execute until migrations complete.
- If web is enabled: remember expo-sqlite web support requires additional setup and may be unstable.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` principles: local-first + fast UX
- Iteration 03: DB must be initialized before later tasks
- `lib/db/*` from Subtask 3B

### Repo anchors
- `app/_layout.tsx` (startup boundary)
- `app/(tabs)/*` screens should not read DB before ready

### External resources
- Expo Router guidance on root layout behavior and splash screen wrapper
- Expo SQLite docs for Provider + Suspense option
- Expo SQLite docs for web setup notes (if supporting web)

YouTube search phrases:
- `expo router splash screen initialization`
- `expo sqlite SQLiteProvider useSuspense onInit`

## Implementation checklist
- [ ] Create an `initDb()` function that:
  - `getDb()` / `openDb()`
  - `runMigrations()`
  - `healthCheck()`
- [ ] In `app/_layout.tsx`:
  - call `initDb()` before rendering DB-dependent screens
  - show fallback UI or use SplashScreen gating
- [ ] Add error boundary UX:
  - show a “DB init failed” screen with basic instructions
  - include logs for debugging (dev only)
- [ ] Ensure tabs/screens do not query DB until ready

## Deliverables
- App boots reliably with DB ready gate.
- No DB reads occur before migrations complete.
- Clear fallback UX during init and clear error UX on failure.

## Acceptance criteria
- Fresh install: app boots, runs migration once, then shows tabs.
- Second run: app boots without rerunning migration.
- If migration throws: app shows failure UI (not a blank screen).
- No red screens caused by “table not found” during startup.

## Definition of done evidence
- Record/paste console logs for:
  - first run: init start → migration executed → ready
  - second run: init start → already up to date → ready

## Validation commands
- `npm run start -- --clear`
- (Optional) `npm run start -- --web` if web is supported/configured