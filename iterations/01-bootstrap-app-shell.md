# Iteration 1: Bootstrap app shell

## Objective
Set up the Expo Router app skeleton with bottom tabs for Deck, Profile, Library, and Settings, plus stack support for detail screens.

## Why this matters
A stable navigation shell is the foundation for all later feature work and prevents layout churn.

## Scope
### In scope
- Initialize or standardize Expo Router file structure under `app/`.
- Add tab navigator with 4 required tabs and placeholder screens.
- Add stack layout for future detail routes and modals.
- Ensure tabs are reachable on iOS/Android/web where supported.

### Out of scope
- Building business logic for ranking or persistence.
- Final visual polish.

## Agent resources and navigation map
### Source-of-truth references
- `CLAUDE.md` Section 1 (Product Principles), Section 5 (Navigation & Screens), and Section 17 (delivery sequence).
- `iterations/README.md` for iteration ordering and naming consistency.

### Current repo implementation anchors
- `app/_layout.tsx`: root stack setup, `initialRouteName`, and details route registration.
- `app/(tabs)/_layout.tsx`: tab registration plus tab labels/icons.
- `app/(tabs)/index.tsx`: Deck placeholder currently mapped to the `index` tab route.
- `app/(tabs)/profile.tsx`, `app/(tabs)/library.tsx`, `app/(tabs)/settings.tsx`: placeholder tab screens for remaining tabs.
- `app/details/[id].tsx`: nested detail route pattern and `useLocalSearchParams` usage.

### External troubleshooting and learning resources
- Official docs:
  - Expo Router docs: https://docs.expo.dev/router/introduction/
  - Expo Router notation (layouts, groups, dynamic routes): https://docs.expo.dev/router/basics/notation/
  - React Navigation docs (tabs/stack patterns used by Expo Router): https://reactnavigation.org/docs/getting-started
  - Expo SDK docs: https://docs.expo.dev/
- Video walkthroughs (YouTube):
  - Expo channel tutorials and Router walkthroughs: https://www.youtube.com/@expo
  - Search phrase for targeted help: `Expo Router tabs stack layout deep linking`
- Step-by-step guides and examples:
  - Expo Router quickstart and examples in docs: https://docs.expo.dev/router/create-pages/
  - Expo examples repo (patterns and working app structures): https://github.com/expo/examples
- Reference repositories:
  - Expo Router source/examples: https://github.com/expo/router
  - Expo monorepo (latest router integration patterns): https://github.com/expo/expo
- Community Q&A and discussion boards:
  - Stack Overflow (`expo-router` / `expo` / `react-navigation` tags): https://stackoverflow.com/questions/tagged/expo-router
  - Expo Discussions (GitHub): https://github.com/expo/expo/discussions
  - React Navigation Discussions: https://github.com/react-navigation/react-navigation/discussions
- Books / long-form references:
  - *Fullstack React Native* (for navigation architecture context): https://www.fullstackreact.com/react-native/
  - *React Native in Action* (Manning; foundational patterns): https://www.manning.com/books/react-native-in-action

### When stuck
- Verify Expo Router naming conventions are intact: `(tabs)` group and `index.tsx` as the default tab route.
- Confirm the root stack includes `(tabs)` and at least one nested route such as `details/[id]`.
- Confirm imports follow the alias style already used in the repo (for example, `@/components/...`).

## Implementation checklist
- [ ] Keep the Deck tab on `app/(tabs)/index.tsx` (or equivalent default tab route) and label it “Deck” in tab options.
- [ ] Configure tab labels/icons and sane defaults.
- [ ] Add minimal placeholder content and loading-safe components.
- [ ] Add stack wrappers for future detail pages while preserving `initialRouteName: '(tabs)'` unless intentionally changing startup routing.

## Deliverables
- Navigation file structure committed.
- App launches directly into Deck tab.
- No red-screen/router resolution errors.

## Acceptance criteria
- User can switch among all 4 tabs without crash.
- Deep-link route resolution works for at least one nested detail path.

### Definition of done evidence
- Provide a screenshot or short recording that shows all 4 tabs are reachable.
- Perform and note a manual deep-link check for one details route (for example, `/details/example-id` on web).

## Validation commands
- `npm run start -- --web` (or `npm run start`)

Lint/typecheck/test scripts are introduced in Iteration 02.

## Notes for next iteration
Document any route naming conventions introduced so next tasks follow the same pattern.
