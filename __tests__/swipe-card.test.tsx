import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SwipeCard } from '@/components/deck';

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

describe('SwipeCard', () => {
  it('renders title, subtitle, tags, and tile content', () => {
    render(
      <SwipeCard
        title="Honesty matters more to me than being liked"
        subtitle="Values deck"
        tags={['honesty', 'growth', 'justice']}
        tileKey="values:values_001"
        tileType="values"
      />,
    );

    expect(screen.getByTestId('swipe-card')).toBeTruthy();
    expect(
      screen.getByText('Honesty matters more to me than being liked'),
    ).toBeTruthy();
    expect(screen.getByText('Values deck')).toBeTruthy();
    expect(screen.getByText('honesty')).toBeTruthy();
    expect(screen.getByText('growth')).toBeTruthy();
    expect(screen.getByText('justice')).toBeTruthy();
  });
});
