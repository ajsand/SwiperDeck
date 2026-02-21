# Iteration 17: Build profile visualizations v1

## Objective
Design and implement a production-ready **Profile v1** experience that turns model state into clear, trustworthy visuals. The screen should communicate:
- top themes/tags,
- content-type affinity,
- strongest likes,
- strongest dislikes,
using local data only and deterministic computations.

## Why this matters
The recommendation engine is only useful if users can understand what the app has learned. Profile v1 is the first transparency layer: it should answer “what does the system think I like?” without overwhelming the user.

## Scope
### In scope
- Build a Profile screen (or section) that reads from local score/aggregate tables.
- Render:
  - Top themes/tags (ranked list or compact bar chart).
  - Type affinity bars (e.g., anime/manga/manhwa or app-defined media types).
  - Strong likes list (highest positive entities).
  - Strong dislikes list (lowest/negative entities).
- Add robust empty/low-data states.
- Use deterministic ordering/tie-break rules so repeated renders are stable.
- Keep computation lightweight by relying on pre-aggregated score tables/selectors.
- Add tests for selector logic and presentation-state behavior.

### Out of scope
- Time-series evolution charts (planned in later iterations).
- Cross-device profile sync or server-side profile APIs.
- Advanced explainability features (e.g., per-swipe causal trace).

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Chart type selection and layout specifications | **Gemini** | Visual/spatial reasoning for data visualization |
| Component hierarchy for profile sections | **Gemini** | Layout composition and accessibility |
| Produce Codex-ready implementation brief | **Gemini** | Structured handoff for implementation |
| Implement selectors, chart/list components, empty states | **Codex** | Primary UI + data implementation |
| Add tests for selector correctness and rendering states | **Codex** | Test authoring |
| Review profile sections against CLAUDE.md Section 9 | **Claude** | Spec enforcement for required outputs |

### Parallel run opportunity
- Run **Gemini** (chart layout brief) and **Codex** (selector/query layer) in parallel. Merge before building the visual components.

## Product/UX requirements
- Profile sections should be readable on small screens and not require perfect data density.
- Every visual should have clear labels (no ambiguous scores).
- If data is insufficient, show constructive guidance (e.g., “Swipe more cards to build your profile”).
- Ordering should remain stable between renders for same underlying data.
- Accessibility basics:
  - text contrast,
  - semantic labels for chart/list items,
  - no color-only signaling for positive/negative meaning.

## Data/contracts and integration points
### Suggested view models
Use typed, UI-oriented models to decouple rendering from raw DB rows:
- `TopThemeView`
  - `tagId: string`
  - `label: string`
  - `score: number`
  - `rank: number`
- `TypeAffinityView`
  - `mediaType: MediaType`
  - `affinityScore: number`
  - `normalized: number` (0..1 for bar width)
- `EntityPreferenceView`
  - `entityId: string`
  - `title: string`
  - `score: number`
  - `confidence?: number`

### Selector contracts
Add/extend deterministic selectors:
- `selectTopThemes(limit: number): TopThemeView[]`
- `selectTypeAffinity(): TypeAffinityView[]`
- `selectStrongLikes(limit: number): EntityPreferenceView[]`
- `selectStrongDislikes(limit: number): EntityPreferenceView[]`

Expected behavior:
- deterministic sorting (score desc/asc + stable tie-break key),
- bounded list sizes,
- graceful behavior when rows are missing/partial.

## Recommended implementation approach
1. **Define ranking + tie-break rules**
   - Document sort direction and fallback key for each section.
2. **Create typed selector layer**
   - Keep transformation logic centralized and unit-tested.
3. **Build reusable visualization primitives**
   - `SectionCard`, `HorizontalBar`, `RankedList` (or equivalent).
4. **Implement Profile screen composition**
   - Render sections in priority order with concise copy.
5. **Add empty/low-data states**
   - Threshold-based messaging and skeleton/loading states if needed.
6. **Add deterministic tests**
   - Snapshot/logic tests for fixed fixtures.
7. **Polish accessibility + responsiveness**
   - Ensure labels, spacing, and truncation work on narrow devices.

## Implementation checklist
- [ ] Define/extend typed view models for profile sections.
- [ ] Implement selector queries for top themes, type affinity, likes, dislikes.
- [ ] Add deterministic sorting/tie-break utility helpers.
- [ ] Build reusable chart/list UI components.
- [ ] Compose Profile v1 screen sections with clear headings/descriptions.
- [ ] Implement no-data and low-data fallback copy.
- [ ] Ensure positive/negative semantics are visible without relying only on color.
- [ ] Add unit tests for selectors using fixed fixtures.
- [ ] Add UI tests for empty/populated states.
- [ ] Validate layout/readability on small screen dimensions.

## Deliverables
- Profile v1 screen with top themes, type affinity, likes, and dislikes.
- Deterministic selector layer powering all visual sections.
- Test coverage for selector correctness and state-based rendering.

## Acceptance criteria
- Recent swipes lead to visible profile updates in expected sections.
- For identical DB snapshot input, rendered ordering is stable across app launches.
- Empty-state UX is clear and actionable when user history is minimal.
- Visual sections remain readable and accessible on small devices.
- Screen-level errors from missing optional data are handled gracefully.

## Definition-of-done evidence
Include in PR notes or artifacts:
- Screenshot(s)/recording of Profile v1 with populated state.
- Screenshot of no-data/low-data state.
- Example fixture + expected ordered output for at least one selector.
- Test output for profile selector/presentation suite.

## Concrete testing requirements
- **Selector tests**
  - Correct top-N slicing.
  - Deterministic tie-break behavior.
  - Proper handling of null/undefined labels/scores.
- **UI state tests**
  - Empty state shown when all selector arrays are empty.
  - Populated state renders all required sections.
  - Long labels truncate/wrap without layout breakage.
- **Determinism tests**
  - Fixed fixture input yields identical ordered output each run.
- **Performance sanity checks**
  - Selector computation remains lightweight for expected local dataset sizes.

## File-location hints (repo navigation)
Likely implementation points:
- Profile screen route/component in app navigation,
- selector/query module(s) for local score tables,
- shared UI primitives for cards/lists/bars,
- recommendation/profile scoring model types,
- test directories for selectors and screen rendering.

Useful search strings:
- `ProfileScreen`
- `type affinity`
- `top tags`
- `likes`
- `dislikes`
- `selector`
- `score table`
- `empty state`

## Resources when stuck

### YouTube tutorials
- React Native charts overview (multiple libs): https://www.youtube.com/results?search_query=react+native+charts+tutorial
- Building dashboard-style UI in React Native: https://www.youtube.com/results?search_query=react+native+dashboard+ui+tutorial
- Data visualization design basics: https://www.youtube.com/results?search_query=data+visualization+best+practices+tutorial
- Recharts quick start (if web-based components apply anywhere): https://www.youtube.com/results?search_query=recharts+tutorial

### Official documentation
- React Native fundamentals (layout, lists, accessibility): https://reactnative.dev/docs/getting-started
- React Native FlatList: https://reactnative.dev/docs/flatlist
- React Native Accessibility: https://reactnative.dev/docs/accessibility
- Expo docs: https://docs.expo.dev/
- TypeScript handbook: https://www.typescriptlang.org/docs/
- Jest docs: https://jestjs.io/docs/getting-started
- React Native Testing Library docs: https://callstack.github.io/react-native-testing-library/
- SQLite docs (query/perf fundamentals): https://www.sqlite.org/docs.html

### Step-by-step guides / blogs
- Material Design data visualization guidance: https://m3.material.io/styles/data-visualization/overview
- Nielsen Norman Group on dashboard/report usability: https://www.nngroup.com/articles/dashboard-design/
- React docs on deriving UI from data/state: https://react.dev/learn/thinking-in-react
- Datawrapper Academy (practical chart literacy): https://academy.datawrapper.de/

### Books
- *Storytelling with Data* (clear chart communication): https://www.storytellingwithdata.com/books
- *Information Dashboard Design* by Stephen Few: https://www.oreilly.com/library/view/information-dashboard-design/9780596800161/
- *Designing Data-Intensive Applications* (reliability/aggregation thinking): https://dataintensive.net/

### GitHub repositories
- React Native SVG charts: https://github.com/JesperLekland/react-native-svg-charts
- Victory Native XL: https://github.com/FormidableLabs/victory-native-xl
- Gifted Charts (React Native): https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts
- Expo examples: https://github.com/expo/examples
- React Native Paper (UI components): https://github.com/callstack/react-native-paper

### Stack Overflow tags
- `react-native`: https://stackoverflow.com/questions/tagged/react-native
- `expo`: https://stackoverflow.com/questions/tagged/expo
- `charts`: https://stackoverflow.com/questions/tagged/charts
- `data-visualization`: https://stackoverflow.com/questions/tagged/data-visualization
- `typescript`: https://stackoverflow.com/questions/tagged/typescript
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs

### Discussion boards / communities
- Reactiflux Discord: https://www.reactiflux.com/
- Expo forums: https://forums.expo.dev/
- React Native community discussions: https://github.com/react-native-community/discussions-and-proposals
- Reddit r/reactnative: https://www.reddit.com/r/reactnative/
- Dev.to React Native tag: https://dev.to/t/reactnative

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- profile-v1`
- `npm test -- selectors`

## Notes for next iteration
Iteration 18 (periodic profile snapshot job) should reuse these selector/view-model contracts so historical snapshots remain consistent with the Profile v1 UI definitions.
