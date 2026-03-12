import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDeckById } from '@/hooks/useDeckById';
import {
  getDb,
  getDeckCardsByDeckId,
  getDeckTagFacetsByDeckId,
  getDeckTagsByDeckId,
  getDeckCardTagLinksByCardId,
} from '@/lib/db';
import {
  getDeckSafetyBadgeLabel,
  getDeckSafetyPolicy,
} from '@/lib/policy/deckSafetyPolicy';
import {
  selectShowdownCards,
  type ShowdownCardSelectionResult,
} from '@/lib/showdown/showdownCardSelection';
import { createLocalShowdownSession } from '@/lib/showdown/showdownSessionStore';
import {
  asDeckId,
  createDefaultShowdownParticipants,
  normalizeShowdownCardCount,
  normalizeShowdownParticipantCount,
  normalizeShowdownResponseSeconds,
  SHOWDOWN_CARD_COUNT_OPTIONS,
  SHOWDOWN_PARTICIPANT_COUNT_OPTIONS,
  SHOWDOWN_RESPONSE_SECONDS_OPTIONS,
  type ShowdownSessionConfig,
} from '@/types/domain';

function SelectionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionChip,
        selected ? styles.optionChipSelected : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.optionChipText,
          selected ? styles.optionChipTextSelected : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ShowdownCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const { deck, loading, error, refresh } = useDeckById(deckId);
  const [config, setConfig] = useState<ShowdownSessionConfig>({
    cardCount: 8,
    responseSeconds: 30,
    participantCount: 3,
  });
  const [selectionResult, setSelectionResult] =
    useState<ShowdownCardSelectionResult | null>(null);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const safetyPolicy = useMemo(
    () => (deck ? getDeckSafetyPolicy(deck) : null),
    [deck],
  );
  const safetyBadge = useMemo(
    () => (deck ? getDeckSafetyBadgeLabel(deck) : null),
    [deck],
  );

  useEffect(() => {
    if (!deck || !safetyPolicy) {
      setSelectionResult(null);
      setSelectionError(null);
      setSelectionLoading(false);
      return;
    }

    if (!safetyPolicy.showdown.allowed) {
      setSelectionResult({
        available: false,
        reason:
          safetyPolicy.showdown.reason ??
          'This deck is not eligible for showdown.',
        selectedCards: [],
        excludedCardCount: 0,
      });
      setSelectionLoading(false);
      setSelectionError(null);
      return;
    }

    let cancelled = false;
    setSelectionLoading(true);
    setSelectionError(null);

    const loadSelection = async () => {
      try {
        const db = await getDb();
        const [cards, tags, facets] = await Promise.all([
          getDeckCardsByDeckId(db, deck.id),
          getDeckTagsByDeckId(db, deck.id),
          getDeckTagFacetsByDeckId(db, deck.id),
        ]);
        const linkEntries = await Promise.all(
          cards.map(
            async (
              card,
            ): Promise<
              readonly [
                string,
                Awaited<ReturnType<typeof getDeckCardTagLinksByCardId>>,
              ]
            > =>
              [
                card.id as string,
                await getDeckCardTagLinksByCardId(db, card.id),
              ] as const,
          ),
        );
        const nextResult = selectShowdownCards({
          deck,
          cards,
          tags,
          facets,
          cardTagLinksByCardId: new Map(linkEntries),
          policy: safetyPolicy,
          desiredCardCount: config.cardCount,
        });

        if (cancelled) {
          return;
        }

        setSelectionResult(nextResult);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSelectionError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to build a showdown card set for this deck.',
        );
      } finally {
        if (!cancelled) {
          setSelectionLoading(false);
        }
      }
    };

    void loadSelection();

    return () => {
      cancelled = true;
    };
  }, [config.cardCount, deck, safetyPolicy]);

  const startShowdown = () => {
    if (!deck || !selectionResult?.available) {
      return;
    }

    setStarting(true);

    try {
      const session = createLocalShowdownSession({
        deckId: deck.id,
        deckTitle: deck.title,
        deckCategory: deck.category,
        config,
        participants: createDefaultShowdownParticipants(
          config.participantCount,
        ),
        selectedCards: selectionResult.selectedCards,
      });

      router.push(`/showdown/${session.id as string}` as never);
    } finally {
      setStarting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: deck?.title ?? 'Start Showdown' }} />

      {loading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Preparing showdown...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Unable to load deck</Text>
          <Text style={styles.stateMessage}>{error.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : !deck ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No deck selected</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Showdown setup</Text>
          <Text style={styles.subtitle}>
            Showdown is a bounded group mode. Everyone reacts to the same deck
            cards, locally, and the summary stays lighter than a one-to-one
            compare report.
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                {deck.showdownEligible
                  ? 'Deck supports showdown'
                  : 'No showdown'}
              </Text>
            </View>
            {safetyBadge ? (
              <View style={[styles.infoChip, styles.warningChip]}>
                <Text style={styles.infoChipText}>{safetyBadge}</Text>
              </View>
            ) : null}
          </View>

          {!safetyPolicy?.showdown.allowed ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Showdown unavailable</Text>
              <Text style={styles.warningBody}>
                {safetyPolicy?.showdown.reason ??
                  'This deck is not safe for the current showdown mode.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Card count</Text>
            <View style={styles.optionRow}>
              {SHOWDOWN_CARD_COUNT_OPTIONS.map((cardCount) => (
                <SelectionChip
                  key={cardCount}
                  label={`${cardCount} cards`}
                  selected={config.cardCount === cardCount}
                  onPress={() =>
                    setConfig((current) => ({
                      ...current,
                      cardCount: normalizeShowdownCardCount(cardCount),
                    }))
                  }
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timer</Text>
            <View style={styles.optionRow}>
              {SHOWDOWN_RESPONSE_SECONDS_OPTIONS.map((seconds) => (
                <SelectionChip
                  key={seconds}
                  label={`${seconds}s`}
                  selected={config.responseSeconds === seconds}
                  onPress={() =>
                    setConfig((current) => ({
                      ...current,
                      responseSeconds:
                        normalizeShowdownResponseSeconds(seconds),
                    }))
                  }
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Players</Text>
            <View style={styles.optionRow}>
              {SHOWDOWN_PARTICIPANT_COUNT_OPTIONS.map((count) => (
                <SelectionChip
                  key={count}
                  label={`${count} players`}
                  selected={config.participantCount === count}
                  onPress={() =>
                    setConfig((current) => ({
                      ...current,
                      participantCount:
                        normalizeShowdownParticipantCount(count),
                    }))
                  }
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Representative card set</Text>
            <Text style={styles.sectionHint}>
              The host card set stays fair and broad across the deck instead of
              following one person&apos;s profile too narrowly.
            </Text>
            {selectionLoading ? (
              <View style={styles.selectionLoadingCard}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.selectionLoadingText}>
                  Building a showdown-safe card set...
                </Text>
              </View>
            ) : selectionError ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Selection failed</Text>
                <Text style={styles.warningBody}>{selectionError}</Text>
              </View>
            ) : selectionResult?.available ? (
              <>
                <Text style={styles.sectionBody}>
                  {selectionResult.selectedCards.length} cards selected.
                  {selectionResult.excludedCardCount > 0
                    ? ` ${selectionResult.excludedCardCount} cards were excluded by deck safety rules.`
                    : ' Sensitive tags were not needed for this set.'}
                </Text>
                {selectionResult.selectedCards.map((card, index) => (
                  <View
                    key={card.cardId}
                    testID={`showdown-preview-card-${index + 1}`}
                    style={styles.previewCard}
                  >
                    <Text style={styles.previewTitle}>
                      {index + 1}. {card.title}
                    </Text>
                    <Text style={styles.previewMeta}>
                      {card.facetLabel ?? 'Unscoped facet'} |{' '}
                      {card.primaryTagLabel ?? 'General'}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>No safe card set yet</Text>
                <Text style={styles.warningBody}>
                  {selectionResult?.reason ??
                    'This deck did not produce a showdown-safe card set.'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerActions}>
            <Pressable
              testID="showdown-create-start"
              accessibilityRole="button"
              accessibilityLabel="Start showdown"
              disabled={!selectionResult?.available || starting}
              onPress={startShowdown}
              style={({ pressed }) => [
                styles.primaryButton,
                !selectionResult?.available || starting
                  ? styles.disabledButton
                  : null,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>Start Showdown</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to deck"
              onPress={() => router.push(`/deck/${deck.id as string}` as never)}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Back to Deck</Text>
            </Pressable>
          </View>
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
  content: {
    padding: 16,
    paddingBottom: 32,
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
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 15,
    lineHeight: 23,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  infoChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  warningChip: {
    backgroundColor: 'rgba(236,72,153,0.18)',
  },
  infoChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionBody: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  optionChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionChipSelected: {
    backgroundColor: '#FFFFFF',
  },
  optionChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  optionChipTextSelected: {
    color: '#0B0B10',
  },
  previewCard: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
  },
  warningCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(236,72,153,0.14)',
  },
  warningTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  warningBody: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 21,
  },
  selectionLoadingCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  selectionLoadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  footerActions: {
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
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
