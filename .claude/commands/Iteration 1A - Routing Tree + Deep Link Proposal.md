# Iteration 1A: Routing Tree + Deep Link Proposal (Spatial/Nav)

## Objective
Propose and validate the **Expo Router file tree** for:
- Bottom tabs: **Deck, Profile, Library, Settings**
- Root stack support for future detail screens and modals
- A minimal **dynamic detail route** used to prove deep-link resolution

This subtask produces the “navigation blueprint” that implementation (1C) will follow.

## Why this matters
Expo Router is file-based. A single incorrect folder layout or missing `_layout.tsx` can cause:
- wrong initial route,
- tabs not rendering,
- dynamic routes failing,
- broken deep-link behavior.

Locking the file tree early prevents later churn.

## Scope
### In scope
- Choose one canonical routing structure under `app/` (tabs group + stack).
- Decide which file is the default entry route (Deck should be default).
- Specify at least one nested dynamic route path for deep-link testing (e.g., `/details/[id]`).
- Document naming conventions (route groups, layout files, where routes live).

### Out of scope
- Implementing actual UI components, icons, styles.
- Any business logic (ranking, DB, catalog).
- Auth, modals, or filter sheet behavior (just prepare for it).

## Model execution strategy
### Preferred model
**Gemini 3.1** (spatial/navigation reasoning)

### Handoff to next subtask
Output becomes the source plan for **1B (Task Brief)** and **1C (Implementation)**.

## Source-of-truth references (read first)
- Repo: `/CLAUDE.md` Section 5 (Navigation & Screens) and Section 17 (iteration order).
- Expo Router rule: `index.tsx` is the default route for a directory and often the default tab when using Tabs.
- Expo Router layouts: `_layout.tsx` determines how routes in that directory are arranged (Stack/Tabs/etc.).
- Linking: Expo Router automatically enables deep linking across screens.

## Repo anchors to inspect (before proposing tree)
- Does `app/_layout.tsx` exist already?
- Does `app/(tabs)/_layout.tsx` exist already?
- Do tab screens exist as `app/(tabs)/index.tsx` / `profile.tsx` / `library.tsx` / `settings.tsx`?
- Is there already a details route like `app/details/[id].tsx` or `app/entity/[id].tsx`?

## Deliverable (what you must produce)
1) A proposed `app/` file tree (exact paths).
2) A short rationale for each critical choice:
   - Why Deck is the default tab/route
   - Why Stack sits above Tabs (root layout)
   - Where the dynamic route lives and its URL
3) A minimal deep-link test plan:
   - Web path to load
   - One in-app navigation action to reach the dynamic route

## Recommended file tree (preferred)
Use Deck as `index.tsx` inside `(tabs)`:

app/
  _layout.tsx
  +not-found.tsx            (recommended)
  (tabs)/
    _layout.tsx
    index.tsx               (Deck tab)
    profile.tsx
    library.tsx
    settings.tsx
  details/
    [id].tsx                (dynamic detail route for deep-link test)

### Notes on this structure
- `(tabs)/index.tsx` gives you a clean “Deck is default” story (no redirects).
- Root `app/_layout.tsx` as Stack makes future non-tab screens easy (details, modals).

## Deep-link acceptance path (minimum)
- Web: open `/details/example-id`
- In-app: add a simple link/button in Deck to navigate to `/details/example-id`

## Common pitfalls (call out explicitly)
- Putting non-route components under `app/` (pollutes routing).
- Missing a default export in a route file.
- Accidentally making `app/index.tsx` the entry route when you intended `(tabs)/index.tsx` to be root.
- Using a dynamic route but not testing navigation via full path.

## Validation (for this subtask)
This subtask is “planning only.”
Success = the proposal is consistent, complete, and implementable without ambiguity.

## Handoff package to 1B / 1C
Provide a short “Routing Decision Summary”:

- Default entry route:
- Tabs group path:
- Dynamic detail route path:
- Required files to create/edit:
- Deep-link test steps: