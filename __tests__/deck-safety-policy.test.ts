import {
  evaluateDeckSafetyReadiness,
  filterSensitiveThemeSummaryItems,
  getDeckSafetyBadgeLabel,
  getDeckSafetyPolicy,
  getDeckShowdownPolicy,
  shouldPreferLocalCompareFallback,
} from '@/lib/policy/deckSafetyPolicy';
import {
  asDeckId,
  asDeckTagId,
  type ComparePayloadV1,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_relationship_preferences'),
    title: 'Relationship Preferences',
    description: 'Explore what helps a relationship feel secure.',
    category: 'relationship_preferences',
    tier: 'tier_2',
    cardCount: 32,
    compareEligible: true,
    showdownEligible: false,
    sensitivity: 'standard',
    minCardsForProfile: 12,
    minCardsForCompare: 24,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildSummary(
  overrides: Partial<DeckProfileSummary> = {},
): DeckProfileSummary {
  return {
    deckId: asDeckId('deck_relationship_preferences'),
    stage: 'high_confidence',
    confidence: {
      value: 0.69,
      label: 'medium',
      swipeCount: 30,
      cardCoverage: 0.64,
      components: {
        swipeSignal: 1,
        cardCoverage: 0.64,
        tagCoverage: 0.7,
        facetCoverage: 1,
        stability: 0.6,
        ambiguityPenalty: 0.18,
      },
    },
    coverage: {
      deckId: asDeckId('deck_relationship_preferences'),
      cardsSeen: 20,
      totalCards: 32,
      cardCoverage: 20 / 32,
      tags: {
        deckId: asDeckId('deck_relationship_preferences'),
        totalTagCount: 10,
        seenTagCount: 8,
        unseenTagCount: 2,
        resolvedTagCount: 7,
        uncertainTagCount: 2,
        coverageRatio: 0.8,
      },
      facets: {
        totalFacetCount: 3,
        seenFacetCount: 3,
        unseenFacetCount: 0,
        coverageRatio: 1,
      },
    },
    stability: {
      stabilityScore: 0.72,
      stableTagCount: 3,
      emergingTagCount: 1,
      mixedSignalTagCount: 0,
      retestedTagCount: 2,
      retestPendingCount: 0,
    },
    affinities: [
      {
        tagId: asDeckTagId('relationship_preferences:boundaries'),
        tag: 'Boundaries',
        facet: 'Structure',
        score: 2.4,
        exposureCount: 2,
        stability: 'emerging',
      },
    ],
    aversions: [],
    unresolved: [
      {
        tagId: asDeckTagId('relationship_preferences:trust'),
        tag: 'Trust',
        facet: 'Closeness',
        reason: 'pending_retest',
        uncertainty: 0.71,
        exposureCount: 2,
      },
    ],
    nextSteps: [],
    readiness: {
      compareReady: true,
      blockers: [],
    },
    topCardsLiked: [],
    topCardsDisliked: [],
    generatedAt: 1700000005000,
    ...overrides,
  };
}

function buildPayload(
  overrides: Partial<ComparePayloadV1> = {},
): ComparePayloadV1 {
  return {
    schema: 'datedeck.compare_payload.v1',
    generatedAt: 1700000000000,
    profileGeneratedAt: 1700000001000,
    deck: {
      deckId: asDeckId('deck_relationship_preferences'),
      title: 'Relationship Preferences',
      category: 'relationship_preferences',
      tier: 'tier_2',
      sensitivity: 'standard',
      contentVersion: 2,
    },
    readiness: {
      state: 'compare_ready_with_caution',
      ready: true,
      caution: true,
      reasons: ['sensitive_deck'],
      recommendedAction: 'Use extra care.',
    },
    confidence: {
      stage: 'high_confidence',
      value: 0.7,
      label: 'medium',
      swipeCount: 30,
      cardCoverage: 0.64,
      tagCoverage: 0.8,
      facetCoverage: 1,
      stabilityScore: 0.72,
      ambiguityRatio: 0.18,
    },
    coverage: {
      cardsSeen: 20,
      totalCards: 32,
      seenTagCount: 8,
      totalTagCount: 10,
      seenFacetCount: 3,
      totalFacetCount: 3,
    },
    affinities: [],
    aversions: [],
    unresolvedAreas: [],
    evidence: {
      mode: 'summary_only',
      includedCardCount: 0,
      omittedRawCardCount: 20,
      cards: [],
    },
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
    ...overrides,
  };
}

describe('deck safety policy', () => {
  it('loads strict policy for relationship preference compare and showdown', () => {
    const deck = buildDeck();
    const policy = getDeckSafetyPolicy(deck);

    expect(policy.cautionLevel).toBe('strict');
    expect(policy.report.aiMode).toBe('local_only');
    expect(getDeckShowdownPolicy(deck)).toEqual(
      expect.objectContaining({
        allowed: false,
      }),
    );
    expect(getDeckSafetyBadgeLabel(deck)).toBe('Sensitive compare');
  });

  it('blocks sensitive decks until stricter confidence thresholds are met', () => {
    const result = evaluateDeckSafetyReadiness({
      deck: buildDeck(),
      summary: buildSummary(),
    });

    expect(result.blockedByDeckPolicy).toBe(true);
    expect(result.additionalReasons).toEqual(
      expect.arrayContaining([
        'sensitive_threshold_not_met',
        'sensitive_tag_caution',
      ]),
    );
  });

  it('suppresses guarded sensitive tags until they have stable coverage', () => {
    const policy = getDeckSafetyPolicy(buildDeck());
    const filtered = filterSensitiveThemeSummaryItems(policy, [
      {
        tagId: asDeckTagId('relationship_preferences:boundaries'),
        tag: 'Boundaries',
        facet: 'Structure',
        score: 2.4,
        exposureCount: 2,
        stability: 'emerging',
      },
      {
        tagId: asDeckTagId('relationship_preferences:communication'),
        tag: 'Communication',
        facet: 'Communication',
        score: 2.1,
        exposureCount: 3,
        stability: 'steady',
      },
    ]);

    expect(filtered.kept.map((item) => item.tag)).toEqual(['Communication']);
    expect(filtered.suppressed.map((item) => item.tag)).toEqual(['Boundaries']);
  });

  it('prefers local fallback reports for strict decks', () => {
    const result = shouldPreferLocalCompareFallback({
      selfPayload: buildPayload(),
      otherPayload: buildPayload({
        confidence: {
          ...buildPayload().confidence,
          value: 0.74,
        },
      }),
    });

    expect(result.preferLocalFallback).toBe(true);
    expect(result.reason).toContain('Relationship');
  });
});
