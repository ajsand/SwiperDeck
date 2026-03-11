import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDecksWithProfileStatus } from '@/hooks/useDecksWithProfileStatus';

function formatStage(stage: string): string {
  if (stage === 'lightweight') return 'Lightweight';
  if (stage === 'meaningful') return 'Meaningful';
  return 'High confidence';
}

export default function ProfileScreen() {
  const router = useRouter();
  const { decks, loading, error, refresh } = useDecksWithProfileStatus();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Deck Profiles</Text>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateText}>Loading decks...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Deck Profiles</Text>
        <View style={styles.stateContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            onPress={() => void refresh()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (decks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Deck Profiles</Text>
        <View style={styles.stateContainer}>
          <Text style={styles.emptyText}>
            No deck profiles yet. Choose a deck and start swiping.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deck Profiles</Text>
      <Text style={styles.intro}>
        Each deck builds its own profile as you swipe.
      </Text>
      <FlatList
        data={decks}
        keyExtractor={(item) => item.deck.id as string}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            testID={`deck-profile-row-${item.deck.id}`}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.deck.title} profile`}
            accessibilityHint={`Opens the profile for ${item.deck.title}`}
            onPress={() =>
              router.push(
                `/deck/${item.deck.id as string}/profile` as never,
              )
            }
            style={({ pressed }) => [
              styles.deckRow,
              pressed ? styles.deckRowPressed : null,
            ]}
          >
            <Text style={styles.deckTitle}>{item.deck.title}</Text>
            <View style={styles.deckMeta}>
              <Text style={styles.deckMetaText}>
                {item.swipeCount} swipes
              </Text>
              <View
                style={[
                  styles.stageBadge,
                  item.stage === 'meaningful'
                    ? styles.stageMeaningful
                    : styles.stageLightweight,
                ]}
              >
                <Text style={styles.stageBadgeText}>
                  {formatStage(item.stage)}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 16,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  intro: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  deckRow: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deckRowPressed: {
    opacity: 0.9,
  },
  deckTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  deckMeta: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deckMetaText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },
  stageBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stageLightweight: {
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  stageMeaningful: {
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  stageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateText: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  errorText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  retryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '600',
  },
});
