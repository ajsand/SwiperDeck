import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckProfileScreen from '../app/deck/[deckId]/profile';
import {
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUseDeckById = jest.fn();
const mockUseDeckProfileSummary = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ deckId: 'deck_movies_tv' }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDeckById', () => ({
  useDeckById: (...args: unknown[]) => mockUseDeckById(...args),
}));

jest.mock('@/hooks/useDeckProfileSummary', () => ({
  useDeckProfileSummary: (...args: unknown[]) =>
    mockUseDeckProfileSummary(...args),
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

describe('DeckProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeckById.mockReturnValue({
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseDeckProfileSummary.mockReturnValue({
      summary: buildSummary(),
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders richer coverage, stability, and unresolved-area copy', () => {
    render(<DeckProfileScreen />);

    expect(screen.getByText('Coverage')).toBeTruthy();
    expect(screen.getByText('Confidence breakdown')).toBeTruthy();
    expect(screen.getAllByText('Stability').length).toBeGreaterThan(0);
    expect(screen.getByText('Unresolved areas')).toBeTruthy();
    expect(screen.getByText('Prestige')).toBeTruthy();
    expect(screen.getAllByText(/Pending retest/).length).toBeGreaterThan(0);
  });

  it('keeps compare available for compare-ready high-confidence profiles', () => {
    mockUseDeckProfileSummary.mockReturnValue({
      summary: buildSummary({
        stage: 'high_confidence',
        confidence: {
          value: 0.83,
          label: 'high',
          swipeCount: 30,
          cardCoverage: 0.8,
          components: {
            swipeSignal: 1,
            cardCoverage: 0.8,
            tagCoverage: 0.9,
            facetCoverage: 1,
            stability: 0.75,
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
      }),
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DeckProfileScreen />);

    expect(
      screen.getByText(
        'This deck has broad enough and stable enough signal to support stronger compare and report quality later.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('This deck is locally ready for a compare flow.'),
    ).toBeTruthy();
    expect(screen.getByTestId('deck-profile-compare')).toBeTruthy();
  });

  it('still exposes compare status routing for custom decks', () => {
    mockUseDeckById.mockReturnValue({
      deck: buildDeck({
        id: asDeckId('deck_custom_movies_tv'),
        compareEligible: false,
        isCustom: true,
      }),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckProfileScreen />);

    expect(
      screen.getByText(
        'Custom decks are not compare-eligible under the current product scope. Their profile stays local to this device.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('deck-profile-compare-readiness')).toBeTruthy();

    fireEvent.press(screen.getByTestId('deck-profile-compare-readiness'));
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_movies_tv/compare');
  });
});
