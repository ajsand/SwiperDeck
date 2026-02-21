# Iteration 20: Build Library screen v1

## Objective

Implement a production-ready **Library v1** that lets users review and audit their swipe history via segmented buckets (`Liked`, `Disliked`, `Skipped`) with deterministic filtering and smooth list performance.

## Why this matters

Library is the user’s source of truth for “what the app thinks I told it.” A clear history view improves trust, helps users spot mistakes, and sets up future correction workflows (reclassify/remove/undo).

## Scope

### In scope

- Build segmented control UI with three deterministic buckets:
  - `Liked` (e.g., yes/love)
  - `Disliked` (e.g., no/hard_no)
  - `Skipped` (skip/don’t know)
- Query swipe history by action group with stable ordering.
- Add filter controls for:
  - entity type,
  - date range (or date presets),
  - optional tag/theme if already available in local model.
- Render swipe-event-backed list rows with entity metadata + event timestamp.
- Provide empty/loading/error states.
- Add basic pagination/virtualization for mobile performance.

### Out of scope

- Full-text search.
- Semantic/vector search.
- Reclassify/delete actions (prepare row API for these in future iterations).
- Cloud sync history merge.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                   | Model      | Rationale                              |
| ---------------------------------------------------------- | ---------- | -------------------------------------- |
| List layout and segmented control UX design                | **Gemini** | Spatial reasoning for list + filter UI |
| Produce Codex-ready brief for Library screen structure     | **Gemini** | Layout specification                   |
| Implement query layer with bucket/filter/pagination        | **Codex**  | Data access implementation             |
| Build segmented control, filter UI, virtualized list       | **Codex**  | Primary UI implementation              |
| Add tests for mapping, query filters, UI state transitions | **Codex**  | Test authoring                         |
| Review bucket-to-action mapping for spec alignment         | **Claude** | Verify against CLAUDE.md Section 3     |

### Notes

- Gemini advises on list layout and segmented control UX; Codex implements.
- Claude reviews the action-to-bucket mapping to ensure it aligns with the 5-state swipe action model.

## Product/engineering requirements

- **Deterministic grouping:** same DB state must yield same bucket counts/items.
- **Stable sort:** default sort should be explicit (typically newest first by `created_at`, then deterministic tie-break).
- **Filter correctness:** combining bucket + type + date must return exact intersection.
- **Performance:** list should remain smooth under large local histories.
- **Resilience:** malformed/missing optional metadata must not crash rendering.
- **Accessibility:** segmented and filter controls should be keyboard/screen-reader friendly where supported.

## Data/contracts and integration points

### Suggested query contract

Create a repository/DAO method such as:

- `getLibraryEvents(params: LibraryQueryParams): Promise<LibraryPage>`

Where `LibraryQueryParams` can include:

- `bucket: 'LIKED' | 'DISLIKED' | 'SKIPPED'`
- `types?: EntityType[]`
- `dateFrom?: number | string`
- `dateTo?: number | string`
- `limit: number`
- `cursor?: string | number`

And `LibraryPage` returns:

- `items: LibraryRow[]`
- `nextCursor?: string | number`
- `totalCount?` (optional if cheap enough)

### Action-to-bucket mapping contract

Centralize mapping in one utility (avoid duplicated logic across UI/query layers), e.g.:

- `mapActionToBucket(action)`
- `bucketToActions(bucket)`

Document expected mapping:

- `LIKED` → `yes`, `love` (and maybe `curious` later if product decides)
- `DISLIKED` → `no`, `hard_no`
- `SKIPPED` → `skip`

### List item contract

Define a UI-safe row type:

- `eventId`
- `entityId`
- `title`
- `subtitle`
- `entityType`
- `tags?`
- `action`
- `bucket`
- `swipedAt`
- `tileKey/imageUrl?`

Keep this shape stable so later iterations can add row actions without refactoring all consumers.

## Recommended implementation approach

1. **Define bucket/filter types and mapping first**
   - lock in deterministic semantics for bucket membership.
2. **Implement repository query with joins/index-aware predicates**
   - query `swipe_events` + `catalog_entities` with explicit sort and pagination.
3. **Build pure filter-state model in UI layer**
   - avoid embedding query logic directly in components.
4. **Render segmented header + filter controls**
   - changing controls should trigger predictable query refresh.
5. **Implement virtualized list rows**
   - include timestamp formatting and metadata fallbacks.
6. **Add empty/loading/error states**
   - per bucket/filter combination.
7. **Add deterministic tests**
   - mapping, query filter intersections, sort stability, pagination boundaries.

## Implementation checklist

- [ ] Add/confirm `LibraryBucket` and filter DTO types.
- [ ] Add central action↔bucket mapping utility with tests.
- [ ] Implement/extend repository query for bucket + type + date filters.
- [ ] Ensure stable ordering (`created_at DESC`, then deterministic tie-break).
- [ ] Add pagination/cursor support (or safe offset strategy if already standardized).
- [ ] Build segmented control for `Liked/Disliked/Skipped`.
- [ ] Add filter UI for type/date and wire to query state.
- [ ] Implement `LibraryRow` component with robust metadata fallbacks.
- [ ] Add empty/loading/error UI blocks.
- [ ] Add tests for mapping, repository filtering, and UI state transitions.

## Deliverables

- Functional Library v1 screen accessible via tab navigation.
- Deterministic data query + mapping utilities.
- Stable list rendering with filter controls and fallback states.
- Test coverage for core bucket/filter behavior.

## Acceptance criteria

- User can switch between `Liked`, `Disliked`, and `Skipped` buckets and see corresponding events.
- Type/date filters correctly narrow results for each bucket.
- Empty states display meaningful copy when no results match.
- Library remains responsive with larger datasets (no obvious jank in normal usage).
- No crashes when optional entity metadata is missing.

## Definition-of-done evidence

Include in PR notes/artifacts:

- Screen capture or screenshots for each bucket.
- One example query/filter combination and resulting item count.
- Test output for mapping + repository query tests.
- Brief note on virtualization/pagination strategy used.

## Concrete testing requirements

- **Mapping tests**
  - each action maps to expected bucket.
  - unsupported/unknown actions handled safely.
- **Repository/query tests**
  - bucket-only query correctness.
  - bucket + type + date intersection correctness.
  - deterministic ordering under timestamp ties.
  - pagination cursor/offset boundary behavior.
- **UI/component tests**
  - segmented switch updates list source correctly.
  - filter changes refresh displayed rows.
  - empty/loading/error states render correctly.

## File-location hints (repo navigation)

Likely implementation points:

- `app/(tabs)/library.tsx`
- database query/repository modules for `swipe_events` and `catalog_entities`
- shared types/contracts for swipe actions and entity metadata
- reusable filter controls and row components
- tests for selectors/repositories/components

Useful search strings:

- `library`
- `swipe_events`
- `catalog_entities`
- `action`
- `created_at`
- `segmented`
- `FlatList`
- `FlashList`

## Resources when stuck

### YouTube tutorials

- React Native FlatList performance tips: https://www.youtube.com/results?search_query=react+native+flatlist+performance+tutorial
- FlashList usage/performance walkthrough: https://www.youtube.com/results?search_query=shopify+flashlist+react+native+tutorial
- Expo Router tabs + screen architecture: https://www.youtube.com/results?search_query=expo+router+tabs+tutorial
- SQLite querying in React Native/Expo: https://www.youtube.com/results?search_query=expo+sqlite+react+native+tutorial

### Official documentation

- Expo Router: https://docs.expo.dev/router/introduction/
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/
- React Native FlatList: https://reactnative.dev/docs/flatlist
- React Native VirtualizedList: https://reactnative.dev/docs/virtualizedlist
- Shopify FlashList docs: https://shopify.github.io/flash-list/
- SQLite query planner overview: https://www.sqlite.org/queryplanner.html
- SQLite indexes guide: https://www.sqlite.org/optoverview.html
- date-fns docs (if used): https://date-fns.org/docs/Getting-Started
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### Step-by-step guides / blogs

- React docs on list keys/state thinking (transferable concepts): https://react.dev/learn/rendering-lists
- Mobile list optimization checklist (RN community article): https://blog.logrocket.com/deep-dive-react-native-flatlist/
- Filtering large datasets patterns: https://www.freecodecamp.org/news/implement-search-and-filtering-using-javascript/
- Time/date pitfalls (important for date filters): https://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time

### Books

- _Designing Data-Intensive Applications_ (query/filter/index thinking): https://dataintensive.net/
- _Refactoring UI_ (clear, usable filter/segmented controls): https://www.refactoringui.com/
- _Refactoring_ (extracting pure query/mapping logic): https://martinfowler.com/books/refactoring.html

### GitHub repositories

- Expo examples (routing/UI/data patterns): https://github.com/expo/examples
- Expo Router repo/examples: https://github.com/expo/router
- Shopify FlashList examples: https://github.com/Shopify/flash-list
- React Native examples: https://github.com/facebook/react-native/tree/main/packages/rn-tester
- SQLite official mirror/docs: https://github.com/sqlite/sqlite

### Stack Overflow tags

- `react-native`: https://stackoverflow.com/questions/tagged/react-native
- `expo`: https://stackoverflow.com/questions/tagged/expo
- `expo-router`: https://stackoverflow.com/questions/tagged/expo-router
- `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- `flatlist`: https://stackoverflow.com/questions/tagged/react-native-flatlist
- `typescript`: https://stackoverflow.com/questions/tagged/typescript

### Discussion boards / communities

- Expo forums: https://forums.expo.dev/
- React Native community discussions: https://github.com/react-native-community/discussions-and-proposals
- Reactiflux Discord: https://www.reactiflux.com/
- Reddit r/reactnative: https://www.reddit.com/r/reactnative/
- DEV Community React Native tag: https://dev.to/t/reactnative

## Validation commands

- `npm run typecheck`
- `npm run lint`
- `npm test -- library-v1`
- `npm test -- library-filters`

## Notes for next iteration

Keep `LibraryRow` API extensible for future actions (reclassify/remove/undo) so iteration 21+ can add controls without rewriting query contracts.
