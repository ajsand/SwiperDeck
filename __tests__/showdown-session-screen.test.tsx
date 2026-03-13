import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import ShowdownSessionScreen from '../app/showdown/[sessionId]';

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseShowdownSession = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/hooks/useShowdownSession', () => ({
  useShowdownSession: (...args: unknown[]) => mockUseShowdownSession(...args),
}));

jest.mock('@/components/deck', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    SwipeCard: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

describe('ShowdownSessionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ sessionId: 'showdown_1' });
  });

  it('recovers to decks when the session is missing', () => {
    mockUseShowdownSession.mockReturnValue({
      session: null,
      lastKnownDeckId: null,
      loading: false,
      error: null,
      timeRemainingMs: 0,
      setParticipantAction: jest.fn(),
      advanceRound: jest.fn(),
      refresh: jest.fn(),
    });

    render(<ShowdownSessionScreen />);

    expect(screen.getByText('No showdown session')).toBeTruthy();
    fireEvent.press(screen.getByText('Back to Decks'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('offers a deterministic deck-shell escape when showdown is unavailable', () => {
    const refresh = jest.fn();
    mockUseShowdownSession.mockReturnValue({
      session: null,
      lastKnownDeckId: null,
      loading: false,
      error:
        'This showdown session is no longer available. Start a new local showdown from the deck screen.',
      timeRemainingMs: 0,
      setParticipantAction: jest.fn(),
      advanceRound: jest.fn(),
      refresh,
    });

    render(<ShowdownSessionScreen />);

    fireEvent.press(screen.getByText('Back to Decks'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('returns to the source deck when an expired session still has deck context', () => {
    const refresh = jest.fn();
    mockUseShowdownSession.mockReturnValue({
      session: null,
      lastKnownDeckId: 'deck_movies_tv',
      loading: false,
      error:
        'This showdown session expired. Start a new session from the deck screen.',
      timeRemainingMs: 0,
      setParticipantAction: jest.fn(),
      advanceRound: jest.fn(),
      refresh,
    });

    render(<ShowdownSessionScreen />);

    fireEvent.press(screen.getByText('Back to Deck'));

    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv');
  });

  it('routes back to the source deck when the showdown round is missing', () => {
    mockUseShowdownSession.mockReturnValue({
      session: {
        id: 'showdown_1',
        deckId: 'deck_movies_tv',
        deckTitle: 'Movies & TV',
        deckCategory: 'movies_tv',
        config: {
          cardCount: 8,
          participantCount: 3,
          responseSeconds: 30,
        },
        participants: [],
        selectedCards: [],
        rounds: [],
        currentCardIndex: 0,
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
        completedAt: null,
        summary: null,
      },
      lastKnownDeckId: 'deck_movies_tv',
      loading: false,
      error: null,
      timeRemainingMs: 0,
      setParticipantAction: jest.fn(),
      advanceRound: jest.fn(),
      refresh: jest.fn(),
    });

    render(<ShowdownSessionScreen />);

    fireEvent.press(screen.getByText('Back to Deck'));

    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv');
  });
});
