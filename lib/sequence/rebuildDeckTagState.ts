import type { SQLiteDatabase } from 'expo-sqlite';

import { getDeckById } from '@/lib/db/deckRepository';
import {
  getDeckCardTagLinksByCardId,
  getDeckTagsByDeckId,
} from '@/lib/db/deckTagRepository';
import { replaceDeckTagStateForDeck } from '@/lib/db/deckTagStateRepository';
import { getSwipeEventsByDeckId } from '@/lib/db/swipeRepository';
import {
  type DeckCardId,
  type DeckId,
  type DeckTagId,
  type DeckTagState,
} from '@/types/domain';

type DeckTagStateDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

type MutableTagState = {
  state: DeckTagState;
  seenCards: Set<string>;
  exposureByCard: Map<string, number>;
};

function createEmptyDeckTagState(
  deckId: DeckId,
  tagId: DeckTagId,
): DeckTagState {
  return {
    deckId,
    tagId,
    exposureCount: 0,
    distinctCardsSeen: 0,
    positiveWeight: 0,
    negativeWeight: 0,
    skipCount: 0,
    netWeight: 0,
    uncertaintyScore: 1,
    firstSeenAt: null,
    lastSeenAt: null,
    lastPositiveAt: null,
    lastNegativeAt: null,
    lastRetestedAt: null,
    updatedAt: 0,
  };
}

export function calculateDeckTagUncertaintyScore(
  positiveWeight: number,
  negativeWeight: number,
  distinctCardsSeen: number,
): number {
  if (distinctCardsSeen <= 0) {
    return 1;
  }

  const totalSignal = positiveWeight + negativeWeight;
  const balance =
    totalSignal > 0
      ? 1 - Math.abs(positiveWeight - negativeWeight) / totalSignal
      : 0;
  const coverageConfidence = Math.min(1, distinctCardsSeen / 3);
  const uncertainty = 1 - coverageConfidence + balance * coverageConfidence;

  return Math.max(0, Math.min(1, uncertainty));
}

function finalizeDeckTagState(
  tracker: MutableTagState,
  updatedAt: number,
): DeckTagState {
  const { state } = tracker;
  const netWeight = state.positiveWeight - state.negativeWeight;

  return {
    ...state,
    netWeight,
    uncertaintyScore: calculateDeckTagUncertaintyScore(
      state.positiveWeight,
      state.negativeWeight,
      state.distinctCardsSeen,
    ),
    updatedAt,
  };
}

export async function rebuildDeckTagState(
  db: DeckTagStateDb,
  deckId: DeckId,
): Promise<DeckTagState[]> {
  const deck = await getDeckById(db, deckId);

  if (!deck || deck.isCustom) {
    await replaceDeckTagStateForDeck(db, deckId, []);
    return [];
  }

  const tags = await getDeckTagsByDeckId(db, deckId);

  if (tags.length === 0) {
    await replaceDeckTagStateForDeck(db, deckId, []);
    return [];
  }

  const trackers = new Map<string, MutableTagState>(
    tags.map((tag) => [
      tag.id as string,
      {
        state: createEmptyDeckTagState(deckId, tag.id),
        seenCards: new Set<string>(),
        exposureByCard: new Map<string, number>(),
      },
    ]),
  );
  const events = await getSwipeEventsByDeckId(db, deckId);
  const orderedEvents = [...events].sort((left, right) => {
    if (left.createdAt !== right.createdAt) {
      return left.createdAt - right.createdAt;
    }

    return String(left.id).localeCompare(String(right.id));
  });
  const linkCache = new Map<
    string,
    Awaited<ReturnType<typeof getDeckCardTagLinksByCardId>>
  >();

  for (const event of orderedEvents) {
    const cardId = event.cardId as string;
    let links = linkCache.get(cardId);

    if (!links) {
      const rawLinks = await getDeckCardTagLinksByCardId(
        db,
        event.cardId as DeckCardId,
      );
      links = rawLinks.filter((link) => trackers.has(link.tagId as string));
      linkCache.set(cardId, links);
    }

    if (links.length === 0) {
      continue;
    }

    for (const link of links) {
      const tracker = trackers.get(link.tagId as string);

      if (!tracker) {
        continue;
      }

      const nextExposureCount = tracker.state.exposureCount + 1;
      tracker.state.exposureCount = nextExposureCount;
      tracker.state.firstSeenAt ??= event.createdAt;
      tracker.state.lastSeenAt = event.createdAt;

      if (!tracker.seenCards.has(cardId)) {
        tracker.seenCards.add(cardId);
        tracker.state.distinctCardsSeen = tracker.seenCards.size;
      }

      const previousCardExposure = tracker.exposureByCard.get(cardId) ?? 0;
      tracker.exposureByCard.set(cardId, previousCardExposure + 1);
      if (previousCardExposure >= 1) {
        tracker.state.lastRetestedAt = event.createdAt;
      }

      if (event.strength > 0) {
        tracker.state.positiveWeight += event.strength;
        tracker.state.lastPositiveAt = event.createdAt;
      } else if (event.strength < 0) {
        tracker.state.negativeWeight += Math.abs(event.strength);
        tracker.state.lastNegativeAt = event.createdAt;
      } else {
        tracker.state.skipCount += 1;
      }
    }
  }

  const updatedAt = Date.now();
  const states = Array.from(trackers.values()).map((tracker) =>
    finalizeDeckTagState(tracker, updatedAt),
  );

  await replaceDeckTagStateForDeck(db, deckId, states);

  return states;
}
