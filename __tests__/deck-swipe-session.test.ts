import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckSwipeSession } from '@/hooks/useDeckSwipeSession';
import {
  asDeckCardId,
  asDeckId,
  asSessionId,
  type DeckCard,
} from '@/types/domain';
import type { DeckSequenceQueueEntry } from '@/lib/sequence/deckSequenceTypes';

const mockGetDb = jest.fn();
const mockGetDeckCardsByDeckId = jest.fn();
const mockCreateSwipeSession = jest.fn();
const mockEndSwipeSession = jest.fn();
const mockInsertSwipeEvent = jest.fn();
const mockCreateSwipeEvent = jest.fn();
const mockBuildDeckSequenceQueue = jest.fn();
const mockRecordDeckCardPresentation = jest.fn();
const mockRecordDeckCardSwipe = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getDeckCardsByDeckId: (...args: unknown[]) =>
    mockGetDeckCardsByDeckId(...args),
}));

jest.mock('@/lib/db/swipeRepository', () => ({
  createSwipeSession: (...args: unknown[]) => mockCreateSwipeSession(...args),
  endSwipeSession: (...args: unknown[]) => mockEndSwipeSession(...args),
  insertSwipeEvent: (...args: unknown[]) => mockInsertSwipeEvent(...args),
  createSwipeEvent: (...args: unknown[]) => mockCreateSwipeEvent(...args),
}));

jest.mock('@/lib/sequence/broadStartStrategy', () => ({
  buildDeckSequenceQueue: (...args: unknown[]) =>
    mockBuildDeckSequenceQueue(...args),
}));

jest.mock('@/lib/db/deckCardStateRepository', () => ({
  recordDeckCardPresentation: (...args: unknown[]) =>
    mockRecordDeckCardPresentation(...args),
  recordDeckCardSwipe: (...args: unknown[]) => mockRecordDeckCardSwipe(...args),
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

function buildQueueEntry(
  card: DeckCard,
  stage: 'broad_start' | 'adaptive' = 'broad_start',
): DeckSequenceQueueEntry {
  return {
    card,
    decision: {
      cardId: card.id,
      stage,
      score: 1,
      primaryReason:
        stage === 'adaptive'
          ? 'reinforce_positive_area'
          : 'clarify_low_coverage_tag',
      reasons: [
        {
          code: 'representative_pick',
          scoreDelta: 1,
          detail: 'representative_pick',
        },
      ],
    },
  };
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
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
    mockBuildDeckSequenceQueue.mockResolvedValue([]);
    mockRecordDeckCardPresentation.mockResolvedValue(undefined);
    mockRecordDeckCardSwipe.mockResolvedValue(undefined);
  });

  it('uses the sequencing strategy result instead of raw author order', async () => {
    const cards = [
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
    ];
    mockGetDeckCardsByDeckId.mockResolvedValue(cards);
    mockBuildDeckSequenceQueue.mockResolvedValue([
      buildQueueEntry(cards[1]),
      buildQueueEntry(cards[0]),
    ]);

    const { result } = renderHook(() =>
      useDeckSwipeSession({
        deckId: asDeckId('deck_values'),
        deckCategory: 'values',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    await waitFor(() => {
      expect(mockRecordDeckCardPresentation).toHaveBeenCalledWith(fakeDb, {
        deckId: asDeckId('deck_values'),
        cardId: asDeckCardId('values_002'),
        presentedAt: expect.any(Number),
      });
    });

    expect(result.current.totalCards).toBe(3);
    expect(result.current.cardsRemaining).toBe(2);
    expect(result.current.currentCard?.id).toBe(asDeckCardId('values_002'));
    expect(result.current.currentDecision?.stage).toBe('broad_start');
    expect(mockBuildDeckSequenceQueue).toHaveBeenCalledWith(
      fakeDb,
      asDeckId('deck_values'),
      expect.arrayContaining(cards),
    );
    expect(mockCreateSwipeSession).toHaveBeenCalledWith(
      fakeDb,
      asDeckId('deck_values'),
      {
        category: 'values',
      },
    );
  });

  it('persists a swipe event and advances through the queue to completion', async () => {
    const cards = [
      buildCard({ id: asDeckCardId('values_001'), sortOrder: 0 }),
      buildCard({ id: asDeckCardId('values_002'), sortOrder: 1 }),
    ];
    mockGetDeckCardsByDeckId.mockResolvedValue(cards);
    mockBuildDeckSequenceQueue
      .mockResolvedValueOnce([
        buildQueueEntry(cards[0]),
        buildQueueEntry(cards[1]),
      ])
      .mockResolvedValueOnce([buildQueueEntry(cards[1])])
      .mockResolvedValueOnce([]);

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
    expect(mockRecordDeckCardSwipe).toHaveBeenCalledWith(fakeDb, {
      deckId: asDeckId('deck_values'),
      cardId: asDeckCardId('values_001'),
      swipedAt: expect.any(Number),
    });
    expect(result.current.currentCard?.id).toBe(asDeckCardId('values_002'));
    expect(result.current.cardsRemaining).toBe(1);
    expect(mockBuildDeckSequenceQueue).toHaveBeenCalledTimes(2);

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
    expect(result.current.currentDecision).toBeNull();
    expect(mockEndSwipeSession).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockEndSwipeSession).toHaveBeenCalledTimes(1);
  });

  it('can end a live session explicitly without waiting for unmount', async () => {
    const cards = [buildCard({ id: asDeckCardId('values_001') })];
    mockGetDeckCardsByDeckId.mockResolvedValue(cards);
    mockBuildDeckSequenceQueue.mockResolvedValue([buildQueueEntry(cards[0])]);

    const { result } = renderHook(() =>
      useDeckSwipeSession({
        deckId: asDeckId('deck_values'),
        deckCategory: 'values',
      }),
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    await act(async () => {
      await result.current.endSession();
    });

    expect(mockEndSwipeSession).toHaveBeenCalledTimes(1);
  });

  it('returns complete immediately when all cards were already seen', async () => {
    const cards = [
      buildCard({ id: asDeckCardId('values_001') }),
      buildCard({ id: asDeckCardId('values_002'), sortOrder: 1 }),
    ];
    mockGetDeckCardsByDeckId.mockResolvedValue(cards);
    mockBuildDeckSequenceQueue.mockResolvedValue([]);

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

  it('suppresses stale deck state immediately when the deck route changes', async () => {
    const deckA = asDeckId('deck_values');
    const deckB = asDeckId('deck_movies');
    const cardA = buildCard({ id: asDeckCardId('values_001'), deckId: deckA });
    const cardB = buildCard({
      id: asDeckCardId('movies_001'),
      deckId: deckB,
      title: 'I will always choose a thriller over a prestige drama',
      tileKey: 'movies:001',
    });
    const deferredCards = createDeferred<DeckCard[]>();

    mockGetDeckCardsByDeckId
      .mockResolvedValueOnce([cardA])
      .mockImplementationOnce(() => deferredCards.promise);
    mockBuildDeckSequenceQueue
      .mockResolvedValueOnce([buildQueueEntry(cardA)])
      .mockResolvedValueOnce([buildQueueEntry(cardB)]);

    const { result, rerender } = renderHook(
      ({
        deckId,
        deckCategory,
      }: {
        deckId: typeof deckA;
        deckCategory: string;
      }) =>
        useDeckSwipeSession({
          deckId,
          deckCategory,
        }),
      {
        initialProps: {
          deckId: deckA,
          deckCategory: 'values',
        },
      },
    );

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    await waitFor(() => {
      expect(result.current.currentCard?.id).toBe(asDeckCardId('values_001'));
    });

    mockRecordDeckCardPresentation.mockClear();

    rerender({
      deckId: deckB,
      deckCategory: 'movies_tv',
    });

    expect(result.current.state).toBe('loading');
    expect(result.current.currentCard).toBeNull();
    expect(result.current.currentDecision).toBeNull();
    expect(result.current.cardsRemaining).toBe(0);
    expect(result.current.totalCards).toBe(0);
    expect(mockRecordDeckCardPresentation).not.toHaveBeenCalled();

    deferredCards.resolve([cardB]);

    await waitFor(() => {
      expect(result.current.state).toBe('ready');
    });

    expect(result.current.currentCard?.id).toBe(asDeckCardId('movies_001'));
    expect(mockCreateSwipeSession).toHaveBeenLastCalledWith(fakeDb, deckB, {
      category: 'movies_tv',
    });
  });
});
