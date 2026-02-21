# Iteration 3: Create SQLite initialization and migration framework

## Objective

Implement local SQLite access with deterministic open/init flow and versioned migrations.

## Why this matters

Local-first product requirements depend on resilient on-device storage. A robust migration framework prevents schema drift and lets future iterations safely evolve data structures.

## Scope

### In scope

- Add or enable SQLite dependency for Expo app runtime.
- Introduce DB module for open, migrate, and health check.
- Define migration registry and schema version tracking.
- Ensure migrations are deterministic, idempotent, and ordered.
- Add startup hook so migrations run before data-dependent flows.

### Out of scope

- Implementing the full production table set (handled in Iteration 04).
- Complex seed/import flows (handled in Iteration 06).
- Remote sync/cloud data behavior.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                 | Model      | Rationale                                         |
| -------------------------------------------------------- | ---------- | ------------------------------------------------- |
| Build DB module (client, migration runner, health check) | **Codex**  | Core implementation work with SQLite              |
| Design migration versioning strategy (table vs PRAGMA)   | **Claude** | Architecture decision with long-term implications |
| Add startup initialization hook in app layout            | **Codex**  | Wiring code into existing Expo Router structure   |
| Review migration framework against CLAUDE.md Section 6   | **Claude** | Spec enforcement for data model compatibility     |

### Notes

- This is a **Codex-primary** iteration. Gemini is not needed (no spatial/UI work).
- Claude should produce a short design decision memo if the versioning strategy choice is unclear (tracking table vs `PRAGMA user_version`).

## Agent resources and navigation map

### Source-of-truth references

- `CLAUDE.md` Section 6 (Data Model), and Section 17 item #3 (SQLite initialization layer).
- `iterations/README.md` for sequencing constraints and naming conventions.
- `iterations/04-create-base-database-schema-tables-and-indexes.md` for forward compatibility with next schema task.

### Current repo implementation anchors

- `package.json`: dependency and script baseline (add `expo-sqlite` if not already present).
- `app/_layout.tsx`: startup boundary where app-level initialization orchestration can be triggered.
- `app/(tabs)/index.tsx`: current app entry UX that should not read/write DB before migrations complete.
- `tsconfig.json`: strict TypeScript constraints to keep DB layer typed and reliable.

### Suggested implementation anchors (new files)

Use a clear, centralized DB folder so later iterations can extend it safely. Example structure:

- `lib/db/client.ts` (singleton open/close helpers)
- `lib/db/migrations.ts` (ordered migration registry + metadata)
- `lib/db/runMigrations.ts` (transactional migration runner)
- `lib/db/health.ts` (simple readiness check/query)
- `lib/db/index.ts` (public exports)

If you choose different paths, keep naming explicit and update iteration notes so later tasks can find the modules quickly.

### External troubleshooting and learning resources

#### Official docs

- Expo SQLite API docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo “Using libraries” workflow (native module setup expectations): https://docs.expo.dev/workflow/using-libraries/
- React Native architecture/performance basics: https://reactnative.dev/docs/performance
- SQLite official docs (SQL semantics, transactions, pragmas): https://www.sqlite.org/docs.html
- SQLite `PRAGMA user_version` reference (schema versioning option): https://www.sqlite.org/pragma.html#pragma_user_version

#### Step-by-step guides and practical references

- SQLite tutorial (schema/versioning refresher): https://www.sqlitetutorial.net/
- Expo + SQLite walkthrough examples (community): https://blog.logrocket.com/using-sqlite-react-native/
- Migration pattern examples with ordered registries (general RN/Node patterns):
  - https://github.com/typeorm/typeorm/blob/master/docs/migrations.md
  - https://knexjs.org/guide/migrations.html

#### YouTube tutorials

- Expo channel (search for SQLite + local data patterns): https://www.youtube.com/@expo
- Fireship SQLite crash courses (SQL/migrations intuition): https://www.youtube.com/@Fireship
- Search phrase for targeted help: `Expo SQLite migrations React Native offline first`

#### Other GitHub repos to reference

- Expo examples repo (current Expo project conventions): https://github.com/expo/examples
- Expo monorepo SQLite package source (API behavior/reference): https://github.com/expo/expo/tree/main/packages/expo-sqlite
- React Native SQLite storage patterns (community implementations): https://github.com/andpor/react-native-sqlite-storage

#### Stack Overflow and discussion boards

- Stack Overflow (`expo-sqlite`, `sqlite`, `react-native` tags):
  - https://stackoverflow.com/questions/tagged/expo-sqlite
  - https://stackoverflow.com/questions/tagged/sqlite
  - https://stackoverflow.com/questions/tagged/react-native
- Expo Discussions: https://github.com/expo/expo/discussions
- SQLite Forum: https://sqlite.org/forum/
- React Native Discussions: https://github.com/react-native-community/discussions-and-proposals/discussions

#### Books and long-form references

- _Using SQLite_ by Jay A. Kreibich (O’Reilly): https://www.oreilly.com/library/view/using-sqlite/9781449394592/
- _Designing Data-Intensive Applications_ by Martin Kleppmann (migration/change-management principles): https://dataintensive.net/
- _SQL Antipatterns_ by Bill Karwin (schema pitfalls to avoid early): https://pragprog.com/titles/bksap1/sql-antipatterns/

### When stuck

- Start with a minimal migration (`001_init`) that creates only schema tracking metadata and prove rerun safety.
- Pick exactly one versioning strategy and stay consistent:
  - tracking table (e.g., `schema_migrations`) OR
  - `PRAGMA user_version`.
- Ensure every migration has:
  - unique numeric/version key,
  - deterministic SQL,
  - transaction boundaries,
  - guard clauses (`IF NOT EXISTS`) where appropriate.
- Fail fast on migration errors and block app data flows until migration completes.
- Add lightweight logging around migration start/success/failure to simplify debugging in later tasks.

## Implementation checklist

- [ ] Add/confirm SQLite dependency in `package.json` (`expo-sqlite`) and keep Expo compatibility.
- [ ] Create DB client module with singleton access pattern.
- [ ] Add migration registry with explicit ordering and migration IDs.
- [ ] Add migration runner with transaction boundaries and idempotent behavior.
- [ ] Add schema version tracking mechanism (table and/or `PRAGMA user_version`).
- [ ] Add startup initialization hook so DB is ready before app consumes persisted data.
- [ ] Add a smoke migration proving first-run init + rerun safety.

## Deliverables

- Reusable DB layer with migration hooks and clear module boundaries.
- At least one applied smoke migration proving mechanism correctness.
- Short developer note documenting how to add migration `N+1` in future iterations.

## Acceptance criteria

- Fresh install initializes DB without manual steps.
- Re-running init does not duplicate or unexpectedly mutate prior schema state.
- Migration order is deterministic and reproducible across app restarts.
- Initialization failure surfaces clear, actionable error logs.

### Definition of done evidence

- Capture first-run migration log output.
- Capture second-run output showing no duplicate migration execution.
- Document migration naming convention (`001_description`, `002_description`, etc.) and where to register new migrations.

## Validation commands

- `npm run typecheck`
- `npm run lint`
- `npm run start -- --clear`

## Notes for next iteration

Record the chosen migration versioning strategy, folder structure, and helper API names so Iteration 04 can add base schema tables without refactoring the migration engine.
