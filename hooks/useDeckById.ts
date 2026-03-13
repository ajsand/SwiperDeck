import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb, getDeckById } from '@/lib/db';
import type { Deck, DeckId } from '@/types/domain';

export interface UseDeckByIdResult {
  deck: Deck | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useDeckById(deckId: DeckId | null): UseDeckByIdResult {
  const requestedDeckKey = deckId ? (deckId as string) : null;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastDeckIdRef = useRef<DeckId | null>(null);
  const stateDeckKeyRef = useRef<string | null>(requestedDeckKey);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDeck = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    stateDeckKeyRef.current = requestedDeckKey;

    if (!deckId) {
      if (!isMountedRef.current) {
        return;
      }

      lastDeckIdRef.current = null;
      setDeck(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    const deckChanged = lastDeckIdRef.current !== deckId;
    lastDeckIdRef.current = deckId;

    setLoading(true);
    setError(null);
    if (deckChanged) {
      setDeck(null);
    }

    try {
      const db = await getDb();
      const nextDeck = await getDeckById(db, deckId);

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setDeck(nextDeck);
    } catch (loadError) {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      const normalizedError =
        loadError instanceof Error ? loadError : new Error(String(loadError));
      setDeck(null);
      setError(normalizedError);
    } finally {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setLoading(false);
    }
  }, [deckId, requestedDeckKey]);

  useFocusEffect(
    useCallback(() => {
      void loadDeck();
    }, [loadDeck]),
  );

  const refresh = useCallback(() => {
    void loadDeck();
  }, [loadDeck]);

  const isCurrentDeckState = stateDeckKeyRef.current === requestedDeckKey;

  return {
    deck: isCurrentDeckState ? deck : null,
    loading: isCurrentDeckState ? loading : requestedDeckKey !== null,
    error: isCurrentDeckState ? error : null,
    refresh,
  };
}
