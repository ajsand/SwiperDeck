import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckDetailScreen from '../app/deck/[deckId]';
import { asDeckId, type Deck } from '@/types/domain';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockUseDeckById = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ deckId: 'deck_values' }),
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDeckById', () => ({
  useDeckById: (...args: unknown[]) => mockUseDeckById(...args),
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return {
    LinearGradient: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) => <View {...props}>{children}</View>,
  };
});

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
    description: 'Explore what matters most in early dating.',
    category: 'values',
    tier: 'tier_2',
    cardCount: 32,
    compareEligible: true,
    showdownEligible: false,
    sensitivity: 'sensitive',
    minCardsForProfile: 12,
    minCardsForCompare: 24,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('DeckDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state before deck data resolves', () => {
    mockUseDeckById.mockReturnValue({
      deck: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckDetailScreen />);

    expect(screen.getByTestId('deck-detail-loading')).toBeTruthy();
    expect(screen.getByText('Loading deck...')).toBeTruthy();
  });

  it('renders a not-found state and allows going back', () => {
    mockUseDeckById.mockReturnValue({
      deck: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckDetailScreen />);

    expect(screen.getByTestId('deck-detail-not-found')).toBeTruthy();
    fireEvent.press(screen.getByTestId('deck-detail-go-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders deck metadata and navigates to the play route from the CTA', () => {
    mockUseDeckById.mockReturnValue({
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckDetailScreen />);

    expect(screen.getAllByText('Values').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Explore what matters most in early dating.'),
    ).toBeTruthy();
    expect(screen.getByText('32 cards')).toBeTruthy();
    expect(screen.getByText('Compare eligible')).toBeTruthy();
    expect(screen.getByText('Showdown unavailable')).toBeTruthy();
    expect(screen.getByText('Sensitive topic')).toBeTruthy();
    expect(
      screen.getByText('At least 12 cards for a basic profile'),
    ).toBeTruthy();
    expect(screen.getByText('At least 24 cards for comparison')).toBeTruthy();

    fireEvent.press(screen.getByTestId('deck-detail-start-swiping'));
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_values/play');
  });

  it('shows an error state and retries loading', () => {
    const refresh = jest.fn();
    mockUseDeckById.mockReturnValue({
      deck: null,
      loading: false,
      error: new Error('Deck lookup failed.'),
      refresh,
    });

    render(<DeckDetailScreen />);

    expect(screen.getByText('Unable to load deck')).toBeTruthy();
    fireEvent.press(screen.getByTestId('deck-browser-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
