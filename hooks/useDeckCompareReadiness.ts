import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildComparePayload } from '@/lib/compare/buildComparePayload';
import { buildComparePayloadPreview } from '@/lib/compare/comparePayloadPreview';
import {
  buildDeckCompareConsentDraft,
  evaluateDeckCompareReadiness,
} from '@/lib/compare/deckCompareReadiness';
import { getDb } from '@/lib/db';
import { useDeckById } from '@/hooks/useDeckById';
import { useDeckProfileSummary } from '@/hooks/useDeckProfileSummary';
import type {
  ComparePayloadPreview,
  ComparePayloadV1,
  DeckCompareConsentDraft,
  DeckCompareReadiness,
  DeckId,
  DeckProfileSummary,
} from '@/types/domain';

export interface UseDeckCompareReadinessResult {
  deck: ReturnType<typeof useDeckById>['deck'];
  summary: DeckProfileSummary | null;
  readiness: DeckCompareReadiness | null;
  consentDraft: DeckCompareConsentDraft | null;
  payload: ComparePayloadV1 | null;
  payloadPreview: ComparePayloadPreview | null;
  payloadLoading: boolean;
  payloadError: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDeckCompareReadiness(
  deckId: DeckId | null,
): UseDeckCompareReadinessResult {
  const {
    deck,
    loading: deckLoading,
    error: deckError,
    refresh: refreshDeck,
  } = useDeckById(deckId);
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useDeckProfileSummary(deckId);
  const [payload, setPayload] = useState<ComparePayloadV1 | null>(null);
  const [payloadPreview, setPayloadPreview] =
    useState<ComparePayloadPreview | null>(null);
  const [payloadLoading, setPayloadLoading] = useState(false);
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const activePayloadRequestRef = useRef(0);

  const readiness = useMemo(() => {
    if (!deck) {
      return null;
    }

    return evaluateDeckCompareReadiness({
      deck,
      summary,
    });
  }, [deck, summary]);

  const consentDraft = useMemo(() => {
    if (!deck || !summary || !readiness || !readiness.ready) {
      return null;
    }

    return buildDeckCompareConsentDraft({
      deck,
      summary,
      readiness,
    });
  }, [deck, readiness, summary]);

  useEffect(() => {
    const requestId = activePayloadRequestRef.current + 1;
    activePayloadRequestRef.current = requestId;

    if (!deck || !summary || !readiness?.ready) {
      setPayload(null);
      setPayloadPreview(null);
      setPayloadLoading(false);
      setPayloadError(null);
      return;
    }

    let cancelled = false;
    setPayload(null);
    setPayloadPreview(null);
    setPayloadLoading(true);
    setPayloadError(null);

    const loadPayload = async () => {
      try {
        const db = await getDb();
        const nextPayload = await buildComparePayload({
          db,
          deck,
          summary,
          readiness,
        });
        const nextPreview = buildComparePayloadPreview(nextPayload);

        if (cancelled || activePayloadRequestRef.current !== requestId) {
          return;
        }

        setPayload(nextPayload);
        setPayloadPreview(nextPreview);
      } catch (error) {
        if (cancelled || activePayloadRequestRef.current !== requestId) {
          return;
        }

        setPayload(null);
        setPayloadPreview(null);
        setPayloadError(
          error instanceof Error
            ? error.message
            : 'Failed to build compare payload preview.',
        );
      } finally {
        if (cancelled || activePayloadRequestRef.current !== requestId) {
          return;
        }

        setPayloadLoading(false);
      }
    };

    void loadPayload();

    return () => {
      cancelled = true;
    };
  }, [deck, readiness, summary]);

  const refetch = useCallback(async () => {
    refreshDeck();
    await refetchSummary();
  }, [refreshDeck, refetchSummary]);

  return {
    deck,
    summary,
    readiness,
    consentDraft,
    payload,
    payloadPreview,
    payloadLoading,
    payloadError,
    loading: deckLoading || summaryLoading,
    error: deckError?.message ?? summaryError,
    refetch,
  };
}
