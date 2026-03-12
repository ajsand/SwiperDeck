# Iteration 21: Add local custom deck creation and import

## 1. Objective

Add local custom deck creation and import while keeping a clear boundary between:

- prebuilt decks with richer tag-aware sequencing support
- custom decks that may not yet have the same metadata richness or sequencing guarantees

Custom decks remain local-only by default.

This iteration must also respect the navigation and session model introduced by 20B:

- custom deck creation, import, browser, and detail flows are normal app navigation and should stay inside the persistent bottom-nav shell
- custom decks must not reintroduce a route structure where ordinary drill-down hides the tab bar

## 2. Why this matters

Custom decks are part of the DateDeck vision, but the fork now has a clear asymmetry:

- prebuilt decks have canonical taxonomy, tag state, coverage-aware sequencing, and stronger compare/report foundations
- custom decks do not automatically inherit all of that just because they use the same storage tables

This iteration has to add custom deck support without pretending parity already exists.

It also has to avoid reintroducing the pre-20B app-shell problem where new deck-related screens bypass the normal tabbed navigation model.

## 3. Scope

### In scope

- add local custom deck creation flows
- add local custom deck import flows
- validate and store custom decks/cards safely
- expose custom decks in the deck browser/detail flows
- place custom deck create/import/detail surfaces inside the normal deck-navigation shell
- make the prebuilt/custom capability boundary explicit in product copy and logic

### Out of scope

- public/community deck sharing
- automatic canonical taxonomy generation for custom decks
- automatic parity with prebuilt sequencing
- cloud sync for custom decks

### Reuse / refactor / replace

| Category   | What happens                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Reused     | Existing `decks` / `deck_cards` tables, deck browser/detail flows, validation patterns from Iterations 13 and 14A |
| Refactored | Validation and load/import code should branch between prebuilt and custom deck constraints                        |
| Replaced   | The assumption that all decks in the app are editorial prebuilt decks                                             |

## 4. Downstream dependency note

This iteration depends on 14A-14G mainly as a boundary-setting step:

- prebuilt decks have richer sequencing guarantees
- custom decks should not silently claim those guarantees unless later work explicitly adds them

It also depends on existing deck storage and UI from 10-14 and on 20B's navigation/session rules:

- custom deck management screens are normal tab-owned navigation surfaces
- live swiping, if later enabled for custom decks, should still use the same session-envelope model rather than a persisted session queue

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define custom-deck import/create types and validation rules.
2. Build local creation/import flows.
3. Integrate custom decks into browser/detail surfaces.
4. Add tests and explicit product-boundary copy.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.1, 5.3, 11, 16, and 19
- `/iterations/13-ship-mvp-prebuilt-decks.md`
- `/iterations/14a-add-prebuilt-deck-tag-taxonomy-and-card-tag-metadata.md`
- `/iterations/20b-refine-navigation-consistency-and-cross-session-deck-swiping.md`
- `/iterations/README.md`

### Current repo implementation anchors

- `lib/content/validateDeck.ts`
- `lib/content/loadPrebuiltDecks.ts`
- `lib/db/deckRepository.ts`
- `lib/db/deckCardRepository.ts`
- `types/domain/decks.ts`
- `app/(tabs)/index.tsx`
- `app/deck/[deckId].tsx`

### Suggested file organization

```text
types/domain/customDecks.ts
lib/customDecks/validateCustomDeck.ts
lib/customDecks/importCustomDeck.ts
lib/customDecks/createCustomDeck.ts
app/deck/custom/new.tsx
app/deck/custom/import.tsx
__tests__/custom-deck-import.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- Expo Router docs
- Expo SQLite docs
- React Native form/input docs

#### Step-by-step guides

- Existing prebuilt deck validation/import iteration files
- Existing repo deck browser/detail test patterns

#### YouTube

- React Native form and file-import walkthroughs if blocked

#### GitHub repos

- `expo/expo`
- `callstack/react-native-testing-library`

#### Stack Overflow/discussion boards

- React Native local-file import discussions
- SQLite validation/import discussions

#### Books/long-form references

- Local-first software references
- Privacy-by-design references

## 7. When stuck

| Problem                                                              | Resolution                                                                                   |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Custom deck validation keeps copying prebuilt rules verbatim         | Separate the rules. Prebuilt taxonomy guarantees do not automatically apply to custom decks. |
| The UI starts implying custom decks get the same sequencing quality  | Add explicit product copy and internal flags that preserve the boundary.                     |
| Import wants to depend on cloud formats                              | Keep it local-only in this iteration.                                                        |
| The custom deck model starts drifting into public/community features | Stop. That is out of scope here.                                                             |

## 8. Implementation checklist

1. Define custom-deck types and source shapes.
2. Create validation rules for custom deck import/create flows.
3. Decide supported local import formats such as:
   - app JSON format
   - CSV, if practical
4. Store custom decks in the existing deck tables with explicit custom flags.
5. Add local creation/import screens.
6. Integrate custom decks into browser/detail flows without breaking the persistent bottom-nav shell.
7. Add product-boundary copy explaining that custom decks may not have the same sequencing/report quality as prebuilt decks.
8. Add tests for:
   - validation failures
   - successful import
   - browser/detail visibility
   - navigation visibility for custom deck create/import/detail flows

## 9. Deliverables

1. Local custom deck types and validation.
2. Local custom deck creation/import flows.
3. Browser/detail support for custom decks.
4. Tests and copy that preserve the prebuilt/custom capability boundary.

## 10. Acceptance criteria

1. Users can create or import custom decks locally.
2. Custom decks are stored safely and appear in deck flows.
3. The app does not silently claim prebuilt tag-aware sequencing quality for custom decks.
4. Custom decks remain local-only by default.
5. Custom deck create/import/detail screens behave like normal tab-owned navigation and do not hide the bottom nav.
6. Validation and import tests pass.

## 11. Definition of done evidence

| Evidence                         | Verification command                       |
| -------------------------------- | ------------------------------------------ |
| Custom deck types exist          | `ls types/domain/customDecks.ts`           |
| Custom deck validator exists     | `ls lib/customDecks/validateCustomDeck.ts` |
| Custom deck import helper exists | `ls lib/customDecks/importCustomDeck.ts`   |
| Custom deck create screen exists | `ls app/deck/custom/new.tsx`               |
| Custom deck tests exist          | `ls __tests__/custom-deck-import.test.ts`  |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- custom-deck-import
npm test
```

## 13. Notes for next iteration

1. Iteration 22 should add compare support for custom decks with bounded confidence and quality claims.
2. Do not extend prebuilt-only taxonomy/sequence guarantees unless a later iteration explicitly adds the needed metadata and safeguards.
3. Keep import/export strictly local in this phase.
4. If custom deck swiping is extended later, preserve 20B's rule that session boundaries do not own future queue state.
