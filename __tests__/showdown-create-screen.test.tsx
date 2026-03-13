import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import ShowdownCreateScreen from '../app/showdown/create';
import { asDeckCardId, asDeckId, type Deck } from '@/types/domain';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseDeckById = jest.fn();
const mockGetDb = jest.fn();
const mockGetDeckCardsByDeckId = jest.fn();
const mockGetDeckTagsByDeckId = jest.fn();
const mockGetDeckTagFacetsByDeckId = jest.fn();
const mockGetDeckCardTagLinksByCardId = jest.fn();
const mockGetDeckSafetyPolicy = jest.fn();
const mockGetDeckSafetyBadgeLabel = jest.fn();
const mockSelectShowdownCards = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('@/hooks/useDeckById', () => ({
  useDeckById: (...args: unknown[]) => mockUseDeckById(...args),
}));

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getDeckCardsByDeckId: (...args: unknown[]) =>
    mockGetDeckCardsByDeckId(...args),
  getDeckTagsByDeckId: (...args: unknown[]) => mockGetDeckTagsByDeckId(...args),
  getDeckTagFacetsByDeckId: (...args: unknown[]) =>
    mockGetDeckTagFacetsByDeckId(...args),
  getDeckCardTagLinksByCardId: (...args: unknown[]) =>
    mockGetDeckCardTagLinksByCardId(...args),
}));

jest.mock('@/lib/policy/deckSafetyPolicy', () => ({
  getDeckSafetyPolicy: (...args: unknown[]) => mockGetDeckSafetyPolicy(...args),
  getDeckSafetyBadgeLabel: (...args: unknown[]) =>
    mockGetDeckSafetyBadgeLabel(...args),
}));

jest.mock('@/lib/showdown/showdownCardSelection', () => ({
  selectShowdownCards: (...args: unknown[]) => mockSelectShowdownCards(...args),
}));

jest.mock('@/lib/showdown/showdownSessionStore', () => ({
  createLocalShowdownSession: jest.fn(),
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

describe('ShowdownCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ deckId: 'deck_movies_tv' });
    mockUseDeckById.mockReturnValue({
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockGetDb.mockResolvedValue({ label: 'db' });
    mockGetDeckTagsByDeckId.mockResolvedValue([]);
    mockGetDeckTagFacetsByDeckId.mockResolvedValue([]);
    mockGetDeckCardTagLinksByCardId.mockResolvedValue([]);
    mockGetDeckSafetyPolicy.mockReturnValue({
      showdown: {
        allowed: true,
        reason: null,
      },
    });
    mockGetDeckSafetyBadgeLabel.mockReturnValue(null);
    mockGetDeckCardsByDeckId.mockResolvedValue([
      {
        id: asDeckCardId('movies_tv_001'),
        deckId: asDeckId('deck_movies_tv'),
      },
    ]);
    mockSelectShowdownCards.mockReturnValue({
      available: true,
      reason: null,
      excludedCardCount: 0,
      selectedCards: [
        {
          cardId: 'movies_tv_001',
          title: 'Deck A preview card',
          subtitle: '',
          facetLabel: 'Mood',
          primaryTagLabel: 'Comfort watch',
          tagLabels: ['Comfort watch'],
          selectionReason: 'representative',
          tileKey: 'movies_tv:001',
        },
      ],
    });
  });

  it('does not leak the previous deck preview while a new deck selection is loading', async () => {
    const pendingDeckBCards = new Promise<unknown[]>(() => {});

    const { rerender, queryByTestId, queryByText } = render(
      <ShowdownCreateScreen />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('showdown-preview-card-1')).toBeTruthy();
    });

    expect(screen.getByText('1. Deck A preview card')).toBeTruthy();

    mockUseLocalSearchParams.mockReturnValue({ deckId: 'deck_travel' });
    mockUseDeckById.mockReturnValue({
      deck: buildDeck({
        id: asDeckId('deck_travel'),
        title: 'Travel',
        category: 'travel',
      }),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockGetDeckCardsByDeckId.mockImplementation(
      (_db: unknown, deckId: Deck['id']) =>
        deckId === asDeckId('deck_travel')
          ? pendingDeckBCards
          : Promise.resolve([
              {
                id: asDeckCardId('movies_tv_001'),
                deckId: asDeckId('deck_movies_tv'),
              },
            ]),
    );

    rerender(<ShowdownCreateScreen />);

    expect(queryByTestId('showdown-preview-card-1')).toBeNull();
    expect(queryByText('1. Deck A preview card')).toBeNull();
    expect(
      screen.getByText('Building a showdown-safe card set...'),
    ).toBeTruthy();
  });
});
