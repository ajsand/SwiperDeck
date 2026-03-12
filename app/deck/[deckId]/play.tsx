import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  DeckActionBar,
  DeckStatePlaceholder,
  SwipeCard,
  dispatchDeckAction,
  type DeckActionHandler,
  type DeckActionPayload,
} from '@/components/deck';
import { useDeckById } from '@/hooks/useDeckById';
import { useDeckGestures } from '@/hooks/useDeckGestures';
import { useDeckSwipeSession } from '@/hooks/useDeckSwipeSession';
import { asDeckId, type Deck } from '@/types/domain';

function cardsRemainingLabel(count: number): string {
  return count === 1 ? '1 card left' : `${count} cards left`;
}

function DeckPlaySurface({ deck }: { deck: Deck }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const session = useDeckSwipeSession({
    deckId: deck.id,
    deckCategory: deck.category,
  });
  const [isDispatchLocked, setIsDispatchLocked] = useState(false);
  const [lastPayload, setLastPayload] = useState<DeckActionPayload | null>(
    null,
  );
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const goToDeckDetail = useCallback(() => {
    router.replace(`/deck/${deck.id as string}` as never);
  }, [deck.id, router]);

  const handleExitSession = useCallback(async () => {
    await session.endSession();
    goToDeckDetail();
  }, [goToDeckDetail, session]);

  useEffect(() => {
    if (session.state !== 'ready') {
      setIsDispatchLocked(false);
    }
  }, [session.state]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const onUnifiedAction = useCallback<DeckActionHandler>(
    (action, meta) => {
      if (session.state !== 'ready' || !session.currentCard) {
        return;
      }

      const payload = dispatchDeckAction({
        action,
        meta,
        isLocked: isDispatchLocked,
        lock: () => setIsDispatchLocked(true),
        onAction: (dispatchedAction, dispatchedMeta) => {
          setLastPayload({
            action: dispatchedAction,
            source: dispatchedMeta.source,
            velocityX: dispatchedMeta.velocityX,
            distanceX: dispatchedMeta.distanceX,
          });

          const persistAndAdvance = async () => {
            await session.onAction(dispatchedAction, dispatchedMeta);
            setIsDispatchLocked(false);
          };

          if (dispatchedMeta.source === 'button') {
            if (transitionTimeoutRef.current) {
              clearTimeout(transitionTimeoutRef.current);
            }
            transitionTimeoutRef.current = setTimeout(() => {
              void persistAndAdvance();
              transitionTimeoutRef.current = null;
            }, 280);
            return;
          }

          void persistAndAdvance();
        },
      });

      if (!payload) {
        return;
      }
    },
    [isDispatchLocked, session],
  );

  const { gesture, animatedCardStyle } = useDeckGestures({
    enabled: session.state === 'ready' && !isDispatchLocked,
    screenWidth: Math.max(screenWidth, 1),
    onAction: onUnifiedAction,
  });

  const renderBody = () => {
    if (session.state === 'loading') {
      return <DeckStatePlaceholder state="loading" />;
    }

    if (session.state === 'empty') {
      return <DeckStatePlaceholder state="empty" />;
    }

    if (session.state === 'error') {
      return (
        <DeckStatePlaceholder
          state="error"
          errorMessage={session.errorMessage}
          onRetry={session.retry}
        />
      );
    }

    if (session.state === 'complete') {
      return (
        <View testID="deck-play-complete" style={styles.completeContainer}>
          <Text style={styles.completeTitle}>Nothing new is due right now</Text>
          <Text style={styles.completeMessage}>
            Your swipes for {deck.title} are already saved. DateDeck will pick
            the next useful card for this deck when you come back later.
          </Text>
          <Pressable
            testID="deck-play-view-profile"
            accessibilityRole="button"
            accessibilityLabel="View your profile"
            accessibilityHint="Opens your deck profile"
            onPress={() =>
              router.push(`/deck/${deck.id as string}/profile` as never)
            }
            style={({ pressed }) => [
              styles.completeButton,
              pressed ? styles.completeButtonPressed : null,
            ]}
          >
            <Text style={styles.completeButtonText}>View Profile</Text>
          </Pressable>
          <Pressable
            testID="deck-play-back-to-detail"
            accessibilityRole="button"
            accessibilityLabel="Back to deck detail"
            accessibilityHint="Returns to the deck detail screen"
            onPress={goToDeckDetail}
            style={({ pressed }) => [
              styles.completeButtonSecondary,
              pressed ? styles.completeButtonPressed : null,
            ]}
          >
            <Text style={styles.completeButtonSecondaryText}>Back to Deck</Text>
          </Pressable>
        </View>
      );
    }

    if (!session.currentCard) {
      return (
        <DeckStatePlaceholder
          state="error"
          errorMessage="Current card missing."
        />
      );
    }

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          testID="deck-play-gesture-surface"
          style={[styles.cardAnimatedContainer, animatedCardStyle]}
        >
          <SwipeCard
            title={session.currentCard.title}
            subtitle={session.currentCard.subtitle}
            tags={session.currentCard.tags}
            tileKey={session.currentCard.tileKey}
            tileType={deck.category}
          />
        </Animated.View>
      </GestureDetector>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>{deck.title}</Text>
            <Text style={styles.subtitle}>
              {session.state === 'ready'
                ? cardsRemainingLabel(session.cardsRemaining)
                : session.state === 'complete'
                  ? 'No cards due right now'
                  : `${session.totalCards} total cards`}
            </Text>
          </View>
          <Pressable
            testID="deck-play-exit-session"
            accessibilityRole="button"
            accessibilityLabel="Exit swipe session"
            accessibilityHint="Stops swiping and returns to the deck detail screen"
            onPress={() => {
              void handleExitSession();
            }}
            style={({ pressed }) => [
              styles.exitButton,
              pressed ? styles.exitButtonPressed : null,
            ]}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.viewport}>{renderBody()}</View>

      <View
        style={[styles.actionBarRegion, { paddingBottom: insets.bottom + 12 }]}
      >
        {session.state === 'ready' ? (
          <DeckActionBar
            onAction={onUnifiedAction}
            disabled={isDispatchLocked}
          />
        ) : null}
        {session.state === 'ready' && lastPayload ? (
          <Text testID="deck-play-last-action" style={styles.lastActionText}>
            Last action: {lastPayload.action} via {lastPayload.source}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function DeckPlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string | string[] }>();
  const routeDeckId = Array.isArray(params.deckId)
    ? params.deckId[0]
    : params.deckId;
  const deckId = routeDeckId ? asDeckId(routeDeckId) : null;
  const { deck, loading, error, refresh } = useDeckById(deckId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: deck?.title ?? 'Swipe Deck' }} />

      {loading ? (
        <View style={styles.viewport}>
          <DeckStatePlaceholder state="loading" />
        </View>
      ) : error ? (
        <View style={styles.viewport}>
          <DeckStatePlaceholder
            state="error"
            errorMessage={error.message}
            onRetry={refresh}
          />
        </View>
      ) : !deck ? (
        <View testID="deck-play-not-found" style={styles.completeContainer}>
          <Text style={styles.completeTitle}>Deck not found</Text>
          <Text style={styles.completeMessage}>
            We could not open a swipe session because this deck was unavailable.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.completeButton,
              pressed ? styles.completeButtonPressed : null,
            ]}
          >
            <Text style={styles.completeButtonText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <DeckPlaySurface deck={deck} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  header: {
    paddingHorizontal: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(255,255,255,0.68)',
  },
  exitButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  exitButtonPressed: {
    opacity: 0.8,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  viewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardAnimatedContainer: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
  },
  actionBarRegion: {
    minHeight: 92,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  lastActionText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  completeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  completeMessage: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  completeButton: {
    marginTop: 20,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  completeButtonSecondary: {
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  completeButtonPressed: {
    opacity: 0.82,
  },
  completeButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  completeButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
