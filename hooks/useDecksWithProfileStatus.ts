import { useCallback, useEffect, useState } from 'react';

import {
  getAllDecks,
  getDb,
  getSwipeEventCountByDeckId,
} from '@/lib/db';
import type { Deck, DeckProfileStage } from '@/types/domain';

export interface DeckWithProfileStatus {
  deck: Deck;
  swipeCount: number;
  stage: DeckProfileStage;
}

export interface UseDecksWithProfileStatusResult {
  decks: DeckWithProfileStatus[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function deriveStage(
  swipeCount: number,
  minProfile: number,
  minCompare: number,
): DeckProfileStage {
  if (swipeCount < minProfile) {
    return 'lightweight';
  }

  return 'meaningful';
}

export function useDecksWithProfileStatus(): UseDecksWithProfileStatusResult {
  const [decks, setDecks] = useState<DeckWithProfileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const db = await getDb();
      const allDecks = await getAllDecks(db);

      const withStatus: DeckWithProfileStatus[] = await Promise.all(
        allDecks.map(async (deck) => {
          const swipeCount = await getSwipeEventCountByDeckId(db, deck.id);

          return {
            deck,
            swipeCount,
            stage: deriveStage(
              swipeCount,
              deck.minCardsForProfile,
              deck.minCardsForCompare,
            ),
          };
        }),
      );

      setDecks(withStatus);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load deck profiles.',
      );
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    decks,
    loading,
    error,
    refresh: fetch,
  };
}
