import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import DeckPlayScreen from '../app/deck/[deckId]/play';
import {
  asDeckCardId,
  asDeckId,
  type Deck,
  type DeckCard,
} from '@/types/domain';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockEndSession = jest.fn();
const mockUseDeckById = jest.fn();
const mockUseDeckSwipeSession = jest.fn();

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

jest.mock('@/hooks/useDeckSwipeSession', () => ({
  useDeckSwipeSession: (...args: unknown[]) => mockUseDeckSwipeSession(...args),
}));

jest.mock('@/hooks/useDeckGestures', () => ({
  useDeckGestures: () => ({
    gesture: {},
    animatedCardStyle: {},
  }),
}));

jest.mock('@/components/deck', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    DeckActionBar: ({
      onAction,
      disabled,
    }: {
      onAction: (action: 'yes', meta: { source: 'button' }) => void;
      disabled?: boolean;
    }) => (
      <Pressable
        testID="deck-action-bar-button"
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onAction('yes', { source: 'button' })}
      >
        <Text>Action</Text>
      </Pressable>
    ),
    DeckStatePlaceholder: ({ state }: { state: string }) => (
      <Text>{state}</Text>
    ),
    SwipeCard: ({ title }: { title: string }) => <Text>{title}</Text>,
    dispatchDeckAction: ({
      action,
      meta,
      onAction,
      isLocked,
      lock,
    }: {
      action: 'yes';
      meta: { source: 'button' };
      onAction: (action: 'yes', meta: { source: 'button' }) => void;
      isLocked: boolean;
      lock: () => void;
    }) => {
      if (isLocked) {
        return null;
      }

      lock();
      onAction(action, meta);
      return {
        action,
        source: meta.source,
      };
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');

  return {
    GestureDetector: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
    title: 'I care more about rewatchability than prestige.',
    subtitle: '',
    descriptionShort: 'Tests comfort-watch leaning.',
    tags: ['comfort watch'],
    popularity: 0.8,
    tileKey: 'movies_tv:001',
    sortOrder: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('DeckPlayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockEndSession.mockResolvedValue(undefined);
    mockUseDeckById.mockReturnValue({
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseDeckSwipeSession.mockReturnValue({
      state: 'ready',
      currentCard: buildCard(),
      currentDecision: null,
      cardsRemaining: 4,
      totalCards: 24,
      errorMessage: undefined,
      onAction: jest.fn(),
      endSession: mockEndSession,
      retry: jest.fn(),
    });
  });

  it('exits back to the originating deck-related screen when returnTo is provided', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_movies_tv',
      returnTo: '%2Fdeck%2Fdeck_movies_tv%2Fprofile',
    });

    render(<DeckPlayScreen />);

    fireEvent.press(screen.getByTestId('deck-play-exit-session'));

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv/profile');
  });

  it('falls back to deck detail when no return target exists', async () => {
    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_movies_tv',
    });

    render(<DeckPlayScreen />);

    fireEvent.press(screen.getByTestId('deck-play-exit-session'));

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv');
  });

  it('cancels a pending button swipe commit when exiting the session', async () => {
    jest.useFakeTimers();
    const mockOnAction = jest.fn();

    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_movies_tv',
      returnTo: '%2Fdeck%2Fdeck_movies_tv',
    });
    mockUseDeckSwipeSession.mockReturnValue({
      state: 'ready',
      currentCard: buildCard(),
      currentDecision: null,
      cardsRemaining: 4,
      totalCards: 24,
      errorMessage: undefined,
      onAction: mockOnAction,
      endSession: mockEndSession,
      retry: jest.fn(),
    });

    render(<DeckPlayScreen />);

    fireEvent.press(screen.getByTestId('deck-action-bar-button'));
    fireEvent.press(screen.getByTestId('deck-play-exit-session'));

    await waitFor(() => {
      expect(mockEndSession).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockOnAction).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv');
    jest.useRealTimers();
  });

  it('cancels a pending button swipe commit when the play route switches to a different deck', async () => {
    jest.useFakeTimers();
    const mockOnActionA = jest.fn();
    const mockOnActionB = jest.fn();

    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_movies_tv',
      returnTo: '%2Fdeck%2Fdeck_movies_tv',
    });
    mockUseDeckById.mockReturnValue({
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseDeckSwipeSession.mockReturnValue({
      state: 'ready',
      currentCard: buildCard(),
      currentDecision: null,
      cardsRemaining: 4,
      totalCards: 24,
      errorMessage: undefined,
      onAction: mockOnActionA,
      endSession: mockEndSession,
      retry: jest.fn(),
    });

    const { rerender, queryByTestId } = render(<DeckPlayScreen />);

    fireEvent.press(screen.getByTestId('deck-action-bar-button'));
    expect(screen.getByTestId('deck-play-last-action')).toBeTruthy();

    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_travel',
      returnTo: '%2Fdeck%2Fdeck_travel',
    });
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
    mockUseDeckSwipeSession.mockReturnValue({
      state: 'ready',
      currentCard: buildCard({
        id: asDeckCardId('travel_001'),
        deckId: asDeckId('deck_travel'),
        title: 'I prefer a road trip to a resort stay.',
      }),
      currentDecision: null,
      cardsRemaining: 6,
      totalCards: 24,
      errorMessage: undefined,
      onAction: mockOnActionB,
      endSession: mockEndSession,
      retry: jest.fn(),
    });

    rerender(<DeckPlayScreen />);

    expect(queryByTestId('deck-play-last-action')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(mockOnActionA).not.toHaveBeenCalled();
    expect(mockOnActionB).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('replaces to deck profile from the completed swipe state', () => {
    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_movies_tv',
      returnTo: '%2Fdeck%2Fdeck_movies_tv',
    });
    mockUseDeckSwipeSession.mockReturnValue({
      state: 'complete',
      currentCard: null,
      currentDecision: null,
      cardsRemaining: 0,
      totalCards: 24,
      errorMessage: undefined,
      onAction: jest.fn(),
      endSession: mockEndSession,
      retry: jest.fn(),
    });

    render(<DeckPlayScreen />);

    fireEvent.press(screen.getByTestId('deck-play-view-profile'));

    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv/profile');
  });

  it('routes back to decks when the requested deck cannot be loaded', () => {
    mockUseLocalSearchParams.mockReturnValue({
      deckId: 'deck_missing',
    });
    mockUseDeckById.mockReturnValue({
      deck: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckPlayScreen />);

    fireEvent.press(screen.getByLabelText('Back to decks'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
