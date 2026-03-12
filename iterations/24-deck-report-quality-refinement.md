# Iteration 24: Deck report quality refinement

## 1. Objective

Refine deck report quality on top of the richer prebuilt-deck algorithm foundation.

This iteration should improve reports through:

- stronger grouping by theme/tag
- better contrast framing
- clearer unresolved-area handling
- confidence-aware wording
- more grounded conversation prompts

It is not just a wording-polish pass.

It must also stay consistent with the 20B interaction model:

- compare/report screens are normal navigation surfaces, not full-screen live-session routes
- report language should reflect that deck profiles evolve over time across multiple sessions

## 2. Why this matters

After 14A-14G, 18, and 23, DateDeck can support much better report quality than a generic AI summary.

If this iteration only tweaks style:

- the reports will still feel shallow
- uncertainty will still be under-explained
- conversation prompts will still risk sounding gimmicky
- the product will still feel inconsistent if report flows behave differently from the normal app shell

This iteration should capitalize on the richer within-deck structure that now exists.

## 3. Scope

### In scope

- improve report prompt/template structure
- group alignments and contrasts by theme/tag where appropriate
- improve confidence and uncertainty framing
- refine conversation starters so they are grounded and less gimmicky
- reduce output that sounds too deterministic or too fluffy
- preserve the evolving-profile model instead of implying permanent fixed truths
- add tests or fixtures that protect report-quality improvements

### Out of scope

- brand-new compare products
- public social/report sharing
- custom-deck parity beyond the bounded support already defined
- server-side experimentation

### Reuse / refactor / replace

| Category   | What happens                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Reused     | Compare payload, compare report contract, safety policy, confidence/stability model                |
| Refactored | Prompt building, report section ordering, conversation-prompt generation, and presentation copy    |
| Replaced   | Generic report phrasing that does not take full advantage of deck structure or uncertainty markers |

## 4. Downstream dependency note

This iteration depends on:

- 14A-14G for richer theme/tag structure, coverage, stability, and explainability
- 18 for the first report pipeline
- 19 for safety constraints
- 23 for stronger confidence and retest refinement
- 20B for the persistent app-shell and cross-session profile model

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Audit current report output against structured signal quality.
2. Refactor prompt/template logic and output grouping.
3. Refine UI copy and uncertainty wording.
4. Add regression fixtures/tests for report quality.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 9, 12, 16, and 19
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/18-implement-one-to-one-ai-compare-report-v1.md`
- `/iterations/19-add-sensitive-deck-gating-and-report-safeguards.md`
- `/iterations/20b-refine-navigation-consistency-and-cross-session-deck-swiping.md`
- `/iterations/23-profile-confidence-and-retest-logic-refinement.md`

### Current repo implementation anchors

- `lib/compare/buildCompareReportPrompt.ts`
- `lib/compare/parseCompareReport.ts`
- `app/compare/[deckId]/report.tsx`
- `types/domain/deckCompareReport.ts`
- safety policy modules from 19

### Suggested file organization

```text
lib/compare/buildCompareReportPrompt.ts
lib/compare/reportTemplates.ts
lib/compare/reportPostProcessing.ts
app/compare/[deckId]/report.tsx
__tests__/compare-report-quality.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- OpenAI platform docs
- React Native accessibility docs

#### Step-by-step guides

- Existing compare/report iteration files
- Existing repo prompt/parser tests

#### YouTube

- Structured writing and prompt-quality walkthroughs if blocked

#### GitHub repos

- `openai/openai-node`
- `expo/expo`

#### Stack Overflow/discussion boards

- Structured-output and rendering discussions

#### Books/long-form references

- Writing references for uncertainty-aware, grounded product language

## 7. When stuck

| Problem                                                | Resolution                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| The work drifts into "rewrite the whole report system" | Refine the existing report pipeline rather than replacing it wholesale. |
| The prompts still sound generic                        | Use the richer deck/tag structure and confidence markers explicitly.    |
| Contrast sections feel too judgmental                  | Reframe them as conversation material, not verdicts.                    |
| Uncertainty disappears during polish                   | Do not polish away unresolved areas; make them clearer.                 |

## 8. Implementation checklist

1. Audit current reports against a fixture set of prebuilt deck scenarios.
2. Improve prompt/template logic so it:
   - groups by tag/theme when useful
   - separates strong signal from low-confidence signal
   - avoids deterministic overclaiming
3. Improve conversation prompts so they are grounded in actual overlap/contrast structure.
4. Improve low-confidence and unresolved wording.
5. Ensure report language reflects an evolving deck profile rather than a permanently fixed verdict.
6. Add report post-processing if needed to normalize tone and section quality.
7. Add regression fixtures/tests for quality-sensitive sections.

## 9. Deliverables

1. Refined report prompt/template logic.
2. Better grouped and more grounded report output.
3. Clearer uncertainty/confidence framing.
4. Report-quality regression fixtures/tests.

## 10. Acceptance criteria

1. Reports make better use of theme/tag structure.
2. Uncertainty and low-confidence areas are clearer, not hidden.
3. Conversation prompts feel grounded rather than gimmicky.
4. Safety constraints from 19 still hold.
5. Report copy does not imply that deck preferences are permanently fixed after one or two sessions.
6. Report-quality tests pass.

## 11. Definition of done evidence

| Evidence                             | Verification command                          |
| ------------------------------------ | --------------------------------------------- |
| Report template helper exists        | `ls lib/compare/reportTemplates.ts`           |
| Report post-processing helper exists | `ls lib/compare/reportPostProcessing.ts`      |
| Report quality tests exist           | `ls __tests__/compare-report-quality.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- compare-report-quality
npm test
```

## 13. Notes for next iteration

1. Iteration 25 should harden this full stack for release, including regressions, privacy, confidence correctness, and fallback behavior.
2. Keep report quality improvements tied to structured signal rather than marketing-style polish.
3. Do not weaken uncertainty language in pursuit of a smoother tone.
4. Keep report flows aligned with 20B's normal-navigation model rather than treating them like focused live-session surfaces.
