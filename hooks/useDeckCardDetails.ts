import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getDb,
  getDeckById,
  getDeckCardById,
  getDeckCardTagLinksByCardId,
  getDeckTagsByIds,
} from '@/lib/db';
import type { Deck, DeckCard, DeckCardId } from '@/types/domain';

export interface UseDeckCardDetailsResult {
  card: DeckCard | null;
  deck: Deck | null;
  tagLabels: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDeckCardDetails(
  cardId: DeckCardId | null,
): UseDeckCardDetailsResult {
  const [card, setCard] = useState<DeckCard | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [tagLabels, setTagLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const lastCardIdRef = useRef<DeckCardId | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchCardDetails = useCallback(async () => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    if (!cardId) {
      if (!isMountedRef.current) {
        return;
      }

      lastCardIdRef.current = null;
      setCard(null);
      setDeck(null);
      setTagLabels([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (!isMountedRef.current) {
      return;
    }

    const cardChanged = lastCardIdRef.current !== cardId;
    lastCardIdRef.current = cardId;

    setLoading(true);
    setError(null);
    if (cardChanged) {
      setCard(null);
      setDeck(null);
      setTagLabels([]);
    }

    try {
      const db = await getDb();
      const nextCard = await getDeckCardById(db, cardId);

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      if (!nextCard) {
        setCard(null);
        setDeck(null);
        setTagLabels([]);
        return;
      }

      const [nextDeck, tagLinks] = await Promise.all([
        getDeckById(db, nextCard.deckId),
        getDeckCardTagLinksByCardId(db, nextCard.id),
      ]);
      const tags =
        tagLinks.length > 0
          ? await getDeckTagsByIds(
              db,
              tagLinks.map((link) => link.tagId),
            )
          : [];
      const tagLabelById = new Map(
        tags.map((tag) => [tag.id, tag.label] as const),
      );
      const nextTagLabels =
        tagLinks.length > 0
          ? tagLinks
              .map((link) => tagLabelById.get(link.tagId))
              .filter((value): value is string => Boolean(value))
          : nextCard.tags;

      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setCard(nextCard);
      setDeck(nextDeck);
      setTagLabels(nextTagLabels.length > 0 ? nextTagLabels : nextCard.tags);
    } catch (err) {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setError(
        err instanceof Error ? err.message : 'Failed to load card details.',
      );
      setCard(null);
      setDeck(null);
      setTagLabels([]);
    } finally {
      if (!isMountedRef.current || activeRequestRef.current !== requestId) {
        return;
      }

      setLoading(false);
    }
  }, [cardId]);

  useFocusEffect(
    useCallback(() => {
      void fetchCardDetails();
    }, [fetchCardDetails]),
  );

  return {
    card,
    deck,
    tagLabels,
    loading,
    error,
    refresh: fetchCardDetails,
  };
}
