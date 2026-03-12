# Iteration 14F: Add retest, reaffirmation, and ambiguity-targeting resurfacing

## 1. Objective

Add purposeful card resurfacing rules for prebuilt decks so the app can:

- confirm whether users still feel the same way
- revisit ambiguous areas
- refine stability and confidence
- improve later compare/report quality

Resurfacing should be intentional, limited, and grounded in uncertainty or importance. It should not feel repetitive or spammy.

## 2. Why this matters

After 14A-14E, the app can build richer local structure, but some of that structure will still be fragile:

- strong early reactions may not be stable
- mixed tags may remain unresolved
- important compare areas may still need confirmation

Retest is how the app turns "interesting signal" into "more trustworthy signal."

## 3. Scope

### In scope

- add explicit resurfacing rules for prebuilt decks
- target cards based on ambiguity, importance, and low stability
- enforce cooldowns and repetition caps
- persist or derive enough local state to know when a card is due for retest
- return explainable resurfacing reasons
- add tests for ambiguity-targeting and reaffirmation behavior

### Out of scope

- broad profile UI redesign
- compare/report UI changes
- custom deck retest parity
- unlimited repetition loops
- cloud personalization

### Relationship to simple repetition

| Category   | What happens                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Reused     | Existing swipe history, card affinity, tag state, and adaptive ranking stack                                                  |
| Refactored | Seen cards are no longer treated as universally ineligible; some can re-enter the queue when the retest rules say they should |
| Replaced   | Accidental repetition and ad hoc resurfacing become a structured local policy                                                 |

## 4. Multi-model execution strategy

Workflow note: execute with GPT-5.4 Extra High only.

| Step | Model              | Task                                                                    |
| ---- | ------------------ | ----------------------------------------------------------------------- |
| 1    | GPT-5.4 Extra High | Add resurfacing types and due-state helpers                             |
| 2    | GPT-5.4 Extra High | Add retest scheduling/selection logic with cooldowns and caps           |
| 3    | GPT-5.4 Extra High | Integrate resurfacing into the existing sequencing flow                 |
| 4    | GPT-5.4 Extra High | Add deterministic tests for ambiguity-targeting and reaffirmation cases |

## 5. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 8, 9, and 14
- `/iterations/14b-add-tag-level-deck-state-and-typed-models.md`
- `/iterations/14d-implement-tag-aware-next-card-scoring.md`
- `/iterations/14e-add-coverage-diversity-and-anti-collapse-guardrails.md`

### Current repo implementation anchors

- `lib/db/swipeRepository.ts`
- `lib/profile/deckProfileService.ts`
- `lib/db/deckProfileRepository.ts`
- `hooks/useDeckSwipeSession.ts`
- `types/domain/deckProfile.ts`

### Suggested file organization

```text
lib/sequence/retestSelection.ts
lib/sequence/deckSequenceTypes.ts
lib/sequence/explainSequenceDecision.ts
hooks/useDeckSwipeSession.ts
__tests__/retest-selection.test.ts
```

### External troubleshooting and learning resources

- Expo SQLite docs
- SQLite query/index docs for recency lookups
- local-first and explainability references

## 6. When stuck

| Problem                                        | Resolution                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Resurfacing starts looking like spam           | Add minimum cooldowns, maximum resurfacing counts, and strong eligibility reasons.                                        |
| Everything becomes "important"                 | Restrict retest to explicit buckets: ambiguous, high-impact, or compare-relevant tags/cards.                              |
| The logic tries to bypass diversity guardrails | Resurfacing should still respect 14E unless a documented retest reason overrides it.                                      |
| Unclear whether state must be persisted        | If current tables are not enough, add a small additive card-state table. Do not hide retest meaning inside UI-only state. |

## 7. Implementation checklist

1. Add resurfacing types such as:
   - `DeckRetestReason`
   - `DeckRetestCandidate`
   - `DeckRetestDecision`
2. If needed, add a small local card-state table or derived helper that tracks:
   - `last_shown_at`
   - `last_action`
   - `retest_count`
   - `last_retest_at`
   - `retest_due_at`
3. Define explicit retest reasons:
   - `ambiguous_tag_signal`
   - `mixed_card_signal`
   - `stability_check`
   - `important_compare_area`
4. Add cooldowns and caps:
   - no immediate resurfacing
   - no unlimited repeat loops
5. Insert resurfacing into sequencing as a bounded candidate source, not the whole queue.
6. Return local explanation output that says why the resurfaced card was chosen.
7. Add tests for:
   - ambiguous tag clarification
   - reaffirming an important prior signal
   - cooldown enforcement
   - repetition-cap enforcement

## 8. Deliverables

1. Purposeful resurfacing/retest selection logic for prebuilt decks.
2. Local state or derived helpers sufficient to schedule retests.
3. Explainable retest reasons.
4. Tests covering ambiguity-targeting, reaffirmation, and cooldown behavior.

## 9. Acceptance criteria

1. Cards can resurface for explicit local reasons rather than accidental repetition.
2. Resurfacing is limited by cooldowns and caps.
3. Ambiguous or high-value areas can be revisited intentionally.
4. The behavior stays deck-specific, tag-aware, and explainable.
5. The implementation prepares better stability/confidence inputs for later profile and compare work.

## 10. Definition of done evidence

| Evidence                           | Verification command                    |
| ---------------------------------- | --------------------------------------- | ---------------------------------------- |
| Retest module exists               | `ls lib/sequence/retestSelection.ts`    |
| Swipe flow references retest logic | `rg "retest                             | resurface" hooks/useDeckSwipeSession.ts` |
| Retest tests exist                 | `ls __tests__/retest-selection.test.ts` |

## 11. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- retest-selection
npm test -- deck-swipe-session
npm test
```

## 12. Notes for next iteration

1. Iteration 14G should treat retest outcomes as part of the evaluation and explainability harness.
2. Later profile confidence should use resurfacing as a stability signal, not just more raw card count.
3. Do not broaden this resurfacing model to custom decks until the custom deck roadmap explicitly supports it.
