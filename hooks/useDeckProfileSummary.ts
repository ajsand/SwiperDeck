import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDb } from '@/lib/db';
import { computeDeckProfileSummary } from '@/lib/profile/deckProfileService';
import type { DeckId, DeckProfileSummary } from '@/types/domain';

export interface UseDeckProfileSummaryResult {
  summary: DeckProfileSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDeckProfileSummary(
  deckId: DeckId | null,
): UseDeckProfileSummaryResult {
  const requestedDeckKey = deckId ? (deckId as string) : null;
  const [summary, setSummary] = useState<DeckProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastDeckIdRef = useRef<DeckId | null>(null);
  const stateDeckKeyRef = useRef<string | null>(requestedDeckKey);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    stateDeckKeyRef.current = requestedDeckKey;

    if (!deckId) {
      if (!isMountedRef.current) {
        return;
      }

      lastDeckIdRef.current = null;
      setSummary(null);
      setLoading(false);
      setError(null);
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
      setSummary(null);
    }

    try {
      const db = await getDb();
      const result = await computeDeckProfileSummary(db, deckId);

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setSummary(result);
    } catch (err) {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load deck profile summary.',
      );
      setSummary(null);
    } finally {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setLoading(false);
    }
  }, [deckId, requestedDeckKey]);

  useFocusEffect(
    useCallback(() => {
      void fetchSummary();
    }, [fetchSummary]),
  );

  const isCurrentDeckState = stateDeckKeyRef.current === requestedDeckKey;

  return {
    summary: isCurrentDeckState ? summary : null,
    loading: isCurrentDeckState ? loading : requestedDeckKey !== null,
    error: isCurrentDeckState ? error : null,
    refetch: fetchSummary,
  };
}
