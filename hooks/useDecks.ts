import { useCallback, useEffect, useState } from 'react';

import { getAllDecks, getDb } from '@/lib/db';
import type { Deck } from '@/types/domain';

export interface UseDecksResult {
  decks: Deck[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useDecks(): UseDecksResult {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCount((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDecks = async () => {
      setLoading(true);
      setError(null);

      try {
        const db = await getDb();
        const nextDecks = await getAllDecks(db);

        if (cancelled) {
          return;
        }

        setDecks(nextDecks);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        const normalizedError =
          loadError instanceof Error ? loadError : new Error(String(loadError));
        setDecks([]);
        setError(normalizedError);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDecks();

    return () => {
      cancelled = true;
    };
  }, [refreshCount]);

  return {
    decks,
    loading,
    error,
    refresh,
  };
}
