import {
  buildDeckCompareConsentDraft,
  evaluateDeckCompareReadiness,
} from '@/lib/compare/deckCompareReadiness';
import {
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies_tv'),
    title: 'Movies & TV',
    description: 'Talk through favorites and comfort rewatches.',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 24,
    compareEligible: true,
    showdownEligible: true,
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
    deckId: asDeckId('deck_movies_tv'),
    stage: 'meaningful',
    confidence: {
      value: 0.62,
      label: 'medium',
      swipeCount: 24,
      cardCoverage: 0.58,
      components: {
        swipeSignal: 1,
        cardCoverage: 0.58,
        tagCoverage: 0.8,
        facetCoverage: 1,
        stability: 0.52,
        ambiguityPenalty: 0.2,
      },
    },
    coverage: {
      deckId: asDeckId('deck_movies_tv'),
      cardsSeen: 14,
      totalCards: 24,
      cardCoverage: 14 / 24,
      tags: {
        deckId: asDeckId('deck_movies_tv'),
        totalTagCount: 10,
        seenTagCount: 8,
        unseenTagCount: 2,
        resolvedTagCount: 7,
        uncertainTagCount: 3,
        coverageRatio: 0.8,
      },
      facets: {
        totalFacetCount: 4,
        seenFacetCount: 4,
        unseenFacetCount: 0,
        coverageRatio: 1,
      },
    },
    stability: {
      stabilityScore: 0.61,
      stableTagCount: 2,
      emergingTagCount: 3,
      mixedSignalTagCount: 1,
      retestedTagCount: 1,
      retestPendingCount: 1,
    },
    affinities: [
      {
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        tag: 'Comfort watch',
        facet: 'Mood',
        score: 3,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    aversions: [],
    unresolved: [
      {
        tagId: asDeckTagId('movies_tv:prestige'),
        tag: 'Prestige',
        facet: 'Tone',
        reason: 'pending_retest',
        uncertainty: 0.74,
        exposureCount: 2,
      },
    ],
    nextSteps: [
      {
        kind: 'retest_pending',
        title: 'Revisit uncertain areas',
        detail:
          'Some themes still need reaffirmation before the profile is stable enough to trust.',
        priority: 0,
      },
    ],
    readiness: {
      compareReady: false,
      blockers: ['retest_needed'],
    },
    topCardsLiked: [],
    topCardsDisliked: [],
    generatedAt: 1700000005000,
    ...overrides,
  };
}

describe('deck compare readiness', () => {
  it('classifies decks with no signal as not started', () => {
    const readiness = evaluateDeckCompareReadiness({
      deck: buildDeck(),
      summary: null,
    });

    expect(readiness.state).toBe('not_started');
    expect(readiness.ready).toBe(false);
    expect(readiness.reasons[0]?.reason).toBe('no_profile_signal');
  });

  it('classifies unresolved breadth/stability blockers explicitly', () => {
    const readiness = evaluateDeckCompareReadiness({
      deck: buildDeck(),
      summary: buildSummary({
        readiness: {
          compareReady: false,
          blockers: ['not_enough_tag_coverage', 'retest_needed'],
        },
      }),
    });

    expect(readiness.state).toBe('needs_more_breadth');
    expect(readiness.reasons.map((reason) => reason.reason)).toEqual(
      expect.arrayContaining(['not_enough_tag_coverage', 'retest_needed']),
    );
  });

  it('marks policy-guarded decks as compare ready with caution and builds disclosure draft', () => {
    const deck = buildDeck({
      id: asDeckId('deck_relationship_preferences'),
      title: 'Relationship Preferences',
      category: 'relationship_preferences',
      sensitivity: 'standard',
      showdownEligible: false,
    });
    const summary = buildSummary({
      deckId: asDeckId('deck_relationship_preferences'),
      stage: 'high_confidence',
      confidence: {
        value: 0.78,
        label: 'high',
        swipeCount: 28,
        cardCoverage: 0.72,
        components: {
          swipeSignal: 1,
          cardCoverage: 0.72,
          tagCoverage: 0.86,
          facetCoverage: 1,
          stability: 0.8,
          ambiguityPenalty: 0.14,
        },
      },
      coverage: {
        deckId: asDeckId('deck_relationship_preferences'),
        cardsSeen: 18,
        totalCards: 24,
        cardCoverage: 0.75,
        tags: {
          deckId: asDeckId('deck_relationship_preferences'),
          totalTagCount: 10,
          seenTagCount: 9,
          unseenTagCount: 1,
          resolvedTagCount: 8,
          uncertainTagCount: 1,
          coverageRatio: 0.9,
        },
        facets: {
          totalFacetCount: 3,
          seenFacetCount: 3,
          unseenFacetCount: 0,
          coverageRatio: 1,
        },
      },
      stability: {
        stabilityScore: 0.84,
        stableTagCount: 4,
        emergingTagCount: 1,
        mixedSignalTagCount: 0,
        retestedTagCount: 3,
        retestPendingCount: 0,
      },
      affinities: [
        {
          tagId: asDeckTagId('relationship_preferences:trust'),
          tag: 'Trust',
          facet: 'Closeness',
          score: 3.2,
          exposureCount: 4,
          stability: 'stable',
        },
      ],
      unresolved: [],
      readiness: {
        compareReady: true,
        blockers: [],
      },
      nextSteps: [
        {
          kind: 'compare_ready',
          title: 'Compare ready',
          detail:
            'This deck now has enough breadth, confidence, and stability for a deck-scoped compare flow.',
          priority: 0,
        },
      ],
    });
    const readiness = evaluateDeckCompareReadiness({
      deck,
      summary,
    });
    const draft = buildDeckCompareConsentDraft({
      deck,
      summary,
      readiness,
    });

    expect(readiness.state).toBe('compare_ready_with_caution');
    expect(readiness.ready).toBe(true);
    expect(draft.caution).toContain('private expectations');
    expect(draft.exportPreview).toHaveLength(5);
    expect(draft.confirmations).toHaveLength(3);
  });

  it('adds caution for guarded tags inside otherwise standard decks', () => {
    const deck = buildDeck({
      id: asDeckId('deck_social_habits'),
      title: 'Social Habits',
      category: 'social_habits',
      showdownEligible: true,
    });
    const summary = buildSummary({
      deckId: asDeckId('deck_social_habits'),
      stage: 'high_confidence',
      readiness: {
        compareReady: true,
        blockers: [],
      },
      affinities: [
        {
          tagId: asDeckTagId('social_habits:boundaries'),
          tag: 'Boundaries',
          facet: 'Connection',
          score: 2.3,
          exposureCount: 3,
          stability: 'stable',
        },
      ],
      unresolved: [],
      nextSteps: [
        {
          kind: 'compare_ready',
          title: 'Compare ready',
          detail: 'Ready.',
          priority: 0,
        },
      ],
    });

    const readiness = evaluateDeckCompareReadiness({
      deck,
      summary,
    });

    expect(readiness.state).toBe('compare_ready_with_caution');
    expect(readiness.reasons.map((reason) => reason.reason)).toContain(
      'sensitive_tag_caution',
    );
  });

  it('blocks custom decks until custom compare support exists', () => {
    const readiness = evaluateDeckCompareReadiness({
      deck: buildDeck({ isCustom: true }),
      summary: buildSummary(),
    });

    expect(readiness.state).toBe('unavailable');
    expect(readiness.reasons[0]?.reason).toBe('custom_deck_not_supported');
  });
});
