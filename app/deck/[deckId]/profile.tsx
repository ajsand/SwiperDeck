import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDeckById } from '@/hooks/useDeckById';
import { useDeckProfileSummary } from '@/hooks/useDeckProfileSummary';
import { asDeckId } from '@/types/domain';

function formatTag(tag: string): string {
  return tag
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function DeckProfileContent({
  deckId,
}: {
  deckId: string;
}) {
  const router = useRouter();
  const { deck, loading: deckLoading, error: deckError, refresh } = useDeckById(
    asDeckId(deckId),
  );
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refetch,
  } = useDeckProfileSummary(asDeckId(deckId));

  const loading = deckLoading || summaryLoading;
  const error = deckError ?? summaryError;

  if (loading) {
    return (
      <View testID="deck-profile-loading" style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.stateTitle}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Unable to load profile</Text>
        <Text style={styles.stateMessage}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => {
            refresh();
            void refetch();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!deck) {
    return (
      <View testID="deck-profile-not-found" style={styles.stateContainer}>
        <Text style={styles.stateTitle}>Deck not found</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!summary || summary.confidence.swipeCount === 0) {
    return (
      <View testID="deck-profile-empty" style={styles.stateContainer}>
        <Text style={styles.stateTitle}>No profile yet</Text>
        <Text style={styles.stateMessage}>
          Swipe some cards in this deck to build your profile.
        </Text>
        <Pressable
          testID="deck-profile-start-swiping"
          accessibilityRole="button"
          accessibilityLabel="Start swiping"
          onPress={() =>
            router.push(`/deck/${deckId}/play` as never)
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Start Swiping</Text>
        </Pressable>
      </View>
    );
  }

  const isCompareReady =
    summary.stage === 'meaningful' &&
    summary.confidence.swipeCount >= deck.minCardsForCompare;

  return (
    <ScrollView
      testID="deck-profile-scroll"
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerBlock}>
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              summary.confidence.label === 'high'
                ? styles.badgeHigh
                : summary.confidence.label === 'medium'
                  ? styles.badgeMedium
                  : styles.badgeLow,
            ]}
          >
            <Text style={styles.badgeText}>
              {summary.confidence.label} confidence
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {summary.confidence.swipeCount} swipes
            </Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>Stage</Text>
        <Text style={styles.sectionValue}>
          {summary.stage === 'lightweight'
            ? 'Lightweight — keep swiping for a fuller profile'
            : summary.stage === 'meaningful'
              ? 'Meaningful — ready for comparison'
              : 'High confidence'}
        </Text>
      </View>

      {summary.affinities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Affinities</Text>
          <View style={styles.chipRow}>
            {summary.affinities.map((a) => (
              <View key={a.tag} style={[styles.chip, styles.chipPositive]}>
                <Text style={styles.chipText}>{formatTag(a.tag)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {summary.aversions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aversions</Text>
          <View style={styles.chipRow}>
            {summary.aversions.map((a) => (
              <View key={a.tag} style={[styles.chip, styles.chipNegative]}>
                <Text style={styles.chipText}>{formatTag(a.tag)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {summary.unresolved.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unresolved</Text>
          <Text style={styles.sectionHint}>
            Tags with weak or mixed signal — swipe more to clarify.
          </Text>
          <View style={styles.chipRow}>
            {summary.unresolved.map((tag) => (
              <View key={tag} style={[styles.chip, styles.chipNeutral]}>
                <Text style={styles.chipText}>{formatTag(tag)}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          testID="deck-profile-swipe-more"
          accessibilityRole="button"
          accessibilityLabel="Swipe more cards"
          onPress={() => router.push(`/deck/${deckId}/play` as never)}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Swipe More</Text>
        </Pressable>

        {isCompareReady ? (
          <Pressable
            testID="deck-profile-compare"
            accessibilityRole="button"
            accessibilityLabel="Compare with someone"
            onPress={() => {
              // Iteration 16 will implement compare flow
              router.back();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Compare</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

export default function DeckProfileScreen() {
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;

  if (!routeDeckId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Deck Profile' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No deck selected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Deck Profile' }} />
      <DeckProfileContent deckId={routeDeckId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerBlock: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeHigh: {
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  badgeMedium: {
    backgroundColor: 'rgba(234,179,8,0.25)',
  },
  badgeLow: {
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipPositive: {
    backgroundColor: 'rgba(34,197,94,0.2)',
  },
  chipNegative: {
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  chipNeutral: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  buttonPressed: {
    opacity: 0.82,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
