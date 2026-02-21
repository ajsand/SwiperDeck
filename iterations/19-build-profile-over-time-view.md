# Iteration 19: Build Profile over-time view

## Objective
Build a production-ready **Profile Over-Time** section that visualizes historical preference movement from `profile_snapshots` (created in Iteration 18), so users can quickly understand how their taste profile evolves.

## Why this matters
A single “current profile” score is useful but incomplete. Trend visuals make personalization transparent, increase trust, and provide product feedback loops (“my swipes changed the model in this direction”).

## Scope
### In scope
- Query and transform `profile_snapshots` into chart-ready time-series datasets.
- Render compact trend visuals (sparkline or minimal line chart) for top themes/categories.
- Provide deterministic time window controls: `7D`, `30D`, `ALL`.
- Handle sparse/irregular history gracefully (0, 1, or few snapshots).
- Surface empty/loading/error UI states without breaking Profile screen.
- Keep implementation lightweight for mobile performance.

### Out of scope
- Forecasting or predictive extrapolation.
- Advanced chart interactions (pinch zoom, tooltips for every point, annotations).
- Server sync/cross-device historical merge.

## Product/engineering requirements
- **Deterministic rendering:** same snapshot inputs must produce identical plotted series.
- **Stable ordering:** theme/category ordering must be deterministic (tie-break rules documented).
- **Resilient UX:** no crash or malformed chart for missing/null/partial payload fields.
- **Performance:** avoid expensive recomputation on every re-render; memoize selectors.
- **Accessibility:** trends should include readable labels and non-color-only cues where feasible.

## Data/contracts and integration points

### Expected snapshot input contract
Each `profile_snapshots` record should provide or derive:
- `createdAt` (ISO UTC)
- `snapshotDateLocal` (optional helper date)
- `profileVersion`
- `payloadJson` containing aggregate theme/category scores

### Suggested transformation contract
Implement a pure transformer, e.g.:
- `buildTrendSeries(snapshots, options): TrendSeriesResult`

Where `TrendSeriesResult` includes:
- `window: '7D' | '30D' | 'ALL'`
- `pointsByTheme: Record<ThemeKey, Array<{ t: string; value: number }>>`
- `xDomain`, `yDomain` (if needed by chart)
- `metadata` (snapshot count, sparse indicators)

### Selector/query boundaries
- Keep DB query logic in repository/DAO layer.
- Keep shape normalization + sorting in selector/utils layer.
- Keep rendering concerns in UI component layer.

## Recommended implementation approach
1. **Define UI/UX states first**
   - Empty state, minimal state (1 point), and normal trend state.
2. **Add snapshot query selector(s)**
   - Fetch only fields required for trend rendering.
3. **Build pure transform utilities**
   - Normalize payloads, sort by timestamp, clamp/filter by window.
4. **Implement chart component wrapper**
   - Encapsulate chart lib specifics behind a small component API.
5. **Add window switch control**
   - `7D`, `30D`, `ALL`; default should be explicit and test-backed.
6. **Optimize rendering**
   - Memoize computed series and avoid excessive state churn.
7. **Add deterministic tests**
   - Cover sparse data, ordering, window filtering, and fallback states.

## Implementation checklist
- [ ] Add/confirm typed DTO for reading `profile_snapshots` trend fields.
- [ ] Implement repository query: recent snapshots ordered by time.
- [ ] Add pure utility to parse/validate `payloadJson` into typed aggregates.
- [ ] Add window filter logic (`7D`, `30D`, `ALL`) with deterministic date boundaries.
- [ ] Implement stable ranking/select of visible top themes (with tie-break).
- [ ] Create reusable `ProfileTrendChart` (or equivalent) component.
- [ ] Add profile screen section with title, legend/labels, and window switcher.
- [ ] Add empty/sparse/error UI states.
- [ ] Add unit tests for transforms/selectors.
- [ ] Add UI/component tests for window switching and fallback rendering.

## Deliverables
- Profile screen includes an over-time trend section backed by snapshots.
- Deterministic selectors/utilities for building chart series.
- Test coverage for edge cases and regressions.

## Acceptance criteria
- Users can view trend direction over `7D`, `30D`, and `ALL` windows.
- Trend section renders correctly with 0, 1, 2, and many snapshots.
- No crashes from malformed or partially missing snapshot payload fields.
- Time-window switching updates chart deterministically and quickly.
- Lint/type checks and trend-related tests pass.

## Definition-of-done evidence
Include in PR artifacts/notes:
- Screenshot(s) or screen recording of trend section in at least two windows.
- Example transformed series JSON for one theme.
- Test output for trend selector + component tests.
- Brief note on performance guardrails used (memoization/selective re-rendering).

## Concrete testing requirements
- **Selector/transform tests**
  - Chronological sorting works with out-of-order snapshot rows.
  - Window filtering includes/excludes correct points at boundaries.
  - Tie-break ordering for equal scores is deterministic.
  - Malformed payload rows are skipped/handled safely.
- **UI tests**
  - Empty state shown when no snapshots exist.
  - Single-point dataset renders without chart crash.
  - Window switch updates visible series.
- **Integration tests (if available)**
  - Profile screen reads snapshot-backed trends from data layer.
  - Snapshot schema version mismatch is handled gracefully.

## File-location hints (repo navigation)
Likely implementation points:
- Profile screen/container module (existing profile UI)
- Snapshot repository/DAO (`profile_snapshots` query utilities)
- Selector/transform utility module for profile aggregates
- Shared date/time helpers for window calculations
- Chart component(s) under UI/components path
- Test files near selectors/components/profile screen

Useful search strings:
- `profile_snapshots`
- `Profile`
- `snapshotDateLocal`
- `payloadJson`
- `sparkline`
- `time window`
- `7D`
- `30D`

## Resources when stuck

### YouTube tutorials
- React Native charts overview (library comparisons): https://www.youtube.com/results?search_query=react+native+chart+library+comparison
- Building sparklines/line charts in React Native: https://www.youtube.com/results?search_query=react+native+sparkline+line+chart+tutorial
- Data visualization design basics (mobile): https://www.youtube.com/results?search_query=mobile+data+visualization+best+practices
- Memoization/performance in React: https://www.youtube.com/results?search_query=react+memo+usememo+performance+tutorial

### Official documentation
- React Native docs: https://reactnative.dev/docs/getting-started
- Expo docs: https://docs.expo.dev/
- React docs (state, rendering, memoization): https://react.dev/learn
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- SQLite date/time functions: https://www.sqlite.org/lang_datefunc.html
- SQLite JSON functions (if payload extraction happens in SQL): https://www.sqlite.org/json1.html
- Jest docs: https://jestjs.io/docs/getting-started
- React Native Testing Library: https://callstack.github.io/react-native-testing-library/

### Step-by-step guides / blogs
- Datawrapper Academy (chart type + readability guidance): https://academy.datawrapper.de/
- Observable Plot docs (clear encoding principles transferable to RN charts): https://observablehq.com/plot/
- React docs on choosing memoization points: https://react.dev/reference/react/useMemo
- A11y project (color/contrast principles for charts): https://www.a11yproject.com/

### Books
- *Storytelling with Data* (chart clarity and trend communication): https://www.storytellingwithdata.com/books
- *Designing Interfaces* (UI state handling patterns): https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/
- *Refactoring UI* (practical visual hierarchy/legibility): https://www.refactoringui.com/book
- *Designing Data-Intensive Applications* (data correctness mindset): https://dataintensive.net/

### GitHub repositories
- react-native-svg (foundation used by many chart libs): https://github.com/software-mansion/react-native-svg
- react-native-gifted-charts: https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts
- react-native-chart-kit: https://github.com/indiespirit/react-native-chart-kit
- victory-native-xl: https://github.com/FormidableLabs/victory-native-xl
- Expo examples: https://github.com/expo/examples

### Stack Overflow tags
- `react-native`: https://stackoverflow.com/questions/tagged/react-native
- `expo`: https://stackoverflow.com/questions/tagged/expo
- `data-visualization`: https://stackoverflow.com/questions/tagged/data-visualization
- `typescript`: https://stackoverflow.com/questions/tagged/typescript
- `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs

### Discussion boards / communities
- Expo forums: https://forums.expo.dev/
- React Native discussions/proposals: https://github.com/react-native-community/discussions-and-proposals
- Reactiflux Discord: https://www.reactiflux.com/
- Reddit r/reactnative: https://www.reddit.com/r/reactnative/
- DEV Community React Native tag: https://dev.to/t/reactnative

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- profile-trends`
- `npm test -- profile-selectors`

## Notes for next iteration
Iteration 20 (Library screen v1) can reuse trend selector patterns for stable sorting and lightweight, memoized list derivations.
