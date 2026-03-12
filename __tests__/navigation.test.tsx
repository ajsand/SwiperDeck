import React from 'react';
import { render, screen } from '@testing-library/react-native';

import DeckScreen from '../app/(tabs)/index';
import ProfileScreen from '../app/(tabs)/profile';
import LibraryScreen from '../app/(tabs)/library';
import SettingsScreen from '../app/(tabs)/settings';
import DetailScreen from '../app/details/[id]';
import ModalScreen from '../app/modal';
import { asDeckId, type Deck } from '@/types/domain';

const mockPush = jest.fn();
const mockUseDecks = jest.fn();
const mockUseDecksWithProfileStatus = jest.fn();
const mockUseDeckCardDetails = jest.fn();

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ id: 'test-id' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const ReactNative = jest.requireActual('react-native');

  const createPanGesture = () => {
    const chain = {
      enabled: () => chain,
      onUpdate: () => chain,
      onEnd: () => chain,
    };
    return chain;
  };

  return {
    Gesture: {
      Pan: createPanGesture,
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => (
      <ReactNative.View>{children}</ReactNative.View>
    ),
  };
});

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

jest.mock('@expo/vector-icons/FontAwesome', () => {
  const { Text } = jest.requireActual('react-native');
  function MockFontAwesome(props: { name: string }) {
    return <Text>{props.name}</Text>;
  }
  MockFontAwesome.font = {};
  return MockFontAwesome;
});

jest.mock('../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/useDecks', () => ({
  useDecks: () => mockUseDecks(),
}));

jest.mock('@/hooks/useDecksWithProfileStatus', () => ({
  useDecksWithProfileStatus: () => mockUseDecksWithProfileStatus(),
}));

jest.mock('@/hooks/useDeckCardDetails', () => ({
  useDeckCardDetails: () => mockUseDeckCardDetails(),
}));

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies'),
    title: 'Movies & TV',
    description: 'Talk about films, comfort rewatches, and shared favorites.',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 18,
    compareEligible: true,
    showdownEligible: true,
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

describe('Tab screens render without crash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDecksWithProfileStatus.mockReturnValue({
      decks: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
    mockUseDeckCardDetails.mockReturnValue({
      card: {
        id: 'test-id',
        deckId: asDeckId('deck_movies'),
        kind: 'statement',
        title: 'I would rather rewatch a favorite than chase every new release',
        subtitle: 'Movies & TV',
        descriptionShort: 'Tests comfort-watch leaning.',
        tags: ['Comfort watch'],
        popularity: 0.8,
        tileKey: 'statement:test-id',
        sortOrder: 1,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
      deck: buildDeck(),
      tagLabels: ['Comfort watch'],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders Deck screen', () => {
    mockUseDecks.mockReturnValue({
      decks: [buildDeck()],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<DeckScreen />);
    expect(screen.getByText('Decks')).toBeTruthy();
    expect(screen.getByText('Choose a deck to explore.')).toBeTruthy();
  });

  it('renders Profile screen', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Deck Profiles')).toBeTruthy();
  });

  it('renders Library screen', () => {
    mockUseDecksWithProfileStatus.mockReturnValue({
      decks: [
        {
          deck: buildDeck(),
          swipeCount: 12,
          stage: 'meaningful',
          compareReady: false,
          compareState: 'needs_more_breadth',
          compareDetail:
            'This deck has a profile, but it still needs broader coverage across cards, tags, or facets before compare should unlock.',
          primaryHint: null,
        },
      ],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<LibraryScreen />);
    expect(screen.getByText('History')).toBeTruthy();
    expect(
      screen.getByText('Deck activity is tracked locally, one deck at a time.'),
    ).toBeTruthy();
  });

  it('renders Settings screen', () => {
    mockUseDecksWithProfileStatus.mockReturnValue({
      decks: [
        {
          deck: buildDeck(),
          swipeCount: 30,
          stage: 'meaningful',
          compareReady: false,
          compareState: 'needs_more_stability',
          compareDetail:
            'This deck has enough breadth to be interesting, but it still needs more stability or less ambiguity before compare should unlock.',
          primaryHint: null,
        },
      ],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(
      screen.getByText(
        'DateDeck stays local-first, deck-first, and consent-gated by design.',
      ),
    ).toBeTruthy();
  });
});

describe('Detail and modal screens render without crash', () => {
  it('renders Detail screen with id param', () => {
    render(<DetailScreen />);
    expect(
      screen.getAllByText(
        'I would rather rewatch a favorite than chase every new release',
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Comfort watch')).toBeTruthy();
  });

  it('renders Modal screen', () => {
    render(<ModalScreen />);
    expect(screen.getByText('Deck Browser Filters')).toBeTruthy();
  });
});
