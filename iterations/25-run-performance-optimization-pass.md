# Iteration 25: Run performance optimization pass

## Objective
Execute a **measurement-first performance optimization pass** focused on swipe responsiveness and interaction smoothness.

The coding agent should improve performance without breaking ranking correctness or introducing state consistency bugs.

Primary goals:
- keep swipe interactions feeling instant
- reduce expensive work on the critical input/render path
- improve list/deck rendering efficiency
- preserve deterministic behavior from earlier iterations

## Why this matters
Even strong recommendation logic fails if interaction latency is noticeable.

For swipe-heavy apps, small delays in event handling, state writes, re-renders, image decoding, and selector churn stack quickly into perceived jank. This iteration ensures the app remains smooth as data volume and feature complexity increase.

## Scope

### In scope
- Measure current performance baseline (before changes) with repeatable scenarios.
- Preload upcoming cards/assets (target depth: 5–10, configurable).
- Remove/block less work from immediate swipe handler path.
- Optimize ranking/profile-triggered updates so UI thread remains responsive.
- Profile selector/query/state derivation hotspots and reduce unnecessary recomputation.
- Reduce avoidable re-renders in deck/card components.
- Re-measure after changes and document deltas.

### Out of scope
- Unmeasured micro-optimizations.
- Large architecture rewrites (unless clearly necessary and justified by profiling evidence).
- Feature changes unrelated to responsiveness.

---

## Repository context for the coding agent
Before implementation, review:
- `CLAUDE.md` for intended UX responsiveness expectations and system behavior.
- Iteration `08` (deck card UI), `09` (swipe persistence), `10` (undo), `12` (candidate selection), `14` (exploration), `15` (repetition guardrails), `17`/`19` (profile visualizations), and `24` (test safeguards).
- Existing state/query/data-access layers where expensive selectors or recomputation may occur.

Use the test safety net from Iteration 24 to ensure perf optimizations do not regress ranking/profile correctness.

---

## Implementation checklist (detailed)

### 1) Establish baseline measurements first
- [ ] Define 2–3 representative performance scenarios (e.g., cold-start deck session, warm user with heavy history, fast swipe burst).
- [ ] Capture baseline metrics before changing code:
  - input delay / handler time
  - frame timing (dropped frames / long frames)
  - React render count + commit durations
  - selector/derivation cost (if instrumented)
- [ ] Store baseline notes in repo (short markdown/log format) so changes are auditable.

### 2) Add/validate next-card preloading strategy
- [ ] Implement a bounded prefetch queue for next cards (configurable depth, default 5–10).
- [ ] Ensure preloading does not block current frame work.
- [ ] Prevent duplicate prefetching and wasted work when deck order changes.
- [ ] Add cancellation/invalidations for stale preloads.

### 3) Shorten critical swipe interaction path
- [ ] Keep swipe event handling minimal and deterministic.
- [ ] Perform immediate state update needed for UI continuity first.
- [ ] Defer non-critical work (analytics, heavy ranking recompute, extended profile updates) to post-interaction scheduling.
- [ ] Confirm undo semantics remain correct after deferrals.

### 4) Reduce unnecessary renders and recalculation
- [ ] Profile deck/card component render frequency.
- [ ] Apply memoization only where profiler confirms benefit.
- [ ] Stabilize callback/object identities that trigger avoidable child renders.
- [ ] Audit selector dependencies and avoid broad invalidation fan-out.
- [ ] Introduce derived-data caching where hot paths justify it.

### 5) Optimize data access/query hot paths
- [ ] Verify indexes and query shape for frequent candidate/profile lookups.
- [ ] Avoid repeated expensive transforms during a single interaction.
- [ ] Batch/coalesce writes where safe to reduce update churn.
- [ ] Keep local-first guarantees and deterministic ordering intact.

### 6) Guard correctness while optimizing
- [ ] Re-run ranking/profile/snapshot tests from Iteration 24.
- [ ] Add targeted perf-smoke assertions if test infra supports timing thresholds or render-count checks.
- [ ] Validate no behavior regressions in exploration/repetition guardrails.

### 7) Re-measure and document outcomes
- [ ] Repeat baseline scenarios after optimization.
- [ ] Record before/after values and notable trade-offs.
- [ ] Capture remaining bottlenecks for Iteration 26 hardening.

---

## Suggested profiling workflow (example)

1. Baseline capture
   - Interaction trace while swiping 30–50 cards.
   - Log render counts for deck + top card components.
2. Optimize one hotspot at a time
   - e.g., selector memoization, prefetch scheduling, deferred heavy tasks.
3. Re-profile same scenario
   - confirm measurable improvement and no correctness regression.
4. Keep or revert change based on evidence.

Avoid bundling many optimizations at once without intermediate measurement checkpoints.

---

## Deliverables
1. Code updates improving swipe/deck responsiveness.
2. A short performance notes artifact (markdown) with:
   - scenarios tested
   - baseline vs post-change metrics
   - key optimizations applied
   - known residual bottlenecks
3. Any added instrumentation hooks or debug flags (documented and safe for non-production defaults).

---

## Acceptance criteria
1. Swipe interactions remain smooth under typical load and burst swiping.
2. No major UI-thread stalls attributable to ranking/profile updates on swipe.
3. Deck preloading is active, bounded, and does not introduce instability.
4. Optimization changes are supported by before/after measurements.
5. Existing ranking/profile correctness tests continue to pass.

---

## Validation commands
- `npm test -- performance-smoke`
- `npm test -- ranking`
- `npm test -- snapshot`
- `npm run typecheck`
- `npm run lint`

If command filters differ in this repo, use equivalent targeted commands.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: app still feels janky but CPU looks low
- Inspect main-thread blocking from synchronous JS bursts.
- Check image decode/layout/paint costs in performance timeline.
- Verify deferred tasks are not scheduled too aggressively right after swipe.

### Problem: memoization added but performance worsened
- Remove broad memoization that increases comparison overhead.
- Focus on high-frequency components/selectors only.
- Confirm stable dependencies; unstable inputs nullify memo benefits.

### Problem: prefetch causes stale or duplicate cards
- Ensure queue keys use stable card identifiers.
- Invalidate queue on deck reorder/filter changes.
- Add guardrails against enqueuing already-consumed candidates.

### Problem: optimization changed ranking behavior unexpectedly
- Re-run Iteration 24 tests and compare fixture outputs.
- Check ordering tie-breakers remain deterministic.
- Ensure deferred recomputation does not apply stale state snapshots.

### Problem: difficult to measure improvement reliably
- Use identical scripted interaction flows for before/after captures.
- Repeat runs and compare median values, not single outliers.
- Separate dev-mode noise from production-like builds when possible.

---

## Curated resources for Claude Opus coding agent

Use this order: official docs/profilers → framework-specific perf guidance → practical examples → community debugging.

### Official documentation (highest priority)
1. React docs — performance and profiling
   - https://react.dev/reference/react/Profiler
   - https://react.dev/reference/react/memo
   - https://react.dev/reference/react/useMemo
   - https://react.dev/reference/react/useCallback
2. React Native performance overview (if app surface includes RN)
   - https://reactnative.dev/docs/performance
3. Chrome DevTools performance profiling
   - https://developer.chrome.com/docs/devtools/performance
4. Web.dev performance fundamentals
   - https://web.dev/performance/
5. MDN requestIdleCallback / scheduling references
   - https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
6. SQLite query planning/index usage
   - https://www.sqlite.org/queryplanner.html
   - https://www.sqlite.org/eqp.html

### Step-by-step guides / practical references
1. Addy Osmani — frontend performance patterns and diagnostics
   - https://addyosmani.com/blog/
2. Kent C. Dodds — fixing perf and re-render pitfalls in React apps
   - https://kentcdodds.com/blog
3. React docs: optimizing re-renders with memoization (official examples)
   - https://react.dev/learn
4. Web.dev rendering performance guide (jank reduction)
   - https://web.dev/rendering-performance/

### Books (high-value conceptual references)
1. *Web Performance in Action* (Jeremy L. Wagner)
2. *High Performance Browser Networking* (Ilya Grigorik)
3. *Designing Data-Intensive Applications* (Martin Kleppmann) — useful for throughput/latency trade-offs and consistency decisions

### YouTube references (quick refreshers)
1. Search: “React Profiler tutorial performance optimization”
   - https://www.youtube.com/results?search_query=react+profiler+tutorial+performance+optimization
2. Search: “Chrome DevTools performance panel deep dive”
   - https://www.youtube.com/results?search_query=chrome+devtools+performance+panel+deep+dive
3. Search: “React unnecessary re-renders how to debug”
   - https://www.youtube.com/results?search_query=react+unnecessary+re-renders+how+to+debug
4. Search: “SQLite query optimization explain query plan”
   - https://www.youtube.com/results?search_query=sqlite+query+optimization+explain+query+plan

### High-signal GitHub repositories (reference implementations)
1. React repository (Profiler usage patterns and ecosystem references)
   - https://github.com/facebook/react
2. TanStack Query (excellent cache/query performance patterns)
   - https://github.com/TanStack/query
3. Shopify FlashList (virtualized list performance ideas, especially mobile)
   - https://github.com/Shopify/flash-list
4. Recoil/Redux Toolkit examples for derived state optimization patterns
   - https://github.com/reduxjs/redux-toolkit
5. SQLite source/docs mirror for planner behavior references
   - https://github.com/sqlite/sqlite

### Community troubleshooting resources
1. Stack Overflow — React performance
   - https://stackoverflow.com/questions/tagged/reactjs
2. Stack Overflow — React Native performance
   - https://stackoverflow.com/questions/tagged/react-native
3. Stack Overflow — SQLite performance/indexing
   - https://stackoverflow.com/questions/tagged/sqlite
4. Reactiflux Discord (community debugging)
   - https://www.reactiflux.com/
5. Reddit discussions for practical perf war stories
   - https://www.reddit.com/r/reactjs/
   - https://www.reddit.com/r/reactnative/

---

## Notes for next iteration
Iteration 26 should convert this optimization pass into a release-readiness checklist: enforce profiling sanity checks, codify guardrails, and ensure no critical bottlenecks remain before production release.
