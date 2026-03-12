import { buildCompareReportPrompt } from '@/lib/compare/buildCompareReportPrompt';
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
  const deckId = asDeckId('deck_movies_tv');

  return {
    schema: 'datedeck.compare_payload.v1',
    generatedAt: 1700000000000,
    profileGeneratedAt: 1700000001000,
    deck: {
      deckId,
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
      recommendedAction: 'Ready to compare.',
    },
    confidence: {
      stage: 'meaningful',
      value: role === 'self' ? 0.71 : 0.66,
      label: 'medium',
      swipeCount: role === 'self' ? 28 : 26,
      cardCoverage: 0.62,
      tagCoverage: 0.8,
      facetCoverage: 1,
      stabilityScore: role === 'self' ? 0.72 : 0.61,
      ambiguityRatio: role === 'self' ? 0.12 : 0.18,
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
        score: role === 'self' ? 3.4 : 2.9,
        exposureCount: 4,
        stability: 'steady',
      },
      {
        tagId:
          role === 'self'
            ? asDeckTagId('movies_tv:mainstream')
            : asDeckTagId('movies_tv:prestige'),
        tag: role === 'self' ? 'Mainstream' : 'Prestige',
        facet: 'Audience',
        score: 2.2,
        exposureCount: 3,
        stability: 'emerging',
      },
    ],
    aversions: [
      {
        tagId:
          role === 'self'
            ? asDeckTagId('movies_tv:prestige')
            : asDeckTagId('movies_tv:mainstream'),
        tag: role === 'self' ? 'Prestige' : 'Mainstream',
        facet: 'Audience',
        score: -2.5,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    unresolvedAreas: [
      {
        tagId: asDeckTagId('movies_tv:arthouse'),
        tag: 'Arthouse',
        facet: 'Audience',
        reason: role === 'self' ? 'pending_retest' : 'mixed_signal',
        uncertainty: 0.74,
        exposureCount: 2,
      },
    ],
    evidence: {
      mode: 'summary_with_minimal_evidence',
      includedCardCount: 1,
      omittedRawCardCount: 14,
      cards: [
        {
          cardId: asDeckCardId(
            role === 'self' ? 'movies_tv_001' : 'movies_tv_002',
          ),
          kind: 'entity',
          title: role === 'self' ? 'Knives Out' : 'Past Lives',
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

describe('buildCompareReportPrompt', () => {
  it('builds grounded compare context from two minimized payloads', () => {
    const prompt = buildCompareReportPrompt({
      selfPayload: buildPayload('self'),
      otherPayload: buildPayload('other'),
    });

    expect(prompt.context.deckTitle).toBe('Movies & TV');
    expect(prompt.context.sharedAlignments[0]?.tag).toBe('Comfort watch');
    expect(prompt.context.contrasts[0]?.tag).toBe('Mainstream');
    expect(prompt.context.unresolvedAreas[0]?.tag).toBe('Arthouse');
    expect(prompt.developerInstruction).toContain('not an oracle');
    expect(prompt.userPrompt).toContain('"deckTitle": "Movies & TV"');
    expect(prompt.userPrompt).toContain('"sharedAlignments"');
  });

  it('rejects payloads from different decks', () => {
    expect(() =>
      buildCompareReportPrompt({
        selfPayload: buildPayload('self'),
        otherPayload: buildPayload('other', {
          deck: {
            ...buildPayload('other').deck,
            deckId: asDeckId('deck_music'),
            title: 'Music',
            category: 'music',
          },
        }),
      }),
    ).toThrow('same deck');
  });

  it('rejects payloads from different deck content versions', () => {
    expect(() =>
      buildCompareReportPrompt({
        selfPayload: buildPayload('self'),
        otherPayload: buildPayload('other', {
          deck: {
            ...buildPayload('other').deck,
            contentVersion: 3,
          },
        }),
      }),
    ).toThrow('same deck content version');
  });

  it('rejects payloads that are not compare-ready', () => {
    expect(() =>
      buildCompareReportPrompt({
        selfPayload: buildPayload('self', {
          readiness: {
            state: 'needs_more_breadth',
            ready: false,
            caution: false,
            reasons: ['not_enough_tag_coverage'],
            recommendedAction: 'Swipe more cards first.',
          },
        }),
        otherPayload: buildPayload('other'),
      }),
    ).toThrow('compare-ready');
  });

  it('adds guarded-tag prompt restrictions for sensitive decks', () => {
    const prompt = buildCompareReportPrompt({
      selfPayload: buildPayload('self', {
        deck: {
          ...buildPayload('self').deck,
          deckId: asDeckId('deck_relationship_preferences'),
          title: 'Relationship Preferences',
          category: 'relationship_preferences',
        },
        affinities: [
          {
            tagId: asDeckTagId('relationship_preferences:trust'),
            tag: 'Trust',
            facet: 'Closeness',
            score: 3.1,
            exposureCount: 4,
            stability: 'stable',
          },
        ],
        aversions: [],
        unresolvedAreas: [],
        policy: {
          cautionLevel: 'strict',
          maxAffinityThemes: 4,
          maxAversionThemes: 4,
          maxUnresolvedAreas: 3,
          maxEvidenceCards: 0,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
          aiMode: 'local_only',
          showdownAllowed: false,
          safetyWarnings: [
            'Relationship preference output should stay cautious and specific to this deck.',
          ],
          redactions: ['full_swipe_history', 'sensitive_card_evidence_omitted'],
        },
      }),
      otherPayload: buildPayload('other', {
        deck: {
          ...buildPayload('other').deck,
          deckId: asDeckId('deck_relationship_preferences'),
          title: 'Relationship Preferences',
          category: 'relationship_preferences',
        },
        affinities: [
          {
            tagId: asDeckTagId('relationship_preferences:trust'),
            tag: 'Trust',
            facet: 'Closeness',
            score: 2.8,
            exposureCount: 4,
            stability: 'stable',
          },
        ],
        aversions: [],
        unresolvedAreas: [],
        policy: {
          cautionLevel: 'strict',
          maxAffinityThemes: 4,
          maxAversionThemes: 4,
          maxUnresolvedAreas: 3,
          maxEvidenceCards: 0,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
          aiMode: 'local_only',
          showdownAllowed: false,
          safetyWarnings: [
            'Relationship preference output should stay cautious and specific to this deck.',
          ],
          redactions: ['full_swipe_history', 'sensitive_card_evidence_omitted'],
        },
      }),
    });

    expect(prompt.context.safety.cautionLevel).toBe('strict');
    expect(prompt.context.safety.guardedConversationTags).toContain('Trust');
    expect(prompt.context.guardrails.join(' ')).toContain(
      'Do not turn Trust into direct conversation starters',
    );
  });
});
