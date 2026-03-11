import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeckActionBar } from '@/components/deck';
import type { CoreSwipeAction } from '@/types/domain';

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native');

  function MockIonicons(props: { name: string; testID?: string }) {
    return <Text testID={props.testID}>{props.name}</Text>;
  }

  MockIonicons.glyphMap = {};
  return MockIonicons;
});

const EXPECTED_ACTIONS: CoreSwipeAction[] = [
  'hard_no',
  'no',
  'skip',
  'yes',
  'strong_yes',
];

describe('DeckActionBar', () => {
  it('renders all five core action buttons and dispatches button metadata', () => {
    const onAction = jest.fn();
    render(<DeckActionBar onAction={onAction} />);

    EXPECTED_ACTIONS.forEach((action) => {
      const button = screen.getByTestId(`deck-action-${action}`);
      expect(button).toBeTruthy();
      fireEvent.press(button);
    });

    expect(onAction.mock.calls).toEqual([
      ['hard_no', { source: 'button' }],
      ['no', { source: 'button' }],
      ['skip', { source: 'button' }],
      ['yes', { source: 'button' }],
      ['strong_yes', { source: 'button' }],
    ]);
  });

  it('marks all buttons disabled and blocks dispatch while disabled', () => {
    const onAction = jest.fn();
    render(<DeckActionBar onAction={onAction} disabled />);

    EXPECTED_ACTIONS.forEach((action) => {
      const button = screen.getByTestId(`deck-action-${action}`);
      expect(button.props.accessibilityState?.disabled).toBe(true);
      fireEvent.press(button);
    });

    expect(onAction).not.toHaveBeenCalled();
  });
});
