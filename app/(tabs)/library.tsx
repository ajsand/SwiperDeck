import { useMemo } from 'react';
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
import type { DeckCompareReadinessState } from '@/types/domain';

function formatStage(stage: string): string {
  if (stage === 'lightweight') return 'Lightweight';
  if (stage === 'meaningful') return 'Meaningful';
  return 'High Confidence';
}

function buildProgressCopy(
  compareReady: boolean,
  compareState: DeckCompareReadinessState,
  compareDetail: string,
  hint: string | null,
  swipeCount: number,
  minCardsForCompare: number,
  stage: string,
): string {
  if (compareState === 'unavailable') {
    return compareDetail;
  }

  if (compareReady) {
    return 'This deck has enough breadth, stability, and confidence for compare readiness.';
  }

  if (hint) {
    return hint;
  }

  if (stage === 'high_confidence') {
    return 'Stable enough for a stronger compare later.';
  }

  if (swipeCount >= minCardsForCompare) {
    return 'Enough swipes for deeper compare-readiness checks, but breadth and stability still matter.';
  }

  const remaining = Math.max(0, minCardsForCompare - swipeCount);
  return `${remaining} more swipe${remaining === 1 ? '' : 's'} to reach the baseline compare threshold.`;
}

function buildMetaCopy(
  swipeCount: number,
  compareState: DeckCompareReadinessState,
  minCardsForCompare: number,
): string {
  const compareCopy =
    compareState === 'unavailable'
      ? 'compare unavailable'
      : `baseline compare threshold ${minCardsForCompare}`;

  return `${swipeCount} swipes | ${compareCopy}`;
}

export default function LibraryScreen() {
  const router = useRouter();
  const { decks, loading, error, refresh } = useDecksWithProfileStatus();
  const activeDecks = useMemo(
    () =>
      [...decks]
        .filter((entry) => entry.swipeCount > 0)
        .sort((left, right) => {
          if (left.swipeCount !== right.swipeCount) {
            return right.swipeCount - left.swipeCount;
          }

          return left.deck.title.localeCompare(right.deck.title);
        }),
    [decks],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Swipe history stays on this device until you explicitly compare.
        </Text>
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Loading local activity...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Swipe history stays on this device until you explicitly compare.
        </Text>
        <View style={styles.stateContainer}>
          <Text style={styles.stateMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry history"
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

  if (activeDecks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          Swipe history stays on this device until you explicitly compare.
        </Text>
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No local swipe history yet</Text>
          <Text style={styles.stateMessage}>
            Start a deck to build deck-specific history, confidence, and later
            compare readiness.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>
        Deck activity is tracked locally, one deck at a time.
      </Text>

      <FlatList
        data={activeDecks}
        keyExtractor={(item) => item.deck.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.deck.title} profile history`}
            onPress={() =>
              router.push(`/deck/${item.deck.id as string}/profile` as never)
            }
            style={({ pressed }) => [
              styles.deckRow,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <View style={styles.deckHeaderRow}>
              <Text style={styles.deckTitle}>{item.deck.title}</Text>
              <View
                style={[
                  styles.stageBadge,
                  item.stage === 'high_confidence'
                    ? styles.stageHigh
                    : item.stage === 'meaningful'
                      ? styles.stageMeaningful
                      : styles.stageLightweight,
                ]}
              >
                <Text style={styles.stageBadgeText}>
                  {formatStage(item.stage)}
                </Text>
              </View>
            </View>

            <Text style={styles.deckMeta}>
              {buildMetaCopy(
                item.swipeCount,
                item.compareState,
                item.deck.minCardsForCompare,
              )}
            </Text>
            {item.summary ? (
              <Text style={styles.deckCoverage}>
                Cards {item.summary.coverage.cardsSeen}/
                {item.summary.coverage.totalCards} | Tags{' '}
                {item.summary.coverage.tags.seenTagCount}/
                {item.summary.coverage.tags.totalTagCount} | Facets{' '}
                {item.summary.coverage.facets.seenFacetCount}/
                {item.summary.coverage.facets.totalFacetCount}
              </Text>
            ) : null}
            <Text style={styles.deckProgress}>
              {buildProgressCopy(
                item.compareReady,
                item.compareState,
                item.compareDetail,
                item.primaryHint?.detail ?? null,
                item.swipeCount,
                item.deck.minCardsForCompare,
                item.stage,
              )}
            </Text>
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
  subtitle: {
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
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deckHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  deckTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  deckMeta: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
  },
  deckCoverage: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  deckProgress: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 20,
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
  stageHigh: {
    backgroundColor: 'rgba(14,165,233,0.28)',
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
  stateTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 20,
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
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
