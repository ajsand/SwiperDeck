import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeckBrowserCard } from '@/components/deck-browser';
import { asDeckId, type Deck } from '@/types/domain';

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
    title: 'First Date Values',
    description: 'Explore what matters early in a relationship.',
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

describe('DeckBrowserCard', () => {
  it('renders deck metadata and calls onPress with the deck id', () => {
    const deck = buildDeck();
    const onPress = jest.fn();

    render(<DeckBrowserCard deck={deck} onPress={onPress} />);

    expect(screen.getByText('First Date Values')).toBeTruthy();
    expect(screen.getByText('Values')).toBeTruthy();
    expect(screen.getByText('42 cards')).toBeTruthy();

    fireEvent.press(screen.getByTestId(`deck-browser-card-${deck.id}`));
    expect(onPress).toHaveBeenCalledWith(deck.id);
  });

  it('shows a sensitivity indicator for non-standard decks', () => {
    const deck = buildDeck();

    render(<DeckBrowserCard deck={deck} onPress={jest.fn()} />);

    expect(
      screen.getByTestId(`deck-browser-card-sensitivity-${deck.id}`),
    ).toBeTruthy();
    expect(screen.getByText('Sensitive topic')).toBeTruthy();
  });

  it('applies accessible deck labels for screen readers', () => {
    const deck = buildDeck({ cardCount: 18 });

    render(<DeckBrowserCard deck={deck} onPress={jest.fn()} />);

    expect(
      screen.getByLabelText('First Date Values, Values, 18 cards'),
    ).toBeTruthy();
  });
});
