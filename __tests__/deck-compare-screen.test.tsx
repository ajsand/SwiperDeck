import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckCompareReadinessScreen from '../app/deck/[deckId]/compare';
import { asDeckId, type DeckCompareReadiness } from '@/types/domain';

const mockPush = jest.fn();
const mockUseDeckCompareReadiness = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ deckId: 'deck_movies_tv' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDeckCompareReadiness', () => ({
  useDeckCompareReadiness: (...args: unknown[]) =>
    mockUseDeckCompareReadiness(...args),
}));

function buildReadiness(
  overrides: Partial<DeckCompareReadiness> = {},
): DeckCompareReadiness {
  return {
    deckId: asDeckId('deck_movies_tv'),
    state: 'needs_more_breadth',
    ready: false,
    caution: false,
    title: 'More breadth is needed',
    detail:
      'This deck has a profile, but it still needs broader coverage across cards, tags, or facets before compare should unlock.',
    reasons: [],
    recommendedAction: 'Cover more themes inside this deck before comparing.',
    ...overrides,
  };
}

describe('DeckCompareReadinessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeckCompareReadiness.mockReturnValue({
      deck: {
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
      },
      summary: null,
      readiness: buildReadiness(),
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('uses Swipe More when the deck can become compare-ready with more signal', () => {
    render(<DeckCompareReadinessScreen />);

    fireEvent.press(screen.getByTestId('deck-compare-swipe-more'));
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_movies_tv/play');
  });

  it('uses Browse Decks when compare is unavailable for the deck', () => {
    mockUseDeckCompareReadiness.mockReturnValue({
      deck: {
        id: asDeckId('deck_custom_movies_tv'),
        title: 'Custom Movies',
        description: 'Custom deck',
        category: 'movies_tv',
        tier: 'tier_1',
        cardCount: 24,
        compareEligible: false,
        showdownEligible: false,
        sensitivity: 'standard',
        minCardsForProfile: 12,
        minCardsForCompare: 24,
        isCustom: true,
        coverTileKey: null,
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
      },
      summary: null,
      readiness: buildReadiness({
        deckId: asDeckId('deck_custom_movies_tv'),
        state: 'unavailable',
        title: 'Compare unavailable',
        detail:
          'This deck is not eligible for compare under the current product scope.',
        recommendedAction:
          'Use a shipped prebuilt deck for compare until custom-deck compare support lands.',
      }),
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<DeckCompareReadinessScreen />);

    expect(screen.getByTestId('deck-compare-open-decks')).toBeTruthy();
    fireEvent.press(screen.getByTestId('deck-compare-open-decks'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
