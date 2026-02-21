# Iteration 21: Build Settings data controls

## Objective
Build production-ready **Settings → Data Controls** flows for:
1. **Export local app data to JSON** (user-owned backup / portability).
2. **Clear all local data** with explicit destructive confirmation.
3. **Privacy + About** screens that clearly explain local-first behavior.

## Why this matters
This iteration closes critical app-store and user-trust requirements:
- Users must be able to access and export their own data.
- Users must be able to permanently delete local data.
- Users need plain-language disclosure about what is stored locally vs optionally sent to cloud features.

These requirements map directly to the original product principles in `CLAUDE.md` (local-first, bounded AI, app-store readiness).

## Scope

### In scope
- Implement Settings entry points for:
  - **Export Data (JSON)**
  - **Clear Local Data**
  - **Privacy**
  - **About**
- Exporter should include all core user-generated and profile-state tables.
- Clear-data flow should include:
  - danger-zone UI
  - typed or multi-step confirmation
  - DB wipe routine + post-reset UX
- Privacy/About screens should be static, versioned app content.

### Out of scope
- Cloud account deletion (no account system in local-first baseline).
- Remote backup restore flows.
- Legal-policy hosting backend.

---

## Repository context for the coding agent

Before implementing, review these areas to stay aligned with existing architecture:
- `CLAUDE.md` sections on Settings, data model, local-first constraints, and privacy expectations.
- Existing SQLite migrations, repositories/services, and utility patterns used in prior iterations.
- Existing navigation layout for the Settings tab and nested stack/screens.

If existing tables differ from planning docs, **export what actually exists in the live schema** and document the exact contract.

---

## Implementation checklist (detailed)

### 1) Export JSON flow
- [ ] Add `exportUserDataToJson()` service with explicit table allowlist.
- [ ] Include export metadata envelope:
  - `schemaVersion`
  - `exportedAt`
  - `appVersion`
  - optional `deviceTimezone`
- [ ] Serialize data with stable key order where practical.
- [ ] Save/share file using platform-safe path + share sheet/file API.
- [ ] Add Settings CTA + loading + success/failure toasts.
- [ ] Add tests for:
  - expected table presence
  - deterministic shape
  - empty DB behavior

### 2) Clear local data flow (destructive)
- [ ] Add **Danger Zone** section in Settings.
- [ ] Implement two-step confirmation UX (modal + final confirm action).
- [ ] Execute DB wipe in transaction:
  - either `DELETE FROM` all mutable tables in FK-safe order
  - or drop/recreate strategy consistent with migration framework
- [ ] Re-seed required baseline rows/config if app requires them.
- [ ] Recompute/reset in-memory stores and cached selectors after wipe.
- [ ] Navigate user to safe post-reset state (fresh deck/onboarding-ready).
- [ ] Add tests for:
  - all target tables emptied
  - app remains usable after reset
  - reset is not triggered accidentally

### 3) Privacy + About content screens
- [ ] Create static content screen(s) linked from Settings.
- [ ] Include explicit sections:
  - what data is stored locally
  - what export includes
  - what clear data deletes
  - optional cloud AI summary behavior (if enabled in later iteration)
- [ ] Include app version/build info in About.
- [ ] Ensure content is readable offline and accessible.

---

## Data contract guidance

### Suggested export payload shape
```json
{
  "meta": {
    "schemaVersion": 1,
    "exportedAt": "2026-01-01T00:00:00.000Z",
    "appVersion": "x.y.z"
  },
  "tables": {
    "swipe_sessions": [],
    "swipe_events": [],
    "taste_tag_scores": [],
    "taste_type_scores": [],
    "entity_affinity": [],
    "profile_snapshots": []
  }
}
```

### Minimum tables to include
At minimum include local preference/history/profile state (based on implemented schema):
- `swipe_sessions`
- `swipe_events`
- `taste_tag_scores`
- `taste_type_scores`
- `entity_affinity`
- `profile_snapshots`

Include `catalog_entities` only if product intent is full offline portability and file size remains acceptable.

---

## Acceptance criteria
1. User can export local data from Settings and receives a valid JSON file with expected tables/fields.
2. User can clear local data only after explicit destructive confirmation.
3. After reset, app returns to clean usable state without crashes or stale in-memory state.
4. Privacy/About content is accessible from Settings and accurately describes data behavior.
5. All flows work offline.

---

## Validation commands
- `npm run lint`
- `npm run typecheck`
- `npm test -- settings-data-controls`
- `npm test -- data-export`
- `npm test -- data-reset`

If tests do not yet exist, add focused tests for exporter/reset behavior in this iteration.

---

## Troubleshooting playbook (when agent gets stuck)

### Common issue: SQLite FK errors during wipe
- Ensure deletion order respects FK constraints.
- Prefer transactional execution and fail-fast rollback.
- Verify pragma settings and migration assumptions.

### Common issue: share/export fails on one platform
- Validate file path and URI scheme required by Expo APIs.
- Confirm platform permissions/availability of file-sharing module.
- Add graceful fallback (save locally + copy path).

### Common issue: stale UI after reset
- Invalidate query caches/selectors.
- Reinitialize state containers after wipe.
- Re-run app bootstrap data load pipeline.

---

## Curated resources for Claude Opus coding agent

Use these in order: official docs first, then implementation examples, then community Q&A.

### Official documentation (highest priority)
1. Expo SQLite docs (schema, transactions, async access patterns):
   - https://docs.expo.dev/versions/latest/sdk/sqlite/
2. Expo FileSystem docs (write/read/export files):
   - https://docs.expo.dev/versions/latest/sdk/filesystem/
3. Expo Sharing docs (share exported JSON):
   - https://docs.expo.dev/versions/latest/sdk/sharing/
4. Expo Router docs (Settings routes + nested screens):
   - https://docs.expo.dev/router/introduction/
5. React Native Alert / Modal / accessibility docs:
   - https://reactnative.dev/docs/alert
   - https://reactnative.dev/docs/modal
   - https://reactnative.dev/docs/accessibility

### Step-by-step guides / practical tutorials
1. Expo guide patterns for file handling and document export flows:
   - https://docs.expo.dev/guides/
2. React Navigation / settings-screen UX patterns (if router interop needed):
   - https://reactnavigation.org/docs/getting-started
3. OWASP MASVS + mobile data storage guidance for secure local data handling:
   - https://mas.owasp.org/

### YouTube references (implementation walkthroughs)
1. Search target: “Expo SQLite tutorial”, “Expo FileSystem tutorial”, “Expo Sharing tutorial”.
   - https://www.youtube.com/results?search_query=expo+sqlite+tutorial
   - https://www.youtube.com/results?search_query=expo+filesystem+tutorial
   - https://www.youtube.com/results?search_query=expo+sharing+tutorial
2. Search target: “React Native destructive action confirmation UX”.
   - https://www.youtube.com/results?search_query=react+native+destructive+action+confirmation

### High-signal GitHub repositories (reference implementations)
1. Expo examples monorepo (canonical patterns):
   - https://github.com/expo/examples
2. Expo Router examples:
   - https://github.com/expo/router/tree/main/examples
3. React Native Async/local data app examples (for settings architecture inspiration):
   - https://github.com/topics/react-native-example

### Community troubleshooting resources
1. Stack Overflow (Expo SQLite):
   - https://stackoverflow.com/questions/tagged/expo-sqlite
2. Stack Overflow (Expo):
   - https://stackoverflow.com/questions/tagged/expo
3. Stack Overflow (React Native file APIs):
   - https://stackoverflow.com/questions/tagged/react-native-filesystem
4. Expo Discussions:
   - https://github.com/expo/expo/discussions
5. Reactiflux Discord (React Native channels):
   - https://www.reactiflux.com/

### Books / long-form references
1. *Designing Data-Intensive Applications* (Kleppmann) — data integrity, migrations, consistency mindset.
2. *Mobile App Security* references aligned with OWASP MASVS for secure deletion/export posture.
3. *The Pragmatic Programmer* — defensive workflows and safe refactor/testing practices.

---

## Definition of done
- Settings includes discoverable Data Controls section.
- Export creates valid, user-accessible JSON artifact.
- Reset flow is clearly destructive, confirmed, and reliable.
- Privacy/About content is present, accurate, and offline-accessible.
- Tests cover happy path + key failure cases for export and reset.

## Notes for next iteration
Iteration 22 introduces deterministic local AI-label fallback rules; keep Settings copy compatible with that behavior (local summaries available even when cloud summary is disabled).
