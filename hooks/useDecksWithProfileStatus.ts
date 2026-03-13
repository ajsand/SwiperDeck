import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { evaluateDeckCompareReadiness } from '@/lib/compare/deckCompareReadiness';
import { getAllDecks, getDb } from '@/lib/db';
import { computeDeckProfileSummary } from '@/lib/profile/deckProfileService';
import type {
  Deck,
  DeckCompareReadinessState,
  DeckProfileActionHint,
  DeckProfileStage,
  DeckProfileSummary,
} from '@/types/domain';

export interface DeckWithProfileStatus {
  deck: Deck;
  summary: DeckProfileSummary | null;
  swipeCount: number;
  stage: DeckProfileStage;
  compareReady: boolean;
  compareState: DeckCompareReadinessState;
  compareDetail: string;
  primaryHint: DeckProfileActionHint | null;
}

export interface UseDecksWithProfileStatusResult {
  decks: DeckWithProfileStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDecksWithProfileStatus(): UseDecksWithProfileStatusResult {
  const [decks, setDecks] = useState<DeckWithProfileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDb();
      const allDecks = await getAllDecks(db);

      const withStatus: DeckWithProfileStatus[] = await Promise.all(
        allDecks.map(async (deck) => {
          try {
            const summary = await computeDeckProfileSummary(db, deck.id);
            const readiness = evaluateDeckCompareReadiness({
              deck,
              summary,
            });

            return {
              deck,
              summary,
              swipeCount: summary?.confidence.swipeCount ?? 0,
              stage: summary?.stage ?? 'lightweight',
              compareReady: readiness.ready,
              compareState: readiness.state,
              compareDetail: readiness.detail,
              primaryHint: summary?.nextSteps[0] ?? null,
            };
          } catch (summaryError) {
            const fallbackDetail =
              summaryError instanceof Error &&
              summaryError.message.trim().length > 0
                ? `Profile data for this deck is temporarily unavailable. ${summaryError.message}`
                : 'Profile data for this deck is temporarily unavailable. Open the deck and retry after more local activity.';

            return {
              deck,
              summary: null,
              swipeCount: 0,
              stage: 'lightweight',
              compareReady: false,
              compareState: 'unavailable',
              compareDetail: fallbackDetail,
              primaryHint: {
                kind: 'keep_swiping',
                title: 'Profile unavailable',
                detail: fallbackDetail,
                priority: 0,
              },
            };
          }
        }),
      );

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setDecks(withStatus);
    } catch (err) {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setError(
        err instanceof Error ? err.message : 'Failed to load deck profiles.',
      );
      setDecks([]);
    } finally {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetch();
    }, [fetch]),
  );

  return {
    decks,
    loading,
    error,
    refresh: fetch,
  };
}
