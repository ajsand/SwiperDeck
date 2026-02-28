
```md
<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08F-codex-tests-dispatch-parity-and-placeholders.md -->

# Model: GPT-5.3 CODEX (Extra High Fast)
# Iteration 8F: Tests for action dispatch parity + placeholder states

## Objective
Add tests that prove:
1) Buttons dispatch correct canonical actions via the unified dispatcher.
2) Gesture path and button path share the same action payload contract (test at the contract boundary).
3) Loading/empty/error placeholders render correctly and invoke callbacks.

## Why this matters
Gesture simulation is notoriously tricky. The goal is not to perfectly emulate touch physics, but to:
- lock the action contract,
- prevent regressions,
- and ensure state placeholders never break.

## Scope
### In scope
- Unit/component tests using Jest + React Native Testing Library patterns.
- Snapshot tests for placeholder states if already used in repo.
- Tests for dispatch parity via shared dispatcher function.

### Out of scope
- End-to-end gesture physics tests (later).
- Performance benchmarks.

## Key testing strategy (required)
- Make the dispatcher function pure (e.g., `dispatchDeckAction`) and test it directly.
- Button tests: render `DeckActionBar`, press buttons, assert `onAction` calls.
- Gesture tests: DO NOT attempt to fire a “real swipe” if the test tooling can’t do it reliably.
  - Instead, test the gesture-to-action mapping function (pure helper) OR
  - call the hook handler directly if it’s structured for testability.

## Suggested files
- `__tests__/deck/deck-actionbar.test.tsx`
- `__tests__/deck/deck-placeholders.test.tsx`
- `__tests__/deck/deck-gesture-mapping.test.ts` (pure mapping tests)

## Implementation checklist
- [ ] Ensure each action button has a stable `testID`.
- [ ] Use RNTL press helpers to simulate button presses.
- [ ] Assert `onAction` receives canonical action string (from Iteration 05 action constants).
- [ ] Placeholder tests:
  - render each state and assert correct content/testID,
  - press retry and assert callback.
- [ ] Gesture mapping tests:
  - given dx/dy/velocity, assert correct action or cancel.

## Acceptance criteria
- Tests fail if an action string drifts from the canonical union.
- Tests fail if payload shape changes unexpectedly.
- Placeholder states are covered.

## Validation commands
- `npm test -- deck`

## References
```txt
Expo: Unit testing with Jest (jest-expo): https://docs.expo.dev/develop/unit-testing/
Expo Router testing config: https://docs.expo.dev/router/reference/testing/
React Native Testing overview: https://reactnative.dev/docs/testing-overview
React Native Testing Library fireEvent API: https://oss.callstack.com/react-native-testing-library/docs/api/events/fire-event
(Testing limitation discussion for swipe): https://stackoverflow.com/questions/70844307/how-to-fire-swipe-in-jest-with-react-testing-library