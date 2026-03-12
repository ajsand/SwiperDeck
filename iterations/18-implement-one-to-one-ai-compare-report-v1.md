# Iteration 18: Implement one-to-one AI compare report v1

## 1. Objective

Implement the first deck-scoped one-to-one AI compare report for DateDeck.

This report must explicitly depend on 14A-14G and use:

- strong tag/theme overlaps
- interesting contrasts by sub-area
- low-confidence or unresolved areas
- confidence-aware framing
- conversation starters grounded in actual structured signal

AI remains a summarizer, not an oracle.

## 2. Why this matters

The earlier TasteDeck-style report plan was too shallow for the new fork. After 14A-14G, the app has richer local structure and can ask the AI for better output than "shared liked cards" vs "different cards."

If the report ignores that richer structure:

- it will sound generic
- it will overclaim certainty
- it will waste the sequencing/profile work that came before it

## 3. Scope

### In scope

- define the deck-scoped compare report contract
- build a report request/prompt layer grounded in the minimized compare payload
- add response parsing/validation
- render a report UI that shows:
  - deck summary
  - alignments
  - contrasts
  - unresolved areas
  - conversation starters
- keep the tone confidence-aware, warm, and anti-creepy

### Out of scope

- sensitive deck safeguards beyond basic respect for consent/readiness
- public sharing
- custom deck compare reports
- cloud profile storage

### Reuse / refactor / replace

| Category   | What happens                                                                       |
| ---------- | ---------------------------------------------------------------------------------- |
| Reused     | Consent/readiness flow, minimized compare payload, local confidence metadata       |
| Refactored | The older simpler compare-report framing based on raw overlap summaries            |
| Replaced   | A card-overlap-first report model that ignores tag/theme structure and uncertainty |

## 4. Downstream dependency note

This iteration depends on 14A-14G, 15, 16, and 17 because:

- 14A-14F create the structured signal the report should talk about
- 14G makes that signal explainable and safer to tune
- 15 supplies deck profile summaries and confidence
- 16 ensures only eligible, consented comparisons reach reporting
- 17 supplies the minimized, grounded report payload

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define report input/output types.
2. Build prompt/request construction from the minimized payload.
3. Add response validation and fallbacks.
4. Render the report UI and tests.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 4.5, 9, 11, and 12
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/15-build-deck-profile-summary-v1.md`
- `/iterations/16-build-compare-eligibility-and-consent-flow.md`
- `/iterations/17-build-compare-payload-minimization-layer.md`

### Current repo implementation anchors

- compare readiness/consent modules from 16
- compare payload modules from 17
- `types/domain/deckProfile.ts`
- `lib/profile/deckProfileService.ts`

### Suggested file organization

```text
types/domain/deckCompareReport.ts
lib/compare/buildCompareReportPrompt.ts
lib/compare/parseCompareReport.ts
lib/ai/compareReportClient.ts
app/compare/[deckId]/report.tsx
__tests__/compare-report-prompt.test.ts
__tests__/compare-report-parser.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- OpenAI platform docs
- Expo Router docs
- React Native accessibility docs

#### Step-by-step guides

- Existing compare payload/consent iteration files
- Existing repo testing patterns

#### YouTube

- Prompt-contract and structured-output walkthroughs if blocked

#### GitHub repos

- `openai/openai-node`
- `expo/expo`

#### Stack Overflow/discussion boards

- Structured-output parsing discussions
- Expo Router screen-state discussions

#### Books/long-form references

- Privacy-by-design references
- Writing/UX references for uncertainty-aware product copy

## 7. When stuck

| Problem                                               | Resolution                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The report starts sounding like compatibility scoring | Re-anchor every section to grounded deck-specific evidence and uncertainty markers. |
| The AI wants to speculate beyond the payload          | Tighten the prompt and parser. AI is a summarizer only.                             |
| The report over-focuses on raw cards                  | Use theme/tag structure first and raw evidence only to ground claims.               |
| Confidence is not visible enough                      | Surface it in the report header and unresolved sections.                            |

## 8. Implementation checklist

1. Define report types such as:
   - `DeckCompareReport`
   - `DeckCompareReportSection`
   - `DeckCompareConversationPrompt`
2. Build a prompt/request layer that consumes the minimized compare payload.
3. Require structured output with sections for:
   - deck summary
   - strongest alignments
   - interesting contrasts
   - unresolved/low-confidence areas
   - conversation starters
4. Add a parser/validator that rejects malformed or overclaiming responses.
5. Add fallback behavior for:
   - network/API failure
   - invalid response shape
   - low-confidence compare inputs
6. Build the report screen and make the tone:
   - warm
   - non-clinical
   - non-judgmental
   - uncertainty-aware
7. Add tests for prompt construction, parser behavior, and report rendering.

## 9. Deliverables

1. Deck-scoped compare report types and request builder.
2. Structured AI report parsing and fallback behavior.
3. Report UI for one-to-one deck comparison.
4. Tests covering prompt, parse, and UI behavior.

## 10. Acceptance criteria

1. The compare report is grounded in structured deck signal, not just raw card overlap.
2. The report clearly reflects confidence and unresolved areas.
3. The tone stays useful and anti-creepy.
4. AI is treated as a summarizer, not a compatibility oracle.
5. The report is deck-scoped and consent-gated.

## 11. Definition of done evidence

| Evidence              | Verification command                         |
| --------------------- | -------------------------------------------- |
| Report types exist    | `ls types/domain/deckCompareReport.ts`       |
| Prompt builder exists | `ls lib/compare/buildCompareReportPrompt.ts` |
| Parser exists         | `ls lib/compare/parseCompareReport.ts`       |
| Report client exists  | `ls lib/ai/compareReportClient.ts`           |
| Report screen exists  | `ls app/compare/[deckId]/report.tsx`         |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- compare-report-prompt
npm test -- compare-report-parser
npm test
```

## 13. Notes for next iteration

1. Iteration 19 should add stronger deck/tag safeguards and policy-based constraints around this report pipeline.
2. Keep the report contract structured so later refinement work can improve quality without changing core consent assumptions.
3. Custom deck reports remain out of scope until Iteration 22.
