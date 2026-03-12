# Iteration 17: Build compare payload minimization layer

## 1. Objective

Build the local payload-minimization layer for deck comparison.

The compare payload should now be both:

- more structured
- more privacy-minimized

because local computation already has richer within-deck structure from 14A-14G and 15.

## 2. Why this matters

The old compare model would naturally drift toward sending too much raw card data. That is no longer necessary.

By this point, the app can already compute:

- tag-level summaries
- coverage/readiness
- ambiguity and unresolved areas
- stability/retest signal

That means the exported compare payload can be smaller, more grounded, and easier to explain.

## 3. Scope

### In scope

- define a versioned compare payload schema
- build a local mapper from deck profile/readiness data into that payload
- minimize raw card detail by default
- include confidence metadata, unresolved areas, and structured overlap/contrast summaries
- add preview/debug helpers for what the payload contains
- add tests for privacy-minimized export rules

### Out of scope

- AI compare report generation
- public sharing
- custom deck compare support
- server-side storage

### Reuse / refactor / replace

| Category   | What happens                                                                      |
| ---------- | --------------------------------------------------------------------------------- |
| Reused     | Deck profile summary, compare readiness logic, canonical tag/taxonomy state       |
| Refactored | Any assumption that compare payloads should mainly ship raw shared-card reactions |
| Replaced   | The older raw-card-first export model                                             |

## 4. Downstream dependency note

This iteration depends on 14A-14G and 16 because the payload now assumes the app can export:

- canonical tag/theme summaries instead of only raw tags
- coverage and confidence metadata
- unresolved and low-confidence areas
- retest/stability context
- only the minimum raw card evidence needed for grounding

## 5. Execution model

Use GPT-5.4 Extra High only.

Recommended order:

1. Define payload types and versioning.
2. Implement local summarization/minimization rules.
3. Add payload preview/debug helpers.
4. Add tests and disclosure alignment.

## 6. Agent resources and navigation map

### Source-of-truth references

- `/CLAUDE.md` Sections 9, 11, and 12
- `/iterations/14a-...md` through `/iterations/14g-...md`
- `/iterations/15-build-deck-profile-summary-v1.md`
- `/iterations/16-build-compare-eligibility-and-consent-flow.md`

### Current repo implementation anchors

- `types/domain/deckProfile.ts`
- `lib/profile/deckProfileService.ts`
- `lib/compare/deckCompareReadiness.ts`
- compare consent screens added in 16

### Suggested file organization

```text
types/domain/comparePayload.ts
lib/compare/buildComparePayload.ts
lib/compare/comparePayloadPolicy.ts
lib/compare/comparePayloadPreview.ts
__tests__/build-compare-payload.test.ts
```

### External troubleshooting and learning resources

#### Official docs

- Expo SQLite docs
- JSON docs for local serialization
- OpenAI platform docs for later payload consumers

#### Step-by-step guides

- Existing repo profile/readiness iterations
- Existing schema/domain docs

#### YouTube

- JSON schema and API contract walkthroughs if blocked

#### GitHub repos

- `sqlite/sqlite`
- `json-schema-org/json-schema-spec`

#### Stack Overflow/discussion boards

- JSON schema and payload-shaping discussions
- SQLite serialization discussions

#### Books/long-form references

- Ink and Switch local-first software essay
- Privacy-by-design references for minimizing data export

## 7. When stuck

| Problem                                               | Resolution                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| The payload still wants to ship lots of raw cards     | Make raw card evidence opt-in and bounded. Tag/theme summaries and confidence metadata should come first. |
| The summary feels too abstract for later reporting    | Include a small, justified evidence section rather than broad raw-card dumps.                             |
| Low-confidence areas are being hidden                 | Export unresolved areas explicitly so later reporting can admit uncertainty.                              |
| The payload is drifting toward a generic user profile | Keep it strictly deck-scoped.                                                                             |

## 8. Implementation checklist

1. Define payload types such as:
   - `ComparePayloadV1`
   - `CompareDeckSummary`
   - `CompareEvidenceCard`
2. Include fields for:
   - deck id and version
   - readiness/confidence metadata
   - card and tag coverage summary
   - affinity/aversion summaries
   - unresolved areas
   - minimal evidence cards only when needed
3. Implement minimization rules:
   - prefer tag/theme summaries over raw cards
   - include raw card detail only when it materially grounds a claim
   - omit low-value raw detail by default
4. Add local payload preview/debug helpers so the consent flow can explain what is being exported.
5. Add tests for:
   - deck scope correctness
   - payload minimization
   - unresolved-area inclusion
   - confidence-aware export rules

## 9. Deliverables

1. A versioned compare payload schema.
2. A local builder that exports minimized, structured compare data.
3. Preview/debug helpers aligned with the consent flow.
4. Tests covering payload content and minimization rules.

## 10. Acceptance criteria

1. The compare payload is deck-scoped and privacy-minimized.
2. The payload prefers local summaries over raw card dumps.
3. Confidence, coverage, and unresolved areas are explicitly represented.
4. Raw card detail is included only when needed for grounded reporting.
5. The payload is ready for Iteration 18 without overexposing local data.

## 11. Definition of done evidence

| Evidence               | Verification command                         |
| ---------------------- | -------------------------------------------- |
| Payload types exist    | `ls types/domain/comparePayload.ts`          |
| Payload builder exists | `ls lib/compare/buildComparePayload.ts`      |
| Policy helper exists   | `ls lib/compare/comparePayloadPolicy.ts`     |
| Payload tests exist    | `ls __tests__/build-compare-payload.test.ts` |

## 12. Validation commands

```bash
npm run typecheck
npm run lint
npm test -- build-compare-payload
npm test
```

## 13. Notes for next iteration

1. Iteration 18 should treat this payload as grounded input, not as something the AI can ignore.
2. Keep payload fields structured enough that safety policies in Iteration 19 can filter or soften them.
3. Custom deck export rules remain out of scope until Iteration 22.
