import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DeterministicTile } from '@/components/tiles';
import { useDeckCardDetails } from '@/hooks/useDeckCardDetails';
import { asDeckCardId } from '@/types/domain';

export default function DetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = id ? asDeckCardId(id) : null;
  const { card, deck, tagLabels, loading, error, refresh } =
    useDeckCardDetails(cardId);
  const title = card?.title ?? 'Card';

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Card' }} />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Loading card...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Card' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load card</Text>
          <Text style={styles.stateMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry card"
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Card' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Card not found</Text>
          <Text style={styles.stateMessage}>
            That card is not available on this device.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title }} />

      <View style={styles.tileShell}>
        <DeterministicTile
          tileKey={card.tileKey}
          type={deck?.category ?? 'concept'}
          title={card.title}
          subtitle={card.subtitle}
          variant="deck"
          accessibilityLabel={`${card.title} detail tile`}
        />
      </View>

      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.subtitle}>
        {card.subtitle || 'Deck-scoped card detail'}
      </Text>
      <Text style={styles.description}>{card.descriptionShort}</Text>

      <View style={styles.metaCard}>
        <Text style={styles.metaLabel}>Deck</Text>
        <Text style={styles.metaValue}>
          {deck?.title ?? 'Deck unavailable'}
        </Text>
        <Text style={styles.metaLabel}>Kind</Text>
        <Text style={styles.metaValue}>{card.kind}</Text>
        <Text style={styles.metaLabel}>Card ID</Text>
        <Text style={styles.metaValueMono}>{card.id}</Text>
      </View>

      <View style={styles.tagsSection}>
        <Text style={styles.sectionTitle}>Tags</Text>
        <View style={styles.tagRow}>
          {(tagLabels.length > 0 ? tagLabels : card.tags).map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {deck ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${deck.title}`}
          onPress={() => router.push(`/deck/${deck.id as string}` as never)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Open Deck</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  tileShell: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
  },
  title: {
    marginTop: 20,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  description: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    lineHeight: 24,
  },
  metaCard: {
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metaLabel: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 15,
  },
  metaValueMono: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'SpaceMono',
  },
  tagsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  tagRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
