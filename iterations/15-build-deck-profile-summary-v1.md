# Iteration 15: Build deck profile summary v1

## 1. Objective

Build a deck-specific profile summary that is now a direct downstream consumer of 14A-14G.

The profile summary must explicitly build on:

- canonical tag-level signals
- tag and facet coverage
- ambiguity and unresolved areas
- retest-informed stability
- breadth across deck sub-areas
- explainable within-deck structure

This is still a local-first profile iteration. No cloud profile storage and no AI summary generation here.

## 2. Why this matters

The repo already contains a first draft of deck profile work, but it is still too shallow for the new backlog. After 14A-14G, a useful deck profile can no longer be just "top tags from swipe counts."

If Iteration 15 does not absorb that richer sequencing foundation:

- compare readiness will be too optimistic
- unresolved areas will be hidden
- confidence will be overstated
- later reports will have weak grounding

This iteration turns the local sequence/state machinery into a trustworthy user-facing deck profile.

## 3. Scope

### In scope

- refactor the existing deck profile summary contract to consume canonical tag IDs and tag state
- compute confidence from:
  - card count
  - card coverage
  - tag coverage
  - retest/stability
  - ambiguity
- produce theme-aware affinities and aversions
- surface unresolved areas with explicit reasons
- expose next-step hints such as:
  - keep swiping
  - more breadth needed
  - retest pending
  - compare-ready
- update the deck profile screen and profile tab to render the richer summary
- update snapshots and local summary persistence if the current snapshot model is too narrow
- keep the entire flow local-first

### Out of scope

- compare eligibility UI
- compare payload export
- AI compare reports
- custom deck parity
- cloud profile sync

### Reuse / refactor / replace

| Category   | What happens                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reused     | Existing deck profile screen, profile tab, snapshot patterns, swipe/session persistence, canonical tags, and tag-state infrastructure                            |
| Refactored | `types/domain/deckProfile.ts`, `lib/db/deckProfileRepository.ts`, `lib/profile/deckProfileService.ts`, `hooks/useDeckProfileSummary.ts`, and the profile screens |
| Replaced   | The older shallow summary model based mostly on raw swipe counts and free-text tag strings                                                                       |

## 4. Downstream dependency note

This iteration now depends on 14A-14G in concrete ways:

- 14A supplies canonical tag IDs and stable within-deck vocabulary
- 14B supplies tag exposure, coverage, ambiguity, and recency state
- 14C supplies broad-start coverage so profile breadth is more meaningful
- 14D supplies adaptive tag-aware relevance signal
- 14E prevents narrow profile collapse
- 14F supplies retest/reaffirmation signals needed for stability
- 14G supplies explainability and regression protection for the underlying sequence behavior

The old Iteration 15 draft assumed a flatter signal model. This revised version must consume the richer foundation instead of ignoring it.

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Refactor the domain and repository contracts.
2. Refactor summary computation and confidence logic.
3. Update screens and hooks.
4. Add tests, snapshot coverage, and docs.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.4, 8, 9, 13, and 14
- `/iterations/14-refactor-swipe-and-session-logic-to-deck-scope.md`
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/README.md`

### Current repo implementation anchors

- `types/domain/deckProfile.ts`
- `lib/db/deckProfileRepository.ts`
- `lib/profile/deckProfileService.ts`
- `hooks/useDeckProfileSummary.ts`
- `hooks/useDecksWithProfileStatus.ts`
- `app/deck/[deckId]/profile.tsx`
- `app/(tabs)/profile.tsx`
- `lib/db/deckTagRepository.ts`
- `lib/db/deckTagStateRepository.ts`

### Suggested file organization

```text
types/domain/deckProfile.ts
lib/db/deckProfileRepository.ts
lib/profile/deckProfileService.ts
lib/profile/computeDeckConfidence.ts
hooks/useDeckProfileSummary.ts
hooks/useDecksWithProfileStatus.ts
app/deck/[deckId]/profile.tsx
app/(tabs)/profile.tsx
__tests__/deck-profile-service.test.ts
__tests__/deck-profile-screen.test.tsx
```

### External troubleshooting and learning resources

#### Official docs

- Expo SQLite docs
- Expo Router docs
- React Native `FlatList` and `Pressable` docs
- SQLite foreign key and index docs

#### Step-by-step guides

- Existing repo iteration files 14, 14A-14G
- Existing repo schema and domain docs

#### YouTube

- SQLite indexing and query-planning explainers
- React Native testing walkthroughs if blocked on UI assertions

#### GitHub repos

- `expo/expo`
- `callstack/react-native-testing-library`
- `sqlite/sqlite`

#### Stack Overflow/discussion boards

- Expo Router discussions
- SQLite schema/index discussions

#### Books/long-form references

- Ink and Switch local-first software essay
- Information architecture references for coverage and taxonomy reasoning

## 7. When stuck

| Problem                                                      | Resolution                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Confidence still wants to collapse to swipe count            | Do not allow that. Confidence must include coverage, ambiguity, and retest/stability.      |
| Affinities and aversions are still built from free-text tags | Refactor to canonical tag IDs and local tag state first.                                   |
| Unresolved areas look like empty data                        | Surface explicit reasons such as low coverage, mixed signal, or pending retest.            |
| The screen gets too dense                                    | Keep the first view compact, but do not remove the richer structure from the domain model. |
| Snapshot tables look too thin                                | Extend them additively rather than hiding richer fields in ad hoc UI-only code.            |

## 8. Implementation checklist

1. Refactor `DeckProfileSummary` so it includes:
   - overall confidence
   - confidence components
   - coverage summary
   - affinities
   - aversions
   - unresolved areas with reasons
   - stability/retest summary
   - next-best-action hints
2. Refactor score aggregation to read canonical tag state and taxonomy joins, not flat strings.
3. Add a confidence model that combines:
   - swipe count
   - card coverage
   - tag/facet coverage
   - ambiguity penalty
   - retest/stability contribution
4. Preserve a simple stage model such as:
   - `lightweight`
   - `meaningful`
   - `high_confidence`
5. Update `useDeckProfileSummary.ts` and `useDecksWithProfileStatus.ts` to use the richer summary/readiness data.
6. Update `app/deck/[deckId]/profile.tsx` to show:
   - confidence
   - coverage progress
   - affinities
   - aversions
   - unresolved areas
   - compare readiness hints
7. Update `app/(tabs)/profile.tsx` so deck rows reflect richer readiness than simple swipe count.
8. Add tests for:
   - confidence composition
   - unresolved-area derivation
   - retest/stability handling
   - screen rendering
9. Update `docs/db/SCHEMA.md` and `docs/domain/DOMAIN_TYPES.md`.

## 9. Deliverables

1. A richer local `DeckProfileSummary` contract.
2. Refactored summary computation grounded in canonical tags and tag state.
3. Updated deck profile screen and profile tab.
4. Tests covering confidence, coverage, unresolved areas, and stability.
5. Updated schema/domain docs.

## 10. Acceptance criteria

1. Deck profile summaries are driven by canonical tag-level structure, not only swipe counts.
2. Confidence explicitly uses coverage, ambiguity, and retest/stability inputs.
3. Affinities and aversions are theme/tag-aware.
4. Unresolved areas are surfaced with explicit local reasons.
5. The profile summary gives later compare/report iterations a trustworthy local foundation.
6. All profile tests pass.

## 11. Definition of done evidence

| Evidence                    | Verification command                        |
| --------------------------- | ------------------------------------------- | --------------------------------------------- | -------------------------------------------- |
| Profile types updated       | `rg "confidenceComponents                   | coverageSummary                               | stability" types/domain/deckProfile.ts`      |
| Profile service updated     | `rg "ambiguity                              | retest                                        | coverage" lib/profile/deckProfileService.ts` |
| Deck profile screen updated | `rg "Unresolved                             | Coverage                                      | Stability" app/deck/[deckId]/profile.tsx`    |
| Profile status hook updated | `rg "compareReady                           | coverage" hooks/useDecksWithProfileStatus.ts` |
| Profile tests exist         | `ls __tests__/deck-profile-service.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- deck-profile-service
npm test -- profile
npm test
```

## 13. Notes for next iteration

1. Iteration 16 should use this richer profile summary to decide compare eligibility instead of relying on a minimum swipe count.
2. Iteration 17 should export summary structure and confidence metadata before raw card detail.
3. Keep the summary explainable so later compare/report flows can disclose why a deck is or is not comparison-ready.
