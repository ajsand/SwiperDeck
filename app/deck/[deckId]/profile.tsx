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
import {
  getDeckBrowserRoute,
  getDeckCompareRoute,
} from '@/lib/navigation/appShell';
import {
  asDeckId,
  type DeckProfileActionHint,
  type DeckProfileThemeScore,
  type DeckProfileUnresolvedReason,
} from '@/types/domain';

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatReason(reason: DeckProfileUnresolvedReason): string {
  switch (reason) {
    case 'mixed_signal':
      return 'Mixed signal';
    case 'pending_retest':
      return 'Pending retest';
    case 'low_coverage':
      return 'Low coverage';
    case 'no_signal':
      return 'No signal yet';
    default:
      return reason;
  }
}

function formatStageDescription(stage: string): string {
  if (stage === 'lightweight') {
    return 'This deck has early signal, but it still needs broader coverage before the profile becomes meaningful.';
  }

  if (stage === 'meaningful') {
    return 'This deck now has a meaningful profile, but some areas may still need more breadth or reaffirmation.';
  }

  return 'This deck has broad enough and stable enough signal to support stronger compare and report quality later.';
}

function compareStatusCopy(
  isCustom: boolean,
  compareEligible: boolean,
  compareReady: boolean,
): string {
  if (isCustom) {
    return 'Custom decks are not compare-eligible under the current product scope. Their profile stays local to this device.';
  }

  if (!compareEligible) {
    return 'This deck is not eligible for compare under the current product scope.';
  }

  if (compareReady) {
    return 'This deck is locally ready for a compare flow.';
  }

  return 'This deck still needs more local evidence before compare should unlock.';
}

function buildPlayRoute(deckId: string, returnTo: string): string {
  return `/deck/${deckId}/play?returnTo=${encodeURIComponent(returnTo)}`;
}

function ThemeScoreRow({
  item,
  tone,
}: {
  item: DeckProfileThemeScore;
  tone: 'positive' | 'negative';
}) {
  return (
    <View
      style={[
        styles.themeRow,
        tone === 'positive' ? styles.themePositive : styles.themeNegative,
      ]}
    >
      <View style={styles.themeCopy}>
        <Text style={styles.themeTitle}>{item.tag}</Text>
        <Text style={styles.themeMeta}>
          {item.facet ?? 'Unscoped facet'} | {item.exposureCount} exposures |{' '}
          {item.stability}
        </Text>
      </View>
      <Text style={styles.themeScore}>{item.score.toFixed(1)}</Text>
    </View>
  );
}

function ActionHintCard({ hint }: { hint: DeckProfileActionHint }) {
  return (
    <View style={styles.hintCard}>
      <Text style={styles.hintTitle}>{hint.title}</Text>
      <Text style={styles.hintDetail}>{hint.detail}</Text>
    </View>
  );
}

function DeckProfileContent({ deckId }: { deckId: string }) {
  const router = useRouter();
  const {
    deck,
    loading: deckLoading,
    error: deckError,
    refresh,
  } = useDeckById(asDeckId(deckId));
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
          onPress={() => router.replace(getDeckBrowserRoute() as never)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Back to Decks</Text>
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
            router.push(
              buildPlayRoute(deckId, `/deck/${deckId}/profile`) as never,
            )
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

  const isCompareReady = summary.readiness.compareReady && deck.compareEligible;
  const compareBadgeCopy = deck.compareEligible
    ? isCompareReady
      ? 'compare ready'
      : 'compare pending'
    : 'compare unavailable';
  const compareButtonLabel = isCompareReady ? 'Compare' : 'Compare Readiness';

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
          <View
            style={[styles.badge, isCompareReady ? styles.badgeHigh : null]}
          >
            <Text style={styles.badgeText}>{compareBadgeCopy}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Stage</Text>
        <Text style={styles.sectionValue}>
          {formatStageDescription(summary.stage)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coverage</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Cards</Text>
            <Text style={styles.metricValue}>
              {summary.coverage.cardsSeen}/{summary.coverage.totalCards}
            </Text>
            <Text style={styles.metricSubtext}>
              {formatPercent(summary.coverage.cardCoverage)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Tags</Text>
            <Text style={styles.metricValue}>
              {summary.coverage.tags.seenTagCount}/
              {summary.coverage.tags.totalTagCount}
            </Text>
            <Text style={styles.metricSubtext}>
              {formatPercent(summary.coverage.tags.coverageRatio)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Facets</Text>
            <Text style={styles.metricValue}>
              {summary.coverage.facets.seenFacetCount}/
              {summary.coverage.facets.totalFacetCount}
            </Text>
            <Text style={styles.metricSubtext}>
              {formatPercent(summary.coverage.facets.coverageRatio)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confidence breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Swipe signal</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.swipeSignal)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Card coverage</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.cardCoverage)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Tag coverage</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.tagCoverage)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Facet coverage</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.facetCoverage)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Stability</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.stability)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Ambiguity penalty</Text>
          <Text style={styles.breakdownValue}>
            {formatPercent(summary.confidence.components.ambiguityPenalty)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stability</Text>
        <Text style={styles.sectionHint}>
          Retest and reaffirmation make this profile more trustworthy.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Stable tags</Text>
            <Text style={styles.metricValue}>
              {summary.stability.stableTagCount}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Retested tags</Text>
            <Text style={styles.metricValue}>
              {summary.stability.retestedTagCount}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending retest</Text>
            <Text style={styles.metricValue}>
              {summary.stability.retestPendingCount}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionValue}>
          Stability score: {formatPercent(summary.stability.stabilityScore)}
        </Text>
      </View>

      {summary.affinities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Affinities</Text>
          {summary.affinities.map((affinity) => (
            <ThemeScoreRow
              key={affinity.tagId}
              item={affinity}
              tone="positive"
            />
          ))}
        </View>
      ) : null}

      {summary.aversions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aversions</Text>
          {summary.aversions.map((aversion) => (
            <ThemeScoreRow
              key={aversion.tagId}
              item={aversion}
              tone="negative"
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compare readiness</Text>
        <Text style={styles.sectionValue}>
          {compareStatusCopy(
            deck.isCustom,
            deck.compareEligible,
            isCompareReady,
          )}
        </Text>
        {summary.readiness.blockers.length > 0 ? (
          <View style={styles.inlineList}>
            {summary.readiness.blockers.map((blocker) => (
              <View key={blocker} style={styles.neutralChip}>
                <Text style={styles.neutralChipText}>{blocker}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {summary.unresolved.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unresolved areas</Text>
          <Text style={styles.sectionHint}>
            These themes still need more clarity before the profile is fully
            trustworthy.
          </Text>
          {summary.unresolved.map((area) => (
            <View key={area.tagId} style={styles.unresolvedCard}>
              <Text style={styles.unresolvedTitle}>{area.tag}</Text>
              <Text style={styles.unresolvedMeta}>
                {area.facet ?? 'Unscoped facet'} | {formatReason(area.reason)} |{' '}
                {area.exposureCount} exposures |{' '}
                {formatPercent(area.uncertainty)} uncertainty
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {summary.nextSteps.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next steps</Text>
          {summary.nextSteps.map((hint) => (
            <ActionHintCard key={hint.kind} hint={hint} />
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          testID="deck-profile-swipe-more"
          accessibilityRole="button"
          accessibilityLabel="Swipe more cards"
          onPress={() =>
            router.push(
              buildPlayRoute(deckId, `/deck/${deckId}/profile`) as never,
            )
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Swipe More</Text>
        </Pressable>

        <Pressable
          testID={
            isCompareReady
              ? 'deck-profile-compare'
              : 'deck-profile-compare-readiness'
          }
          accessibilityRole="button"
          accessibilityLabel={
            isCompareReady ? 'Compare with someone' : 'Review compare readiness'
          }
          onPress={() => router.push(getDeckCompareRoute(deckId) as never)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>{compareButtonLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export default function DeckProfileScreen() {
  const router = useRouter();
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
          <Text style={styles.stateMessage}>
            Choose a deck first to view a deck-specific profile.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(getDeckBrowserRoute() as never)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Decks</Text>
          </Pressable>
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
  metricSubtext: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  breakdownLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
  },
  breakdownValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  themePositive: {
    backgroundColor: 'rgba(34,197,94,0.16)',
  },
  themeNegative: {
    backgroundColor: 'rgba(239,68,68,0.16)',
  },
  themeCopy: {
    flex: 1,
  },
  themeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  themeMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  themeScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inlineList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  neutralChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  neutralChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  unresolvedCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  unresolvedTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  unresolvedMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 19,
  },
  hintCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  hintTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  hintDetail: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.78)',
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
