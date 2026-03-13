import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckById } from '@/hooks/useDeckById';
import { useDeckProfileSummary } from '@/hooks/useDeckProfileSummary';
import { useDecks } from '@/hooks/useDecks';
import {
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
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
const mockGetAllDecks = jest.fn();
const mockGetDeckById = jest.fn();
const mockComputeDeckProfileSummary = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getAllDecks: (...args: unknown[]) => mockGetAllDecks(...args),
  getDeckById: (...args: unknown[]) => mockGetDeckById(...args),
}));

jest.mock('@/lib/profile/deckProfileService', () => ({
  computeDeckProfileSummary: (...args: unknown[]) =>
    mockComputeDeckProfileSummary(...args),
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

function buildSummary(
  overrides: Partial<DeckProfileSummary> = {},
): DeckProfileSummary {
  return {
    deckId: asDeckId('deck_values'),
    stage: 'meaningful',
    confidence: {
      value: 0.56,
      label: 'medium',
      swipeCount: 18,
      cardCoverage: 0.52,
      components: {
        swipeSignal: 0.75,
        cardCoverage: 0.52,
        tagCoverage: 0.68,
        facetCoverage: 0.75,
        stability: 0.41,
        ambiguityPenalty: 0.34,
      },
    },
    coverage: {
      deckId: asDeckId('deck_values'),
      cardsSeen: 13,
      totalCards: 25,
      cardCoverage: 13 / 25,
      tags: {
        deckId: asDeckId('deck_values'),
        totalTagCount: 10,
        seenTagCount: 7,
        unseenTagCount: 3,
        resolvedTagCount: 5,
        uncertainTagCount: 5,
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
      stabilityScore: 0.44,
      stableTagCount: 2,
      emergingTagCount: 3,
      mixedSignalTagCount: 1,
      retestedTagCount: 1,
      retestPendingCount: 1,
    },
    affinities: [
      {
        tagId: asDeckTagId('values:direct_communication'),
        tag: 'Direct communication',
        facet: 'Style',
        score: 2.1,
        exposureCount: 3,
        stability: 'steady',
      },
    ],
    aversions: [],
    unresolved: [],
    nextSteps: [
      {
        kind: 'keep_swiping',
        title: 'Keep swiping',
        detail: 'Cover more of the deck before comparing.',
        priority: 0,
      },
    ],
    readiness: {
      compareReady: false,
      blockers: ['not_enough_swipes'],
    },
    topCardsLiked: [],
    topCardsDisliked: [],
    generatedAt: 1700000005000,
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

  it('refresh reloads the current deck', async () => {
    const firstDeck = buildDeck({ title: 'First detail' });
    const secondDeck = buildDeck({ title: 'Updated detail' });
    mockGetDeckById
      .mockResolvedValueOnce(firstDeck)
      .mockResolvedValueOnce(secondDeck);

    const { result } = renderHook(() => useDeckById(firstDeck.id));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck?.title).toBe('First detail');

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.deck?.title).toBe('Updated detail');
    });

    expect(mockGetDeckById).toHaveBeenCalledTimes(2);
  });

  it('clears stale deck data when the requested deck id changes', async () => {
    const firstDeck = buildDeck({ title: 'First deck' });
    const secondDeck = buildDeck({
      id: asDeckId('deck_movies_tv'),
      title: 'Second deck',
      category: 'movies_tv',
    });

    let resolveSecondDeck: ((value: Deck | null) => void) | null = null;
    mockGetDeckById.mockResolvedValueOnce(firstDeck).mockImplementationOnce(
      () =>
        new Promise<Deck | null>((resolve) => {
          resolveSecondDeck = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckById(deckId),
      {
        initialProps: { deckId: firstDeck.id },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck?.title).toBe('First deck');

    rerender({ deckId: secondDeck.id });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    expect(result.current.deck).toBeNull();

    act(() => {
      resolveSecondDeck?.(secondDeck);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck?.title).toBe('Second deck');
  });

  it('suppresses a stale deck error when the requested deck id changes', async () => {
    let resolveSecondDeck: ((value: Deck | null) => void) | null = null;
    const secondDeckPromise = new Promise<Deck | null>((resolve) => {
      resolveSecondDeck = resolve;
    });

    mockGetDeckById.mockImplementation(
      (_db: unknown, requestedDeckId: Deck['id']) => {
        if (requestedDeckId === asDeckId('deck_values')) {
          return Promise.reject(new Error('Deck A failed.'));
        }

        return secondDeckPromise;
      },
    );

    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckById(deckId),
      {
        initialProps: { deckId: asDeckId('deck_values') },
      },
    );

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Deck A failed.');
    });

    rerender({ deckId: asDeckId('deck_movies_tv') });

    expect(result.current.loading).toBe(true);
    expect(result.current.deck).toBeNull();
    expect(result.current.error).toBeNull();

    act(() => {
      resolveSecondDeck?.(
        buildDeck({
          id: asDeckId('deck_movies_tv'),
          title: 'Movies & TV',
          category: 'movies_tv',
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.deck?.id).toBe(asDeckId('deck_movies_tv'));
    expect(result.current.error).toBeNull();
  });
});

describe('useDeckProfileSummary', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
  });

  it('loads the summary for a deck', async () => {
    const summary = buildSummary();
    mockComputeDeckProfileSummary.mockResolvedValue(summary);

    const { result } = renderHook(() => useDeckProfileSummary(summary.deckId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary).toEqual(summary);
    expect(result.current.error).toBeNull();
    expect(mockComputeDeckProfileSummary).toHaveBeenCalledWith(
      fakeDb,
      summary.deckId,
    );
  });

  it('clears stale summary data when the requested deck id changes', async () => {
    const firstSummary = buildSummary();
    const secondSummary = buildSummary({
      deckId: asDeckId('deck_movies_tv'),
      generatedAt: 1700000009000,
      coverage: {
        deckId: asDeckId('deck_movies_tv'),
        cardsSeen: 17,
        totalCards: 24,
        cardCoverage: 17 / 24,
        tags: {
          deckId: asDeckId('deck_movies_tv'),
          totalTagCount: 9,
          seenTagCount: 8,
          unseenTagCount: 1,
          resolvedTagCount: 6,
          uncertainTagCount: 3,
          coverageRatio: 8 / 9,
        },
        facets: {
          totalFacetCount: 4,
          seenFacetCount: 4,
          unseenFacetCount: 0,
          coverageRatio: 1,
        },
      },
    });

    let resolveSecondSummary:
      | ((value: DeckProfileSummary | null) => void)
      | null = null;

    mockComputeDeckProfileSummary
      .mockResolvedValueOnce(firstSummary)
      .mockImplementationOnce(
        () =>
          new Promise<DeckProfileSummary | null>((resolve) => {
            resolveSecondSummary = resolve;
          }),
      );

    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckProfileSummary(deckId),
      {
        initialProps: { deckId: firstSummary.deckId },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary?.deckId).toBe(firstSummary.deckId);

    rerender({ deckId: secondSummary.deckId });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    expect(result.current.summary).toBeNull();

    act(() => {
      resolveSecondSummary?.(secondSummary);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary?.deckId).toBe(secondSummary.deckId);
  });

  it('suppresses a stale summary error when the requested deck id changes', async () => {
    let resolveSecondSummary:
      | ((value: DeckProfileSummary | null) => void)
      | null = null;
    const secondSummaryPromise = new Promise<DeckProfileSummary | null>(
      (resolve) => {
        resolveSecondSummary = resolve;
      },
    );

    mockComputeDeckProfileSummary.mockImplementation(
      (_db: unknown, requestedDeckId: Deck['id']) => {
        if (requestedDeckId === asDeckId('deck_values')) {
          return Promise.reject(new Error('Deck A summary failed.'));
        }

        return secondSummaryPromise;
      },
    );

    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckProfileSummary(deckId),
      {
        initialProps: { deckId: asDeckId('deck_values') },
      },
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Deck A summary failed.');
    });

    rerender({ deckId: asDeckId('deck_movies_tv') });

    expect(result.current.loading).toBe(true);
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBeNull();

    act(() => {
      resolveSecondSummary?.(
        buildSummary({
          deckId: asDeckId('deck_movies_tv'),
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.summary?.deckId).toBe(asDeckId('deck_movies_tv'));
    expect(result.current.error).toBeNull();
  });
});
