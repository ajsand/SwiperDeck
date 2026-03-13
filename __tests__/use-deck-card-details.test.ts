import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckCardDetails } from '@/hooks/useDeckCardDetails';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckCard,
} from '@/types/domain';

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');

  return {
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

const mockGetDb = jest.fn();
const mockGetDeckCardById = jest.fn();
const mockGetDeckById = jest.fn();
const mockGetDeckCardTagLinksByCardId = jest.fn();
const mockGetDeckTagsByIds = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getDeckCardById: (...args: unknown[]) => mockGetDeckCardById(...args),
  getDeckById: (...args: unknown[]) => mockGetDeckById(...args),
  getDeckCardTagLinksByCardId: (...args: unknown[]) =>
    mockGetDeckCardTagLinksByCardId(...args),
  getDeckTagsByIds: (...args: unknown[]) => mockGetDeckTagsByIds(...args),
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

function buildCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: asDeckCardId('movies_tv_001'),
    deckId: asDeckId('deck_movies_tv'),
    kind: 'statement',
    title: 'I would rather rewatch a favorite than chase every new release',
    subtitle: 'Movies & TV',
    descriptionShort: 'Tests comfort-watch leaning.',
    tags: ['Comfort watch'],
    popularity: 0.8,
    tileKey: 'statement:movies_tv_001',
    sortOrder: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('useDeckCardDetails', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
    mockGetDeckCardTagLinksByCardId.mockResolvedValue([
      {
        cardId: asDeckCardId('movies_tv_001'),
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        role: 'primary',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ]);
    mockGetDeckTagsByIds.mockResolvedValue([
      {
        id: asDeckTagId('movies_tv:comfort_watch'),
        deckId: asDeckId('deck_movies_tv'),
        facetId: 'movies_tv:mood',
        slug: 'comfort_watch',
        label: 'Comfort watch',
        description: 'Familiar, rewatchable, low-friction viewing.',
        sortOrder: 0,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ]);
  });

  it('loads card, deck, and canonical tag labels', async () => {
    const card = buildCard();
    const deck = buildDeck();
    mockGetDeckCardById.mockResolvedValue(card);
    mockGetDeckById.mockResolvedValue(deck);

    const { result } = renderHook(() => useDeckCardDetails(card.id));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card).toEqual(card);
    expect(result.current.deck).toEqual(deck);
    expect(result.current.tagLabels).toEqual(['Comfort watch']);
  });

  it('refresh reloads the current card detail', async () => {
    const firstCard = buildCard({ title: 'First card detail' });
    const secondCard = buildCard({ title: 'Updated card detail' });
    const deck = buildDeck();
    mockGetDeckCardById
      .mockResolvedValueOnce(firstCard)
      .mockResolvedValueOnce(secondCard);
    mockGetDeckById.mockResolvedValue(deck);

    const { result } = renderHook(() => useDeckCardDetails(firstCard.id));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card?.title).toBe('First card detail');

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.card?.title).toBe('Updated card detail');
    });
  });

  it('clears stale card detail when the route card id changes', async () => {
    const firstCard = buildCard({ title: 'First card' });
    const secondCard = buildCard({
      id: asDeckCardId('movies_tv_002'),
      title: 'Second card',
    });
    const deck = buildDeck();
    let resolveSecondCard: ((value: DeckCard | null) => void) | null = null;

    mockGetDeckCardById.mockResolvedValueOnce(firstCard).mockImplementationOnce(
      () =>
        new Promise<DeckCard | null>((resolve) => {
          resolveSecondCard = resolve;
        }),
    );
    mockGetDeckById.mockResolvedValue(deck);

    const { result, rerender } = renderHook(
      ({ cardId }: { cardId: DeckCard['id'] }) => useDeckCardDetails(cardId),
      {
        initialProps: { cardId: firstCard.id },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card?.title).toBe('First card');

    rerender({ cardId: secondCard.id });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    expect(result.current.card).toBeNull();
    expect(result.current.deck).toBeNull();
    expect(result.current.tagLabels).toEqual([]);

    act(() => {
      resolveSecondCard?.(secondCard);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card?.title).toBe('Second card');
  });

  it('treats a card id as fresh again after the route is cleared to null', async () => {
    const card = buildCard({ title: 'Reloaded card' });
    const deck = buildDeck();

    mockGetDeckCardById.mockResolvedValue(card);
    mockGetDeckById.mockResolvedValue(deck);

    const { result, rerender } = renderHook(
      ({ cardId }: { cardId: DeckCard['id'] | null }) =>
        useDeckCardDetails(cardId),
      {
        initialProps: { cardId: card.id },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card?.title).toBe('Reloaded card');
    expect(mockGetDeckCardById).toHaveBeenCalledTimes(1);

    rerender({ cardId: null });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card).toBeNull();
    expect(result.current.deck).toBeNull();
    expect(result.current.tagLabels).toEqual([]);

    rerender({ cardId: card.id });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.card?.title).toBe('Reloaded card');
    expect(mockGetDeckCardById).toHaveBeenCalledTimes(2);
  });
});
