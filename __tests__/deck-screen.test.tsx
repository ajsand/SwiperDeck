import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckScreen from '../app/(tabs)/index';
import { asDeckId, type Deck } from '@/types/domain';

const mockPush = jest.fn();
const mockUseDecks = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDecks', () => ({
  useDecks: () => mockUseDecks(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native');

  function MockIonicons(props: { name: string; testID?: string }) {
    return <Text testID={props.testID}>{props.name}</Text>;
  }

  MockIonicons.glyphMap = {};
  return MockIonicons;
});

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_values'),
    title: 'Values',
    description: 'Talk through what matters most.',
    category: 'values',
    tier: 'tier_1',
    cardCount: 24,
    compareEligible: true,
    showdownEligible: false,
    sensitivity: 'standard',
    minCardsForProfile: 15,
    minCardsForCompare: 30,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('DeckScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading state', () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckScreen />);

    expect(screen.getByTestId('deck-browser-loading')).toBeTruthy();
    expect(screen.getByText('Decks')).toBeTruthy();
    expect(screen.getByText('Choose a deck to explore.')).toBeTruthy();
  });

  it('renders an empty state when no decks are available', () => {
    mockUseDecks.mockReturnValue({
      decks: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckScreen />);

    expect(screen.getByTestId('deck-browser-empty')).toBeTruthy();
    expect(screen.queryByTestId('deck-action-bar')).toBeNull();
    expect(screen.queryByTestId('deck-gesture-surface')).toBeNull();
  });

  it('renders an error state and retries loading', () => {
    const refresh = jest.fn();
    mockUseDecks.mockReturnValue({
      decks: [],
      loading: false,
      error: new Error('Deck list failed.'),
      refresh,
    });

    render(<DeckScreen />);

    fireEvent.press(screen.getByTestId('deck-browser-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders deck cards and navigates to detail', () => {
    const deck = buildDeck();
    mockUseDecks.mockReturnValue({
      decks: [deck],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckScreen />);

    fireEvent.press(screen.getByTestId(`deck-browser-card-${deck.id}`));
    expect(mockPush).toHaveBeenCalledWith(`/deck/${deck.id}`);
  });
});
