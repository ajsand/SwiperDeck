# Iteration 22: Enable compare support for custom decks

## 1. Objective

Enable compare support for custom decks without overclaiming the same quality, confidence, or structure as prebuilt deck comparisons.

This iteration must explicitly define:

- what custom decks need before they are compare-eligible
- what AI/report claims must be limited
- how prebuilt-deck sophistication differs from custom-deck support
- how privacy and safety thresholds still apply

It must also preserve 20B's navigation model:

- compare readiness, consent, and report remain normal deck-related screens inside the persistent bottom-nav shell
- only live swiping breaks out into a full-screen route

## 2. Why this matters

After 21, users can bring custom decks into the app. That does not mean every custom deck should immediately receive the same compare treatment as an editorial prebuilt deck.

Without explicit bounds:

- compare quality will be inconsistent
- AI reports may overclaim on weak structure
- users will not understand why custom and prebuilt decks behave differently
- the app could regress back into disconnected deck-related navigation flows

## 3. Scope

### In scope

- define compare eligibility rules for custom decks
- add deck-identity and overlap checks for custom compare
- bound report confidence/AI claims for custom decks
- extend compare consent/readiness flows to branch on deck type
- keep custom compare surfaces inside the normal tab-owned deck navigation
- keep the entire flow privacy-safe and deck-scoped

### Out of scope

- automatic canonical taxonomy generation for custom decks
- community/public custom deck compare
- cloud sync or public sharing
- pretending custom decks have prebuilt-grade sequencing guarantees

### Reuse / refactor / replace

| Category   | What happens                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| Reused     | Compare readiness, consent, payload, and report infrastructure from 16-18                                          |
| Refactored | Readiness, payload, and report rules must branch by deck type instead of assuming one universal deck quality level |
| Replaced   | The assumption that all compareable decks have the same structural confidence model                                |

## 4. Downstream dependency note

This iteration depends on 14A-14G mainly as a contrast:

- prebuilt decks have the richer taxonomy/state/sequencing foundation
- custom decks do not automatically have that foundation

It also depends on 21 because custom decks must already exist locally before compare support can be enabled.

It also depends on 20B because:

- compare eligibility must be based on durable deck history rather than the most recent swipe session boundary
- compare-related screens should remain in the normal app shell instead of behaving like live-swipe breakouts

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define custom compare-readiness rules.
2. Update consent and payload logic to branch by deck type.
3. Bound report claims for custom decks.
4. Add tests and user-facing expectation copy.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 5.3, 9, 11, 16, and 19
- `/iterations/16-build-compare-eligibility-and-consent-flow.md`
- `/iterations/17-build-compare-payload-minimization-layer.md`
- `/iterations/18-implement-one-to-one-ai-compare-report-v1.md`
- `/iterations/20b-refine-navigation-consistency-and-cross-session-deck-swiping.md`
- `/iterations/21-add-local-custom-deck-creation-and-import.md`

### Current repo implementation anchors

- custom deck modules from 21
- compare readiness modules from 16
- compare payload modules from 17
- compare report modules from 18

### Suggested file organization

```text
types/domain/customDeckCompare.ts
lib/compare/customDeckCompareReadiness.ts
lib/compare/buildComparePayload.ts
lib/compare/buildCompareReportPrompt.ts
__tests__/custom-deck-compare.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- OpenAI platform docs
- Expo Router docs
- Expo SQLite docs

#### Step-by-step guides

- Existing compare/report/custom-deck iteration files

#### YouTube

- Structured-output and product-copy walkthroughs if blocked

#### GitHub repos

- `openai/openai-node`
- `expo/expo`

#### Stack Overflow/discussion boards

- JSON contract and readiness-state discussions

#### Books/long-form references

- Privacy-by-design references

## 7. When stuck

| Problem                                                  | Resolution                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The flow keeps treating custom decks like prebuilt decks | Add explicit deck-type branches and user-facing expectations.                                 |
| Confidence claims are too strong for custom decks        | Lower the ceiling and surface that the deck lacks editorial structure or taxonomy guarantees. |
| Overlap checks are ambiguous                             | Require a stable deck identity or checksum and a minimum usable shared-card overlap.          |
| The report feels unsafe for weak custom data             | Soften or suppress sections rather than pretending confidence exists.                         |

## 8. Implementation checklist

1. Define custom compare-readiness types and reasons.
2. Add custom-deck compare rules such as:
   - same custom deck identity/version on both devices
   - minimum shared-card overlap
   - enough local signal for both participants
3. Branch consent/readiness messaging by deck type and keep those screens in the normal bottom-nav shell.
4. Update payload building so custom decks:
   - may rely more on raw card overlap
   - may export less theme/tag structure when it does not exist
5. Update report prompting/rendering so custom decks:
   - use bounded or softened AI claims
   - surface lower structure/confidence explicitly
6. Add tests for:
   - custom deck identity mismatch
   - insufficient overlap
   - bounded report behavior

## 9. Deliverables

1. Custom-deck compare-readiness rules.
2. Compare/payload/report branching by deck type.
3. User-facing expectation copy for lower-structure custom comparisons.
4. Tests covering custom compare edge cases.

## 10. Acceptance criteria

1. Custom decks can be compare-eligible only when explicit thresholds are met.
2. The app does not overclaim prebuilt-grade confidence for custom decks.
3. Consent and report flows clearly communicate lower structural confidence where appropriate.
4. Privacy-safe, deck-scoped compare behavior is preserved.
5. Custom compare surfaces do not hide the bottom nav unless the user explicitly enters live swiping.
6. Custom compare tests pass.

## 11. Definition of done evidence

| Evidence                               | Verification command                           |
| -------------------------------------- | ---------------------------------------------- |
| Custom compare types exist             | `ls types/domain/customDeckCompare.ts`         |
| Custom compare readiness module exists | `ls lib/compare/customDeckCompareReadiness.ts` |
| Custom compare tests exist             | `ls __tests__/custom-deck-compare.test.ts`     |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- custom-deck-compare
npm test
```

## 13. Notes for next iteration

1. Iteration 23 should refine confidence and retest logic mainly for the richer prebuilt path, with custom support only where the data model supports it.
2. Keep prebuilt/custom asymmetry explicit instead of trying to flatten it away.
3. Report-quality refinement later should preserve lower-confidence wording for custom decks.
4. Keep compare readiness tied to durable deck history rather than session-local notions of progress.
