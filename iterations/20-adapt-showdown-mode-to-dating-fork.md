# Iteration 20: Adapt showdown mode to dating fork

## 1. Objective

Adapt showdown mode so it works as a bounded, deck-scoped secondary mode in DateDeck.

This iteration must account for:

- deck-scoped showdown built on prebuilt-deck sequencing/profile assumptions
- fair, representative card selection in a group context
- lighter summaries that still benefit from tag/theme structure
- exclusions for sensitive decks and tags

## 2. Why this matters

Showdown is not the core product, but if it exists it should reinforce DateDeck's tone rather than undermine it.

A direct carry-over from older TasteDeck-style showdown logic would miss the new fork realities:

- decks are now the core unit
- prebuilt decks have richer sequencing structure
- some decks or sub-areas are not safe for group play

## 3. Scope

### In scope

- define deck-scoped showdown session types and routes
- add showdown card-selection rules for eligible decks
- keep selection fair and representative in group contexts
- add a light showdown summary that can use theme/tag structure when available
- enforce sensitive deck exclusions and caution rules

### Out of scope

- remote invite flows
- public multiplayer discovery
- showdown for blocked sensitive decks
- custom-deck showdown parity

### Reuse / refactor / replace

| Category   | What happens                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Reused     | Existing deck/card model, timing/session ideas from TasteDeck, compare/report safety rules, deck sensitivity metadata |
| Refactored | Showdown becomes deck-scoped and safety-filtered instead of a generic card stream                                     |
| Replaced   | Any older showdown logic that ignores deck structure, sensitivity, or representative card cadence                     |

## 4. Downstream dependency note

This iteration depends on 14A-14G because showdown card selection should still respect deck structure, breadth, and fairness.

It also depends on 19 because showdown must inherit sensitive deck and tag exclusions rather than invent its own policy.

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define showdown types and route structure.
2. Implement showdown card selection for eligible decks.
3. Add light summary generation.
4. Add safety exclusions and tests.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.6, 10, 11.6, 14, and 19
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/19-add-sensitive-deck-gating-and-report-safeguards.md`

### Current repo implementation anchors

- `app/deck/[deckId]/play.tsx`
- `hooks/useDeckSwipeSession.ts`
- `assets/data/prebuilt-decks.json`
- `assets/data/prebuilt-deck-policy.json` once Iteration 19 lands

### Suggested file organization

```text
types/domain/showdown.ts
lib/showdown/showdownCardSelection.ts
lib/showdown/buildShowdownSummary.ts
app/showdown/create.tsx
app/showdown/[sessionId].tsx
__tests__/showdown-card-selection.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- Expo Router docs
- React Native timing/input docs
- Expo SQLite docs

#### Step-by-step guides

- Existing swipe/play iteration docs
- Existing compare/safety iteration docs

#### YouTube

- React Native timer/state-machine walkthroughs if blocked

#### GitHub repos

- `expo/expo`
- `callstack/react-native-testing-library`

#### Stack Overflow/discussion boards

- React Native timer and multiplayer state discussions

#### Books/long-form references

- Privacy-by-design references for group sharing boundaries

## 7. When stuck

| Problem                                         | Resolution                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Showdown starts looking like the main product   | Keep it secondary, playful, and bounded in scope.                                    |
| Card selection becomes too chaotic in groups    | Favor representative, fair, deck-scoped cards rather than highly personalized picks. |
| Sensitive content slips in                      | Reuse the policy layer from Iteration 19. Do not duplicate or bypass it.             |
| Summary output turns into a full compare report | Keep showdown lighter and more group-oriented.                                       |

## 8. Implementation checklist

1. Define showdown types such as:
   - `ShowdownSession`
   - `ShowdownParticipant`
   - `ShowdownSummary`
2. Implement showdown card selection for eligible decks:
   - use representative card cadence
   - avoid hyper-personalized or overly narrow card runs
   - respect safety policy exclusions
3. Build a lightweight summary that can surface:
   - strongest group alignments
   - major split topics
   - surprise consensus
   - conversation spark cards
4. Block or exclude sensitive decks/tags per policy.
5. Add tests for:
   - representative selection
   - sensitive deck exclusion
   - summary shape

## 9. Deliverables

1. Deck-scoped showdown types and routes.
2. Fair group card-selection logic.
3. A lighter showdown summary.
4. Safety-aware showdown tests.

## 10. Acceptance criteria

1. Showdown runs on a deck-specific card set, not a generic global stream.
2. Card selection is fair and representative for group contexts.
3. Sensitive decks/tags are excluded or constrained appropriately.
4. Summary output stays lighter than one-to-one compare reports.
5. Showdown remains secondary and bounded.

## 11. Definition of done evidence

| Evidence                     | Verification command                           |
| ---------------------------- | ---------------------------------------------- |
| Showdown types exist         | `ls types/domain/showdown.ts`                  |
| Card-selection module exists | `ls lib/showdown/showdownCardSelection.ts`     |
| Summary builder exists       | `ls lib/showdown/buildShowdownSummary.ts`      |
| Showdown tests exist         | `ls __tests__/showdown-card-selection.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- showdown-card-selection
npm test
```

## 13. Notes for next iteration

1. Iteration 21 should keep custom deck authoring/import separate from the richer prebuilt sequencing stack.
2. Do not quietly enable showdown for custom or sensitive decks without explicit policy work.
3. Keep group summaries grounded and lightweight so they do not blur into report creep.
