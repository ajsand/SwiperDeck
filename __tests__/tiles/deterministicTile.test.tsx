import React from 'react';
import { render } from '@testing-library/react-native';
import { DeterministicTile } from '@/components/tiles/DeterministicTile';
import {
  TILE_COMPONENT_FIXTURES,
  TILE_CONTRACT,
  type TileComponentFixture,
} from '../../test-fixtures/tiles';

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');

  function MockLinearGradient({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  }) {
    return <View {...props}>{children}</View>;
  }

  return {
    LinearGradient: MockLinearGradient,
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

function toRenderSnapshot(fixture: TileComponentFixture) {
  const rendered = render(
    <DeterministicTile
      tileKey={fixture.tileKey}
      type={fixture.type}
      title={fixture.title}
      subtitle={fixture.subtitle}
      variant={fixture.variant ?? 'deck'}
    />,
  );

  const gradientNode = rendered.getByTestId('tile-gradient');
  const titleNode = rendered.getByTestId('tile-title');
  const subtitleNode = rendered.queryByTestId('tile-subtitle');
  const iconNode = rendered.getByTestId('tile-icon');
  const iconBadgeNode = rendered.queryByTestId('tile-icon-badge');
  const iconBadgeStyle = iconBadgeNode?.props.style;
  const iconBadgeDynamicStyle = Array.isArray(iconBadgeStyle)
    ? iconBadgeStyle[iconBadgeStyle.length - 1]
    : iconBadgeStyle;

  const snapshot = {
    id: fixture.id,
    variant: fixture.variant ?? 'deck',
    gradientColors: gradientNode.props.colors,
    gradientStart: gradientNode.props.start,
    gradientEnd: gradientNode.props.end,
    iconName: iconNode.props.children,
    iconBadgeBackground: iconBadgeDynamicStyle?.backgroundColor ?? null,
    titleText: titleNode.props.children,
    titleLines: titleNode.props.numberOfLines,
    subtitleText: subtitleNode?.props.children ?? null,
  };

  rendered.unmount();
  return snapshot;
}

describe('DeterministicTile contract', () => {
  it('keeps fallback title string stable', () => {
    const fallbackFixture = TILE_COMPONENT_FIXTURES.find(
      (fixture) => fixture.id === 'deck-missing-title-subtitle',
    );
    expect(fallbackFixture).toBeDefined();

    const snapshot = toRenderSnapshot(fallbackFixture as TileComponentFixture);
    expect(snapshot.titleText).toBe(TILE_CONTRACT.fallbackTitle);
  });

  it('keeps unknown-type icon fallback stable', () => {
    const unknownTypeFixture = TILE_COMPONENT_FIXTURES.find(
      (fixture) => fixture.id === 'deck-unknown-type',
    );
    expect(unknownTypeFixture).toBeDefined();

    const snapshot = toRenderSnapshot(unknownTypeFixture as TileComponentFixture);
    expect(snapshot.iconName).toBe(TILE_CONTRACT.fallbackIcon);
  });

  it('keeps deterministic render snapshot matrix stable', () => {
    const snapshotMatrix = TILE_COMPONENT_FIXTURES.map((fixture) =>
      toRenderSnapshot(fixture),
    );

    expect(snapshotMatrix).toMatchSnapshot();
  });

  it('renders identical output for same fixture across repeated renders', () => {
    const fixture = TILE_COMPONENT_FIXTURES[0];
    const first = toRenderSnapshot(fixture);
    const second = toRenderSnapshot(fixture);

    expect(second).toEqual(first);
  });
});
