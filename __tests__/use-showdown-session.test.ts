import { renderHook, waitFor } from '@testing-library/react-native';

import { useShowdownSession } from '@/hooks/useShowdownSession';
import {
  asDeckCardId,
  asDeckId,
  asShowdownParticipantId,
  asShowdownSessionId,
  type ShowdownSession,
} from '@/types/domain';

const mockAdvanceLocalShowdownSession = jest.fn();
const mockGetLocalShowdownSession = jest.fn();
const mockSubmitLocalShowdownResponse = jest.fn();
const mockSyncLocalShowdownTimer = jest.fn();

jest.mock('@/lib/showdown/showdownSessionStore', () => ({
  advanceLocalShowdownSession: (...args: unknown[]) =>
    mockAdvanceLocalShowdownSession(...args),
  getLocalShowdownSession: (...args: unknown[]) =>
    mockGetLocalShowdownSession(...args),
  submitLocalShowdownResponse: (...args: unknown[]) =>
    mockSubmitLocalShowdownResponse(...args),
  syncLocalShowdownTimer: (...args: unknown[]) =>
    mockSyncLocalShowdownTimer(...args),
}));

function buildSession(
  overrides: Partial<ShowdownSession> = {},
): ShowdownSession {
  return {
    id: asShowdownSessionId('showdown_movies_tv'),
    deckId: asDeckId('deck_movies_tv'),
    deckTitle: 'Movies & TV',
    deckCategory: 'movies_tv',
    config: {
      cardCount: 8,
      participantCount: 2,
      responseSeconds: 30,
    },
    participants: [
      {
        id: asShowdownParticipantId('participant_1'),
        label: 'Alex',
        seat: 1,
      },
      {
        id: asShowdownParticipantId('participant_2'),
        label: 'Sam',
        seat: 2,
      },
    ],
    selectedCards: [
      {
        cardId: asDeckCardId('movies_tv_001'),
        title: 'A mystery with a strong ending matters to me.',
        subtitle: '',
        descriptionShort: '',
        tags: ['mystery'],
        tileKey: 'mystery',
        cardKind: 'statement',
        popularity: 0.5,
        primaryTagId: null,
        primaryTagLabel: null,
        facetId: null,
        facetLabel: null,
        selectionScore: 0.88,
        selectionReason: 'representative: mystery',
      },
    ],
    rounds: [
      {
        cardId: asDeckCardId('movies_tv_001'),
        startedAt: 1700000000000,
        deadlineAt: Date.now() + 30_000,
        responses: [],
      },
    ],
    currentCardIndex: 0,
    startedAt: 1700000000000,
    completedAt: null,
    summary: null,
    ...overrides,
  };
}

describe('useShowdownSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the requested showdown session', async () => {
    const session = buildSession();
    mockGetLocalShowdownSession.mockReturnValue(session);

    const { result } = renderHook(() =>
      useShowdownSession(asShowdownSessionId('showdown_movies_tv')),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session?.id).toBe(session.id);
    expect(result.current.lastKnownDeckId).toBe(session.deckId);
    expect(result.current.error).toBeNull();
  });

  it('does not leak the previous live session while switching to a different showdown session', async () => {
    const firstSession = buildSession();
    const secondSession = buildSession({
      id: asShowdownSessionId('showdown_travel'),
      deckId: asDeckId('deck_travel'),
      deckTitle: 'Travel',
      deckCategory: 'travel',
    });
    mockGetLocalShowdownSession
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(secondSession);

    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: ReturnType<typeof asShowdownSessionId> }) =>
        useShowdownSession(sessionId),
      {
        initialProps: {
          sessionId: asShowdownSessionId('showdown_movies_tv'),
        },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session?.id).toBe(firstSession.id);

    rerender({
      sessionId: asShowdownSessionId('showdown_travel'),
    });

    expect(result.current.session?.id).not.toBe(firstSession.id);
    expect(result.current.lastKnownDeckId).not.toBe(firstSession.deckId);
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session?.id).toBe(secondSession.id);
    expect(result.current.lastKnownDeckId).toBe(secondSession.deckId);
  });

  it('clears stale deck context when the route switches to a different missing session', async () => {
    const firstSession = buildSession();
    mockGetLocalShowdownSession
      .mockReturnValueOnce(firstSession)
      .mockReturnValueOnce(null);

    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: ReturnType<typeof asShowdownSessionId> }) =>
        useShowdownSession(sessionId),
      {
        initialProps: {
          sessionId: asShowdownSessionId('showdown_movies_tv'),
        },
      },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.lastKnownDeckId).toBe(asDeckId('deck_movies_tv'));

    rerender({
      sessionId: asShowdownSessionId('showdown_values'),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.lastKnownDeckId).toBeNull();
    expect(result.current.error).toBe(
      'This showdown session is no longer available. Start a new local showdown from the deck screen.',
    );
  });
});
