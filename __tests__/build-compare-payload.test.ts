import { buildComparePayload } from '@/lib/compare/buildComparePayload';
import { buildComparePayloadPreview } from '@/lib/compare/comparePayloadPreview';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

const mockGetDeckCardById = jest.fn();
const mockGetDeckCardTagLinksByCardId = jest.fn();
const mockGetDeckTagsByDeckId = jest.fn();

jest.mock('@/lib/db', () => ({
  getDeckCardById: (...args: unknown[]) => mockGetDeckCardById(...args),
  getDeckCardTagLinksByCardId: (...args: unknown[]) =>
    mockGetDeckCardTagLinksByCardId(...args),
  getDeckTagsByDeckId: (...args: unknown[]) => mockGetDeckTagsByDeckId(...args),
}));

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
      value: 0.64,
      label: 'medium',
      swipeCount: 28,
      cardCoverage: 0.62,
      components: {
        swipeSignal: 1,
        cardCoverage: 0.62,
        tagCoverage: 0.8,
        facetCoverage: 1,
        stability: 0.56,
        ambiguityPenalty: 0.18,
      },
    },
    coverage: {
      deckId: asDeckId('deck_movies_tv'),
      cardsSeen: 15,
      totalCards: 24,
      cardCoverage: 15 / 24,
      tags: {
        deckId: asDeckId('deck_movies_tv'),
        totalTagCount: 10,
        seenTagCount: 8,
        unseenTagCount: 2,
        resolvedTagCount: 6,
        uncertainTagCount: 2,
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
      stabilityScore: 0.68,
      stableTagCount: 3,
      emergingTagCount: 2,
      mixedSignalTagCount: 1,
      retestedTagCount: 2,
      retestPendingCount: 1,
    },
    affinities: [
      {
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        tag: 'Comfort watch',
        facet: 'Mood',
        score: 3.4,
        exposureCount: 4,
        stability: 'steady',
      },
      {
        tagId: asDeckTagId('movies_tv:mainstream'),
        tag: 'Mainstream',
        facet: 'Audience',
        score: 2.2,
        exposureCount: 3,
        stability: 'emerging',
      },
    ],
    aversions: [
      {
        tagId: asDeckTagId('movies_tv:prestige'),
        tag: 'Prestige',
        facet: 'Tone',
        score: -2.8,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    unresolved: [
      {
        tagId: asDeckTagId('movies_tv:arthouse'),
        tag: 'Arthouse',
        facet: 'Audience',
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
      compareReady: true,
      blockers: [],
    },
    topCardsLiked: [
      asDeckCardId('movies_tv_001'),
      asDeckCardId('movies_tv_002'),
    ],
    topCardsDisliked: [asDeckCardId('movies_tv_003')],
    generatedAt: 1700000005000,
    ...overrides,
  };
}

describe('buildComparePayload', () => {
  const fakeDb = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDeckTagsByDeckId.mockResolvedValue([
      {
        id: asDeckTagId('movies_tv:comfort_watch'),
        deckId: asDeckId('deck_movies_tv'),
        facetId: 'movies_tv:mood',
        slug: 'comfort_watch',
        label: 'Comfort watch',
        description: '',
        sortOrder: 0,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      {
        id: asDeckTagId('movies_tv:prestige'),
        deckId: asDeckId('deck_movies_tv'),
        facetId: 'movies_tv:tone',
        slug: 'prestige',
        label: 'Prestige',
        description: '',
        sortOrder: 1,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ]);
    mockGetDeckCardById.mockImplementation(async (_db, cardId) => {
      if (String(cardId) === 'movies_tv_001') {
        return {
          id: asDeckCardId('movies_tv_001'),
          deckId: asDeckId('deck_movies_tv'),
          kind: 'entity',
          title: 'Knives Out',
          subtitle: 'Rian Johnson, 2019',
          descriptionShort: 'A modern whodunit.',
          tags: ['Comfort watch', 'Mainstream'],
          popularity: 0.82,
          tileKey: 'entity:movies_tv_001',
          sortOrder: 1,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        };
      }

      if (String(cardId) === 'movies_tv_003') {
        return {
          id: asDeckCardId('movies_tv_003'),
          deckId: asDeckId('deck_movies_tv'),
          kind: 'entity',
          title: 'The Power of the Dog',
          subtitle: 'Jane Campion, 2021',
          descriptionShort: 'A slow-burn western drama.',
          tags: ['Prestige'],
          popularity: 0.63,
          tileKey: 'entity:movies_tv_003',
          sortOrder: 3,
          createdAt: 1700000000000,
          updatedAt: 1700000000000,
        };
      }

      return null;
    });
    mockGetDeckCardTagLinksByCardId.mockImplementation(async (_db, cardId) => {
      if (String(cardId) === 'movies_tv_001') {
        return [
          {
            cardId: asDeckCardId('movies_tv_001'),
            tagId: asDeckTagId('movies_tv:comfort_watch'),
            role: 'primary',
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        ];
      }

      if (String(cardId) === 'movies_tv_003') {
        return [
          {
            cardId: asDeckCardId('movies_tv_003'),
            tagId: asDeckTagId('movies_tv:prestige'),
            role: 'primary',
            createdAt: 1700000000000,
            updatedAt: 1700000000000,
          },
        ];
      }

      return [];
    });
  });

  it('builds a deck-scoped minimized payload with bounded evidence cards', async () => {
    const payload = await buildComparePayload({
      db: fakeDb,
      deck: buildDeck(),
      summary: buildSummary(),
      readiness: {
        deckId: asDeckId('deck_movies_tv'),
        state: 'compare_ready',
        ready: true,
        caution: false,
        title: 'Compare ready',
        detail:
          'This deck has enough breadth, confidence, and stability for a deck-scoped compare flow.',
        reasons: [],
        recommendedAction:
          'This deck now has enough breadth, confidence, and stability for a deck-scoped compare flow.',
      },
    });

    expect(payload.deck.deckId).toBe(asDeckId('deck_movies_tv'));
    expect(payload.deck.contentVersion).toBe(2);
    expect(payload.affinities).toHaveLength(2);
    expect(payload.aversions).toHaveLength(1);
    expect(payload.unresolvedAreas).toHaveLength(1);
    expect(payload.evidence.mode).toBe('summary_with_minimal_evidence');
    expect(payload.evidence.cards).toHaveLength(2);
    expect(payload.policy.cautionLevel).toBe('standard');
    expect(payload.policy.aiMode).toBe('allow');
    expect(payload.policy.showdownAllowed).toBe(true);
    expect(payload.evidence.cards[0]).toEqual(
      expect.objectContaining({
        cardId: asDeckCardId('movies_tv_001'),
        title: 'Knives Out',
        leaning: 'affinity',
        supportingTags: ['Comfort watch'],
      }),
    );
    expect(payload.evidence.cards[0]).not.toHaveProperty('descriptionShort');
    expect(payload.policy.redactions).toContain('full_swipe_history');
  });

  it('drops raw evidence for high-confidence standard decks with no unresolved areas', async () => {
    const payload = await buildComparePayload({
      db: fakeDb,
      deck: buildDeck(),
      summary: buildSummary({
        stage: 'high_confidence',
        unresolved: [],
      }),
      readiness: {
        deckId: asDeckId('deck_movies_tv'),
        state: 'compare_ready',
        ready: true,
        caution: false,
        title: 'Compare ready',
        detail:
          'This deck has enough breadth, confidence, and stability for a deck-scoped compare flow.',
        reasons: [],
        recommendedAction: 'Ready.',
      },
    });
    const preview = buildComparePayloadPreview(payload);

    expect(payload.evidence.mode).toBe('summary_only');
    expect(payload.evidence.cards).toHaveLength(0);
    expect(
      preview.categories.find(
        (item) => item.category === 'minimal_card_examples',
      )?.detail,
    ).toContain('No raw card examples included');
  });

  it('refuses custom deck payload export', async () => {
    await expect(
      buildComparePayload({
        db: fakeDb,
        deck: buildDeck({
          id: asDeckId('deck_custom_movies'),
          isCustom: true,
          compareEligible: false,
        }),
        summary: buildSummary({
          deckId: asDeckId('deck_custom_movies'),
        }),
        readiness: {
          deckId: asDeckId('deck_custom_movies'),
          state: 'unavailable',
          ready: false,
          caution: false,
          title: 'Compare unavailable',
          detail: 'Custom decks are not supported yet.',
          reasons: [],
          recommendedAction: 'Use a prebuilt deck.',
        },
      }),
    ).rejects.toThrow(
      'Compare payload export is currently limited to shipped prebuilt decks.',
    );
  });

  it('suppresses guarded sensitive themes and evidence for strict decks', async () => {
    const payload = await buildComparePayload({
      db: fakeDb,
      deck: buildDeck({
        id: asDeckId('deck_relationship_preferences'),
        title: 'Relationship Preferences',
        category: 'relationship_preferences',
        showdownEligible: false,
      }),
      summary: buildSummary({
        deckId: asDeckId('deck_relationship_preferences'),
        stage: 'high_confidence',
        confidence: {
          value: 0.78,
          label: 'high',
          swipeCount: 30,
          cardCoverage: 0.74,
          components: {
            swipeSignal: 1,
            cardCoverage: 0.74,
            tagCoverage: 0.84,
            facetCoverage: 1,
            stability: 0.78,
            ambiguityPenalty: 0.12,
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
            tagId: asDeckTagId('relationship_preferences:boundaries'),
            tag: 'Boundaries',
            facet: 'Structure',
            score: 3,
            exposureCount: 2,
            stability: 'emerging',
          },
          {
            tagId: asDeckTagId('relationship_preferences:communication'),
            tag: 'Communication',
            facet: 'Communication',
            score: 2.4,
            exposureCount: 4,
            stability: 'stable',
          },
        ],
        aversions: [],
        unresolved: [
          {
            tagId: asDeckTagId('relationship_preferences:trust'),
            tag: 'Trust',
            facet: 'Closeness',
            reason: 'pending_retest',
            uncertainty: 0.73,
            exposureCount: 2,
          },
        ],
        readiness: {
          compareReady: true,
          blockers: [],
        },
        topCardsLiked: [asDeckCardId('movies_tv_001')],
        topCardsDisliked: [],
      }),
      readiness: {
        deckId: asDeckId('deck_relationship_preferences'),
        state: 'compare_ready_with_caution',
        ready: true,
        caution: true,
        title: 'Compare ready with caution',
        detail: 'This deck is ready but needs extra care.',
        reasons: [
          {
            reason: 'sensitive_deck',
            title: 'Sensitive deck caution',
            detail: 'Use extra care.',
          },
        ],
        recommendedAction: 'Review the extra-care consent language.',
      },
    });

    expect(payload.affinities.map((item) => item.tag)).toEqual([
      'Communication',
    ]);
    expect(payload.unresolvedAreas).toHaveLength(0);
    expect(payload.evidence.mode).toBe('summary_only');
    expect(payload.policy.cautionLevel).toBe('strict');
    expect(payload.policy.aiMode).toBe('local_only');
    expect(payload.policy.redactions).toEqual(
      expect.arrayContaining([
        'sensitive_low_confidence_theme_summaries',
        'sensitive_unresolved_areas',
        'sensitive_card_evidence_omitted',
      ]),
    );
  });
});
