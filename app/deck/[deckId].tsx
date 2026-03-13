import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DeckBrowserError } from '@/components/deck-browser';
import { DeterministicTile } from '@/components/tiles';
import { useDeckById } from '@/hooks/useDeckById';
import { getDeckBrowserRoute } from '@/lib/navigation/appShell';
import {
  getDeckSafetyBadgeLabel,
  getDeckSafetyPolicy,
  getDeckShowdownPolicy,
} from '@/lib/policy/deckSafetyPolicy';
import { iconForDeckCategory } from '@/lib/tiles';
import { asDeckId } from '@/types/domain';

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

function formatTier(tier: string): string {
  return tier.replace('tier_', 'Tier ');
}

function formatSensitivityLabel(args: {
  sensitivity: string;
  badgeLabel: string | null;
}): string {
  if (args.badgeLabel) {
    return args.badgeLabel;
  }

  if (args.sensitivity === 'standard') {
    return 'Standard sensitivity';
  }

  if (args.sensitivity === 'sensitive') {
    return 'Sensitive topic';
  }

  return 'Gated topic';
}

function compareThresholdCopy(args: {
  isCustom: boolean;
  compareEligible: boolean;
  minCardsForCompare: number;
  readinessWarning: string;
}): string {
  if (args.isCustom) {
    return 'Custom decks stay local-first and are not compare-eligible under the current product scope.';
  }

  if (!args.compareEligible) {
    return 'Compare is unavailable for this deck under the current product rules.';
  }

  const base = `At least ${args.minCardsForCompare} swipes before compare readiness can be considered. Coverage, ambiguity, and stability still matter.`;

  return args.readinessWarning.length > 0
    ? `${base} ${args.readinessWarning}`
    : base;
}

function showdownStatusCopy(args: {
  showdownAllowed: boolean;
  showdownReason: string | null;
}): string {
  if (args.showdownAllowed) {
    return 'Showdown stays lighter than compare: one shared card at a time, local group reactions, and a short summary at the end.';
  }

  return (
    args.showdownReason ??
    'This deck is not eligible for showdown under the current product rules.'
  );
}

function buildPlayRoute(deckId: string, returnTo: string): string {
  return `/deck/${deckId}/play?returnTo=${encodeURIComponent(returnTo)}`;
}

export default function DeckDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const { deck, loading, error, refresh } = useDeckById(deckId);
  const categoryIcon = useMemo(
    () => iconForDeckCategory(deck?.category ?? 'unknown'),
    [deck?.category],
  );
  const safetyPolicy = useMemo(
    () => (deck ? getDeckSafetyPolicy(deck) : null),
    [deck],
  );
  const showdownPolicy = useMemo(
    () => (deck ? getDeckShowdownPolicy(deck) : null),
    [deck],
  );
  const safetyBadgeLabel = useMemo(
    () => (deck ? getDeckSafetyBadgeLabel(deck) : null),
    [deck],
  );

  const handleStartSwiping = () => {
    if (!deck) {
      return;
    }

    router.push(
      buildPlayRoute(deck.id as string, `/deck/${deck.id as string}`) as never,
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: deck?.title ?? 'Deck Detail' }} />

      {loading ? (
        <View testID="deck-detail-loading" style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Loading deck...</Text>
        </View>
      ) : error ? (
        <View style={styles.contentShell}>
          <DeckBrowserError
            title="Unable to load deck"
            message={error.message}
            onRetry={refresh}
            retryAccessibilityLabel="Retry loading deck"
            retryAccessibilityHint="Attempts to load this deck again"
          />
        </View>
      ) : !deck ? (
        <View testID="deck-detail-not-found" style={styles.stateContainer}>
          <Ionicons
            name="search-outline"
            size={32}
            color="rgba(255,255,255,0.78)"
          />
          <Text style={styles.stateTitle}>Deck not found</Text>
          <Text style={styles.stateMessage}>
            We could not find that deck on this device.
          </Text>
          <Pressable
            testID="deck-detail-go-back"
            accessibilityRole="button"
            accessibilityLabel="Back to decks"
            accessibilityHint="Returns to the deck browser"
            onPress={() => router.replace(getDeckBrowserRoute() as never)}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Decks</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          testID="deck-detail-scroll"
          contentContainerStyle={styles.scrollContent}
        >
          {deck.coverTileKey ? (
            <View style={styles.heroTileShell}>
              <DeterministicTile
                tileKey={deck.coverTileKey}
                type="concept"
                title={deck.title}
                subtitle={formatDeckCategory(deck.category)}
                variant="deck"
                accessibilityLabel={`${deck.title} cover art`}
              />
            </View>
          ) : (
            <LinearGradient
              colors={['#1E2030', '#0E1118']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroFallback}
            >
              <View style={styles.heroIconBadge}>
                <Ionicons name={categoryIcon} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroTitle}>{deck.title}</Text>
              <Text style={styles.heroSubtitle}>
                {formatDeckCategory(deck.category)}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.headerBlock}>
            <Text accessibilityRole="header" style={styles.title}>
              {deck.title}
            </Text>
            <Text style={styles.description}>{deck.description}</Text>
          </View>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {formatDeckCategory(deck.category)}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{formatTier(deck.tier)}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{deck.cardCount} cards</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {deck.compareEligible
                  ? 'Compare eligible'
                  : 'Compare unavailable'}
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {showdownPolicy?.allowed
                  ? 'Showdown eligible'
                  : 'Showdown unavailable'}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                safetyBadgeLabel || deck.sensitivity !== 'standard'
                  ? styles.warningChip
                  : null,
              ]}
            >
              <Text style={styles.chipText}>
                {formatSensitivityLabel({
                  sensitivity: deck.sensitivity,
                  badgeLabel: safetyBadgeLabel,
                })}
              </Text>
            </View>
            {deck.isCustom ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Custom deck</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.thresholdSection}>
            <Text style={styles.sectionTitle}>Readiness thresholds</Text>
            <View style={styles.thresholdCard}>
              <Text style={styles.thresholdLabel}>Profile threshold</Text>
              <Text style={styles.thresholdValue}>
                At least {deck.minCardsForProfile} cards for a basic profile
              </Text>
            </View>
            <View style={styles.thresholdCard}>
              <Text style={styles.thresholdLabel}>Compare threshold</Text>
              <Text style={styles.thresholdValue}>
                {compareThresholdCopy({
                  isCustom: deck.isCustom,
                  compareEligible: deck.compareEligible,
                  minCardsForCompare: deck.minCardsForCompare,
                  readinessWarning: safetyPolicy?.warnings.readiness ?? '',
                })}
              </Text>
            </View>
            <View style={styles.thresholdCard}>
              <Text style={styles.thresholdLabel}>Showdown status</Text>
              <Text style={styles.thresholdValue}>
                {showdownStatusCopy({
                  showdownAllowed: showdownPolicy?.allowed ?? false,
                  showdownReason: showdownPolicy?.reason ?? null,
                })}
              </Text>
            </View>
          </View>

          {deck.isCustom ? (
            <View style={styles.customDeckNotice}>
              <Text style={styles.customDeckNoticeTitle}>Custom deck mode</Text>
              <Text style={styles.customDeckNoticeBody}>
                Custom decks stay local on this device. They can be swiped and
                profiled, but they do not yet use the richer prebuilt taxonomy,
                coverage-aware sequencing, compare flow, or report quality
                guarantees.
              </Text>
            </View>
          ) : null}

          <Pressable
            testID="deck-detail-start-swiping"
            accessibilityRole="button"
            accessibilityLabel={`Start swiping ${deck.title}`}
            accessibilityHint="Starts a swipe session for this deck"
            onPress={handleStartSwiping}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Start Swiping</Text>
          </Pressable>
          <Pressable
            testID="deck-detail-view-profile"
            accessibilityRole="button"
            accessibilityLabel="View deck profile"
            accessibilityHint="Opens your profile for this deck"
            onPress={() =>
              router.push(`/deck/${deck.id as string}/profile` as never)
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>View Profile</Text>
          </Pressable>
          <Pressable
            testID="deck-detail-compare-readiness"
            accessibilityRole="button"
            accessibilityLabel="Review compare readiness"
            accessibilityHint="Opens compare readiness and consent information for this deck"
            onPress={() =>
              router.push(`/deck/${deck.id as string}/compare` as never)
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.primaryButtonPressed : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Compare Readiness</Text>
          </Pressable>
          {showdownPolicy?.allowed ? (
            <Pressable
              testID="deck-detail-start-showdown"
              accessibilityRole="button"
              accessibilityLabel="Start showdown"
              accessibilityHint="Starts a local showdown session for this deck"
              onPress={() =>
                router.push(
                  `/showdown/create?deckId=${deck.id as string}` as never,
                )
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.primaryButtonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Start Showdown</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  contentShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
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
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroTileShell: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
  heroFallback: {
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    minHeight: 220,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroTitle: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  headerBlock: {
    marginTop: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 16,
    lineHeight: 24,
  },
  chipRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  warningChip: {
    backgroundColor: 'rgba(236,72,153,0.18)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  thresholdSection: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  thresholdCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  thresholdLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thresholdValue: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 23,
  },
  customDeckNotice: {
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  customDeckNoticeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  customDeckNoticeBody: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 28,
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
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
