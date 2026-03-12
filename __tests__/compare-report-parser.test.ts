import { buildDeckCompareReportContext } from '@/lib/compare/buildCompareReportPrompt';
import { parseCompareReport } from '@/lib/compare/parseCompareReport';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagId,
  type ComparePayloadV1,
} from '@/types/domain';

function buildPayload(
  role: 'self' | 'other',
  overrides: Partial<ComparePayloadV1> = {},
): ComparePayloadV1 {
  return {
    schema: 'datedeck.compare_payload.v1',
    generatedAt: 1700000000000,
    profileGeneratedAt: 1700000001000,
    deck: {
      deckId: asDeckId('deck_movies_tv'),
      title: 'Movies & TV',
      category: 'movies_tv',
      tier: 'tier_1',
      sensitivity: 'standard',
      contentVersion: 2,
    },
    readiness: {
      state: 'compare_ready',
      ready: true,
      caution: false,
      reasons: [],
      recommendedAction: 'Ready.',
    },
    confidence: {
      stage: 'meaningful',
      value: role === 'self' ? 0.71 : 0.63,
      label: 'medium',
      swipeCount: 24,
      cardCoverage: 0.62,
      tagCoverage: 0.8,
      facetCoverage: 1,
      stabilityScore: 0.65,
      ambiguityRatio: 0.15,
    },
    coverage: {
      cardsSeen: 15,
      totalCards: 24,
      seenTagCount: 8,
      totalTagCount: 10,
      seenFacetCount: 4,
      totalFacetCount: 4,
    },
    affinities: [
      {
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        tag: 'Comfort watch',
        facet: 'Mood',
        score: 3.1,
        exposureCount: 4,
        stability: 'steady',
      },
    ],
    aversions: [
      {
        tagId: asDeckTagId('movies_tv:prestige'),
        tag: 'Prestige',
        facet: 'Audience',
        score: role === 'self' ? -2.6 : -2.1,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    unresolvedAreas: [
      {
        tagId: asDeckTagId('movies_tv:arthouse'),
        tag: 'Arthouse',
        facet: 'Audience',
        reason: 'pending_retest',
        uncertainty: 0.71,
        exposureCount: 2,
      },
    ],
    evidence: {
      mode: 'summary_with_minimal_evidence',
      includedCardCount: 1,
      omittedRawCardCount: 14,
      cards: [
        {
          cardId: asDeckCardId('movies_tv_001'),
          kind: 'entity',
          title: 'Knives Out',
          subtitle: '',
          leaning: 'affinity',
          reason: 'Grounding example.',
          supportingTagIds: [asDeckTagId('movies_tv:comfort_watch')],
          supportingTags: ['Comfort watch'],
        },
      ],
    },
    policy: {
      cautionLevel: 'standard',
      maxAffinityThemes: 5,
      maxAversionThemes: 5,
      maxUnresolvedAreas: 5,
      maxEvidenceCards: 2,
      includeEvidenceCards: true,
      evidenceMode: 'summary_with_minimal_evidence',
      aiMode: 'allow',
      showdownAllowed: true,
      safetyWarnings: [],
      redactions: ['full_swipe_history'],
    },
    ...overrides,
  };
}

describe('parseCompareReport', () => {
  const context = buildDeckCompareReportContext({
    selfPayload: buildPayload('self'),
    otherPayload: buildPayload('other'),
  });

  it('parses valid structured output into a deck compare report', () => {
    const report = parseCompareReport({
      raw: JSON.stringify({
        comparison_confidence_label: 'medium',
        comparison_confidence_note:
          'This compare has enough breadth to be useful, but the unresolved areas still matter.',
        summary_headline: 'A few shared lanes stand out right away',
        summary_body:
          'Both people overlap most around comfort-watch energy, while prestige remains a shared aversion and arthouse still looks unresolved.',
        alignments: [
          {
            title: 'Comfort watch lands for both people',
            detail:
              'The two payloads both show positive signal here, which makes it a low-friction topic to deepen first.',
            tag: 'Comfort watch',
            facet: 'Mood',
            evidence: ['Knives Out (positive anchor)'],
          },
        ],
        contrasts: [
          {
            title: 'Mainstream and prestige create a useful tension',
            detail:
              'The overall lane differs enough to be interesting, but it should still be treated as conversation material rather than a verdict.',
            tag: 'Mainstream',
            facet: 'Audience',
            evidence: ['Past Lives (contrast anchor)'],
          },
        ],
        unresolved_areas: [
          {
            title: 'Arthouse still needs more signal',
            detail:
              'At least one profile still treats this area as unsettled, so the report should stay tentative here.',
            tag: 'Arthouse',
            facet: 'Audience',
            confidence_note: 'High uncertainty remains here.',
          },
        ],
        conversation_starters: [
          {
            title: 'Trade comfort-watch examples',
            prompt:
              'What is a recent comfort watch that each of you keeps returning to, and why?',
            rationale:
              'Shared positive lanes are easiest to explore when they are anchored in a specific example.',
            related_tags: ['Comfort watch'],
          },
        ],
        guardrails: ['Stay inside this deck only.'],
      }),
      context,
      deckId: asDeckId('deck_movies_tv'),
      deckTitle: 'Movies & TV',
      sourceKind: 'ai',
      model: 'gpt-4.1',
    });

    expect(report.schema).toBe('datedeck.compare_report.v1');
    expect(report.summary.title).toBe(
      'A few shared lanes stand out right away',
    );
    expect(report.alignments[0]?.tag).toBe('Comfort watch');
    expect(report.unresolvedAreas[0]?.tag).toBe('Arthouse');
    expect(report.source.kind).toBe('ai');
  });

  it('rejects overclaiming report language', () => {
    expect(() =>
      parseCompareReport({
        raw: JSON.stringify({
          comparison_confidence_label: 'medium',
          comparison_confidence_note:
            'This compare has enough breadth to be useful, but the unresolved areas still matter.',
          summary_headline: 'Perfect match score',
          summary_body:
            'This is clearly a perfect match and you should keep dating.',
          alignments: [],
          contrasts: [],
          unresolved_areas: [
            {
              title: 'Arthouse still needs more signal',
              detail: 'Stay tentative here.',
              tag: 'Arthouse',
              facet: 'Audience',
              confidence_note: 'High uncertainty remains here.',
            },
          ],
          conversation_starters: [],
          guardrails: [],
        }),
        context,
        deckId: asDeckId('deck_movies_tv'),
        deckTitle: 'Movies & TV',
        sourceKind: 'ai',
        model: 'gpt-4.1',
      }),
    ).toThrow('outside the DateDeck product boundary');
  });
});
