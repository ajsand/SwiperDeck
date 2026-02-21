# Iteration 26: Release hardening and readiness checklist

## Objective

Prepare the app for production release by hardening reliability, offline resilience, failure recovery, privacy disclosures, and release operations.

This iteration should convert a feature-complete build into an app-store-ready build with predictable behavior under real-world conditions.

## Why this matters

The biggest launch risks usually come from edge cases: startup failures, schema migration issues, offline states, corrupted local data, and weak recovery UX.

This pass ensures:

- users can recover from errors without app reinstall
- local-first behavior remains trustworthy without network
- release artifacts are reproducible and documented
- privacy and data-handling claims match actual behavior

## Scope

### In scope

- Add/validate global + screen-level error boundaries and fallback UX.
- Verify startup hardening (DB init, migration safety, corrupted-state handling).
- Validate offline-first behavior end-to-end for Deck/Profile/Library/Settings.
- Add empty states/loading skeletons/retry actions for critical surfaces.
- Verify analytics/logging/crash visibility approach for release builds.
- Produce a release readiness checklist with explicit sign-off gates.

### Out of scope

- New ranking/product features.
- Non-essential UI redesign.
- Backend/platform expansion beyond launch-critical needs.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                          | Model      | Rationale                                    |
| ----------------------------------------------------------------- | ---------- | -------------------------------------------- |
| Own the release readiness checklist and risk assessment           | **Claude** | Product thinking and quality gate definition |
| Produce Task Brief for hardening fixes                            | **Claude** | Decomposition of hardening work items        |
| Implement error boundaries, startup hardening, offline checks     | **Codex**  | Core implementation of reliability features  |
| Add empty/loading/error state completeness                        | **Codex**  | UI state implementation                      |
| Navigation edge-case audit (tab state, deep links, modal dismiss) | **Gemini** | Spatial reasoning for navigation reliability |
| Final verification pass using Iteration 24-25 test suites         | **Codex**  | Regression and correctness testing           |

### Notes

- **All three models** contribute to this iteration:
  - Claude owns the checklist and risk log.
  - Codex implements the hardening fixes.
  - Gemini audits navigation edge cases.

---

## Repository context for the coding agent

Before implementation, review:

- `CLAUDE.md` sections on Product Principles, local-first guarantees, and app-store readiness.
- Iterations `03`, `04`, `06`, `09`, `10`, `18`, `21`, `23`, `24`, `25` for DB lifecycle, swipe persistence, settings/data controls, snapshot background jobs, test safeguards, and perf constraints.
- Existing app shell/routes under `app/` and reusable primitives under `components/`.

Preserve deterministic ranking/profile behavior while hardening runtime safety.

---

## Implementation checklist (detailed)

### 1) Global runtime safety and boundary coverage

- [ ] Add top-level React error boundary wrapping app navigation tree.
- [ ] Add screen-level boundaries for Deck/Profile/Library/Settings so failures are isolated.
- [ ] Provide user-safe fallback states with:
  - concise error explanation
  - retry action
  - navigation escape route
  - optional diagnostics token/log reference
- [ ] Ensure boundary fallback does not break tab navigation state.

### 2) Startup and storage hardening

- [ ] Validate DB bootstrap and migration path on:
  - fresh install
  - upgrade with existing data
  - partially-applied migration simulation
- [ ] Add defensive handling for malformed/corrupted local records.
- [ ] Confirm startup fails gracefully (no white screen / infinite spinner).
- [ ] Add startup recovery guidance in-app where feasible (retry/reset path).

### 3) Offline-first and degraded-mode validation

- [ ] Verify core flows operate offline after initial catalog load:
  - swiping and persistence
  - profile rendering from local snapshots
  - library/history browsing
  - settings data export/delete controls
- [ ] Confirm optional cloud summary toggle degrades gracefully when offline.
- [ ] Ensure network failures show non-blocking UI messaging (no hard crash).

### 4) Empty/loading/error state completeness

- [ ] Audit all key screens for explicit states:
  - initial loading
  - empty data
  - recoverable error
  - retry success path
- [ ] Ensure accessibility labels/text exist for fallback actions.
- [ ] Remove ambiguous placeholders that hide error cause.

### 5) Data safety, privacy, and compliance alignment

- [ ] Validate export/delete flows reflect actual stored data.
- [ ] Confirm privacy text in app/settings matches implementation behavior.
- [ ] Verify no unexpected sensitive payloads in logs or analytics.
- [ ] Add release notes section documenting local-first + optional cloud behavior.

### 6) Release checklist artifact and operational readiness

- [ ] Create/expand a release checklist markdown file with sign-off owners/fields for:
  - functional smoke checks
  - migration checks
  - offline checks
  - privacy checks
  - performance sanity checks
  - crash/monitoring verification
- [ ] Include rollback + hotfix criteria (what blocks release vs post-launch follow-up).
- [ ] Record known risks and mitigations with severity tags.

### 7) Final verification pass

- [ ] Execute smoke flow across Deck/Profile/Library/Settings with realistic local data.
- [ ] Run deterministic correctness test suite from Iteration 24.
- [ ] Run performance sanity checks from Iteration 25 to ensure no regression from hardening.
- [ ] Confirm release checklist has complete sign-offs.

---

## Suggested release readiness checklist structure (example)

```text
release/
  release-readiness-checklist.md
  known-risks.md
  rollback-plan.md
```

`release-readiness-checklist.md` sections:

1. Build & environment metadata (commit SHA, build number, date)
2. Functional smoke matrix (core flows)
3. Data lifecycle checks (init, migrate, export, delete)
4. Offline/degraded-mode checks
5. Error-boundary and recovery checks
6. Privacy/compliance checks
7. Performance sanity checks
8. Go/No-Go sign-off

---

## Deliverables

1. Hardened runtime behavior with robust boundaries and recoverable fallbacks.
2. Completed release readiness checklist artifact(s).
3. Documented known risks + mitigation/rollback criteria.
4. Any targeted hardening tests added for startup/offline/error handling paths.

---

## Acceptance criteria

1. No broken core flow (Deck/Profile/Library/Settings) in smoke run.
2. Offline mode supports swipe persistence and profile/library viewing after initial catalog load.
3. Error states are recoverable with clear user actions (retry/navigate/reset as applicable).
4. Startup/migration failures fail gracefully and are diagnosable.
5. Release checklist is complete with explicit Go/No-Go criteria and risk log.

---

## Validation commands

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run test -- --runInBand` (if deterministic diagnostics are needed)

Use equivalent workspace-specific commands if scripts differ.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: app shows blank screen on startup

- Inspect app root layout and startup async sequence ordering.
- Ensure DB init/migrations resolve or surface an explicit error state.
- Add timeout + fallback UI path so startup cannot hang silently.

### Problem: error boundary catches too much and traps user

- Scope boundaries to route/screen segments.
- Ensure fallback offers safe navigation to unaffected tabs.
- Avoid throwing from fallback render path itself.

### Problem: offline mode breaks profile or library

- Confirm selectors read from local persisted sources, not network-dependent shape.
- Verify snapshot refresh jobs degrade to local-only behavior.
- Gate cloud-only features with clear offline messaging.

### Problem: delete/export behavior inconsistent

- Centralize data lifecycle operations in one service module.
- Add integration tests for export payload and post-delete empty-state behavior.
- Ensure UI reflects completion and handles cancellation/retry safely.

### Problem: release gate uncertainty (go/no-go unclear)

- Define blocking severity rubric (P0/P1 block, P2/P3 defer with notes).
- Require explicit owner sign-off and timestamps for each checklist category.
- Maintain a rollback trigger list and communication plan.

---

## Curated resources for Claude Opus coding agent

Use this order: official docs/specs → platform release docs → reliability patterns → community troubleshooting.

### Official documentation (highest priority)

1. Expo docs (builds, runtime, updates, app config):
   - https://docs.expo.dev/
   - https://docs.expo.dev/build/introduction/
   - https://docs.expo.dev/eas-update/introduction/
2. Expo Router docs (navigation structure and error handling context):
   - https://docs.expo.dev/router/introduction/
3. React docs (Error Boundaries):
   - https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
4. React Native docs (AppState, network, production guidance):
   - https://reactnative.dev/docs/getting-started
5. SQLite docs (transactions, integrity concepts):
   - https://www.sqlite.org/docs.html
6. TypeScript handbook (strict types for error/result modeling):
   - https://www.typescriptlang.org/docs/

### Step-by-step guides / practical references

1. Expo production checklist guidance:
   - https://docs.expo.dev/distribution/introduction/
2. Sentry for React Native + Expo setup (if monitoring is used):
   - https://docs.sentry.io/platforms/react-native/
3. Web.dev resilience concepts (offline/error UX patterns transferable to RN):
   - https://web.dev/learn/pwa/resilience
4. Microsoft release checklist philosophy (quality gates):
   - https://learn.microsoft.com/devops/operate/continuous-delivery

### Books (high-value conceptual references)

1. _Release It!_ (Michael T. Nygard)
2. _Site Reliability Engineering_ (Beyer, Jones, Petoff, Murphy)
3. _Designing Data-Intensive Applications_ (Martin Kleppmann) — reliability/data consistency chapters
4. _The Pragmatic Programmer_ (Hunt & Thomas) — defensive coding and operational readiness

### YouTube references (quick refreshers)

1. Search: “Expo EAS build release workflow tutorial”
   - https://www.youtube.com/results?search_query=expo+eas+build+release+workflow+tutorial
2. Search: “React Error Boundaries explained”
   - https://www.youtube.com/results?search_query=react+error+boundaries+explained
3. Search: “React Native offline first architecture”
   - https://www.youtube.com/results?search_query=react+native+offline+first+architecture
4. Search: “Mobile app release checklist QA”
   - https://www.youtube.com/results?search_query=mobile+app+release+checklist+qa

### High-signal GitHub repositories (reference implementations)

1. Expo examples:
   - https://github.com/expo/examples
2. React Native template/reference app patterns:
   - https://github.com/react-native-community/react-native-template-typescript
3. Sentry React Native SDK:
   - https://github.com/getsentry/sentry-react-native
4. TanStack Query (offline/retry/cache reliability patterns):
   - https://github.com/TanStack/query

### Community troubleshooting resources

1. Stack Overflow (Expo):
   - https://stackoverflow.com/questions/tagged/expo
2. Stack Overflow (React Native):
   - https://stackoverflow.com/questions/tagged/react-native
3. Stack Overflow (SQLite):
   - https://stackoverflow.com/questions/tagged/sqlite
4. Expo forums/discussions:
   - https://forums.expo.dev/
5. Reactiflux Discord (React/React Native help channels):
   - https://www.reactiflux.com/
6. Reddit (React Native, use cautiously and verify advice):
   - https://www.reddit.com/r/reactnative/

---

## Notes for next iteration

After release hardening is complete, open a post-launch stabilization backlog with:

- top observed crash/error categories
- startup/offline friction metrics
- first-wave quality-of-life fixes to prioritize in patch release `v1.0.1`
