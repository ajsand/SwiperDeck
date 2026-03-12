# Iteration 19: Add sensitive deck gating and report safeguards

## 1. Objective

Add deck-level and tag-level safety policy for sensitive comparison/report scenarios.

This iteration should protect against overclaiming or socially risky output in decks or sub-areas that require more caution.

The solution should account for:

- deck sensitivity
- sensitive tags or sub-areas within otherwise standard decks
- higher confidence thresholds for sensitive output
- stricter report wording and prompt boundaries
- showdown exclusions where needed

## 2. Why this matters

After 14A-14G and 18, the app can generate richer compare reports. That is useful, but it also expands the surface area for harm.

Sensitive decks or tag clusters need stronger controls so the product does not:

- overstate low-confidence signals
- turn private topics into gimmicky output
- surface destabilizing or invasive prompts

## 3. Scope

### In scope

- define local deck/tag safety policy for compare/report/showdown decisions
- add gating rules for sensitive decks and tag clusters
- add stronger readiness/report thresholds where needed
- constrain report prompt/input/output behavior for sensitive areas
- add user-facing warning/caution states
- ensure showdown remains blocked for ineligible sensitive decks

### Out of scope

- public moderation systems
- cloud trust/safety services
- custom/public community deck moderation
- broad censorship of standard decks

### Reuse / refactor / replace

| Category   | What happens                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Reused     | Existing `decks.sensitivity`, compare readiness, compare payload, report pipeline, showdown-eligibility concept |
| Refactored | Sensitive handling becomes explicit policy instead of scattered one-off checks                                  |
| Replaced   | The assumption that all decks and all tag areas can use the same compare/report thresholds and tone             |

## 4. Downstream dependency note

This iteration depends on:

- 14A because canonical tag IDs make tag-level policy possible
- 14B-14F because coverage, ambiguity, and stability affect whether sensitive claims are justified
- 14G because safeguard behavior should be regression-tested
- 16 because compare consent and readiness need caution states
- 17 because payload export should be filterable
- 18 because AI reports need constrained prompt/input/output rules

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define safety policy types and sources.
2. Apply policy to compare readiness, payload building, and report generation.
3. Add user-facing warning/caution states.
4. Add tests covering sensitive deck/tag behavior.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 5.2, 10.5, 11.6, 12, and 16
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/16-build-compare-eligibility-and-consent-flow.md`
- `/iterations/17-build-compare-payload-minimization-layer.md`
- `/iterations/18-implement-one-to-one-ai-compare-report-v1.md`

### Current repo implementation anchors

- `assets/data/prebuilt-decks.json`
- `assets/data/prebuilt-deck-taxonomies.json`
- compare readiness modules from 16
- compare payload modules from 17
- compare report modules from 18

### Suggested file organization

```text
types/domain/deckSafetyPolicy.ts
assets/data/prebuilt-deck-policy.json
lib/policy/deckSafetyPolicy.ts
lib/compare/deckCompareReadiness.ts
lib/compare/buildComparePayload.ts
lib/compare/buildCompareReportPrompt.ts
__tests__/deck-safety-policy.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- OpenAI platform safety/prompting docs
- Expo Router docs
- React Native accessibility docs

#### Step-by-step guides

- Existing repo compare/report iteration files
- Existing privacy and domain docs

#### YouTube

- Trust-and-safety product design discussions if blocked

#### GitHub repos

- `openai/openai-node`
- `expo/expo`

#### Stack Overflow/discussion boards

- Privacy and prompt-guardrail discussions

#### Books/long-form references

- Privacy-by-design references
- Writing references for sensitive, uncertainty-aware UX language

## 7. When stuck

| Problem                                                    | Resolution                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| "Sensitive" keeps turning into one global flag             | Use deck-level policy plus optional tag-level policy. Some standard decks may still have sensitive sub-areas. |
| The safeguards only apply at the final report step         | Apply policy earlier: readiness, payload export, prompt construction, and showdown eligibility.               |
| The app still wants to make strong claims with weak signal | Raise thresholds and soften or suppress those sections.                                                       |
| Policy is hidden in UI code                                | Centralize it in a local policy module or bundled policy file.                                                |

## 8. Implementation checklist

1. Define policy types such as:
   - `DeckSafetyPolicy`
   - `SensitiveTagRule`
   - `ReportCautionLevel`
2. Add a bundled local policy source for prebuilt decks/tags, either by:
   - extending canonical prebuilt metadata
   - or adding a dedicated policy file
3. Define policy behaviors such as:
   - stronger compare thresholds
   - report section suppression
   - wording softening
   - showdown exclusion
4. Apply policy to:
   - compare readiness
   - compare payload generation
   - report prompt building
   - report rendering
5. Add warning/caution states in the user flow.
6. Add tests for:
   - sensitive deck block/caution cases
   - sensitive tag suppression
   - showdown exclusion
   - low-confidence sensitive report fallback

## 9. Deliverables

1. Local deck/tag safety policy types and source.
2. Gating and caution logic across readiness, payload, report, and showdown decisions.
3. User-facing caution states and tests.

## 10. Acceptance criteria

1. Sensitive decks or tag areas can be handled more cautiously than standard decks.
2. Sensitive claims require stronger confidence/readiness.
3. Compare payloads and reports can suppress or soften sensitive low-confidence output.
4. Sensitive showdown exclusions are enforced.
5. Safeguard behavior is local, explicit, and testable.

## 11. Definition of done evidence

| Evidence                  | Verification command                       |
| ------------------------- | ------------------------------------------ |
| Safety policy types exist | `ls types/domain/deckSafetyPolicy.ts`      |
| Policy source exists      | `ls assets/data/prebuilt-deck-policy.json` |
| Policy module exists      | `ls lib/policy/deckSafetyPolicy.ts`        |
| Safety tests exist        | `ls __tests__/deck-safety-policy.test.ts`  |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- deck-safety-policy
npm test -- compare
npm test
```

## 13. Notes for next iteration

1. Iteration 20 should inherit showdown exclusions and caution rules from this policy layer.
2. Later report refinement should improve wording quality without weakening the policy boundaries.
3. Keep this policy prebuilt-first; custom deck safety needs its own explicit roadmap work later.
