import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckSwipeSession } from '@/hooks/useDeckSwipeSession';
import {
  asDeckCardId,
  asDeckId,
  asSessionId,
  type DeckCard,
} from '@/types/domain';

const mockGetDb = jest.fn();
const mockGetDeckCardsByDeckId = jest.fn();
const mockGetSwipedCardIdsByDeckId = jest.fn();
const mockCreateSwipeSession = jest.fn();
const mockEndSwipeSession = jest.fn();
const mockInsertSwipeEvent = jest.fn();
const mockCreateSwipeEvent = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getDeckCardsByDeckId: (...args: unknown[]) =>
    mockGetDeckCardsByDeckId(...args),
}));

jest.mock('@/lib/db/swipeRepository', () => ({
  getSwipedCardIdsByDeckId: (...args: unknown[]) =>
    mockGetSwipedCardIdsByDeckId(...args),
  createSwipeSession: (...args: unknown[]) => mockCreateSwipeSession(...args),
  endSwipeSession: (...args: unknown[]) => mockEndSwipeSession(...args),
  insertSwipeEvent: (...args: unknown[]) => mockInsertSwipeEvent(...args),
  createSwipeEvent: (...args: unknown[]) => mockCreateSwipeEvent(...args),
}));

function buildCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: asDeckCardId('values_001'),
    deckId: asDeckId('deck_values'),
    kind: 'statement',
    title: 'Honesty matters more to me than being liked',
    subtitle: '',
    descriptionShort: 'Deck card description',
    tags: ['honesty', 'growth'],
    popularity: 0.8,
    tileKey: 'values:values_001',
    sortOrder: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('useDeckSwipeSession', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
    mockCreateSwipeSession.mockResolvedValue({
      id: asSessionId('session_1'),
      deckId: asDeckId('deck_values'),
      startedAt: 1700000005000,
      endedAt: null,
      filters: {},
    });
    mockCreateSwipeEvent.mockImplementation((event) =>
      Promise.resolve({
        ...event,
        id: 'event_generated',
      }),
    );
    mockInsertSwipeEvent.mockResolvedValue(undefined);
    mockEndSwipeSession.mockResolvedValue(undefined);
  });

  it('filters seen cards and serves the lowest sort_order card first', async () => {
    mockGetDeckCardsByDeckId.mockResolvedValue([
      buildCard({
        id: asDeckCardId('values_003'),
        sortOrder: 3,
        popularity: 0.2,
      }),
      buildCard({
        id: asDeckCardId('values_002'),
        sortOrder: 0,
        popularity: 0.4,
      }),
      buildCard({
        id: asDeckCardId('values_001'),
        sortOrder: 0,
        popularity: 0.9,
      }),
    ]);
    mockGetSwipedCardIdsByDeckId.mockResolvedValue(
      new Set([asDeckCardId('values_001')]),
    );

    const { result } = renderHook(() =>
      useDeckSwipeSession({
        deckId: asDeckId('deck_values'),
        deckCategory: 'values',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    expect(result.current.totalCards).toBe(3);
    expect(result.current.cardsRemaining).toBe(2);
    expect(result.current.currentCard?.id).toBe(asDeckCardId('values_002'));
    expect(mockCreateSwipeSession).toHaveBeenCalledWith(
      fakeDb,
      asDeckId('deck_values'),
      {
        category: 'values',
      },
    );
  });

  it('persists a swipe event and advances through the queue to completion', async () => {
    mockGetDeckCardsByDeckId.mockResolvedValue([
      buildCard({ id: asDeckCardId('values_001'), sortOrder: 0 }),
      buildCard({ id: asDeckCardId('values_002'), sortOrder: 1 }),
    ]);
    mockGetSwipedCardIdsByDeckId.mockResolvedValue(new Set());

    const { result, unmount } = renderHook(() =>
      useDeckSwipeSession({
        deckId: asDeckId('deck_values'),
        deckCategory: 'values',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    await act(async () => {
      await (
        result.current.onAction as unknown as (
          action: 'yes',
          meta: { source: 'button' },
        ) => Promise<void>
      )('yes', { source: 'button' });
    });

    expect(mockInsertSwipeEvent).toHaveBeenCalledTimes(1);
    expect(result.current.currentCard?.id).toBe(asDeckCardId('values_002'));
    expect(result.current.cardsRemaining).toBe(1);

    await act(async () => {
      await (
        result.current.onAction as unknown as (
          action: 'strong_yes',
          meta: { source: 'gesture' },
        ) => Promise<void>
      )('strong_yes', { source: 'gesture' });
    });

    expect(result.current.state).toBe('complete');
    expect(result.current.currentCard).toBeNull();
    expect(mockEndSwipeSession).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockEndSwipeSession).toHaveBeenCalledTimes(1);
  });

  it('returns complete immediately when all cards were already seen', async () => {
    const cards = [
      buildCard({ id: asDeckCardId('values_001') }),
      buildCard({ id: asDeckCardId('values_002'), sortOrder: 1 }),
    ];
    mockGetDeckCardsByDeckId.mockResolvedValue(cards);
    mockGetSwipedCardIdsByDeckId.mockResolvedValue(
      new Set(cards.map((card) => card.id)),
    );

    const { result } = renderHook(() =>
      useDeckSwipeSession({
        deckId: asDeckId('deck_values'),
        deckCategory: 'values',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('complete');
    });

    expect(mockCreateSwipeSession).not.toHaveBeenCalled();
  });
});
