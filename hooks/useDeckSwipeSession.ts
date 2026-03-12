import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getDeckCardsByDeckId, getDb } from '@/lib/db';
import { updateScoresFromSwipeEvent } from '@/lib/profile/deckProfileService';
import { buildDeckSequenceQueue } from '@/lib/sequence/broadStartStrategy';
import {
  recordDeckCardPresentation,
  recordDeckCardSwipe,
} from '@/lib/db/deckCardStateRepository';
import {
  createSwipeEvent,
  createSwipeSession,
  endSwipeSession,
  insertSwipeEvent,
} from '@/lib/db/swipeRepository';
import {
  actionToDbStrength,
  type DeckCard,
  type DeckId,
  type SessionId,
} from '@/types/domain';
import type { DeckSequenceDecision } from '@/lib/sequence/deckSequenceTypes';

import type { DeckActionHandler } from '@/components/deck/deckActionPayload';

export interface UseDeckSwipeSessionOptions {
  deckId: DeckId;
  deckCategory: string;
}

export type DeckSwipeSessionState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'complete'
  | 'error';

export interface UseDeckSwipeSessionResult {
  state: DeckSwipeSessionState;
  currentCard: DeckCard | null;
  currentDecision: DeckSequenceDecision | null;
  cardsRemaining: number;
  totalCards: number;
  errorMessage?: string;
  onAction: DeckActionHandler;
  endSession: () => Promise<void>;
  retry: () => void;
}

type SwipeSessionDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

function sortDeckCards(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.popularity !== right.popularity) {
      return right.popularity - left.popularity;
    }

    return left.title.localeCompare(right.title);
  });
}

export function useDeckSwipeSession({
  deckId,
  deckCategory,
}: UseDeckSwipeSessionOptions): UseDeckSwipeSessionResult {
  const [state, setState] = useState<DeckSwipeSessionState>('loading');
  const [queue, setQueue] = useState<DeckCard[]>([]);
  const [currentDecision, setCurrentDecision] =
    useState<DeckSequenceDecision | null>(null);
  const [totalCards, setTotalCards] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [refreshCount, setRefreshCount] = useState(0);
  const dbRef = useRef<SwipeSessionDb | null>(null);
  const sessionIdRef = useRef<SessionId | null>(null);
  const sessionClosedRef = useRef(false);
  const allCardsRef = useRef<DeckCard[]>([]);
  const lastPresentedCardIdRef = useRef<string | null>(null);

  const retry = useCallback(() => {
    setRefreshCount((current) => current + 1);
  }, []);

  const closeSessionIfNeeded = useCallback(async () => {
    const db = dbRef.current;
    const sessionId = sessionIdRef.current;

    if (!db || !sessionId || sessionClosedRef.current) {
      return;
    }

    sessionClosedRef.current = true;
    try {
      await endSwipeSession(db, sessionId);
    } catch {
      // Session cleanup failure should not crash the screen teardown path.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setState('loading');
      setErrorMessage(undefined);
      setQueue([]);
      setCurrentDecision(null);
      setTotalCards(0);
      sessionIdRef.current = null;
      sessionClosedRef.current = false;
      allCardsRef.current = [];
      lastPresentedCardIdRef.current = null;

      try {
        const db = await getDb();
        dbRef.current = db;

        const allCards = await getDeckCardsByDeckId(db, deckId);
        const orderedCards = sortDeckCards(allCards);
        // Adaptive sequencing may reinsert a due retest card ahead of unseen cards.
        const queueEntries = await buildDeckSequenceQueue(
          db,
          deckId,
          orderedCards,
        );
        const remainingCards = queueEntries.map((entry) => entry.card);

        if (cancelled) {
          return;
        }

        allCardsRef.current = orderedCards;
        setTotalCards(orderedCards.length);

        if (orderedCards.length === 0) {
          setState('empty');
          return;
        }

        if (remainingCards.length === 0) {
          setState('complete');
          return;
        }

        const session = await createSwipeSession(db, deckId, {
          category: deckCategory,
        });
        sessionIdRef.current = session.id;

        if (cancelled) {
          void closeSessionIfNeeded();
          return;
        }

        setQueue(remainingCards);
        setCurrentDecision(queueEntries[0]?.decision ?? null);
        setState('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'A recoverable error occurred while starting this swipe session.',
        );
        setState('error');
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
      void closeSessionIfNeeded();
    };
  }, [closeSessionIfNeeded, deckCategory, deckId, refreshCount]);

  const onAction = useCallback<DeckActionHandler>(
    async (action) => {
      const db = dbRef.current;
      const sessionId = sessionIdRef.current;
      const currentCard = queue[0];

      if (!db || !sessionId || !currentCard || state !== 'ready') {
        return;
      }

      try {
        const event = await createSwipeEvent({
          sessionId,
          deckId,
          cardId: currentCard.id,
          action,
          strength: actionToDbStrength(action),
          createdAt: Date.now(),
        });
        await insertSwipeEvent(db, event);
        await recordDeckCardSwipe(db, {
          deckId,
          cardId: currentCard.id,
          swipedAt: event.createdAt,
        });
        try {
          await updateScoresFromSwipeEvent(db, event);
        } catch {
          // Profile score update is best-effort; do not block swipe flow
        }

        // Rebuild from live state so guardrails and retest eligibility stay current.
        const nextEntries = await buildDeckSequenceQueue(
          db,
          deckId,
          allCardsRef.current,
        );
        const nextQueue = nextEntries.map((entry) => entry.card);
        setQueue(nextQueue);
        setCurrentDecision(nextEntries[0]?.decision ?? null);

        if (nextQueue.length === 0) {
          setState('complete');
          void closeSessionIfNeeded();
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'A recoverable error occurred while saving this swipe.',
        );
        setState('error');
        void closeSessionIfNeeded();
      }
    },
    [closeSessionIfNeeded, deckId, queue, state],
  );

  const currentCard = useMemo(
    () => (state === 'ready' && queue.length > 0 ? queue[0] : null),
    [queue, state],
  );

  useEffect(() => {
    if (state !== 'ready' || !currentCard) {
      lastPresentedCardIdRef.current = null;
      return;
    }

    if (lastPresentedCardIdRef.current === (currentCard.id as string)) {
      return;
    }

    lastPresentedCardIdRef.current = currentCard.id as string;

    let cancelled = false;

    const persistPresentation = async () => {
      const db = dbRef.current;

      if (!db) {
        return;
      }

      try {
        await recordDeckCardPresentation(db, {
          deckId,
          cardId: currentCard.id,
          presentedAt: Date.now(),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'A recoverable error occurred while tracking this card view.',
        );
        setState('error');
        void closeSessionIfNeeded();
      }
    };

    void persistPresentation();

    return () => {
      cancelled = true;
    };
  }, [closeSessionIfNeeded, currentCard, deckId, state]);

  const endSession = useCallback(async () => {
    await closeSessionIfNeeded();
  }, [closeSessionIfNeeded]);

  return {
    state,
    currentCard,
    currentDecision,
    cardsRemaining: queue.length,
    totalCards,
    errorMessage,
    onAction,
    endSession,
    retry,
  };
}
