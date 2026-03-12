# Iteration 14C: Implement broad-start representative sequencing for prebuilt decks

## 1. Objective

Implement the early-stage sequencing policy for prebuilt decks before the app has strong personalization signal.

The algorithm should:

- start broad
- cover representative areas of the deck
- use prebuilt card/tag metadata to avoid skewed early learning
- avoid jumping too quickly into one sub-area
- build a balanced profile foundation

This is the cold-start-inside-a-deck logic for prebuilt decks.

## 2. Why this matters

The current repo still has a simple ordering path rooted in `sort_order` and `popularity`. That is enough to get cards on screen, but not enough to produce trustworthy within-deck learning.

Without a deliberate broad-start strategy:

- early swipes over-shape the rest of the session too quickly
- the user may only see one slice of a category
- profile confidence will look stronger than it should
- compare/report quality will suffer later because the app never explored the deck properly

Broad-start sequencing is the first real anti-overfit rule inside a deck.

## 3. Scope

### In scope

- add a prebuilt-deck broad-start strategy that runs before mature personalization
- use canonical tags/facets from 14A plus tag state from 14B
- choose cards to maximize representative coverage during the early window
- refactor the current play/session ordering path to call the new strategy
- produce deterministic, explainable selection reasons
- add scenario tests for early deck sequencing

### Out of scope

- the full mature next-card scoring function
- later-stage diversity guardrails
- retest/resurfacing logic
- custom deck sequencing parity
- cloud or ML-driven ranking

### Relationship to old generic sequencing logic

| Category   | What happens                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Reused     | Existing swipe session flow, deck card repositories, canonical tag metadata, and deck tag state inputs                         |
| Refactored | The current `sort_order` / `popularity` ordering path becomes a fallback, not the primary cold-start policy for prebuilt decks |
| Replaced   | The assumption that author order alone should control the early deck experience                                                |

## 4. Multi-model execution strategy

Workflow note: execute with GPT-5.4 Extra High only.

| Step | Model              | Task                                                                        |
| ---- | ------------------ | --------------------------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Add deck-sequencing types and a broad-start strategy helper                 |
| 2    | GPT-5.4 Extra High | Wire the strategy into `useDeckSwipeSession` / play flow for prebuilt decks |
| 3    | GPT-5.4 Extra High | Add deterministic selection explanations and scenario tests                 |
| 4    | GPT-5.4 Extra High | Validate fallback behavior for sparse or oddly shaped decks                 |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.3, 8, and 14
- `/iterations/14a-add-prebuilt-deck-tag-taxonomy-and-card-tag-metadata.md`
- `/iterations/14b-add-tag-level-deck-state-and-typed-models.md`

### Current repo implementation anchors

- `hooks/useDeckSwipeSession.ts`
- `app/deck/[deckId]/play.tsx`
- `lib/db/deckCardRepository.ts`
- `lib/db/swipeRepository.ts`
- `lib/db/deckTagRepository.ts`
- `assets/data/prebuilt-decks.json`

### Suggested file organization

```text
lib/sequence/deckSequenceTypes.ts
lib/sequence/broadStartStrategy.ts
lib/sequence/explainSequenceDecision.ts
hooks/useDeckSwipeSession.ts
__tests__/broad-start-strategy.test.ts
__tests__/deck-swipe-session.test.ts
```

### External troubleshooting and learning resources

- Expo Router and React Native docs for route/hook wiring
- SQLite docs if any supporting query/index work is needed
- existing repo tests around swipe sessions and profile computation

## 6. When stuck

| Problem                                                      | Resolution                                                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Unsure how long broad start should last                      | Use a deterministic early window such as `max(8, ceil(deck.card_count * 0.2))`, then tune later with the evaluation harness. |
| The deck cannot cover every tag cleanly                      | Fall back to facet coverage first, then representative primary tags.                                                         |
| `sort_order` and coverage goals disagree                     | Use `sort_order` and `popularity` as priors, not hard ordering. Coverage wins during broad start.                            |
| The same primary tag keeps resurfacing because it is popular | Add a repeat penalty. Broad start is about breadth before depth.                                                             |
| Temptation to apply this to custom decks                     | Do not. This iteration is prebuilt-only because it relies on canonical tags and editorial metadata.                          |

## 7. Implementation checklist

1. Add sequencing types such as:
   - `DeckSequenceStage = 'broad_start' | 'adaptive'`
   - `DeckSequenceDecision`
   - `DeckSequenceReason`
2. Define the broad-start entry condition for prebuilt decks:
   - before the deck reaches a configured coverage threshold
   - or before the deck exits an early-card window
3. Build a candidate selector that prefers:
   - unswiped cards
   - cards from undercovered facets
   - cards whose primary tags are underexposed
   - representative cards with strong editorial priors (`sort_order`, `popularity`)
4. Add penalties for:
   - repeating the same primary tag too soon
   - repeating the same facet too often in a small rolling window
5. Add deterministic tie-breaking:
   - stable score ordering
   - then `sort_order`
   - then `card.id`
6. Return an explanation object for each choice:
   - `undercovered_facet`
   - `undercovered_tag`
   - `representative_pick`
   - `repeat_penalty_applied`
7. Refactor `useDeckSwipeSession.ts` so the play flow uses this strategy for prebuilt decks and keeps the old ordering path as a fallback.
8. Add scenario tests for:
   - initial deck start with no signal
   - early streak of positive swipes in one tag
   - deck with uneven tag distribution
   - deterministic tie cases

## 8. Deliverables

1. A broad-start sequencing strategy for prebuilt decks.
2. Integration into the existing swipe/play flow.
3. Deterministic explanation output for early next-card decisions.
4. Scenario tests covering representative early sequencing.

## 9. Acceptance criteria

1. Prebuilt decks no longer rely only on static author order during cold start.
2. Early sequencing explicitly favors representativeness and coverage.
3. The broad-start window does not repeatedly collapse into one primary tag or facet without a strong reason.
4. The strategy is deterministic and testable.
5. The old simple ordering path remains available as a fallback.
6. Custom decks do not silently inherit this prebuilt-only behavior.

## 10. Definition of done evidence

| Evidence                         | Verification command                           |
| -------------------------------- | ---------------------------------------------- |
| Broad-start strategy file exists | `ls lib/sequence/broadStartStrategy.ts`        |
| Sequence types exist             | `ls lib/sequence/deckSequenceTypes.ts`         |
| Play hook uses the strategy      | `rg "broadStart" hooks/useDeckSwipeSession.ts` |
| Strategy tests exist             | `ls __tests__/broad-start-strategy.test.ts`    |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- broad-start-strategy
npm test -- deck-swipe-session
npm test
```

## 12. Notes for next iteration

1. Iteration 14D should preserve this broad-start path as the early-stage gate, then hand off to mature tag-aware scoring.
2. Keep selection explanations because Iteration 14G will depend on them for regression and debug tooling.
3. Coverage achieved during broad start should become an explicit input to later relevance scoring.
