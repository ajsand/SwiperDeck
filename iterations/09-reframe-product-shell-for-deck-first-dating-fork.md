# Iteration 09: Reframe product shell for deck-first dating fork

## 1. Objective

Rebrand and reframe the inherited TasteDeck product shell so that every user-facing surface reflects DateDeck's deck-first, dating-oriented identity. Update product copy, tab information architecture, and branding strings while preserving all functional contracts (action dispatch, gesture resolution, DB infrastructure, tile rendering) untouched.

This is a copy-and-IA iteration, not a feature iteration. No new screens, no schema changes, no action model changes.

## 2. Why this matters

The fork begins from a working TasteDeck codebase that uses broad "taste profile" language, generic media categories, and a single-deck mental model. Before any functional fork work (schema refactors in Iteration 10, action renames in Iteration 11, deck browser in Iteration 12), the product shell must speak the language of DateDeck.

If this reframe doesn't happen first, every subsequent iteration will fight against stale copy, confusing tab names, and a mental model that doesn't match the product direction. Downstream iterations assume DateDeck branding and deck-first framing are already in place.

## 3. Scope

### In scope

- Rebrand `app.json` from TasteDeck to DateDeck (name, slug, scheme)
- Rename the SQLite database file constant from `tastedeck.db` to `datedeck.db`
- Update all user-facing strings across screens, placeholders, and accessibility labels
- Rename tab titles and update tab icons to reflect deck-first IA
- Replace "taste profile" framing with "deck profile" framing
- Replace "media types" language with "deck" language
- Update the root layout's initialization and error copy
- Update `docs/deck/DECK_ACTION_CONTRACT.md` header to clarify fork context
- Update `docs/MULTI_MODEL_WORKFLOW.md` to reflect fork model roles (Claude Opus 4.6 + GPT-5.4)
- Update test assertions that reference old product copy
- Run all validation commands and ensure green CI

### Out of scope

- **Action value renaming** (`love` → `strong_yes`) — deferred to Iteration 11
- **Schema changes** (new `decks`, `deck_cards` tables) — deferred to Iteration 10
- **Deck browser UI** — deferred to Iteration 12
- **Prebuilt deck content** — deferred to Iteration 13
- **Compare/report flows** — deferred to Iterations 16–18
- **Any modifications to these frozen files**: `types/domain/actions.ts`, `components/deck/deckActionPayload.ts`, `components/deck/dispatchDeckAction.ts`, `hooks/useDeckGestures.ts`, `hooks/useDeckGestures.constants.ts`
- **Navigation structural changes** (moving swipe to stack route) — deferred to Iteration 12
- **Centralized string constants file** — recommended but optional; may be deferred if scope feels tight

## 4. Multi-model execution strategy

| Step | Model           | Task                                                                   |
| ---- | --------------- | ---------------------------------------------------------------------- |
| 1    | Claude Opus 4.6 | Write this iteration file, review action contract compatibility (done) |
| 2    | GPT-5.4         | Execute all implementation checklist items                             |
| 3    | GPT-5.4         | Update test assertions, run full validation suite                      |
| 4    | Claude Opus 4.6 | Review output for product-copy alignment and spec drift                |

This is primarily an implementation task. GPT-5.4 handles all file modifications. Claude reviews the final copy for tone, spec alignment, and contract preservation.

### Action contract compatibility note

The `docs/deck/DECK_ACTION_CONTRACT.md` was originally written for the old TasteDeck backlog where Iteration 09 meant "persist swipe sessions and swipe events." In this fork, that original Iteration 09 scope is redistributed across Fork Iterations 10 and 14. The contract itself remains valid and frozen — this reframe iteration does not touch it functionally. GPT-5.4 should only add a header annotation clarifying the fork context.

Key compatibility facts:

- `CoreSwipeAction` = `'hard_no' | 'no' | 'skip' | 'yes' | 'love'` — unchanged in this iteration
- `DeckActionHandler` signature — frozen, no modification
- `DeckActionPayload` shape — frozen, no modification
- `dispatchDeckAction` lock semantics — frozen, no modification
- `resolveDeckSwipeAction` gesture mapping — frozen, no modification
- The fork's CLAUDE.md Section 7.1 specifies `strong_yes` (not `love`). That rename is explicitly scoped to Iteration 11. Do not anticipate it here.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document                | Relevant sections                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/CLAUDE.md`            | Section 0 (what this fork is), Section 1 (product principles), Section 2 (baseline inherited state), Section 3 (product definition), Section 4 (user flows) |
| `/CLAUDE.md`            | Section 7 (action model — note `strong_yes` naming target for Iteration 11)                                                                                 |
| `/CLAUDE.md`            | Section 13 (architecture direction — what to reuse vs replace)                                                                                              |
| `/CLAUDE.md`            | Section 19 (fork iteration backlog — understand sequencing)                                                                                                 |
| `/iterations/README.md` | Execution rules, model workflow, fork reminders                                                                                                             |

### Current repo implementation anchors

**Files to MODIFY (copy/branding only):**

| File                                        | What changes                                 |
| ------------------------------------------- | -------------------------------------------- |
| `app.json`                                  | name, slug, scheme → DateDeck                |
| `lib/db/client.ts`                          | `DATABASE_NAME` constant → `datedeck.db`     |
| `app/_layout.tsx`                           | DB init loading/error copy                   |
| `app/(tabs)/_layout.tsx`                    | Tab titles and icons                         |
| `app/(tabs)/index.tsx`                      | Screen header title, subtitle copy           |
| `app/(tabs)/profile.tsx`                    | Screen title and subtitle copy               |
| `app/(tabs)/library.tsx`                    | Screen title and subtitle copy               |
| `app/(tabs)/settings.tsx`                   | Screen subtitle copy                         |
| `app/(modals)/filter.tsx`                   | Placeholder text (iteration reference)       |
| `app/details/[id].tsx`                      | Screen title copy                            |
| `components/deck/DeckStatePlaceholder.tsx`  | Placeholder strings and accessibility labels |
| `components/deck/DeckCard.tsx`              | `accessibilityHint` string                   |
| `docs/deck/DECK_ACTION_CONTRACT.md`         | Header annotation for fork context           |
| `docs/MULTI_MODEL_WORKFLOW.md`              | Model roles update                           |
| `__tests__/navigation.test.tsx`             | Tab title assertions                         |
| `__tests__/deck-screen.test.tsx`            | Screen copy assertions                       |
| `__tests__/deck-state-placeholder.test.tsx` | Placeholder string assertions                |

**Files to PRESERVE (do not modify):**

| File                                     | Why frozen                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `types/domain/actions.ts`                | Action values, weights, labels — rename deferred to Iteration 11                 |
| `components/deck/deckActionPayload.ts`   | Callback contract — frozen                                                       |
| `components/deck/dispatchDeckAction.ts`  | Dispatch lock logic — frozen                                                     |
| `hooks/useDeckGestures.ts`               | Gesture resolution — frozen                                                      |
| `hooks/useDeckGestures.constants.ts`     | Gesture thresholds — frozen                                                      |
| `lib/db/migrations.ts`                   | Schema migrations — changes deferred to Iteration 10                             |
| `lib/db/runMigrations.ts`                | Migration runner — reused as-is                                                  |
| `lib/db/catalogRepository.ts`            | Repository functions — reused as-is                                              |
| `components/deck/DeckActionBar.tsx`      | Action bar rendering — frozen                                                    |
| `components/deck/DeckActionButton.tsx`   | Action button rendering — frozen (ACTION_HINTS use generic language, acceptable) |
| `components/tiles/DeterministicTile.tsx` | Tile system — reused as-is                                                       |
| `lib/tiles/*`                            | Tile utilities — reused as-is                                                    |
| All `types/domain/*.ts`                  | Domain types — no changes until Iteration 10                                     |

### Suggested file organization

No new directories needed. All changes are in-place modifications of existing files.

**Optional new file:**

| File                   | Purpose                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `constants/Strings.ts` | Centralized user-facing copy — makes future i18n and copy iteration easier. Not required but recommended. |

If created, screen files should import from it instead of hardcoding strings. If deferred, leave a TODO comment in one screen file noting the opportunity.

### External troubleshooting and learning resources

#### Official docs

- [Expo Router — File-based routing](https://docs.expo.dev/router/introduction/)
- [Expo Router — Tabs layout](https://docs.expo.dev/router/layouts/tabs/)
- [Expo app.json / app.config.js reference](https://docs.expo.dev/versions/latest/config/app/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)

#### Step-by-step guides

- [Expo Router tabs tutorial](https://docs.expo.dev/tutorial/add-navigation/)
- [Expo icon directory (icons.expo.fyi)](https://icons.expo.fyi/) — for verifying FontAwesome glyph names

#### YouTube

- Search "Expo Router tabs navigation 2025/2026" for recent walkthroughs of tab configuration in SDK 54+
- Search "React Native accessibility labels hints" for accessibilityLabel vs accessibilityHint best practices

#### GitHub repos

- [expo/expo — official example apps](https://github.com/expo/expo/tree/main/apps)
- [expo/router — routing pattern examples](https://github.com/expo/router/tree/main/apps)

#### Stack Overflow / discussion boards

- [expo-router tag on Stack Overflow](https://stackoverflow.com/questions/tagged/expo-router)
- [Expo forums](https://forums.expo.dev/)
- [React Navigation discussions](https://github.com/react-navigation/react-navigation/discussions)

#### Books / long-form references

- _React Native in Action_ (Manning) — navigation and accessibility chapters
- Expo documentation "Guides" section — production patterns and app.json schema

## 6. When stuck

| Problem                                        | Resolution                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab title not updating                         | The tab label comes from the `title` field inside `options` in `app/(tabs)/_layout.tsx`. Make sure the `name` prop still matches the route filename (e.g., `name="index"` for `index.tsx`).                                                                                                           |
| Tab icon not rendering                         | FontAwesome icon names are exact strings. Verify using [icons.expo.fyi](https://icons.expo.fyi/). The project imports `FontAwesome` (not Ionicons) for tab icons — `th-large` and `clock-o` are valid FontAwesome names.                                                                              |
| Tests fail after copy changes                  | Run `npm test -- --verbose` to identify which assertions fail. Search test files for old strings: `"TasteDeck"`, `"Taste Profile"`, `"taste"`, `"media types"`, `"Library"`. Update string assertions to match new copy.                                                                              |
| DB error after rename                          | Renaming `DATABASE_NAME` from `tastedeck.db` to `datedeck.db` creates a fresh database on any device that previously ran TasteDeck. This is expected for the fork. If tests rely on a pre-seeded DB, they will use the new name automatically since `client.ts` is the single source for the DB name. |
| Expo build cache stale after app.json change   | Run `npx expo prebuild --clean` to regenerate native config. For dev server, restart with `npx expo start --clear`.                                                                                                                                                                                   |
| Confused about which files are frozen          | Check the "Files to PRESERVE" table in Section 5. If a file appears there, do not modify it. The simplest check: `git diff <frozen-file>` should be empty after all changes.                                                                                                                          |
| Action contract doc says "Iteration 09"        | That refers to the original TasteDeck backlog where Iteration 09 was persistence wiring. In the fork, that scope moved to Iterations 10 and 14. Add a header annotation to the doc; do not change the contract's functional content.                                                                  |
| Unsure whether to rename `love` → `strong_yes` | Do NOT rename it. The fork's CLAUDE.md defines `strong_yes` as the target name, but the rename is explicitly scoped to Iteration 11. All current code uses `love` and that is correct for this iteration.                                                                                             |

## 7. Implementation checklist

### 7.1 Rebrand app.json

**File:** `app.json`

| Field         | Old value     | New value    |
| ------------- | ------------- | ------------ |
| `expo.name`   | `"TasteDeck"` | `"DateDeck"` |
| `expo.slug`   | `"tastedeck"` | `"datedeck"` |
| `expo.scheme` | `"tastedeck"` | `"datedeck"` |

No other fields change.

### 7.2 Rename database file constant

**File:** `lib/db/client.ts`

Change the `DATABASE_NAME` export:

```typescript
// Before
export const DATABASE_NAME = 'tastedeck.db';

// After
export const DATABASE_NAME = 'datedeck.db';
```

This is the only change in this file. The `openDb`, `getDb`, and `closeDb` functions are preserved.

### 7.3 Update root layout initialization copy

**File:** `app/_layout.tsx`

In `DbInitializationLoading`:

- `"Preparing local database..."` → `"Preparing your decks..."`
- `"TasteDeck is running startup migrations."` → `"DateDeck is setting up your local data."`

In `DbInitializationError`:

- `"Database initialization failed"` → keep as-is (generic, appropriate)
- `"Please restart the app. If this continues, clear app data and try again."` → keep as-is

No structural changes. The DB init flow, error handling, font loading, and `RootLayoutNav` structure remain identical.

### 7.4 Restructure tab layout

**File:** `app/(tabs)/_layout.tsx`

Update each `Tabs.Screen` options:

| Route name | Old title    | New title    | Old icon  | New icon        |
| ---------- | ------------ | ------------ | --------- | --------------- |
| `index`    | `"Deck"`     | `"Decks"`    | `"clone"` | `"th-large"`    |
| `profile`  | `"Profile"`  | `"Profile"`  | `"user"`  | `"user"` (keep) |
| `library`  | `"Library"`  | `"History"`  | `"book"`  | `"clock-o"`     |
| `settings` | `"Settings"` | `"Settings"` | `"cog"`   | `"cog"` (keep)  |

The `TabBarIcon` component, `initialRouteName`, `screenOptions`, and color scheme logic remain unchanged.

### 7.5 Reframe Deck screen (index tab)

**File:** `app/(tabs)/index.tsx`

Update header copy in the JSX:

- `"Deck"` → `"Decks"`
- `"Swipe to teach your taste."` → `"React to what resonates with you."`

**Do not change:**

- The `SAMPLE_DECK_ENTITIES` array (these placeholders get replaced in Iteration 13)
- The `onUnifiedAction` callback or `dispatchDeckAction` call
- The `useDeckGestures` hook usage
- The gesture/animation/lock logic
- The `DeckActionBar` or `DeckCard` rendering
- Any imports

### 7.6 Reframe Profile screen

**File:** `app/(tabs)/profile.tsx`

- `"Taste Profile"` → `"Deck Profiles"`
- `"Your taste profile updates as you swipe."` → `"Each deck builds its own profile as you swipe."`

### 7.7 Reframe Library screen

**File:** `app/(tabs)/library.tsx`

- `"Library"` → `"History"`
- `"Review your liked, disliked, and skipped items."` → `"Review your swipe history across decks."`

### 7.8 Reframe Settings screen

**File:** `app/(tabs)/settings.tsx`

- `"Settings"` → keep as `"Settings"`
- `"Export data, clear history, and manage preferences."` → `"Manage your data, privacy, and preferences."`

### 7.9 Update DeckStatePlaceholder copy

**File:** `components/deck/DeckStatePlaceholder.tsx`

Apply these copy changes. Only modify string literals — do not change component structure, props, styles, or memo wrapper.

| State   | Element                    | Old copy                                                       | New copy                                                                       |
| ------- | -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| loading | `accessibilityLabel`       | `"Loading next card"`                                          | keep                                                                           |
| loading | title `<Text>`             | `"Loading cards..."`                                           | keep                                                                           |
| loading | message `<Text>`           | `"Preparing your next swipe choices."`                         | `"Loading your next card."`                                                    |
| empty   | `accessibilityLabel`       | `"No cards found. Try adjusting filters or broadening types."` | `"No cards in this deck. Try adjusting filters or choosing a different deck."` |
| empty   | title `<Text>`             | `"No cards found"`                                             | `"No cards in this deck"`                                                      |
| empty   | message `<Text>`           | `"Try adjusting filters or broadening media types."`           | `"Try adjusting filters or choosing a different deck."`                        |
| empty   | button label               | `"Adjust filters"`                                             | keep                                                                           |
| empty   | button `accessibilityHint` | `"Opens filtering options to broaden deck results"`            | keep                                                                           |
| error   | `accessibilityLabel`       | `"Something went wrong loading cards"`                         | keep                                                                           |
| error   | title `<Text>`             | `"Unable to load cards"`                                       | keep                                                                           |
| error   | fallback message           | `"A recoverable error occurred while loading Deck."`           | `"A recoverable error occurred while loading this deck."`                      |

### 7.10 Update DeckCard accessibility hint

**File:** `components/deck/DeckCard.tsx`

Change the `accessibilityHint` on the card container `View`:

- Old: `"Swipe right to like, left to dislike, or use buttons below"`
- New: `"Swipe right to react positively, left negatively, or use action buttons below"`

This keeps the hint generic enough to work with both current action names (`love`/`yes`) and the future rename (`strong_yes`/`yes` in Iteration 11).

Do not change any other part of `DeckCard`: the `buildA11yLabel` function, `DeterministicTile` rendering, `DeckTagsRow`, props interface, or styles.

### 7.11 Update filter modal placeholder

**File:** `app/(modals)/filter.tsx`

The current placeholder text says `"Filter controls land here in Iteration 16."` This references the old TasteDeck backlog. Update it to reference the fork's iteration context. The deck filtering UX relates to Fork Iterations 12–13 (deck selection and deck content).

Replace with: `"Deck filtering controls will be added in a future iteration."`

### 7.12 Update details screen

**File:** `app/details/[id].tsx`

- `"Entity Detail"` → `"Card Detail"`

The `ID: {id}` display line is a dev-facing diagnostic; it can stay as-is or be changed to `Card: {id}`.

### 7.13 Annotate DECK_ACTION_CONTRACT.md for fork context

**File:** `docs/deck/DECK_ACTION_CONTRACT.md`

Add a fork context block immediately below the existing title line `# Deck Action Callback Contract (Frozen for Iteration 09)`. Insert:

```markdown
> **Fork context (DateDeck):**
> This contract was originally written for the TasteDeck backlog where Iteration 09 was "Persist swipe sessions and swipe events." In the DateDeck fork, the iteration numbering shifted:
>
> - Fork Iteration 09 = Reframe product shell (this does not touch the action contract)
> - Fork Iteration 11 = Rename `love` → `strong_yes` (action model change)
> - Fork Iteration 14 = Refactor swipe/session logic to deck scope (persistence wiring)
>
> The contract's callback signatures, payload shapes, dispatch semantics, and statelessness invariants remain valid and frozen until explicitly scoped for modification.
```

Do not change any other content in the file.

### 7.14 Update MULTI_MODEL_WORKFLOW.md for fork

**File:** `docs/MULTI_MODEL_WORKFLOW.md`

Make these updates:

- Change the header/title to reference DateDeck fork
- Update "Last updated" date
- Update "Applies to" to reference Fork Iterations 09–25
- Replace "GPT-5.3 Codex" with "GPT-5.4" throughout
- Remove or deprioritize Gemini references (the fork's `CLAUDE.md` Section 16 defines only Claude and GPT-5.4)
- Update the Model Roles table to match `CLAUDE.md` Section 16.1
- Update any TasteDeck-specific references to say DateDeck

### 7.15 Update tests

Read each affected test file and update assertions that reference old product copy. The goal is to make all tests pass with the new copy.

**Files likely needing assertion updates:**

| Test file                                   | Expected changes                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `__tests__/navigation.test.tsx`             | Tab titles: `"Deck"` → `"Decks"`, `"Library"` → `"History"`. Tab icon names if asserted.      |
| `__tests__/deck-screen.test.tsx`            | Screen title text: `"Deck"` → `"Decks"`, subtitle: `"Swipe to teach your taste."` → new copy. |
| `__tests__/deck-state-placeholder.test.tsx` | Placeholder strings: `"media types"` → `"deck"` language, `"swipe choices"` → new copy.       |

**Files that must NOT change:**

| Test file                                       | Why                            |
| ----------------------------------------------- | ------------------------------ |
| `__tests__/actions.test.ts`                     | Action values unchanged        |
| `__tests__/deck-action-bar.test.tsx`            | Action bar rendering unchanged |
| `__tests__/deck-action-dispatch-parity.test.ts` | Dispatch parity unchanged      |
| `__tests__/dispatch-deck-action.test.ts`        | Dispatch logic unchanged       |
| `__tests__/use-deck-gestures.test.ts`           | Gesture logic unchanged        |
| `__tests__/domain-models.test.ts`               | Domain types unchanged         |
| `__tests__/schema-check.test.ts`                | Schema unchanged               |
| `__tests__/db-migrations.test.ts`               | Migrations unchanged           |
| `__tests__/tiles/*.test.ts(x)`                  | Tile system unchanged          |

**Process:** Read each affected test file first. Identify string assertions. Update them to match the new copy from checklist items 7.3–7.12. Run `npm test -- --verbose` to verify.

### 7.16 Run full validation

After all changes are complete:

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

All four must exit 0.

## 8. Deliverables

1. `app.json` reflects DateDeck branding (name, slug, scheme)
2. `lib/db/client.ts` uses `'datedeck.db'` as the database filename
3. `app/_layout.tsx` initialization copy references DateDeck, not TasteDeck
4. `app/(tabs)/_layout.tsx` tab titles are `Decks`, `Profile`, `History`, `Settings` with updated icons
5. All four tab screen files use deck-first, dating-oriented placeholder copy
6. `DeckStatePlaceholder` uses deck-scoped language (no "media types" references)
7. `DeckCard` accessibility hint uses generic action language compatible with future renames
8. `app/(modals)/filter.tsx` placeholder references fork iteration context
9. `app/details/[id].tsx` uses "Card Detail" framing
10. `docs/deck/DECK_ACTION_CONTRACT.md` has fork context annotation
11. `docs/MULTI_MODEL_WORKFLOW.md` reflects fork model roles (Claude Opus 4.6 + GPT-5.4)
12. All action contract files are byte-identical to pre-iteration state
13. All tests pass with updated assertions
14. Typecheck, lint, and format checks all pass

## 9. Acceptance criteria

1. **Branding**: `app.json` contains `"DateDeck"` as name, `"datedeck"` as slug and scheme.
2. **Database**: `lib/db/client.ts` exports `DATABASE_NAME = 'datedeck.db'`.
3. **Tab IA**: Bottom tabs read "Decks", "Profile", "History", "Settings" with appropriate icons.
4. **No TasteDeck remnants**: A case-insensitive search for `"TasteDeck"` across `app/`, `components/`, `constants/`, and `lib/db/client.ts` returns zero hits. (Doc files in `docs/` may retain annotated historical references.)
5. **No "taste profile" remnants**: No user-facing string in `app/` or `components/` contains "taste profile."
6. **No "media types" remnants**: No user-facing string in `app/` or `components/` contains "media types."
7. **Action contract preserved**: These files have zero `git diff`: `types/domain/actions.ts`, `components/deck/deckActionPayload.ts`, `components/deck/dispatchDeckAction.ts`, `hooks/useDeckGestures.ts`, `hooks/useDeckGestures.constants.ts`.
8. **Action values preserved**: `ACTIONS`, `CORE_ACTIONS`, `ACTION_WEIGHTS`, `ACTION_LABELS`, and `CORE_ACTION_LABELS` objects are identical to pre-iteration state.
9. **Tests pass**: `npm test` exits 0.
10. **Typecheck passes**: `npm run typecheck` exits 0.
11. **Lint passes**: `npm run lint` exits 0.
12. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence                         | Verification command                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| app.json says DateDeck           | `Select-String -Path app.json -Pattern "datedeck" -CaseSensitive` returns name, slug, scheme lines |
| DB uses datedeck.db              | `Select-String -Path lib/db/client.ts -Pattern "datedeck.db"` returns the constant                 |
| No TasteDeck in user-facing code | `rg -i "tastedeck" app/ components/ constants/ lib/db/client.ts` returns 0 hits                    |
| No "taste profile" in screens    | `rg -i "taste profile" app/ components/` returns 0 hits                                            |
| No "media types" in screens      | `rg -i "media types" app/ components/` returns 0 hits                                              |
| Action types unchanged           | `git diff types/domain/actions.ts` shows no output                                                 |
| Action payload unchanged         | `git diff components/deck/deckActionPayload.ts` shows no output                                    |
| Dispatch unchanged               | `git diff components/deck/dispatchDeckAction.ts` shows no output                                   |
| Gestures unchanged               | `git diff hooks/useDeckGestures.ts` shows no output                                                |
| Gesture constants unchanged      | `git diff hooks/useDeckGestures.constants.ts` shows no output                                      |
| Tests pass                       | `npm test` exit code 0                                                                             |
| Typecheck passes                 | `npm run typecheck` exit code 0                                                                    |
| Lint passes                      | `npm run lint` exit code 0                                                                         |
| Format passes                    | `npm run format -- --check` exit code 0                                                            |

## 11. Validation commands

```bash
# Full validation suite
npm run typecheck
npm run lint
npm run format -- --check
npm test

# Branding verification
rg -i "tastedeck" app/ components/ constants/ lib/db/client.ts
rg -i "taste profile" app/ components/
rg -i "media types" app/ components/

# Contract preservation verification
git diff --stat types/domain/actions.ts components/deck/deckActionPayload.ts components/deck/dispatchDeckAction.ts hooks/useDeckGestures.ts hooks/useDeckGestures.constants.ts

# Verbose test run (for debugging failures)
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 10 (Introduce first-class `decks` and `deck_cards`)

1. **Database file**: The DB is now `datedeck.db`. New migrations should continue from the existing migration version in `lib/db/migrations.ts`. The migration framework (`runMigrations.ts`) and DB client (`client.ts`) are reused as-is.

2. **Action model state**: Action values remain `hard_no`, `no`, `skip`, `yes`, `love` with the original weights. The fork's CLAUDE.md specifies `strong_yes` as the target name, but the `love` → `strong_yes` rename is scoped to Iteration 11. Schema design in Iteration 10 should use the canonical fork action set (`hard_no`, `no`, `skip`, `yes`, `strong_yes`) in documentation and new type definitions, but the existing `actions.ts` file and its exports must not be modified until Iteration 11.

3. **Tab IA**: The first tab is titled "Decks" but still shows the inherited inline swipe UI with sample TasteDeck entities. Iteration 10 adds the `decks` and `deck_cards` domain models and tables. Iteration 12 builds the deck browser UI that will replace the inline swipe screen as the default tab view.

4. **Sample entities**: The `SAMPLE_DECK_ENTITIES` array in `app/(tabs)/index.tsx` still contains inherited TasteDeck placeholder data (movies, books, podcasts). This gets replaced when dating-relevant deck content is authored in Iteration 13.

5. **Preserved contracts**: All deck UI components remain stateless and presentation-only. The `DeckActionHandler` callback signature is frozen. Iteration 10's schema work should not require modifying any component in `components/deck/`.

6. **DECK_ACTION_CONTRACT.md**: Now annotated with fork context. The original "Iteration 09 Handoff" section (Section 7 of that doc) contains useful persistence-wiring guidance that applies when Iteration 14 scopes deck-specific session and swipe logic.

7. **Relationship to old TasteDeck code at this point**:
   - **Reused as-is**: App shell, DB init/migration framework, gesture system, tile system, action dispatch, all domain types
   - **Refactored (copy only)**: All screen copy, tab layout, branding strings, placeholder messages, accessibility text
   - **Not yet replaced**: Schema (Iteration 10), action names (Iteration 11), navigation structure (Iteration 12), catalog content (Iteration 13)
