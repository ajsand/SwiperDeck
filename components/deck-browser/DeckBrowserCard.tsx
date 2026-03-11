import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DeterministicTile } from '@/components/tiles';
import { iconForDeckCategory } from '@/lib/tiles';
import type { Deck, DeckId, DeckSensitivity } from '@/types/domain';

export interface DeckBrowserCardProps {
  deck: Deck;
  onPress: (deckId: DeckId) => void;
}

function formatDeckCategory(category: string): string {
  return category
    .split('_')
    .map((segment) => {
      if (segment === 'tv') {
        return 'TV';
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(' ')
    .replace('Movies Tv', 'Movies & TV')
    .replace('Food Drinks', 'Food & Drinks');
}

function sensitivityLabel(sensitivity: DeckSensitivity): string | null {
  if (sensitivity === 'sensitive') {
    return 'Sensitive topic';
  }

  if (sensitivity === 'gated') {
    return 'Gated topic';
  }

  return null;
}

function DeckBrowserCardImpl({ deck, onPress }: DeckBrowserCardProps) {
  const categoryLabel = useMemo(
    () => formatDeckCategory(deck.category),
    [deck.category],
  );
  const sensitivityText = useMemo(
    () => sensitivityLabel(deck.sensitivity),
    [deck.sensitivity],
  );
  const fallbackIcon = useMemo(
    () => iconForDeckCategory(deck.category),
    [deck.category],
  );

  return (
    <Pressable
      testID={`deck-browser-card-${deck.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${deck.title}, ${categoryLabel}, ${deck.cardCount} cards`}
      accessibilityHint="View deck details"
      onPress={() => onPress(deck.id)}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.leadingVisual} accessible={false}>
        {deck.coverTileKey ? (
          <DeterministicTile
            tileKey={deck.coverTileKey}
            type="concept"
            title={deck.title}
            subtitle={categoryLabel}
            variant="library"
            accessibilityLabel={`${deck.title} cover tile`}
          />
        ) : (
          <View style={styles.iconSurface}>
            <Ionicons name={fallbackIcon} size={28} color="#FFFFFF" />
          </View>
        )}
      </View>

      <View style={styles.copyColumn}>
        <Text style={styles.title}>{deck.title}</Text>
        <Text style={styles.category}>{categoryLabel}</Text>

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{deck.cardCount} cards</Text>
          </View>
          {deck.isCustom ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Custom</Text>
            </View>
          ) : null}
          {sensitivityText ? (
            <View
              testID={`deck-browser-card-sensitivity-${deck.id}`}
              style={[styles.badge, styles.sensitivityBadge]}
            >
              <Text style={styles.badgeText}>{sensitivityText}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons
        style={styles.chevron}
        name="chevron-forward"
        size={20}
        color="rgba(255,255,255,0.4)"
        accessible={false}
      />
    </Pressable>
  );
}

export const DeckBrowserCard = memo(DeckBrowserCardImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardPressed: {
    opacity: 0.82,
  },
  leadingVisual: {
    alignSelf: 'flex-start',
  },
  iconSurface: {
    width: 64,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  copyColumn: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  category: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  sensitivityBadge: {
    backgroundColor: 'rgba(236,72,153,0.18)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chevron: {
    alignSelf: 'center',
  },
});
