# Iteration 10: Implement undo last swipe

## Objective
Implement a robust single-level undo flow that reverses the **latest eligible swipe** in the active session, keeps persistence and in-memory state synchronized, and restores the deck/candidate queue to the pre-swipe state.

## Why this matters
Undo is a trust feature. Users make accidental swipes, and without a reliable rollback path, preference data quality degrades quickly. This iteration protects profile integrity and improves UX confidence before heavier ranking/scoring logic expands.

## Scope
### In scope
- Implement `undoLastSwipe(sessionId)` as the single entrypoint for undo logic.
- Resolve latest undo-eligible swipe deterministically (stable ordering).
- Atomically reverse persistence-layer effects for that swipe (event row + any dependent materialized updates already applied).
- Restore UI/deck state so the undone card becomes actionable again.
- Ensure undo availability state (enabled/disabled) is always correct.
- Add test coverage for normal, empty, and repeated undo scenarios.

### Out of scope
- Multi-level undo stacks (undoing multiple past swipes).
- Redo support.
- Cross-session undo behavior.
- Product-level analytics dashboards (basic local instrumentation is sufficient).

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 3.1 action model (undo must operate across all supported actions).
- `CLAUDE.md` Section 5.2 deck interaction behavior (event-first pipeline expectations).
- `CLAUDE.md` Section 6 data model (`swipe_sessions`, `swipe_events`, and related score tables).
- `CLAUDE.md` Section 7.1 action weights and implications for rollback math.
- `CLAUDE.md` Section 14 acceptance quality bar (data consistency + deterministic behavior).
- `iterations/09-persist-swipe-sessions-and-swipe-events.md` (upstream dependency: event ordering and write contract).
- `iterations/11-incremental-taste-score-updates.md` (downstream dependency: consistent delta reversal assumptions).
- `iterations/README.md` for sequence and dependency context.

### Current repo implementation anchors
Inspect and align with existing conventions before coding:
- Swipe persistence service/repositories added in Iteration 09 (latest event lookup + insert/delete patterns).
- Deck screen action dispatch path (gesture + button handlers) from Iteration 08.
- Session lifecycle utilities (`startSession`, `endSession`, active session storage).
- Existing score update helpers (if partial work already exists for Iteration 11, ensure compatibility).
- Shared clock/id generation helpers used for deterministic tests.
- Existing test patterns (feature integration tests and repository unit tests).

### Suggested file organization
Use repository conventions if paths differ; representative layout:
- `features/swipes/repository/swipeEventRepository.ts`
  - add `getLatestEventForSession(sessionId)`
  - add `deleteEventById(eventId)` or `markEventUndone(eventId)` depending on chosen approach
- `features/swipes/service/undoLastSwipe.ts`
  - orchestrates transaction, rollback, and return payload for UI
- `features/swipes/service/swipeRecorder.ts`
  - expose undo API through same service boundary used by deck actions
- `features/swipes/state/deckState.ts` (or equivalent)
  - restore last swiped candidate to active position/queue
- `__tests__/swipes/undo-last-swipe.test.ts`
  - behavioral and transactional correctness tests

### External troubleshooting and learning resources
#### Official docs
- Expo SQLite docs: https://docs.expo.dev/versions/latest/sdk/sqlite/
- SQLite transactions and savepoints: https://www.sqlite.org/lang_transaction.html
- SQLite `ORDER BY` determinism guidance: https://www.sqlite.org/lang_select.html
- SQLite foreign keys/cascade behavior: https://www.sqlite.org/foreignkeys.html
- React docs on state updates and immutability (undo-friendly patterns): https://react.dev/learn/updating-arrays-in-state

#### Step-by-step guides
- Expo SQLite usage guide (practical transaction patterns): https://docs.expo.dev/guides/using-sqlite/
- Undo/redo state modeling patterns in frontend apps: https://redux.js.org/usage/implementing-undo-history
- Practical React Native state management patterns for reversible UI actions: https://reactnative.dev/docs/state

#### YouTube
- Expo YouTube channel (storage and app architecture sessions): https://www.youtube.com/@expo
- Jack Herrington (state architecture and reducer patterns): https://www.youtube.com/@jherr
- Web Dev Simplified (clear undo/redo conceptual demos): https://www.youtube.com/@WebDevSimplified

#### Books / long-form references
- *Designing Data-Intensive Applications* (transactional consistency intuition): https://dataintensive.net/
- *Refactoring UI* (interaction trust and recovery patterns): https://www.refactoringui.com/
- SQLite documentation index: https://www.sqlite.org/docs.html

#### GitHub repos
- Expo examples (SQLite + app data flow references): https://github.com/expo/examples
- Expo SQLite package source and examples: https://github.com/expo/expo/tree/main/packages/expo-sqlite
- Redux undo history patterns and examples: https://github.com/reduxjs/redux

#### Stack Overflow / discussion boards
- Stack Overflow `expo-sqlite`: https://stackoverflow.com/questions/tagged/expo-sqlite
- Stack Overflow `react-native`: https://stackoverflow.com/questions/tagged/react-native
- Stack Overflow `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- Expo Discussions: https://github.com/expo/expo/discussions
- SQLite forum: https://sqlite.org/forum/
- Reactiflux Discord (community troubleshooting): https://www.reactiflux.com/

### When stuck
- Choose one canonical "latest event" rule and enforce it everywhere (e.g., `created_at DESC, id DESC`).
- Prefer a transaction-wrapped undo orchestration over ad hoc multi-step updates.
- Decide and document one persistence strategy:
  - **Hard delete** event row, or
  - **Soft undo flag** (`undone_at`) and exclude from downstream queries.
- If score deltas were already materialized, reverse exactly the same deltas with sign inversion and identical targeting.
- Keep UI restoration deterministic: reinsert the undone entity to the top/front of the current candidate queue unless product spec says otherwise.
- Guard against duplicate taps by making undo operation idempotent for the same latest event.

## Recommended implementation approach
1. Add repository query to fetch latest undo-eligible swipe event for a session.
2. Add service-level `undoLastSwipe(sessionId)` that opens one DB transaction.
3. Inside transaction:
   - Resolve latest event.
   - Reverse dependent score updates (if currently materialized).
   - Remove or mark event undone.
   - Persist any session/deck metadata required for state restoration.
4. Return structured result: `{ undone: boolean, entityId?: string, action?: SwipeAction }`.
5. Update deck state to bring back the undone entity and refresh undo button state.
6. Add logging hooks for operation outcome (`success`, `no-op`, `conflict`).

## Implementation checklist
- [ ] Add deterministic `getLatestUndoableEvent(sessionId)` query.
- [ ] Implement `undoLastSwipe(sessionId)` in service layer with transaction boundary.
- [ ] Reverse any already-applied scoring/materialized deltas for the undone event.
- [ ] Delete or mark undone event according to chosen consistency model.
- [ ] Restore candidate/deck state for the undone entity.
- [ ] Disable undo when no eligible event exists.
- [ ] Protect against rapid repeat undo taps (idempotency/locking).
- [ ] Add unit/integration tests for success, no-event, and repeated-undo paths.

## Deliverables
- Production-ready single-level undo feature wired through deck UI and persistence services.
- Deterministic latest-event resolution contract documented in code/comments.
- Automated tests proving rollback integrity across data and UI state boundaries.

## Acceptance criteria
- Undo affects **only** the latest eligible swipe in the active session.
- After undo, persistence state matches pre-swipe state for that event (including dependent score tables if applicable).
- Undone card is restored in deck flow in the intended position.
- Undo is disabled (or returns explicit no-op) when no event is eligible.
- Repeated taps on undo do not corrupt data or roll back multiple events unexpectedly.

## Definition of done evidence
- Show before/after DB state snapshot for one swipe followed by undo.
- Show test proof for:
  - latest-event selection determinism,
  - transactional rollback correctness,
  - repeated-undo safety,
  - UI/deck restoration behavior.
- Show that all deck action paths (gesture/button) interact with the same undo-aware state pipeline.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- undo`
- `npm test -- swipe`

## Notes for next iteration
Iteration 11 (incremental taste score updates) should treat undo as a first-class reversal path. Keep delta computation code centralized so forward-apply and reverse-apply always use the same formula constants.
