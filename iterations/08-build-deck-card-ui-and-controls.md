# Iteration 8: Build Deck card UI and controls

## Objective

Deliver a production-ready Deck interaction surface that renders one card at a time with metadata/tags, supports both gesture and button input for all required actions, and exposes a stable callback contract for downstream persistence work.

## Why this matters

This is the core engagement loop of TasteDeck. If card rendering, controls, and interaction feedback are not fast, accessible, and consistent, users lose trust and Iteration 09 persistence logic will inherit unstable behavior.

## Scope

### In scope

- Build a reusable Deck card presentation layer (title, subtitle, type, tags, deterministic tile integration from Iteration 07).
- Implement 5-state controls (Dislike, Skip, Like, Love, Seen) with clear visual and accessibility semantics.
- Support gesture interactions and button fallback paths that produce identical action payloads.
- Add loading, empty, and recoverable error placeholders for deck state transitions.
- Keep UI action handling stateless and callback-driven so data persistence can be wired in next.

### Out of scope

- Writing swipe sessions/events to SQLite (Iteration 09).
- Undo/reversal behavior (Iteration 10).
- Ranking/candidate selection changes beyond rendering currently provided card data.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task                                                     | Model      | Rationale                                        |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------ |
| Gesture zone mapping and layout brief                        | **Gemini** | Spatial reasoning for swipe areas vs button taps |
| Component hierarchy and accessibility audit                  | **Gemini** | Layout specification and a11y review             |
| Implement card component, action bar, gesture hook           | **Codex**  | Primary UI component implementation              |
| Add loading/empty/error placeholders                         | **Codex**  | State-based rendering code                       |
| Add tests for dispatch parity and placeholder states         | **Codex**  | Test authoring                                   |
| Review action callback contract for downstream compatibility | **Claude** | Spec enforcement for Iteration 09 handoff        |

### Parallel run opportunity

- Run **Gemini** (gesture zone + layout brief) and **Codex** (static card rendering) in parallel for the first phase. Merge Gemini's layout constraints into Codex's gesture implementation.

## Agent resources and navigation map

### Source-of-truth references

- `CLAUDE.md` Section 5.2 Deck Screen (screen contract, swipe + button interaction expectations).
- `CLAUDE.md` Section 3.1 Swipe Signals (required action model and semantics).
- `CLAUDE.md` Section 11.1 Card Art requirements + Section 4.1 `tile_key` contract (deterministic tile dependency from Iteration 07).
- `CLAUDE.md` Sections 12.2 and 14.1 (responsiveness and Deck definition-of-done expectations).
- `iterations/07-implement-deterministic-tile-rendering.md` (must consume deterministic tile primitives instead of introducing alternate card art paths).
- `iterations/09-persist-swipe-sessions-and-swipe-events.md` (handoff dependency; this iteration must provide stable action callbacks ready for persistence wiring).
- `iterations/README.md` (strict sequence/order expectations and handoff continuity).

### Current repo implementation anchors

Inspect these first before coding to align with existing architecture and naming:

- Deck screen entry points and routes: `app/*deck*`, `app/(tabs)/index.tsx`, and related screen/controller files.
- Shared card/tile UI primitives: `components/*card*`, `components/tiles/*`, or equivalent feature-scoped component folders.
- Gesture layer integration points: imports/usages of `react-native-gesture-handler` and `react-native-reanimated`.
- Domain action enums/types introduced in Iteration 05 (typically under `types/domain/*`, `lib/domain/*`, or similar shared typing modules).
- Test conventions and harness: `__tests__/`, `*.test.tsx`, and Jest config/setup files.

### Suggested file organization

Use existing repo conventions if names differ; a concrete target layout for this iteration is:

- `features/deck/components/DeckCard.tsx`
- `features/deck/components/DeckActionBar.tsx`
- `features/deck/hooks/useDeckGestures.ts`
- `features/deck/components/DeckStatePlaceholder.tsx`
- `features/deck/types/deckActions.ts`
- `__tests__/deck/deck-card-controls.test.tsx`

### External troubleshooting and learning resources

#### YouTube

- Expo channel: https://www.youtube.com/@expo
- William Candillon (Reanimated/gesture deep dives): https://www.youtube.com/@wcandillon
- React Native School: https://www.youtube.com/@ReactNativeSchool
- Fireship (RN/Expo quick practical overviews): https://www.youtube.com/@Fireship

#### Official docs

- React Native `Pressable`: https://reactnative.dev/docs/pressable
- React Native accessibility guide: https://reactnative.dev/docs/accessibility
- React Native `Text`: https://reactnative.dev/docs/text
- Expo documentation hub: https://docs.expo.dev/
- React Navigation docs: https://reactnavigation.org/docs/getting-started
- React Native Gesture Handler docs: https://docs.swmansion.com/react-native-gesture-handler/docs/
- React Native Reanimated docs: https://docs.swmansion.com/react-native-reanimated/

#### Step-by-step guides

- LogRocket React Native gesture/swipe tutorial patterns: https://blog.logrocket.com/
- Dev.to React Native swipe card walkthroughs: https://dev.to/t/react-native
- Expo example walkthroughs (gesture + animation): https://docs.expo.dev/tutorial/introduction/

#### Books/long-form

- _Designing Interfaces_: https://www.oreilly.com/library/view/designing-interfaces-3rd/9781492051954/
- _Refactoring UI_: https://www.refactoringui.com/
- WCAG reference: https://www.w3.org/TR/WCAG21/

#### GitHub repos

- Expo examples: https://github.com/expo/examples
- React Native Gesture Handler examples: https://github.com/software-mansion/react-native-gesture-handler
- React Native Reanimated examples: https://github.com/software-mansion/react-native-reanimated
- UI kit references (React Native Paper): https://github.com/callstack/react-native-paper

#### Stack Overflow/discussion boards

- Stack Overflow `react-native`: https://stackoverflow.com/questions/tagged/react-native
- Stack Overflow `expo`: https://stackoverflow.com/questions/tagged/expo
- Stack Overflow `react-native-gesture-handler`: https://stackoverflow.com/questions/tagged/react-native-gesture-handler
- Stack Overflow `react-native-reanimated`: https://stackoverflow.com/questions/tagged/react-native-reanimated
- Expo Discussions: https://github.com/expo/expo/discussions
- React Native Discussions: https://github.com/react-native-community/discussions-and-proposals/discussions

### When stuck

- Validate contract-first: define one action payload shape and ensure gestures/buttons both call the same handler.
- Reduce complexity: get static card + controls stable before layering animation/gesture polish.
- Prefer progressive enhancement: maintain fully functional button-only mode while iterating gestures.
- Use deterministic tile component from Iteration 07 rather than introducing alternate tile logic.
- Add focused tests for dispatch parity, disabled/loading guards, and placeholder rendering before refactors.
- If gestures are flaky on one platform, keep callback API stable and isolate platform-specific behavior in hook/adapter code.

## Implementation checklist

- [ ] Build the main Deck card component using deterministic tile primitives and metadata/tag rendering.
- [ ] Implement action bar with all 5 required controls and consistent pressed/disabled/loading states.
- [ ] Wire gesture handling through a dedicated hook and route gesture outcomes through the same action dispatcher used by controls.
- [ ] Add accessibility semantics for action controls and state placeholders.
- [ ] Implement loading, empty, and recoverable error placeholders for deck state transitions.
- [ ] Add tests that prove gesture/button dispatch parity and placeholder rendering behavior.

## Deliverables

- Deck UI module with production-ready card rendering and controls for all required actions.
- Stateless action callback interface that downstream persistence code can consume without UI rewrites.
- Automated tests covering interaction parity and state placeholders.

## Acceptance criteria

- Gesture and button interaction paths dispatch identical action payloads for each action.
- Disabled/loading states prevent duplicate action dispatches.
- Skip/Like/Dislike/Love/Seen controls render and remain operable across iOS, Android, and Web targets.
- Loading, empty deck, and recoverable error placeholders appear with correct messaging and recovery affordances.
- Deterministic tile visuals from Iteration 07 are used by Deck card rendering.

## Accessibility checklist for controls

- [ ] All 5 actions expose explicit accessibility label, hint, and button role semantics.
- [ ] Every action is reachable and usable without gestures (keyboard/screen-reader/button-only path).
- [ ] Loading/empty/error placeholders are announced clearly for screen readers.
- [ ] Touch target sizing and focus order are validated for practical usability.

## Definition of done evidence

- GIF or screenshot evidence showing gesture interaction plus button fallback path.
- Accessibility evidence (captured labels/hints/roles and verified focus order notes).
- Test evidence demonstrating action dispatch parity and placeholder state coverage.

## Validation commands

- `npm run typecheck`
- `npm run lint`
- `npm test -- deck`

## Notes for next iteration

Iteration 09 may assume a stable, stateless UI action contract is complete: Deck controls/gestures already emit a unified action payload through callback interfaces, and persistence wiring can be added without changing Deck presentation components.
