# Iteration 18: Add periodic profile snapshot job

## Objective
Design and implement a robust, deterministic **profile snapshot pipeline** that records compact historical profile state:
- every **N swipes** (event-threshold trigger), and
- at **local day boundary** (time-threshold trigger),
so Iteration 19 can render trend visuals without expensive recomputation.

## Why this matters
Profile v1 shows current state, but trend UX requires historical checkpoints. A lightweight snapshot job creates those checkpoints while protecting app performance, battery usage, and local database health.

## Scope
### In scope
- Define explicit trigger policy for snapshot creation:
  - swipe-count threshold,
  - day rollover boundary,
  - optional app-start catch-up check.
- Serialize profile aggregates into `profile_snapshots` with versioned payload schema.
- Add duplicate-window protection (idempotent behavior).
- Add throttling/debounce/coalescing so burst swipe sessions don’t flood writes.
- Add deterministic tests for trigger logic and persistence behavior.
- Ensure implementation integrates with existing score/selectors introduced in prior iterations.

### Out of scope
- Remote sync/export of snapshots.
- Advanced background execution orchestration across OS-level job schedulers.
- Long-term retention/compaction policies beyond basic guardrails.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Implement scheduler decision logic and trigger policy | **Codex** | Core data pipeline implementation |
| Implement idempotent persistence and debounce logic | **Codex** | Data reliability code |
| Add deterministic tests for triggers and payload stability | **Codex** | Test authoring |
| Review trigger policy design (thresholds, day boundary) | **Claude** | Architecture decision for snapshot frequency |

### Notes
- This is a **Codex-primary** iteration. Gemini is not needed (no spatial/UI work).
- Claude should review the trigger policy constants before implementation to ensure they align with profile evolution goals.

## Product/engineering requirements
- Snapshot generation must be deterministic for same source aggregates.
- Job must be safe under rapid swipe bursts (no write storms).
- Snapshot timestamps must be consistent (document timezone assumption; prefer storing UTC with local-date helper field if needed).
- Duplicate prevention should be explicit and test-backed (e.g., unique key by bucket/window + profile version).
- Failure in snapshot write should not block core swipe flow; log and continue safely.

## Data/contracts and integration points

### Suggested snapshot row contract
Use/extend `profile_snapshots` with fields like:
- `id: string`
- `createdAt: string` (ISO UTC)
- `snapshotDateLocal: string` (YYYY-MM-DD, optional but useful)
- `triggerType: 'SWIPE_THRESHOLD' | 'DAY_ROLLOVER' | 'MANUAL'`
- `windowKey: string` (e.g., `2026-01-20` or swipe-bucket key)
- `profileVersion: number`
- `payloadJson: string` (compact serialized aggregates)
- `metaJson?: string` (counts, selector versions, diagnostics)

### Selector/input dependency contract
Define one stable source function for snapshot content, e.g.:
- `buildCurrentProfileSnapshotInput(): SnapshotInput`

Expected behavior:
- returns already-aggregated profile data (do not recompute heavy history each run),
- deterministic ordering inside payload arrays,
- includes schema version to preserve forward compatibility.

### Trigger engine contract
Add a scheduler decision function, e.g.:
- `shouldCreateSnapshot(state, now): SnapshotDecision`

Decision should evaluate:
- swipe delta since last snapshot >= threshold,
- local date changed since last snapshot,
- duplicate window already exists.

## Recommended implementation approach
1. **Document trigger policy + constants**
   - Define `SNAPSHOT_SWIPE_INTERVAL` and day-boundary behavior.
2. **Implement pure decision logic first**
   - Build/test `shouldCreateSnapshot` with fixed timestamps and counters.
3. **Create idempotent persistence API**
   - Insert snapshot with conflict protection on `(windowKey, triggerType, profileVersion)` or equivalent.
4. **Integrate with swipe/update pipeline**
   - Invoke scheduler at safe lifecycle point after score updates commit.
5. **Add debouncing/coalescing guardrails**
   - Prevent multiple writes within same short event burst/window.
6. **Add observability hooks**
   - Structured logs/metrics counters for created/skipped/error outcomes.
7. **Add deterministic tests + basic perf sanity check**
   - Ensure consistent output and no pathological write amplification.

## Implementation checklist
- [ ] Define snapshot trigger constants and policy notes.
- [ ] Implement pure scheduler decision function with typed result.
- [ ] Add/confirm `profile_snapshots` schema fields required by job.
- [ ] Build snapshot payload serializer using existing profile selectors.
- [ ] Add uniqueness/idempotency protection for same interval window.
- [ ] Integrate scheduler into swipe/session update flow.
- [ ] Add debounce/throttle/coalescing protection for burst activity.
- [ ] Add tests for threshold trigger, day rollover trigger, duplicate suppression.
- [ ] Add tests for deterministic payload ordering/versioning.
- [ ] Add failure-handling path test (write error does not break swipe flow).

## Deliverables
- Production-ready snapshot job integrated into local recommendation/profile lifecycle.
- Deterministic, versioned snapshot payloads persisted in `profile_snapshots`.
- Test suite covering trigger rules, dedupe behavior, and payload consistency.

## Acceptance criteria
- Snapshots are created when swipe threshold is crossed.
- Snapshots are created at local day change even if threshold not crossed.
- No duplicate snapshots for same window policy.
- Burst swipe sessions do not create excessive redundant writes.
- Same input profile aggregates yield byte-stable payload ordering.
- Snapshot write failures are handled gracefully without blocking swipes.

## Definition-of-done evidence
Include in PR notes or artifacts:
- Example trigger test matrix (inputs → decision output).
- Example snapshot row JSON showing versioned payload.
- Log excerpt or debug output showing create vs skip decisions.
- Test output for snapshot scheduler/persistence suite.

## Concrete testing requirements
- **Scheduler decision tests**
  - Below threshold => no snapshot.
  - Crossing threshold => snapshot.
  - Day rollover => snapshot.
  - Same window repeated invocation => skip.
- **Persistence/idempotency tests**
  - Repeated same decision does not duplicate rows.
  - Conflicting insert path resolves predictably.
- **Payload determinism tests**
  - Stable ordering for equal-score ties.
  - Version field present and validated.
- **Integration tests**
  - Swipe flow calls snapshot pipeline at expected checkpoints.
  - Simulated DB write failure does not crash main interaction loop.

## File-location hints (repo navigation)
Likely implementation points:
- swipe/session event handling module,
- profile selector/aggregation module,
- SQLite repository/DAO layer for snapshots,
- shared time/date utility module,
- tests for scheduler logic and DB behavior.

Useful search strings:
- `profile_snapshots`
- `swipe event`
- `session`
- `selector`
- `snapshot`
- `day rollover`
- `debounce`
- `throttle`

## Resources when stuck

### YouTube tutorials
- Debounce/throttle concepts (practical JS): https://www.youtube.com/results?search_query=javascript+debounce+throttle+explained
- React Native background tasks overview: https://www.youtube.com/results?search_query=react+native+background+task+tutorial
- Expo TaskManager + BackgroundFetch walkthroughs: https://www.youtube.com/results?search_query=expo+taskmanager+backgroundfetch+tutorial
- SQLite performance and indexing basics: https://www.youtube.com/results?search_query=sqlite+performance+indexing+tutorial

### Official documentation
- Expo TaskManager: https://docs.expo.dev/versions/latest/sdk/task-manager/
- Expo BackgroundFetch: https://docs.expo.dev/versions/latest/sdk/background-fetch/
- Expo BackgroundTask (newer API context): https://docs.expo.dev/versions/latest/sdk/background-task/
- React Native AppState: https://reactnative.dev/docs/appstate
- SQLite official docs: https://www.sqlite.org/docs.html
- SQLite UPSERT syntax (idempotent insert patterns): https://www.sqlite.org/lang_upsert.html
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Jest docs: https://jestjs.io/docs/getting-started

### Step-by-step guides / blogs
- Martin Fowler on Event Sourcing (conceptual snapshot reasoning): https://martinfowler.com/eaaDev/EventSourcing.html
- Idempotency patterns overview: https://stripe.com/blog/idempotency
- Date/time falsehoods (time-boundary pitfalls): https://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time
- Testing Library guiding principles (state-focused tests): https://testing-library.com/docs/guiding-principles

### Books
- *Designing Data-Intensive Applications* (state snapshots, correctness): https://dataintensive.net/
- *Release It!* (stability, failure isolation): https://pragprog.com/titles/mnee2/release-it-second-edition/
- *Refactoring* (isolating pure decision logic): https://martinfowler.com/books/refactoring.html

### GitHub repositories
- Expo examples (task/background patterns): https://github.com/expo/examples
- react-native-background-fetch (reference patterns): https://github.com/transistorsoft/react-native-background-fetch
- SQLite source/docs mirror: https://github.com/sqlite/sqlite
- BullMQ (job/idempotency ideas transferable to local scheduling): https://github.com/taskforcesh/bullmq

### Stack Overflow tags
- `react-native`: https://stackoverflow.com/questions/tagged/react-native
- `expo`: https://stackoverflow.com/questions/tagged/expo
- `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- `typescript`: https://stackoverflow.com/questions/tagged/typescript
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs
- `debouncing`: https://stackoverflow.com/questions/tagged/debouncing

### Discussion boards / communities
- Expo forums: https://forums.expo.dev/
- React Native community discussions: https://github.com/react-native-community/discussions-and-proposals
- Reactiflux Discord: https://www.reactiflux.com/
- Reddit r/reactnative: https://www.reddit.com/r/reactnative/
- DEV Community React Native tag: https://dev.to/t/reactnative

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- snapshot-job`
- `npm test -- profile-snapshots`

## Notes for next iteration
Iteration 19 (Profile over-time view) should consume snapshot rows via stable query selectors and avoid re-deriving heavy aggregates from raw swipe history.
