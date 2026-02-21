# Iteration 9: Persist swipe sessions and swipe events

## Objective
Implement a reliable local persistence pipeline that records swipe session lifecycle and swipe events immediately, with canonical action-to-weight mapping and enough context for downstream ranking/profile updates.

## Why this matters
Everything after Deck UI depends on event integrity. If swipe events are dropped, duplicated, misweighted, or detached from session context, profile scoring and ranking logic in later iterations will drift and become untrustworthy.

## Scope
### In scope
- Define and wire session lifecycle: `startSession`, `recordSwipe`, `endSession`.
- Persist each swipe event with required fields (`session_id`, `entity_id`, `action`, `strength`, `created_at`) and optional contextual metadata snapshot.
- Centralize and freeze action-to-weight mapping aligned with product spec.
- Make writes resilient under rapid repeated interactions from gesture and button paths.
- Expose one persistence API surface that all Deck action inputs call through.

### Out of scope
- Undo/reversal behavior and score rollback (Iteration 10).
- Incremental updates to `taste_tag_scores`, `taste_type_scores`, `entity_affinity` (Iteration 11).
- Candidate selection/ranking changes.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Implement session lifecycle + event recording pipeline | **Codex** | Core data persistence implementation |
| Wire Deck action callbacks to unified recording API | **Codex** | Integration with Iteration 08 UI |
| Add tests for mapping, integrity, rapid-write resilience | **Codex** | Test authoring for data layer |
| Review data contract alignment with CLAUDE.md Section 6-7 | **Claude** | Spec enforcement for action weights and schema |

### Notes
- This is a **Codex-primary** iteration. Gemini is not needed (no spatial/UI work).
- Claude should verify that action-to-weight mapping matches `CLAUDE.md` Section 7.1 exactly.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 3.1 (required 5-state action model semantics).
- `CLAUDE.md` Section 5.2 Deck behavior note: “record event locally first, then compute updates”.
- `CLAUDE.md` Section 6 data model definitions for `swipe_sessions` and `swipe_events`.
- `CLAUDE.md` Section 7.1 action weights (`love +2`, `yes +1`, `skip 0`, `no -1`, `hard_no -2`).
- `CLAUDE.md` Section 14.1 acceptance requirement: each swipe produces a stored event.
- `iterations/08-build-deck-card-ui-and-controls.md` (incoming UI callback contract).
- `iterations/10-implement-undo-last-swipe.md` (next-iteration dependency on event ordering and latest-event lookup).
- `iterations/README.md` (sequence expectations).

### Current repo implementation anchors
Inspect these first so naming and architecture remain consistent:
- Database bootstrapping/migrations from Iterations 03–04 (look under paths like `db/`, `lib/db/`, `src/db/`, or migration folders).
- Domain models/types from Iteration 05 (e.g., `SwipeAction`, `SwipeEvent`, `SwipeSession`, filter types).
- Deck action dispatcher/callback integration from Iteration 08 (where user interactions are normalized).
- Existing ID/time helpers (UUID generation, clock wrapper, deterministic test clock utilities).
- Existing repository/service conventions and test patterns (`__tests__/`, feature-level integration tests).

### Suggested file organization
Use current project conventions if different; representative target layout:
- `features/swipes/domain/actionWeights.ts` (single source of truth mapping + guard helpers)
- `features/swipes/repository/swipeSessionRepository.ts` (`startSession`, `endSession`)
- `features/swipes/repository/swipeEventRepository.ts` (`recordSwipe`, optional batched/serialized writer)
- `features/swipes/service/swipeRecorder.ts` (UI-facing unified API)
- `features/swipes/types/swipePersistence.ts` (DTO/input contracts)
- `__tests__/swipes/swipe-persistence.test.ts` (mapping, integrity, rapid-write behavior)

### External troubleshooting and learning resources
#### Official docs
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- SQLite transactions: https://www.sqlite.org/lang_transaction.html
- SQLite WAL/concurrency notes: https://www.sqlite.org/wal.html
- SQLite foreign keys: https://www.sqlite.org/foreignkeys.html
- SQLite indexes and query planner basics: https://www.sqlite.org/queryplanner.html

#### Step-by-step guides
- Expo SQLite local data tutorial patterns: https://docs.expo.dev/guides/using-sqlite/
- Practical React Native offline-first persistence overview: https://blog.logrocket.com/using-sqlite-react-native/
- SQLite schema migration patterns in JS apps: https://www.sqlite.org/pragma.html#pragma_user_version

#### YouTube
- Expo channel (local-first + storage patterns): https://www.youtube.com/@expo
- The Net Ninja SQLite/React Native playlists (conceptual grounding): https://www.youtube.com/@NetNinja
- Fireship (concise architecture overviews for app data layers): https://www.youtube.com/@Fireship

#### Books / long-form references
- *Designing Data-Intensive Applications* (reliability/event integrity concepts): https://dataintensive.net/
- *SQL Antipatterns* (schema and write-path pitfalls): https://pragprog.com/titles/bksap1/sql-antipatterns/
- SQLite official docs index (best canonical reference): https://www.sqlite.org/docs.html

#### GitHub repos
- Expo examples (search for SQLite usage patterns): https://github.com/expo/examples
- Expo SQLite package source/examples: https://github.com/expo/expo/tree/main/packages/expo-sqlite
- React Native SQLite storage community examples: https://github.com/andpor/react-native-sqlite-storage

#### Stack Overflow / discussion boards
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Stack Overflow `expo`: https://stackoverflow.com/questions/tagged/expo
- Stack Overflow `react-native`: https://stackoverflow.com/questions/tagged/react-native
- Stack Overflow `expo-sqlite`: https://stackoverflow.com/questions/tagged/expo-sqlite
- Expo Discussions: https://github.com/expo/expo/discussions
- SQLite forum: https://sqlite.org/forum/

### When stuck
- Lock the domain contract first: ensure one canonical `SwipeAction -> strength` mapping with exhaustive type checks.
- Keep write path simple and serial: prefer one persistence service queue/critical section over many ad hoc DB writes from UI.
- Treat `recordSwipe` as append-only and idempotency-aware where possible (stable event IDs help dedupe safety).
- Use transaction boundaries deliberately: session start + event inserts should never leave partial corrupted state.
- Preserve ordering guarantees (`created_at` + monotonic insertion) so undo/analytics logic can trust “latest swipe”.
- Add tests for rapid interactions and repeated taps/gestures to prove no dropped rows or double writes.

## Implementation checklist
- [ ] Add/confirm typed constants for supported swipe actions and canonical numeric weights.
- [ ] Implement `startSession(filters)` that creates one active session with timestamp and filter snapshot.
- [ ] Implement `recordSwipe(input)` that persists event row with `session_id`, `entity_id`, `action`, `strength`, `created_at`, and optional metadata payload.
- [ ] Implement `endSession(sessionId)` that stamps `ended_at` safely and is tolerant to repeated calls.
- [ ] Ensure DB writes are transactional/serialized enough to tolerate rapid user interactions.
- [ ] Wire Deck action callback path from Iteration 08 to this unified recording API.
- [ ] Add tests for mapping correctness, one-event-per-action behavior, session linkage, and rapid swipe resilience.

## Deliverables
- Production-ready swipe persistence module with session + event repositories/services.
- Canonical action-weight mapping consumed by all swipe write paths.
- Automated tests validating event integrity and session association under normal and rapid usage.

## Acceptance criteria
- Every valid Deck action results in exactly one persisted event row.
- Persisted `strength` values match product mapping for all required actions.
- Every event is linked to an existing session, and session start/end timestamps are coherent.
- Rapid sequential interactions do not drop writes or create malformed rows.
- UI paths (gesture + button) call the same persistence API (no duplicate divergent write logic).

## Definition of done evidence
- Show a sample persisted row set for one session containing all 5 required actions with expected strengths.
- Show test evidence covering rapid interaction burst behavior and session linkage.
- Show contract evidence (single exported action-weight map and unified recorder entrypoint used by Deck UI).

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- swipe`

## Notes for next iteration
Iteration 10 (Undo last swipe) should be able to query the latest event deterministically from this write path and reverse it. Preserve stable ordering semantics and avoid spreading write logic across multiple UI call sites.
