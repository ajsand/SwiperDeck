import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDeckCompareReadiness } from '@/hooks/useDeckCompareReadiness';
import {
  getDeckBrowserRoute,
  getDeckProfileRoute,
} from '@/lib/navigation/appShell';
import { asDeckId, type DeckCompareReadinessState } from '@/types/domain';

function formatState(state: DeckCompareReadinessState): string {
  switch (state) {
    case 'not_started':
      return 'Not started';
    case 'early_profile':
      return 'Early profile';
    case 'needs_more_breadth':
      return 'Needs more breadth';
    case 'needs_more_stability':
      return 'Needs more stability';
    case 'compare_ready':
      return 'Compare ready';
    case 'compare_ready_with_caution':
      return 'Ready with caution';
    case 'unavailable':
      return 'Unavailable';
    default:
      return state;
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function buildPlayRoute(deckId: string, returnTo: string): string {
  return `/deck/${deckId}/play?returnTo=${encodeURIComponent(returnTo)}`;
}

export default function DeckCompareReadinessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const { deck, summary, readiness, loading, error, refetch } =
    useDeckCompareReadiness(deckId);

  if (!routeDeckId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Readiness' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No deck selected</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(getDeckBrowserRoute() as never)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Decks</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Readiness' }} />
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Checking compare readiness...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Readiness' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>
            Unable to load compare readiness
          </Text>
          <Text style={styles.stateMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void refetch()}
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

  if (!deck || !readiness) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Compare Readiness' }} />
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Deck not found</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(getDeckBrowserRoute() as never)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Decks</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const primaryAction = readiness.ready
    ? {
        testID: 'deck-compare-open-consent',
        label: 'Review Consent',
        onPress: () =>
          router.push(`/compare/${deck.id as string}/consent` as never),
      }
    : readiness.state === 'unavailable'
      ? {
          testID: 'deck-compare-open-decks',
          label: 'Browse Decks',
          onPress: () => router.replace('/' as never),
        }
      : {
          testID: 'deck-compare-swipe-more',
          label: 'Swipe More',
          onPress: () =>
            router.push(
              buildPlayRoute(
                deck.id as string,
                `/deck/${deck.id as string}/compare`,
              ) as never,
            ),
        };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Compare Readiness' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <View
            style={[
              styles.stateBadge,
              readiness.ready
                ? readiness.caution
                  ? styles.badgeCaution
                  : styles.badgeReady
                : styles.badgeBlocked,
            ]}
          >
            <Text style={styles.stateBadgeText}>
              {formatState(readiness.state)}
            </Text>
          </View>
          <Text style={styles.deckTitle}>{deck.title}</Text>
          <Text style={styles.headerTitle}>{readiness.title}</Text>
          <Text style={styles.headerBody}>{readiness.detail}</Text>
        </View>

        {summary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current local signal</Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Swipes</Text>
                <Text style={styles.metricValue}>
                  {summary.confidence.swipeCount}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Cards</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(summary.coverage.cardCoverage)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Tags</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(summary.coverage.tags.coverageRatio)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Facets</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(summary.coverage.facets.coverageRatio)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Confidence</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(summary.confidence.value)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Stability</Text>
                <Text style={styles.metricValue}>
                  {formatPercent(summary.stability.stabilityScore)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why this status</Text>
          {readiness.reasons.map((reason) => (
            <View key={reason.reason} style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>{reason.title}</Text>
              <Text style={styles.reasonBody}>{reason.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended next step</Text>
          <Text style={styles.sectionBody}>{readiness.recommendedAction}</Text>
          <Text style={styles.localOnlyNote}>
            Nothing leaves this device on this screen.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            testID={primaryAction.testID}
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            onPress={primaryAction.onPress}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to deck profile"
            onPress={() =>
              router.replace(getDeckProfileRoute(deck.id as string) as never)
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Back to Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  stateBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeReady: {
    backgroundColor: 'rgba(34,197,94,0.25)',
  },
  badgeCaution: {
    backgroundColor: 'rgba(234,179,8,0.25)',
  },
  badgeBlocked: {
    backgroundColor: 'rgba(148,163,184,0.25)',
  },
  stateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deckTitle: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
  },
  headerTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  headerBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionBody: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  localOnlyNote: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  reasonCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reasonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  reasonBody: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 20,
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
  secondaryButton: {
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
