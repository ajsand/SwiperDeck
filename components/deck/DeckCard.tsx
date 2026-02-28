import { memo, useMemo } from 'react';
import { StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { DeterministicTile } from '@/components/tiles';
import type { CatalogEntity } from '@/types/domain';

import { DeckTagsRow } from './DeckTagsRow';

export interface DeckCardProps {
  entity: CatalogEntity;
  style?: StyleProp<ViewStyle>;
}

function buildA11yLabel(entity: CatalogEntity): string {
  const parts = [entity.title || 'Untitled', entity.type || 'unknown'];
  const tagPreview = entity.tags.slice(0, 5);
  if (tagPreview.length > 0) {
    parts.push(tagPreview.join(', '));
  }
  return parts.join(', ');
}

function DeckCardImpl({ entity, style }: DeckCardProps) {
  const a11yLabel = useMemo(() => buildA11yLabel(entity), [entity]);

  return (
    <View
      testID="deck-card"
      style={[styles.container, style]}
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Swipe right to like, left to dislike, or use buttons below"
    >
      <DeterministicTile
        tileKey={entity.tileKey}
        type={entity.type}
        title={entity.title}
        subtitle={entity.subtitle}
        variant="deck"
      />
      <DeckTagsRow tags={entity.tags} />
    </View>
  );
}

export const DeckCard = memo(DeckCardImpl);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
});
