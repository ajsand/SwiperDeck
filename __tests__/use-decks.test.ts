import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckById } from '@/hooks/useDeckById';
import { useDecks } from '@/hooks/useDecks';
import { asDeckId, type Deck } from '@/types/domain';

const mockGetDb = jest.fn();
const mockGetAllDecks = jest.fn();
const mockGetDeckById = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getAllDecks: (...args: unknown[]) => mockGetAllDecks(...args),
  getDeckById: (...args: unknown[]) => mockGetDeckById(...args),
}));

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_values'),
    title: 'Values Deck',
    description: 'Talk through what matters most.',
    category: 'values',
    tier: 'tier_1',
    cardCount: 42,
    compareEligible: true,
    showdownEligible: false,
    sensitivity: 'sensitive',
    minCardsForProfile: 15,
    minCardsForCompare: 30,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('useDecks', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
  });

  it('returns an empty list when no decks exist', async () => {
    mockGetAllDecks.mockResolvedValue([]);

    const { result } = renderHook(() => useDecks());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns deck data after loading completes', async () => {
    const deck = buildDeck();
    mockGetAllDecks.mockResolvedValue([deck]);

    const { result } = renderHook(() => useDecks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decks).toEqual([deck]);
    expect(mockGetAllDecks).toHaveBeenCalledWith(fakeDb);
  });

  it('surfaces database errors', async () => {
    mockGetAllDecks.mockRejectedValue(new Error('Deck query failed.'));

    const { result } = renderHook(() => useDecks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decks).toEqual([]);
    expect(result.current.error?.message).toBe('Deck query failed.');
  });

  it('refresh reloads deck data', async () => {
    const firstDeck = buildDeck({ title: 'First pass' });
    const secondDeck = buildDeck({ title: 'Second pass' });
    mockGetAllDecks
      .mockResolvedValueOnce([firstDeck])
      .mockResolvedValueOnce([secondDeck]);

    const { result } = renderHook(() => useDecks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.decks).toEqual([firstDeck]);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.decks).toEqual([secondDeck]);
    });

    expect(mockGetAllDecks).toHaveBeenCalledTimes(2);
  });
});

describe('useDeckById', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
  });

  it('loads a deck by id', async () => {
    const deck = buildDeck();
    mockGetDeckById.mockResolvedValue(deck);

    const { result } = renderHook(() => useDeckById(deck.id));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck).toEqual(deck);
    expect(result.current.error).toBeNull();
    expect(mockGetDeckById).toHaveBeenCalledWith(fakeDb, deck.id);
  });

  it('returns null for missing decks without raising an error', async () => {
    mockGetDeckById.mockResolvedValue(null);

    const { result } = renderHook(() => useDeckById(asDeckId('missing_deck')));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
