# Iteration 1C: Implement Tabs + Stack Shell (Primary Implementation)

## Objective
Implement the Iteration 1 navigation shell in code:
- Root Stack layout
- `(tabs)` group with 4 tabs: Deck, Profile, Library, Settings
- Placeholder screens
- One dynamic detail route used to prove deep-link resolution
- Minimal “go to details” link from Deck

## Why this matters
This is the foundation for every later iteration. Navigation errors compound quickly.

## Scope
### In scope
- Create/edit route files under `app/` per the routing plan.
- Ensure the app launches directly into Deck tab.
- Ensure tab switching works.
- Add one dynamic detail route and verify it loads via:
  - in-app navigation
  - direct URL on web

### Out of scope
- DB setup, catalog loading, ranking logic, swipe logic.
- Final styling.
- Filter modal UI (later iteration).

## Model execution strategy
### Preferred model
**GPT-5.3 Codex Extra High Fast** (primary implementer)

### Required pre-reads
- `/CLAUDE.md` Section 5 (Navigation & Screens)
- `iterations/01_bootstrap-app-shell.md`
- `iterations/01_bootstrap-app-shell/01A_routing-tree-and-deeplink-proposal.md`
- `iterations/01_bootstrap-app-shell/01B_task-brief-and-plan.md`

## Implementation constraints (must obey)
- Deck is default tab (prefer `app/(tabs)/index.tsx`).
- Use Expo Router file conventions:
  - `_layout.tsx` defines Stack/Tabs for that directory.
- Keep screens minimal and stable (placeholder text is fine).
- Don’t place non-route components under `app/`.

## Target file tree (preferred)
app/
  _layout.tsx
  +not-found.tsx
  (tabs)/
    _layout.tsx
    index.tsx
    profile.tsx
    library.tsx
    settings.tsx
  details/
    [id].tsx

## Step-by-step implementation checklist
1) Root layout (Stack)
- Implement `app/_layout.tsx` as a Stack wrapper.
- Ensure it renders `(tabs)` as the main entry.
- If using router settings / initial route config, keep it consistent with the plan.

2) Tabs layout
- Implement `app/(tabs)/_layout.tsx` using Tabs.
- Declare screens for:
  - index (title: Deck)
  - profile
  - library
  - settings
- Add icons if available in the project; if not, keep titles only (avoid adding deps in this iteration unless already present).

3) Placeholder tab screens
- Implement minimal UI for each tab route file.
- Include a safe container (avoid brittle layout assumptions).

4) Dynamic detail route
- Create `app/details/[id].tsx`.
- Read param using `useLocalSearchParams`.
- Display the id.
- Ensure the screen is reachable.

5) Add navigation to detail route from Deck
- In `app/(tabs)/index.tsx`, add a simple link/button to `/details/example-id`.
- This proves Stack+Tabs+dynamic route work together.

6) Web deep-link check
- Run web dev server and open `/details/example-id` directly.
- Confirm the detail screen renders and has a usable back navigation path.

## Deliverables
- All required files committed.
- App launches into Deck tab.
- Tabs switch without errors.
- Dynamic detail route works.

## Acceptance criteria
- No router resolution errors (no red screen).
- Deck is default on launch.
- `/details/example-id`:
  - works via clicking link from Deck
  - works via direct URL in web

## Validation commands (Iteration 1)
- Start the app on web (preferred for deep-link test):
  - `npm run start -- --web`
  - or equivalent repo command if different
- Manual checks:
  - switch tabs
  - open details via in-app link
  - open /details/example-id directly

## Troubleshooting checklist
- If tabs don’t appear:
  - confirm `app/(tabs)/_layout.tsx` exports a Tabs layout
  - confirm tab files exist and have default exports
- If default route is wrong:
  - confirm Deck is `app/(tabs)/index.tsx`
- If dynamic route param is undefined:
  - confirm the filename is `[id].tsx` and you are navigating to `/details/<value>`
- If router errors mention missing layout:
  - confirm `app/_layout.tsx` exists and exports a default component

## Handoff to 1D (Review)
Provide:
- final file tree
- how you tested deep linking (web path used)
- any deviations from 1A/1B decisions (with justification)