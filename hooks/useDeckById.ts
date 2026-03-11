import { useCallback, useEffect, useState } from 'react';

import { getDb, getDeckById } from '@/lib/db';
import type { Deck, DeckId } from '@/types/domain';

export interface UseDeckByIdResult {
  deck: Deck | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useDeckById(deckId: DeckId | null): UseDeckByIdResult {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(Boolean(deckId));
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCount((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!deckId) {
      setDeck(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDeck = async () => {
      setLoading(true);
      setError(null);

      try {
        const db = await getDb();
        const nextDeck = await getDeckById(db, deckId);

        if (cancelled) {
          return;
        }

        setDeck(nextDeck);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const normalizedError =
          loadError instanceof Error ? loadError : new Error(String(loadError));
        setDeck(null);
        setError(normalizedError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDeck();

    return () => {
      cancelled = true;
    };
  }, [deckId, refreshCount]);

  return {
    deck,
    loading,
    error,
    refresh,
  };
}
