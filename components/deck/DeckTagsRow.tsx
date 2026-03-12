import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const MAX_VISIBLE_TAGS = 8;

export interface DeckTagsRowProps {
  tags: string[];
  maxVisible?: number;
}

function DeckTagsRowImpl({
  tags,
  maxVisible = MAX_VISIBLE_TAGS,
}: DeckTagsRowProps) {
  const visibleTags = useMemo(
    () => tags.slice(0, maxVisible),
    [tags, maxVisible],
  );
  const overflowCount = tags.length - visibleTags.length;

  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <ScrollView
      testID="deck-card-tags"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
      accessible={false}
    >
      {visibleTags.map((tag) => (
        <View key={tag} style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {tag}
          </Text>
        </View>
      ))}
      {overflowCount > 0 && (
        <View style={[styles.chip, styles.overflowChip]}>
          <Text style={styles.chipText}>+{overflowCount}</Text>
        </View>
      )}
    </ScrollView>
  );
}

export const DeckTagsRow = memo(DeckTagsRowImpl);

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    maxHeight: 36,
  },
  content: {
    gap: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chip: {
    height: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 14,
    justifyContent: 'center',
  },
  overflowChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
