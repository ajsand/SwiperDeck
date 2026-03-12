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
  const [summary, setSummary] = useState<DeckProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    if (!deckId) {
      if (!isMountedRef.current) {
        return;
      }

      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

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
  }, [deckId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}
