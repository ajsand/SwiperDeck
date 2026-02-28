import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import DeckScreen from '../app/(tabs)/index';

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

describe('DeckScreen', () => {
  it('renders loading placeholder then ready deck surface', async () => {
    render(<DeckScreen />);

    expect(screen.getByTestId('deck-placeholder-loading')).toBeTruthy();
    expect(screen.getByText('Deck')).toBeTruthy();
    expect(screen.getByText('Swipe to teach your taste.')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('deck-action-bar')).toBeTruthy();
      expect(screen.getByTestId('deck-gesture-surface')).toBeTruthy();
    });
  });
});
