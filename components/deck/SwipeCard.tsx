import { memo, useMemo } from 'react';
import { StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { DeterministicTile } from '@/components/tiles';

import { DeckTagsRow } from './DeckTagsRow';

export interface SwipeCardProps {
  title: string;
  subtitle: string;
  tags: string[];
  tileKey: string;
  tileType: string;
  style?: StyleProp<ViewStyle>;
}

function buildA11yLabel(props: SwipeCardProps): string {
  const parts = [props.title || 'Untitled', props.tileType || 'unknown'];
  const tagPreview = props.tags.slice(0, 5);
  if (tagPreview.length > 0) {
    parts.push(tagPreview.join(', '));
  }
  return parts.join(', ');
}

function SwipeCardImpl(props: SwipeCardProps) {
  const a11yLabel = useMemo(() => buildA11yLabel(props), [props]);

  return (
    <View
      testID="swipe-card"
      style={[styles.container, props.style]}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Swipe right to react positively, left negatively, or use action buttons below"
    >
      <DeterministicTile
        tileKey={props.tileKey}
        type={props.tileType}
        title={props.title}
        subtitle={props.subtitle}
        variant="deck"
      />
      <DeckTagsRow tags={props.tags} />
    </View>
  );
}

export const SwipeCard = memo(SwipeCardImpl);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});
