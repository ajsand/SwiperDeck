# Iteration 16: Build filter modal controls

## Objective

Design and implement a production-ready filter modal from the Deck screen that lets users control:

- media type inclusion/exclusion,
- diversity boost behavior,
- mainstream-vs-niche preference (slider),
  while preserving deterministic selection behavior and safe recommendation quality defaults.

## Why this matters

Filters are a direct trust lever: users should be able to quickly steer what they see without breaking recommendation quality. This iteration creates the first explicit preference-control surface and ensures preferences are persisted, observable, and applied safely in candidate selection.

## Scope

### In scope

- Add a modal/sheet launched from Deck UI.
- Add media type toggles (e.g., anime/manga/manhwa or app-defined content types).
- Add diversity boost toggle (on/off, with safe default).
- Add mainstream slider (continuous or stepped) mapped to ranking weight input.
- Add apply/reset behavior with clear UX states.
- Persist filter state locally (SQLite or existing local persistence layer).
- Feed active filter state into candidate-generation/ranking pipeline.
- Trigger deck refresh/requery after applying filter changes.
- Add telemetry fields for active filter state at selection time.
- Add deterministic tests for state transitions and selector integration.

### Out of scope

- Cloud sync/multi-device preference sync.
- Per-profile collaborative filter sharing.
- Complex preset marketplace or social presets.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                        | Model      | Rationale                                           |
| --------------------------------------------------------------- | ---------- | --------------------------------------------------- |
| Modal routing strategy (route vs imperative vs bottom sheet)    | **Gemini** | Navigation/spatial reasoning for modal presentation |
| Produce Codex-ready implementation brief for modal structure    | **Gemini** | Layout specification and edge cases                 |
| Implement modal UI, filter controls, persistence, deck refresh  | **Codex**  | Primary UI + data implementation                    |
| Wire filter state into candidate-generation pipeline            | **Codex**  | Selector integration                                |
| Add deterministic tests for state transitions + selector effect | **Codex**  | Test authoring                                      |
| Review UX decisions and CLAUDE.md alignment                     | **Claude** | Spec enforcement                                    |

### Parallel run opportunity

- Run **Gemini** (modal routing strategy) and **Codex** (filter state model + persistence) in parallel. Merge Gemini's routing recommendation before Codex builds the modal component.

## Product/UX requirements

- Modal should open quickly from Deck and reflect the latest persisted state.
- Reset returns all controls to documented defaults.
- Apply should be explicit and idempotent.
- If all media types are disabled, enforce at least one valid type (prevent dead-end state).
- Controls should include accessible labels and hints (slider meaning, diversity explanation).
- UI copy should clarify slider direction (e.g., “More mainstream” ↔ “More niche”).

## Data/contracts and integration points

### Filter state model

Add/extend a typed model, for example:

- `FilterPreferences`
  - `enabledMediaTypes: MediaType[]`
  - `diversityBoostEnabled: boolean`
  - `mainstreamPreference: number` (normalized 0..1 or -1..1)
  - `updatedAt: number`

### Persistence contract

Add/extend local persistence API:

- `loadFilterPreferences(): Promise<FilterPreferences>`
- `saveFilterPreferences(prefs: FilterPreferences): Promise<void>`
- `resetFilterPreferences(): Promise<FilterPreferences>`

### Selector contract

Ensure selector/ranker accepts preferences in a typed way:

- `selectCandidates(input, prefs, sessionContext)`

Expected behavior:

- media type toggles constrain eligible pool,
- diversity toggle maps to existing diversity/repetition knobs,
- mainstream slider influences popularity/novelty term weighting,
- deterministic output remains stable for same seed + prefs + catalog snapshot.

## Recommended implementation approach

1. **Define defaults and guardrails**
   - Document default media types enabled.
   - Set safe default diversity mode.
   - Define slider midpoint and extremes behavior.
2. **Create typed preferences module**
   - Include validation/normalization helpers (bounds checks, non-empty media type set).
3. **Implement persistence adapter**
   - Reuse existing local DB/storage patterns from earlier iterations.
4. **Build modal UI**
   - Group sections: Media Types, Diversity, Mainstream.
   - Include Apply and Reset actions.
5. **Wire modal state lifecycle**
   - Hydrate from persisted prefs on open.
   - Keep local draft state until Apply.
6. **Integrate with selection pipeline**
   - Pass active prefs into query/ranking stage.
   - Trigger refresh after Apply.
7. **Add telemetry + debug metadata**
   - Emit active prefs in session/selection events.
8. **Test deterministically**
   - Cover reducer/state transitions, persistence roundtrip, and selector effect tests.

## Implementation checklist

- [ ] Add `FilterPreferences` type + normalization helpers.
- [ ] Define constants for defaults and slider bounds.
- [ ] Implement local persistence load/save/reset methods.
- [ ] Build filter modal/sheet UI and open/close integration from Deck.
- [ ] Add media type toggles with “at least one enabled” constraint.
- [ ] Add diversity toggle and map to selector behavior.
- [ ] Add mainstream slider with clear label and value mapping.
- [ ] Wire Apply action to save + refresh deck candidates.
- [ ] Wire Reset action to defaults + save + refresh.
- [ ] Emit telemetry containing applied filter state.
- [ ] Add tests for UI state, persistence, and ranking integration.

## Deliverables

- Production-ready filter modal with typed state and persistence.
- Selector integration applying filters deterministically.
- Telemetry coverage for active filters during recommendation events.
- Test coverage for filter behavior and failure/edge conditions.

## Acceptance criteria

- Opening modal shows currently persisted values.
- Apply updates upcoming cards according to active media types.
- Reset restores documented defaults and updates upcoming cards.
- Mainstream slider has observable, deterministic impact on ranking behavior.
- Diversity toggle changes exploration/diversity behavior without violating repetition guardrails.
- Preferences survive app relaunch (local persistence confirmed).
- No invalid dead-end states (e.g., zero enabled media types) can be persisted.

## Definition-of-done evidence

Include in PR notes or artifacts:

- Short screen recording/GIF showing open → edit → apply → card changes.
- Persistence proof (set prefs, reload app, verify retained state).
- Before/after candidate sampling showing mainstream slider effect.
- Test output for filter module + selector integration.
- Telemetry sample event with serialized filter state.

## Concrete testing requirements

- **UI state tests**
  - Modal initializes from persisted prefs.
  - Apply commits changes; cancel dismisses without commit (if cancel exists).
- **Validation tests**
  - Attempting to disable all media types is prevented or auto-corrected.
  - Slider values are clamped/normalized correctly.
- **Persistence tests**
  - Save/load/reset roundtrip correctness.
- **Selector integration tests**
  - Media type filtering excludes disallowed types.
  - Mainstream extremes measurably shift popularity-biased ranking term.
  - Diversity toggle changes exploration/diversity behavior as intended.
- **Determinism tests**
  - For fixed seed/catalog/prefs, selected sequence is stable.

## File-location hints (repo navigation)

Likely implementation points:

- Deck screen/component tree and navigation trigger for modal,
- shared UI component library for modal/sheet controls,
- local settings/preferences persistence module,
- candidate selector/ranker orchestration module,
- recommendation/session telemetry emitters,
- test directories for UI, persistence, and recommendation logic.

Useful search strings:

- `DeckScreen`
- `filter modal`
- `preferences`
- `diversity boost`
- `mainstream`
- `candidate selector`
- `ranking weight`
- `telemetry`

## Resources when stuck

### YouTube tutorials

- React Native Modal basics and patterns: https://www.youtube.com/results?search_query=react+native+modal+tutorial
- React Native Bottom Sheet implementation walkthroughs: https://www.youtube.com/results?search_query=react+native+bottom+sheet+tutorial
- Expo + React Native app settings/state persistence guides: https://www.youtube.com/results?search_query=expo+react+native+asyncstorage+settings
- UX for filter/sort interfaces (mobile): https://www.youtube.com/results?search_query=mobile+filter+ux+design

### Official documentation

- React Native Modal: https://reactnative.dev/docs/modal
- React Native Pressable/Switch/Slider ecosystem references:
  - Pressable: https://reactnative.dev/docs/pressable
  - Switch: https://reactnative.dev/docs/switch
  - Community Slider: https://github.com/callstack/react-native-slider
- Expo docs (platform/runtime constraints): https://docs.expo.dev/
- React Navigation (modal/screen presentation): https://reactnavigation.org/docs/modal/
- TypeScript handbook (strict modeling/utility types): https://www.typescriptlang.org/docs/
- Jest docs: https://jestjs.io/docs/getting-started
- React Native Testing Library docs: https://callstack.github.io/react-native-testing-library/
- SQLite docs (if prefs stored in DB): https://www.sqlite.org/docs.html

### Step-by-step guides / blogs

- Material Design filters/sort UX guidance: https://m3.material.io/components/chips/guidelines
- Nielsen Norman Group on filter UX best practices: https://www.nngroup.com/articles/filtering-and-sorting/
- React docs on state management and controlled inputs: https://react.dev/learn/managing-state
- Practical guide for feature flags/settings persistence patterns: https://martinfowler.com/articles/feature-toggles.html

### Books

- _Refactoring UI_ (practical control/layout polish): https://www.refactoringui.com/book
- _Designing Interfaces_ (interaction patterns): https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/
- _Designing Data-Intensive Applications_ (state/persistence reliability): https://dataintensive.net/

### GitHub repositories

- Expo example apps (patterns for settings/stateful UI): https://github.com/expo/examples
- React Navigation examples: https://github.com/react-navigation/react-navigation/tree/main/example
- React Native Paper (ready-made UI controls/patterns): https://github.com/callstack/react-native-paper
- Shopify Restyle + RN architecture examples (typed design systems): https://github.com/Shopify/restyle

### Stack Overflow tags

- `react-native`: https://stackoverflow.com/questions/tagged/react-native
- `expo`: https://stackoverflow.com/questions/tagged/expo
- `react-navigation`: https://stackoverflow.com/questions/tagged/react-navigation
- `typescript`: https://stackoverflow.com/questions/tagged/typescript
- `sqlite`: https://stackoverflow.com/questions/tagged/sqlite
- `jestjs`: https://stackoverflow.com/questions/tagged/jestjs

### Discussion boards / communities

- Reactiflux Discord (React/React Native channels): https://www.reactiflux.com/
- Expo forums: https://forums.expo.dev/
- React Native community discussions: https://github.com/react-native-community/discussions-and-proposals
- Reddit r/reactnative: https://www.reddit.com/r/reactnative/
- Dev.to React Native discussions: https://dev.to/t/reactnative

## Validation commands

- `npm run typecheck`
- `npm run lint`
- `npm test -- filters`
- `npm test -- recommendation`

## Notes for next iteration

Iteration 17 (profile visualizations v1) should consume active filter context so profile charts can distinguish underlying preference-driven exposure from model-driven ranking changes.
