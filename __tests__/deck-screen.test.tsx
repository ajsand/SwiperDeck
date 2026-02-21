import React from 'react';
import { render } from '@testing-library/react-native';
import DeckScreen from '../app/(tabs)/deck';

describe('DeckScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<DeckScreen />);
    expect(getByText('Deck')).toBeTruthy();
  });
});
