import React from 'react';
import { render, screen } from '@testing-library/react-native';

import DeckScreen from '../app/(tabs)/index';
import ProfileScreen from '../app/(tabs)/profile';
import LibraryScreen from '../app/(tabs)/library';
import SettingsScreen from '../app/(tabs)/settings';
import DetailScreen from '../app/details/[id]';
import ModalScreen from '../app/modal';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useLocalSearchParams: () => ({ id: 'test-id' }),
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

describe('Tab screens render without crash', () => {
  it('renders Deck screen', () => {
    render(<DeckScreen />);
    expect(screen.getByText('Deck')).toBeTruthy();
    expect(screen.getByText('Swipe to teach your taste.')).toBeTruthy();
  });

  it('renders Profile screen', () => {
    render(<ProfileScreen />);
    expect(screen.getByText('Taste Profile')).toBeTruthy();
  });

  it('renders Library screen', () => {
    render(<LibraryScreen />);
    expect(screen.getByText('Library')).toBeTruthy();
  });

  it('renders Settings screen', () => {
    render(<SettingsScreen />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});

describe('Detail and modal screens render without crash', () => {
  it('renders Detail screen with id param', () => {
    render(<DetailScreen />);
    expect(screen.getByText('Entity Detail')).toBeTruthy();
    expect(screen.getByText('ID: test-id')).toBeTruthy();
  });

  it('renders Modal screen', () => {
    render(<ModalScreen />);
    expect(screen.getByText('Modal')).toBeTruthy();
  });
});
