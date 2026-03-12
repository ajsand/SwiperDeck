# Iteration 12: Build deck selection and deck detail flows

## 1. Objective

Transform the "Decks" tab from an inherited inline swipe placeholder into a proper deck browser, and add a deck detail screen that presents all deck metadata defined in CLAUDE.md Section 4.2. Together these two screens form the primary entry path into the product: browse decks → view detail → start swiping.

This iteration builds the navigation and presentation layer. It does not wire swipe session logic to decks (that is Iteration 14), and it does not populate deck content (that is Iteration 13). The deck browser and detail screens must therefore handle empty, loading, and error states gracefully — they will be "lit up" by Iteration 13.

## 2. Why this matters

The deck browser is the first screen users see. It replaces the old generic swipe-everything approach with the fork's core concept: **choose a deck, then build a profile within it**. Without this screen, the product cannot present its value proposition and all downstream flows (deck profiles, compare, showdown) have no entry point.

CLAUDE.md Section 4.2 defines exactly what the deck browser must show. Section 5.1 defines what a deck is. These sections are the acceptance standard for this iteration.

## 3. Scope

### In scope

- **Replace** `app/(tabs)/index.tsx` with a deck browser that queries `getAllDecks()` and renders a scrollable list
- **Create** `app/deck/[deckId].tsx` as a new Stack screen for deck detail
- **Create** new UI components: `DeckBrowserCard`, `DeckBrowserEmpty`, `DeckBrowserError`
- **Create** data hooks: `useDecks` (all decks), `useDeckById` (single deck)
- **Register** the `deck/[deckId]` route in the root Stack layout
- **Handle** loading, empty, and error states on both screens
- **Show** a "Start Swiping" CTA on the deck detail screen (navigates to a placeholder — the swipe session wiring is Iteration 14)
- **Present** all deck metadata from CLAUDE.md 4.2: title, description, category, card count, profile threshold, compare threshold, compare eligibility, showdown eligibility, sensitivity level
- **Preserve** all existing swipe UI components (`components/deck/*`) — they remain available for Iteration 14
- **Remove** `SAMPLE_DECK_ENTITIES` from `app/(tabs)/index.tsx` (the hardcoded TasteDeck placeholder data)
- **Write** tests for new hooks, components, and screens
- **Update** documentation

### Out of scope

- **Populating deck content** — Iteration 13 loads prebuilt Tier 1 decks
- **Swipe session wiring** — Iteration 14 refactors swipe/session logic to deck scope
- **Deck profile display** — Iteration 15
- **Compare/showdown flows** — Iterations 16–20
- **Custom deck creation** — Iteration 21
- **Schema changes** — no migration needed; the `decks` and `deck_cards` tables from Iteration 10 already exist
- **Action model changes** — finalized in Iteration 11
- **Renaming the `DeckCard` UI component** — the naming collision with the domain type does not manifest in this iteration (the browser and detail screens don't import the swipe-card component). Deferred to Iteration 14 when swipe wiring forces the collision.

### Relationship to old TasteDeck code

| Category                     | What happens                                                                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Replaced**                 | `app/(tabs)/index.tsx` content — the inline swipe UI with `SAMPLE_DECK_ENTITIES` is removed from this route. The "Decks" tab becomes a true deck browser.                                                                                                                                          |
| **Reused**                   | Tab shell (`app/(tabs)/_layout.tsx`), root Stack navigator (`app/_layout.tsx`), `DeterministicTile` component (used for deck cover art on browser cards), `DeckStatePlaceholder` patterns (loading/empty/error), existing dark theme and styling conventions, `useColorScheme`, safe-area handling |
| **Preserved (not modified)** | All swipe components (`components/deck/*`), gesture hooks (`hooks/useDeckGestures*`), action types, domain types, repositories, tile utilities, all other screens (profile, history, settings)                                                                                                     |
| **New**                      | Deck browser components, deck detail screen, data hooks, deck-detail route registration                                                                                                                                                                                                            |

## 4. Multi-model execution strategy

| Step | Model           | Task                                                                                       |
| ---- | --------------- | ------------------------------------------------------------------------------------------ |
| 1    | Claude Opus 4.6 | Write this iteration file with screen specs, component contracts, navigation design (done) |
| 2    | GPT-5.4         | Implement data hooks, browser components, and deck detail screen                           |
| 3    | GPT-5.4         | Replace index tab content, register new route, write tests                                 |
| 4    | GPT-5.4         | Run full validation suite                                                                  |
| 5    | Claude Opus 4.6 | Review for spec alignment, accessibility, and state handling                               |

This is a UI-heavy iteration. GPT-5.4 handles all implementation. If the grid/scroll layout is proving tricky, a Gemini layout reasoning pass could be helpful — but try GPT-5.4 first since the layout is a standard scrollable list.

### Layout note for complex cases

If the deck browser needs a complex grid layout with varying card sizes (e.g., featured deck + grid), and GPT-5.4 struggles with the spatial reasoning, consider a Gemini 3.1 pass to produce a layout brief before GPT-5.4 implements it. For v1, a simple vertical list or 2-column grid is sufficient and does not require Gemini.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document                          | Relevant sections                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `/CLAUDE.md` Section 4.1          | Onboarding: starting paths (explore recommended decks, continue a prior deck)      |
| `/CLAUDE.md` Section 4.2          | Choosing a deck: browser grouping, metadata to show per deck                       |
| `/CLAUDE.md` Section 5.1          | Core deck model: one category, one card set, one profile space                     |
| `/CLAUDE.md` Section 5.2          | Recommended launch categories with tier groupings                                  |
| `/CLAUDE.md` Section 5.3          | Prebuilt vs custom deck distinction                                                |
| `/CLAUDE.md` Section 11.6         | Sensitive deck safeguards (gating, warnings)                                       |
| `/CLAUDE.md` Section 14.4         | Compare eligibility threshold (min cards)                                          |
| `/CLAUDE.md` Section 15           | UX, accessibility, and performance requirements                                    |
| `/iterations/11-...md` Section 12 | Handoff: schema v4, action model finalized, DeckCard component takes CatalogEntity |

### Current route structure (before this iteration)

```
app/
  _layout.tsx          ← Root Stack: (tabs), details/[id], modal, +not-found
  (tabs)/
    _layout.tsx        ← 4 tabs: Decks, Profile, History, Settings
    index.tsx          ← "Decks" tab — currently inline swipe UI (TO BE REPLACED)
    profile.tsx        ← placeholder
    library.tsx        ← placeholder
    settings.tsx       ← placeholder
  (modals)/
    _layout.tsx        ← Modal stack
    filter.tsx         ← placeholder
  details/
    [id].tsx           ← Card detail (legacy, may become unused)
  modal.tsx            ← Legacy generic modal
  +not-found.tsx       ← 404
```

### Route structure after this iteration

```
app/
  _layout.tsx          ← Root Stack: (tabs), deck/[deckId], details/[id], modal, +not-found
  (tabs)/
    _layout.tsx        ← Same 4 tabs
    index.tsx          ← REWRITTEN: deck browser (queries DB, renders deck list)
    profile.tsx        ← unchanged
    library.tsx        ← unchanged
    settings.tsx       ← unchanged
  deck/
    [deckId].tsx       ← NEW: deck detail screen (Stack screen pushed from browser)
  (modals)/
    ...unchanged
  details/
    ...unchanged
  ...
```

### New files to CREATE

| File                                           | Purpose                                       |
| ---------------------------------------------- | --------------------------------------------- |
| `app/deck/[deckId].tsx`                        | Deck detail screen                            |
| `components/deck-browser/DeckBrowserCard.tsx`  | Visual card for each deck in the browser list |
| `components/deck-browser/DeckBrowserEmpty.tsx` | Empty state when no decks exist               |
| `components/deck-browser/index.ts`             | Barrel export                                 |
| `hooks/useDecks.ts`                            | Hook to query all decks from DB               |
| `hooks/useDeckById.ts`                         | Hook to query a single deck by ID             |
| `__tests__/deck-browser-card.test.tsx`         | Component test                                |
| `__tests__/use-decks.test.ts`                  | Hook test (mock repository)                   |

### Files to MODIFY

| File                   | What changes                                       |
| ---------------------- | -------------------------------------------------- |
| `app/(tabs)/index.tsx` | REWRITE: replace inline swipe UI with deck browser |
| `app/_layout.tsx`      | Register `deck/[deckId]` Stack.Screen              |

### Files to PRESERVE (do not modify)

| File                         | Why                                        |
| ---------------------------- | ------------------------------------------ |
| All `components/deck/*`      | Swipe UI components — used by Iteration 14 |
| All `hooks/useDeckGestures*` | Gesture system — used by Iteration 14      |
| `types/domain/*`             | Domain types — stable                      |
| `lib/db/*`                   | Repositories and migrations — stable       |
| `app/(tabs)/profile.tsx`     | Unchanged                                  |
| `app/(tabs)/library.tsx`     | Unchanged                                  |
| `app/(tabs)/settings.tsx`    | Unchanged                                  |

### Deck domain type reminder (from Iteration 10)

The `Deck` type from `types/domain/decks.ts` provides:

```
id: DeckId
title: string
description: string
category: DeckCategory
tier: DeckTier
cardCount: number
compareEligible: boolean
showdownEligible: boolean
sensitivity: DeckSensitivity
minCardsForProfile: number
minCardsForCompare: number
isCustom: boolean
coverTileKey: string | null
createdAt: number
updatedAt: number
```

The `getAllDecks()` and `getDeckById()` functions in `lib/db/deckRepository.ts` return these typed objects. The hooks created in this iteration wrap those calls with state management.

### External troubleshooting and learning resources

#### Official docs

- [Expo Router — Dynamic routes](https://docs.expo.dev/router/create-pages/#dynamic-routes) — `[deckId].tsx` pattern
- [Expo Router — Navigate between pages](https://docs.expo.dev/router/navigating-pages/)
- [Expo Router — Stack.Screen options](https://docs.expo.dev/router/layouts/stack/)
- [React Native FlatList](https://reactnative.dev/docs/flatlist) — for the deck browser list
- [React Native ScrollView](https://reactnative.dev/docs/scrollview) — for the deck detail content
- [React Native Accessibility](https://reactnative.dev/docs/accessibility) — labels, roles, hints

#### Step-by-step guides

- [Expo Router dynamic routes tutorial](https://docs.expo.dev/tutorial/create-pages/)
- [Expo icon directory](https://icons.expo.fyi/) — for deck category icons

#### YouTube

- Search "Expo Router dynamic routes 2025/2026" for file-based routing with `[param].tsx`
- Search "React Native FlatList performance" for list rendering best practices

#### GitHub repos

- [expo/expo router examples](https://github.com/expo/router/tree/main/apps)
- This repo's `app/details/[id].tsx` — the existing dynamic route pattern to follow

#### Stack Overflow / discussion boards

- [expo-router dynamic routes](https://stackoverflow.com/questions/tagged/expo-router)

## 6. When stuck

| Problem                                   | Resolution                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route `deck/[deckId]` not resolving       | Create `app/deck/[deckId].tsx` (the directory `app/deck/` must exist). Expo Router auto-discovers it. You do NOT need to manually register it in the Stack for the route to work, but add a `Stack.Screen name="deck/[deckId]"` entry in `app/_layout.tsx` if you want custom header options.  |
| Navigation from browser to detail fails   | Use `router.push(\`/deck/${deck.id}\`)`from`expo-router`. The `useRouter`hook provides`push`. Ensure the deck ID is a plain string (not a branded type) when passed to the URL.                                                                                                                |
| Deck list is empty                        | This is expected until Iteration 13 loads content. The empty state should display a helpful message. For development testing, you can temporarily insert a test deck in the `useDecks` hook or in a dev seed script.                                                                           |
| `getDb()` returns uninitialized DB        | The DB is initialized in `app/_layout.tsx` before the tabs mount. If the hook runs before DB init, add a guard. The `isDbReady` state in root layout ensures children only render after init.                                                                                                  |
| FlatList renders blank                    | Ensure `data` is not `undefined` (use `data ?? []`). Ensure `keyExtractor` returns a string. Ensure `renderItem` returns a valid React element.                                                                                                                                                |
| Dark theme not applying to new screens    | Use `useColorScheme` and the project's `Colors` constants or the `Themed` component wrappers. The deck browser background should match the app's dark theme (`#0B0B10`).                                                                                                                       |
| DeterministicTile needs a `type` for icon | For deck cover tiles, pass the deck's `category` as the `type` prop. The `iconForEntityType` function will return the fallback icon if the category isn't in the entity type map. Consider adding a `iconForDeckCategory` helper in `lib/tiles/` for better icons, or extend the existing map. |
| TypeScript error importing Deck type      | Import from the barrel: `import type { Deck, DeckId } from '@/types/domain'`. Never import from `types/domain/decks` directly (per the barrel convention).                                                                                                                                     |
| Accessibility for deck browser cards      | Each card should have `accessibilityRole="button"`, `accessibilityLabel` with the deck title and category, and `accessibilityHint="Opens deck detail"`.                                                                                                                                        |

## 7. Implementation checklist

### 7.1 Create data hooks

#### `hooks/useDecks.ts`

A hook that loads all decks from the database on mount. Pattern:

```typescript
interface UseDecksResult {
  decks: Deck[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}
```

Implementation:

- On mount, call `getDb()` then `getAllDecks(db)` from `lib/db/deckRepository`
- Manage `loading`, `error`, and `decks` state
- Expose a `refresh()` callback for pull-to-refresh
- Clean up with a `cancelled` flag pattern (same as `app/_layout.tsx` DB init)

#### `hooks/useDeckById.ts`

A hook that loads a single deck by ID.

```typescript
interface UseDeckByIdResult {
  deck: Deck | null;
  loading: boolean;
  error: Error | null;
}
```

Implementation:

- Accept `deckId: DeckId` parameter
- Call `getDeckById(db, deckId)` from `deckRepository`
- Handle not-found (return `deck: null` with `loading: false`, `error: null`)

### 7.2 Create deck browser components

#### `components/deck-browser/DeckBrowserCard.tsx`

A pressable card that renders a single deck in the browser list.

**Props:**

```typescript
interface DeckBrowserCardProps {
  deck: Deck;
  onPress: (deckId: DeckId) => void;
}
```

**Visual design:**

- Dark card surface (`rgba(255,255,255,0.06)`) matching the app's dark theme
- Rounded corners (16px border radius)
- Deck title — bold, white, prominent
- Deck category — smaller, muted color, below title
- Card count badge — e.g., "45 cards"
- Optional: A small icon from the deck's `coverTileKey` or category. If `coverTileKey` exists, render a small `DeterministicTile` with `variant="library"` as a visual anchor. If null, use a category-appropriate icon.
- If `sensitivity !== 'standard'`, show a subtle indicator (e.g., a small lock or shield icon)
- Pressable with press feedback (opacity change)

**Accessibility:**

- `accessibilityRole="button"`
- `accessibilityLabel` = `"${deck.title}, ${deck.category}, ${deck.cardCount} cards"`
- `accessibilityHint="View deck details"`

**Size:** Full-width card (with horizontal padding), not a grid cell. Vertical list is simpler for v1 and better for accessibility. Grid layout can be added in a future polish pass.

#### `components/deck-browser/DeckBrowserEmpty.tsx`

Rendered when `decks.length === 0` after loading completes.

**Content:**

- Title: "No decks yet"
- Subtitle: "Prebuilt decks will appear here once they're loaded."
- Optional: A subtle icon or illustration

**Accessibility:**

- `accessibilityRole="text"`
- `accessibilityLabel="No decks available. Prebuilt decks will appear here once loaded."`

#### `components/deck-browser/index.ts`

Barrel exports:

```typescript
export * from './DeckBrowserCard';
export * from './DeckBrowserEmpty';
```

### 7.3 Rewrite the Decks tab (index.tsx)

**File:** `app/(tabs)/index.tsx`

Replace the entire file content. Remove the inline swipe UI, the `SAMPLE_DECK_ENTITIES` array, and all imports from `@/components/deck` and `@/hooks/useDeckGestures`.

The new content is a deck browser screen:

**Structure:**

```
SafeAreaView
  ├── Header (title "Decks", subtitle "Choose a deck to explore")
  ├── FlatList of DeckBrowserCard items
  │   ├── Loading: ActivityIndicator
  │   ├── Empty: DeckBrowserEmpty
  │   ├── Error: error message + retry button
  │   └── Data: list of DeckBrowserCard
  └── (no action bar — that's the swipe screen)
```

**Behavior:**

- Use `useDecks()` hook to load deck list
- Render a `FlatList` with `DeckBrowserCard` items
- On card press: `router.push(\`/deck/${deck.id}\`)`
- Show loading spinner while `loading === true`
- Show `DeckBrowserEmpty` when `decks.length === 0 && !loading`
- Show error state with retry button when `error !== null`

**Styling:**

- Background: `#0B0B10` (matches current dark theme)
- Header padding with safe area insets (same pattern as current index.tsx)
- FlatList with `contentContainerStyle` padding

**What gets removed from this file:**

- `SAMPLE_DECK_ENTITIES` array
- All `DeckActionBar`, `DeckCard`, `DeckStatePlaceholder`, `dispatchDeckAction` imports
- All `useDeckGestures` usage
- All swipe state management (`isDispatchLocked`, `currentEntityIndex`, `lastPayload`, etc.)
- All gesture-related JSX (`GestureDetector`, `Animated.View`, action bar region)

### 7.4 Create deck detail screen

**New file:** `app/deck/[deckId].tsx`

A full Stack screen that displays comprehensive deck metadata.

**Data loading:**

- Extract `deckId` from route params via `useLocalSearchParams<{ deckId: string }>()`
- Convert to branded ID: `asDeckId(deckId)`
- Use `useDeckById(asDeckId(deckId))` hook to load the deck
- Handle loading, not-found, and error states

**Metadata to display** (from CLAUDE.md Section 4.2):

| Datum             | Source field              | Display                                             |
| ----------------- | ------------------------- | --------------------------------------------------- |
| Title             | `deck.title`              | Large heading                                       |
| Description       | `deck.description`        | Body text below heading                             |
| Category          | `deck.category`           | Subtitle or chip                                    |
| Card count        | `deck.cardCount`          | "45 cards"                                          |
| Profile threshold | `deck.minCardsForProfile` | "At least 15 cards for a basic profile"             |
| Compare threshold | `deck.minCardsForCompare` | "At least 30 cards for comparison"                  |
| Compare eligible  | `deck.compareEligible`    | Badge or chip: "Compare-eligible" or hidden         |
| Showdown eligible | `deck.showdownEligible`   | Badge or chip: "Showdown-eligible" or hidden        |
| Sensitivity       | `deck.sensitivity`        | If not 'standard': warning chip ("Sensitive topic") |
| Custom flag       | `deck.isCustom`           | If true: "Custom deck" badge                        |

**Visual layout (top to bottom):**

1. **Cover area** — If `coverTileKey` exists, show a `DeterministicTile` in `deck` variant as a hero. Otherwise, show a gradient header with the category icon and title.
2. **Title and description** — Large title, body description text.
3. **Metadata chips row** — Horizontal scroll of chips: category, card count, compare-eligible, showdown-eligible, sensitivity.
4. **Thresholds section** — "Profile requires X cards", "Compare requires Y cards".
5. **CTA button** — "Start Swiping" — prominent, bottom-anchored or end-of-scroll.

**CTA behavior for this iteration:**
The "Start Swiping" button is present and visible, but since swipe session wiring is Iteration 14, it should either:

- (Option A) Show a brief toast/alert: "Swipe sessions coming in a future update" — simplest
- (Option B) Navigate to a placeholder screen that says "Swipe session for [deck title] — coming soon"
- (Option C) Be visually present but disabled with helper text "Available once deck content is loaded"

Recommend **Option A** (toast/alert) for minimal code. The CTA must be clearly visible and prominently styled so the product flow is legible even before it's functional.

**Loading state:** Center-aligned spinner with "Loading deck..." text.

**Not-found state:** "Deck not found" message with a "Go back" button.

**Error state:** Error message with "Retry" button.

**Accessibility:**

- Screen reader should announce the deck title when the screen mounts
- All metadata chips should have `accessibilityLabel`s
- The CTA button needs `accessibilityRole="button"` and a clear hint

### 7.5 Register the deck detail route in root layout

**File:** `app/_layout.tsx`

Add a `Stack.Screen` entry for the deck detail route inside `RootLayoutNav`:

```typescript
<Stack.Screen
  name="deck/[deckId]"
  options={{ title: 'Deck Detail', headerShown: true }}
/>
```

The title can be overridden dynamically by the detail screen using navigation options if desired. The `headerShown: true` ensures a back button is visible for Stack pop navigation.

### 7.6 Add deck category icon helper (optional but recommended)

**New file:** `lib/tiles/iconForDeckCategory.ts`

Similar to `iconForEntityType.ts`, map deck category strings to Ionicons names:

```typescript
const CATEGORY_ICON_MAP: Record<string, TileIconName> = {
  movies_tv: 'film-outline',
  music: 'musical-notes-outline',
  food_drinks: 'restaurant-outline',
  travel: 'airplane-outline',
  lifestyle: 'sunny-outline',
  social_habits: 'people-outline',
  humor: 'happy-outline',
  relationship_preferences: 'heart-outline',
  values: 'shield-checkmark-outline',
  communication_style: 'chatbubbles-outline',
};
```

This helps both the browser card and the detail screen show meaningful icons per category. Export from `lib/tiles/index.ts`.

### 7.7 Write tests

#### `__tests__/use-decks.test.ts`

Test the `useDecks` hook with a mocked database:

- Returns empty array when no decks exist
- Returns deck list when decks exist
- Sets `loading: true` then `false`
- Sets `error` on DB failure
- `refresh()` reloads data

#### `__tests__/deck-browser-card.test.tsx`

Test `DeckBrowserCard`:

- Renders deck title and category
- Calls `onPress` with deck ID when pressed
- Shows sensitivity indicator for non-standard decks
- Has correct accessibility labels

#### `__tests__/deck-detail-screen.test.tsx` (optional but recommended)

Test the deck detail screen:

- Shows loading state initially
- Renders deck metadata after loading
- Shows "not found" for invalid ID
- CTA button is present and tappable

### 7.8 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

## 8. Deliverables

1. `app/(tabs)/index.tsx` rewritten as a deck browser — queries DB, renders FlatList, handles all states
2. `app/deck/[deckId].tsx` exists as a new Stack screen with full deck metadata display
3. `app/_layout.tsx` registers the `deck/[deckId]` route
4. `components/deck-browser/DeckBrowserCard.tsx` renders a single deck card with title, category, card count
5. `components/deck-browser/DeckBrowserEmpty.tsx` renders the empty state
6. `hooks/useDecks.ts` provides deck list from DB with loading/error/refresh
7. `hooks/useDeckById.ts` provides single deck from DB with loading/error
8. `SAMPLE_DECK_ENTITIES` array removed from the codebase
9. All swipe UI components in `components/deck/*` preserved untouched
10. All gesture hooks preserved untouched
11. Loading, empty, and error states work correctly on both screens
12. CTA button visible on deck detail (placeholder behavior)
13. Accessibility labels present on all interactive elements
14. Tests pass for hooks and components
15. All validation commands pass

## 9. Acceptance criteria

1. **Deck browser renders**: The "Decks" tab shows a scrollable list (or appropriate empty state) — not the old inline swipe UI.
2. **No swipe UI on Decks tab**: The old `DeckActionBar`, `DeckCard`, gesture surface, and `SAMPLE_DECK_ENTITIES` are completely absent from `app/(tabs)/index.tsx`.
3. **Navigation works**: Pressing a deck card in the browser navigates to `deck/[deckId]` and shows the detail screen.
4. **Back navigation works**: The detail screen has a back button that returns to the deck browser.
5. **Metadata displayed**: The deck detail screen shows: title, description, category, card count, profile threshold, compare threshold, compare eligibility, showdown eligibility, and sensitivity.
6. **Empty state**: When `getAllDecks()` returns an empty array, the browser shows a clear "No decks yet" message.
7. **Loading state**: Both screens show a loading indicator while data is being fetched.
8. **Error state**: Both screens handle DB errors with an error message and retry option.
9. **CTA present**: The deck detail screen has a "Start Swiping" button (placeholder behavior is acceptable).
10. **Accessibility**: All interactive elements have `accessibilityRole`, `accessibilityLabel`, and where appropriate `accessibilityHint`.
11. **Swipe components preserved**: `git diff components/deck/` shows no changes. `git diff hooks/useDeckGestures*` shows no changes.
12. **Tests pass**: `npm test` exits 0.
13. **Typecheck passes**: `npm run typecheck` exits 0.
14. **Lint passes**: `npm run lint` exits 0.
15. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence                        | Verification command                                                           |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Deck browser is the index tab   | Open the app → "Decks" tab shows a list or empty state, not swipe UI           |
| SAMPLE_DECK_ENTITIES removed    | `rg "SAMPLE_DECK_ENTITIES" app/` returns 0 hits                                |
| Deck detail route exists        | `ls app/deck/` shows `[deckId].tsx`                                            |
| Route registered in root layout | `rg "deck/\\[deckId\\]" app/_layout.tsx` returns a hit                         |
| Swipe components untouched      | `git diff components/deck/` — empty                                            |
| Gesture hooks untouched         | `git diff hooks/useDeckGestures.ts hooks/useDeckGestures.constants.ts` — empty |
| New hooks exist                 | `ls hooks/useDecks.ts hooks/useDeckById.ts` — both exist                       |
| New browser components exist    | `ls components/deck-browser/` — shows DeckBrowserCard, DeckBrowserEmpty, index |
| Tests pass                      | `npm test` exit code 0                                                         |
| Typecheck passes                | `npm run typecheck` exit code 0                                                |
| Lint passes                     | `npm run lint` exit code 0                                                     |
| Format passes                   | `npm run format -- --check` exit code 0                                        |

## 11. Validation commands

```bash
# Full validation suite
npm run typecheck
npm run lint
npm run format -- --check
npm test

# Verify old swipe UI removed from index
rg "SAMPLE_DECK_ENTITIES" app/
rg "DeckActionBar" app/\(tabs\)/index.tsx
rg "useDeckGestures" app/\(tabs\)/index.tsx

# Verify swipe components preserved
git diff --stat components/deck/
git diff --stat hooks/useDeckGestures.ts hooks/useDeckGestures.constants.ts

# Verify new files exist
ls app/deck/
ls components/deck-browser/
ls hooks/useDecks.ts
ls hooks/useDeckById.ts

# Verify route registration
rg "deck/" app/_layout.tsx

# Targeted test runs
npm test -- use-decks
npm test -- deck-browser
npm test -- deck-detail

# Verbose output for debugging
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 13 (Ship MVP prebuilt decks)

1. **Deck browser is live but empty.** The browser queries `getAllDecks()` which returns `[]` until Iteration 13 inserts prebuilt deck content. The empty state is intentional and shows "No decks yet."

2. **Schema is stable at version 4.** The `decks` and `deck_cards` tables exist with all columns. Iteration 13 will use `upsertDeck()` and `upsertDeckCard()` from the repositories to load content. No schema migration is needed.

3. **Deck detail screen is wired.** Once decks have content, navigating to `deck/[deckId]` will display all metadata. The `coverTileKey` field enables DeterministicTile cover art. The category icon helper (if created) provides per-category visual differentiation.

4. **"Start Swiping" CTA is placeholder.** The button exists on the detail screen but has placeholder behavior. Iteration 14 will wire it to a real deck-scoped swipe session route.

5. **DeckCard naming collision still pending.** The `DeckCard` UI component (`components/deck/DeckCard.tsx`) takes a `CatalogEntity` prop. The domain type `DeckCard` from Iteration 10 has different fields. Iteration 14 will need to resolve this — either rename the UI component, create an adapter, or define a shared interface.

6. **Data hooks pattern established.** `useDecks` and `useDeckById` follow a consistent `{ data, loading, error, refresh? }` pattern. Future hooks for deck profiles, compare sessions, etc. should follow the same shape.

7. **The `useDecks` hook refreshes on mount.** Iteration 13 should verify that after inserting decks via the content pipeline, the browser reflects the new content (it will if the screen remounts or `refresh()` is called).

8. **All swipe components are untouched and available.** `components/deck/DeckCard.tsx`, `DeckActionBar.tsx`, `DeckActionButton.tsx`, `DeckStatePlaceholder.tsx`, `deckActionPayload.ts`, `dispatchDeckAction.ts`, `deckState.ts` — all preserved. The swipe action model is finalized (`hard_no`, `no`, `skip`, `yes`, `strong_yes`). Iteration 14 wires these to a deck-scoped session.
