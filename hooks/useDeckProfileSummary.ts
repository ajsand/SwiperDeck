import { useCallback, useEffect, useState } from 'react';

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

  const fetchSummary = useCallback(async () => {
    if (!deckId) {
      setSummary(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = await getDb();
      const result = await computeDeckProfileSummary(db, deckId);
      setSummary(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load deck profile summary.',
      );
      setSummary(null);
    } finally {
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
