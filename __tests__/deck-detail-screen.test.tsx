import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import DeckDetailScreen from '../app/deck/[deckId]';
import { asDeckId, type Deck } from '@/types/domain';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseDeckById = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ deckId: 'deck_values' }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
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
    expect(mockReplace).toHaveBeenCalledWith('/');
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
    expect(screen.getByText('Extra-care compare')).toBeTruthy();
    expect(
      screen.getByText('At least 12 cards for a basic profile'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'At least 24 swipes before compare readiness can be considered. Coverage, ambiguity, and stability still matter. This deck touches worldview and value priorities, so compare needs stronger confidence and lower ambiguity than a standard deck.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('deck-detail-compare-readiness')).toBeTruthy();

    fireEvent.press(screen.getByTestId('deck-detail-start-swiping'));
    expect(mockPush).toHaveBeenCalledWith(
      '/deck/deck_values/play?returnTo=%2Fdeck%2Fdeck_values',
    );

    fireEvent.press(screen.getByTestId('deck-detail-compare-readiness'));
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_values/compare');
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

  it('keeps compare status visible for custom decks even when compare is unavailable', () => {
    mockUseDeckById.mockReturnValue({
      deck: buildDeck({
        id: asDeckId('deck_custom_values'),
        title: 'Custom Values',
        compareEligible: false,
        isCustom: true,
      }),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckDetailScreen />);

    expect(
      screen.getByText(
        'Custom decks stay local-first and are not compare-eligible under the current product scope.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Custom deck mode')).toBeTruthy();
    expect(
      screen.getByText(
        'Custom decks stay local on this device. They can be swiped and profiled, but they do not yet use the richer prebuilt taxonomy, coverage-aware sequencing, compare flow, or report quality guarantees.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('deck-detail-compare-readiness')).toBeTruthy();

    fireEvent.press(screen.getByTestId('deck-detail-compare-readiness'));
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_custom_values/compare');
  });

  it('offers a showdown entry point only for eligible decks', () => {
    mockUseDeckById.mockReturnValue({
      deck: buildDeck({
        id: asDeckId('deck_movies_tv'),
        title: 'Movies & TV',
        category: 'movies_tv',
        showdownEligible: true,
      }),
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckDetailScreen />);

    expect(screen.getByTestId('deck-detail-start-showdown')).toBeTruthy();
    fireEvent.press(screen.getByTestId('deck-detail-start-showdown'));
    expect(mockPush).toHaveBeenCalledWith(
      '/showdown/create?deckId=deck_movies_tv',
    );
  });
});
