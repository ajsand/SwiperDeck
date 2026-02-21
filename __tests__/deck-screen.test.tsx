import React from 'react';
import { render } from '@testing-library/react-native';
import DeckScreen from '../app/(tabs)/index';

jest.mock('../components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));

describe('DeckScreen', () => {
  it('renders correctly', () => {
    const { getByText } = render(<DeckScreen />);
    expect(getByText('Deck')).toBeTruthy();
  });

  it('shows swipe instruction', () => {
    const { getByText } = render(<DeckScreen />);
    expect(getByText('Swipe to teach your taste.')).toBeTruthy();
  });
});
