import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDecks = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDb();
      const nextDecks = await getAllDecks(db);

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setDecks(nextDecks);
    } catch (loadError) {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      const normalizedError =
        loadError instanceof Error ? loadError : new Error(String(loadError));
      setDecks([]);
      setError(normalizedError);
    } finally {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDecks();
    }, [loadDecks]),
  );

  const refresh = useCallback(() => {
    void loadDecks();
  }, [loadDecks]);

  return {
    decks,
    loading,
    error,
    refresh,
  };
}
