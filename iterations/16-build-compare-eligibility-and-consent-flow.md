# Iteration 16: Build compare eligibility and consent flow

## 1. Objective

Build the deck-scoped compare readiness and consent flow.

Compare eligibility must now be informed by:

- card count
- card coverage
- tag-level coverage
- confidence stage
- ambiguity and unresolved areas
- retest/stability signals where applicable

This iteration should make a clear distinction between "a profile exists" and "this deck is comparison-ready."

## 2. Why this matters

After 14A-14G and the revised Iteration 15, the app has much richer local knowledge than a simple swipe total. Compare readiness should reflect that reality.

If the flow still relies on a single minimum swipe threshold:

- low-breadth decks will be misclassified as ready
- sensitive or ambiguous decks will overclaim certainty
- consent disclosure will not match the actual report quality

## 3. Scope

### In scope

- add a local deck compare-readiness evaluator
- define readiness states and blocking reasons
- build a compare launch flow from the deck profile or deck detail surface
- add insufficient-data UX that explains what is missing
- add deck-scoped consent UI with export/disclosure preview
- keep the flow local-first and explicit before any external compare/report step

### Out of scope

- compare payload construction
- AI compare report generation
- custom deck compare support
- public sharing or social discovery

### Reuse / refactor / replace

| Category   | What happens                                                                           |
| ---------- | -------------------------------------------------------------------------------------- |
| Reused     | Deck profile summary, deck detail/profile routes, privacy copy patterns, local storage |
| Refactored | Any old compare-readiness assumption based on simple swipe count only                  |
| Replaced   | The simplistic mental model that "enough swipes" alone means "safe to compare"         |

## 4. Downstream dependency note

This iteration depends on 14A-14G and 15 because compare readiness now uses:

- canonical deck structure from 14A
- tag coverage and ambiguity state from 14B
- more representative early sequencing from 14C
- adaptive signal quality from 14D
- anti-collapse breadth from 14E
- retest/stability from 14F
- explainability/regression confidence from 14G
- the richer local profile summary from 15

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define readiness types and evaluator logic.
2. Add hooks and route/state plumbing.
3. Build deck-scoped consent UI.
4. Add tests and privacy copy validation.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.5, 4.7, 9, 11, and 14
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/15-build-deck-profile-summary-v1.md`
- `/iterations/README.md`

### Current repo implementation anchors

- `app/deck/[deckId]/profile.tsx`
- `app/deck/[deckId].tsx`
- `hooks/useDeckProfileSummary.ts`
- `hooks/useDecksWithProfileStatus.ts`
- `lib/profile/deckProfileService.ts`
- `types/domain/deckProfile.ts`

### Suggested file organization

```text
types/domain/compare.ts
lib/compare/deckCompareReadiness.ts
hooks/useDeckCompareReadiness.ts
app/deck/[deckId]/compare.tsx
app/compare/[deckId]/consent.tsx
__tests__/deck-compare-readiness.test.ts
__tests__/compare-consent-screen.test.tsx
```

### External troubleshooting and learning resources

#### Official docs

- Expo Router docs
- React Native navigation and accessibility docs
- Expo SQLite docs

#### Step-by-step guides

- Existing deck profile and swipe-flow iteration files
- Existing repo screen and hook test patterns

#### YouTube

- React Native navigation/testing walkthroughs if blocked

#### GitHub repos

- `expo/expo`
- `callstack/react-native-testing-library`

#### Stack Overflow/discussion boards

- Expo Router discussions
- React Native accessibility discussions

#### Books/long-form references

- Ink and Switch local-first software essay

## 7. When stuck

| Problem                                                     | Resolution                                                                                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Compare readiness still looks like a single number          | Break it into explicit reasons: too little coverage, too much ambiguity, missing retest, sensitive deck caution, and so on. |
| Consent UI is tempted to skip export disclosure until later | Do not do that. The user must see what will leave the device before any external compare/report step.                       |
| The deck has a profile but is not compare-ready             | That is expected. Keep the UX explicit about the difference.                                                                |
| Sensitive decks need special rules                          | Add policy hooks now, even if the stronger safeguards land in Iteration 19.                                                 |

## 8. Implementation checklist

1. Define compare-readiness types such as:
   - `DeckCompareReadiness`
   - `DeckCompareReadinessReason`
   - `DeckCompareConsentDraft`
2. Implement a local readiness evaluator that uses:
   - profile stage
   - card coverage
   - tag/facet coverage
   - unresolved ratio
   - retest/stability indicators
3. Add readiness states such as:
   - `not_started`
   - `early_profile`
   - `needs_more_breadth`
   - `needs_more_stability`
   - `compare_ready`
   - `compare_ready_with_caution`
4. Add a compare entry surface from the deck profile or deck detail view.
5. Build insufficient-data UX that explains what is missing and how to improve readiness.
6. Build consent UI that shows:
   - deck scope
   - readiness state
   - exported data categories
   - explicit user confirmation before any external step
7. Add tests for readiness classification, insufficient-data messaging, and consent disclosure.

## 9. Deliverables

1. A local deck compare-readiness evaluator.
2. Deck-scoped readiness/consent types.
3. Compare entry and consent screens.
4. Tests covering readiness logic and disclosure behavior.

## 10. Acceptance criteria

1. Compare readiness is not based on swipe count alone.
2. The app can explain why a deck is or is not compare-ready.
3. The UI distinguishes "profile exists" from "comparison-ready."
4. Users see deck-scoped export/disclosure information before any external compare/report step.
5. The flow remains local-first and consent-gated.

## 11. Definition of done evidence

| Evidence                        | Verification command                          |
| ------------------------------- | --------------------------------------------- |
| Compare readiness module exists | `ls lib/compare/deckCompareReadiness.ts`      |
| Compare readiness hook exists   | `ls hooks/useDeckCompareReadiness.ts`         |
| Compare route exists            | `ls app/deck/[deckId]/compare.tsx`            |
| Consent route exists            | `ls app/compare/[deckId]/consent.tsx`         |
| Readiness tests exist           | `ls __tests__/deck-compare-readiness.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- deck-compare-readiness
npm test -- compare-consent-screen
npm test
```

## 13. Notes for next iteration

1. Iteration 17 should build the minimized compare payload that this consent flow previews.
2. Keep readiness reasons structured so later report and safeguard work can reuse them.
3. Custom decks stay out of scope until Iteration 22.
