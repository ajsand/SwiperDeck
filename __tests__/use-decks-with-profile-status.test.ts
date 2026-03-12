import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDecksWithProfileStatus } from '@/hooks/useDecksWithProfileStatus';
import {
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

const mockGetDb = jest.fn();
const mockGetAllDecks = jest.fn();
const mockComputeDeckProfileSummary = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getAllDecks: (...args: unknown[]) => mockGetAllDecks(...args),
}));

jest.mock('@/lib/profile/deckProfileService', () => ({
  computeDeckProfileSummary: (...args: unknown[]) =>
    mockComputeDeckProfileSummary(...args),
}));

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies_tv'),
    title: 'Movies & TV',
    description: 'Test deck',
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
      value: 0.5,
      label: 'medium',
      swipeCount: 18,
      cardCoverage: 0.55,
      components: {
        swipeSignal: 0.75,
        cardCoverage: 0.55,
        tagCoverage: 0.7,
        facetCoverage: 0.75,
        stability: 0.45,
        ambiguityPenalty: 0.3,
      },
    },
    coverage: {
      deckId: asDeckId('deck_movies_tv'),
      cardsSeen: 13,
      totalCards: 24,
      cardCoverage: 13 / 24,
      tags: {
        deckId: asDeckId('deck_movies_tv'),
        totalTagCount: 10,
        seenTagCount: 7,
        unseenTagCount: 3,
        resolvedTagCount: 6,
        uncertainTagCount: 4,
        coverageRatio: 0.7,
      },
      facets: {
        totalFacetCount: 4,
        seenFacetCount: 3,
        unseenFacetCount: 1,
        coverageRatio: 0.75,
      },
    },
    stability: {
      stabilityScore: 0.48,
      stableTagCount: 1,
      emergingTagCount: 4,
      mixedSignalTagCount: 1,
      retestedTagCount: 0,
      retestPendingCount: 1,
    },
    affinities: [
      {
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        tag: 'Comfort watch',
        facet: 'Mood',
        score: 2.4,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    aversions: [],
    unresolved: [],
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

describe('useDecksWithProfileStatus', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
  });

  it('uses canonical deck profile summaries for stage, readiness, and hinting', async () => {
    const deck = buildDeck();
    const summary = buildSummary({
      stage: 'high_confidence',
      confidence: {
        value: 0.82,
        label: 'high',
        swipeCount: 31,
        cardCoverage: 0.78,
        components: {
          swipeSignal: 1,
          cardCoverage: 0.78,
          tagCoverage: 0.85,
          facetCoverage: 1,
          stability: 0.72,
          ambiguityPenalty: 0.18,
        },
      },
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
    mockGetAllDecks.mockResolvedValue([deck]);
    mockComputeDeckProfileSummary.mockResolvedValue(summary);

    const { result } = renderHook(() => useDecksWithProfileStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.decks).toEqual([
      {
        deck,
        summary,
        swipeCount: 31,
        stage: 'high_confidence',
        compareReady: true,
        compareState: 'compare_ready',
        compareDetail:
          'This deck has enough breadth, confidence, and stability for a deck-scoped compare flow.',
        primaryHint: summary.nextSteps[0],
      },
    ]);
    expect(mockComputeDeckProfileSummary).toHaveBeenCalledWith(fakeDb, deck.id);
  });

  it('refresh re-runs summary computation and returns the latest stage', async () => {
    const deck = buildDeck();
    mockGetAllDecks.mockResolvedValue([deck]);
    mockComputeDeckProfileSummary
      .mockResolvedValueOnce(
        buildSummary({
          stage: 'lightweight',
          confidence: {
            value: 0.2,
            label: 'low',
            swipeCount: 4,
            cardCoverage: 0.1,
            components: {
              swipeSignal: 0.16,
              cardCoverage: 0.1,
              tagCoverage: 0.1,
              facetCoverage: 0.25,
              stability: 0.05,
              ambiguityPenalty: 0.8,
            },
          },
          nextSteps: [
            {
              kind: 'keep_swiping',
              title: 'Keep swiping',
              detail:
                'You have an early read, but this deck needs more cards before the profile becomes meaningful.',
              priority: 0,
            },
          ],
          readiness: {
            compareReady: false,
            blockers: ['not_enough_swipes', 'high_ambiguity'],
          },
        }),
      )
      .mockResolvedValueOnce(
        buildSummary({
          stage: 'meaningful',
          confidence: {
            value: 0.54,
            label: 'medium',
            swipeCount: 16,
            cardCoverage: 0.48,
            components: {
              swipeSignal: 0.67,
              cardCoverage: 0.48,
              tagCoverage: 0.62,
              facetCoverage: 0.75,
              stability: 0.41,
              ambiguityPenalty: 0.38,
            },
          },
        }),
      );

    const { result } = renderHook(() => useDecksWithProfileStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decks[0]?.stage).toBe('lightweight');

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.decks[0]?.stage).toBe('meaningful');
    });
    expect(result.current.decks[0]?.compareState).toBe('needs_more_stability');

    expect(mockComputeDeckProfileSummary).toHaveBeenCalledTimes(2);
  });
});
