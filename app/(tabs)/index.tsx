import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DeckActionBar,
  DeckCard,
  DeckStatePlaceholder,
  dispatchDeckAction,
  type DeckActionHandler,
  type DeckActionPayload,
  type DeckViewState,
} from '@/components/deck';
import { useDeckGestures } from '@/hooks/useDeckGestures';
import { asEntityId, type CatalogEntity } from '@/types/domain';

const SAMPLE_DECK_ENTITIES: CatalogEntity[] = [
  {
    id: asEntityId('entity_movie_shawshank'),
    type: 'movie',
    title: 'The Shawshank Redemption',
    subtitle: 'Frank Darabont, 1994',
    descriptionShort: 'A banker forms an unlikely friendship in prison.',
    tags: ['drama', 'hope', 'friendship'],
    popularity: 0.96,
    tileKey: 'movie:movie-the-shawshank-redemption',
    imageUrl: null,
    updatedAt: 1735603200,
  },
  {
    id: asEntityId('entity_book_1984'),
    type: 'book',
    title: '1984',
    subtitle: 'George Orwell',
    descriptionShort: 'A classic dystopian novel.',
    tags: ['dystopia', 'politics', 'classics'],
    popularity: 0.91,
    tileKey: 'book:book-1984',
    imageUrl: null,
    updatedAt: 1735603200,
  },
  {
    id: asEntityId('entity_podcast_hardcore_history'),
    type: 'podcast',
    title: 'Hardcore History',
    subtitle: 'Dan Carlin',
    descriptionShort: 'Long-form historical storytelling.',
    tags: ['history', 'longform', 'storytelling'],
    popularity: 0.83,
    tileKey: 'podcast:hardcore-history',
    imageUrl: null,
    updatedAt: 1735603200,
  },
];

export default function DeckScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [deckState, setDeckState] = useState<DeckViewState>('loading');
  const [deckErrorMessage, setDeckErrorMessage] = useState<string | undefined>();
  const [isDispatchLocked, setIsDispatchLocked] = useState(false);
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0);
  const [lastPayload, setLastPayload] = useState<DeckActionPayload | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEntities = SAMPLE_DECK_ENTITIES.length > 0;
  const currentEntity =
    hasEntities
      ? SAMPLE_DECK_ENTITIES[currentEntityIndex % SAMPLE_DECK_ENTITIES.length]
      : null;

  const bootstrapDeckState = useCallback(() => {
    if (bootstrapTimeoutRef.current) {
      clearTimeout(bootstrapTimeoutRef.current);
    }

    setDeckState('loading');
    setDeckErrorMessage(undefined);
    setIsDispatchLocked(false);
    setLastPayload(null);

    bootstrapTimeoutRef.current = setTimeout(() => {
      setDeckState(hasEntities ? 'ready' : 'empty');
      bootstrapTimeoutRef.current = null;
    }, 180);
  }, [hasEntities]);

  useEffect(() => {
    bootstrapDeckState();

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (bootstrapTimeoutRef.current) {
        clearTimeout(bootstrapTimeoutRef.current);
      }
    };
  }, [bootstrapDeckState]);

  const onUnifiedAction = useCallback<DeckActionHandler>(
    (action, meta) => {
      if (deckState !== 'ready' || !currentEntity) {
        return;
      }

      try {
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
          },
          });

        if (!payload) {
          return;
        }

        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentEntityIndex(
            (previousIndex) => (previousIndex + 1) % SAMPLE_DECK_ENTITIES.length,
          );
          setIsDispatchLocked(false);
          transitionTimeoutRef.current = null;
        }, 280);
      } catch (error) {
        setDeckState('error');
        setDeckErrorMessage(
          error instanceof Error
            ? error.message
            : 'An unexpected deck action error occurred.',
        );
        setIsDispatchLocked(false);
      }
    },
    [currentEntity, deckState, isDispatchLocked],
  );

  const { gesture, animatedCardStyle } = useDeckGestures({
    enabled: deckState === 'ready' && !isDispatchLocked,
    screenWidth: Math.max(screenWidth, 1),
    onAction: onUnifiedAction,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Deck</Text>
        <Text style={styles.subtitle}>Swipe to teach your taste.</Text>
      </View>

      <View style={styles.viewport}>
        {deckState === 'ready' && currentEntity ? (
          <GestureDetector gesture={gesture}>
            <Animated.View
              testID="deck-gesture-surface"
              style={[styles.cardAnimatedContainer, animatedCardStyle]}
            >
              <DeckCard entity={currentEntity} />
            </Animated.View>
          </GestureDetector>
        ) : (
          <DeckStatePlaceholder
            state={deckState === 'ready' ? 'loading' : deckState}
            errorMessage={deckErrorMessage}
            onRetry={bootstrapDeckState}
            onOpenFilters={bootstrapDeckState}
          />
        )}
      </View>

      <View style={[styles.actionBarRegion, { paddingBottom: insets.bottom + 12 }]}>
        {deckState === 'ready' ? (
          <DeckActionBar onAction={onUnifiedAction} disabled={isDispatchLocked} />
        ) : null}
        {deckState === 'ready' && lastPayload ? (
          <Text testID="deck-last-action" style={styles.lastActionText}>
            Last action: {lastPayload.action} via {lastPayload.source}
          </Text>
        ) : null}
      </View>
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
});
