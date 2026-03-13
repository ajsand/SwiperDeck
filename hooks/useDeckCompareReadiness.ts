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
  const payloadDeckKeyRef = useRef<string | null>(
    deckId ? (deckId as string) : null,
  );
  const requestedDeckKey = deckId ? (deckId as string) : null;
  const currentDeck = useMemo(() => {
    if (!deck || !deckId || deck.id === deckId) {
      return deck;
    }

    return null;
  }, [deck, deckId]);
  const currentSummary = useMemo(() => {
    if (!summary || !deckId || summary.deckId === deckId) {
      return summary;
    }

    return null;
  }, [deckId, summary]);
  const hasStaleRequestedState =
    Boolean(deckId) &&
    ((deck !== null && deck.id !== deckId) ||
      (summary !== null && summary.deckId !== deckId));
  const currentPayload = useMemo(() => {
    if (!payload || !deckId || payload.deck.deckId === deckId) {
      return payload;
    }

    return null;
  }, [deckId, payload]);
  const currentPayloadPreview = useMemo(() => {
    if (!payloadPreview || !deckId || payloadPreview.deckId === deckId) {
      return payloadPreview;
    }

    return null;
  }, [deckId, payloadPreview]);

  const readiness = useMemo(() => {
    if (!currentDeck) {
      return null;
    }

    return evaluateDeckCompareReadiness({
      deck: currentDeck,
      summary: currentSummary,
    });
  }, [currentDeck, currentSummary]);

  const consentDraft = useMemo(() => {
    if (!currentDeck || !currentSummary || !readiness || !readiness.ready) {
      return null;
    }

    return buildDeckCompareConsentDraft({
      deck: currentDeck,
      summary: currentSummary,
      readiness,
    });
  }, [currentDeck, currentSummary, readiness]);

  const startPayloadLoad = useCallback(() => {
    const requestId = activePayloadRequestRef.current + 1;
    activePayloadRequestRef.current = requestId;
    payloadDeckKeyRef.current = requestedDeckKey;

    if (!currentDeck || !currentSummary || !readiness?.ready) {
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
          deck: currentDeck,
          summary: currentSummary,
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
  }, [currentDeck, currentSummary, readiness, requestedDeckKey]);

  useEffect(() => startPayloadLoad(), [startPayloadLoad]);

  const currentPayloadError =
    payloadDeckKeyRef.current === requestedDeckKey ? payloadError : null;
  const currentPayloadLoading =
    payloadDeckKeyRef.current === requestedDeckKey ? payloadLoading : false;

  const refetch = useCallback(async () => {
    refreshDeck();
    await refetchSummary();
    startPayloadLoad();
  }, [refetchSummary, refreshDeck, startPayloadLoad]);

  return {
    deck: currentDeck,
    summary: currentSummary,
    readiness,
    consentDraft,
    payload: currentPayload,
    payloadPreview: currentPayloadPreview,
    payloadLoading: currentPayloadLoading && !hasStaleRequestedState,
    payloadError: currentPayloadError,
    loading: deckLoading || summaryLoading || hasStaleRequestedState,
    error: deckError?.message ?? summaryError,
    refetch,
  };
}
