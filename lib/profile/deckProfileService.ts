import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDeckCardById,
  getDeckById,
  getSwipeEventCountByDeckId,
  getSwipeEventsByDeckId,
  countDeckCardsByDeckId,
} from '@/lib/db';
import {
  getDeckTagScoresByDeckId,
  getDeckCardAffinitiesByDeckId,
  getDeckTagScoreByDeckAndTag,
  getDeckCardAffinityByDeckAndCard,
  getLatestDeckProfileSnapshot,
  insertDeckProfileSnapshot,
  upsertDeckTagScore,
  upsertDeckCardAffinity,
} from '@/lib/db/deckProfileRepository';
import {
  asSnapshotId,
  type DeckCardId,
  type DeckId,
  type DeckProfileConfidence,
  type DeckProfileStage,
  type DeckProfileSummary,
  type SwipeEvent,
  type TagScoreSummary,
} from '@/types/domain';

type DeckProfileDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

const AFFINITY_THRESHOLD = 1.0;
const TOP_N = 10;
const SNAPSHOT_STALE_MS = 24 * 60 * 60 * 1000;

function confidenceLabel(value: number): 'low' | 'medium' | 'high' {
  if (value >= 0.7) return 'high';
  if (value >= 0.35) return 'medium';
  return 'low';
}

export async function updateScoresFromSwipeEvent(
  db: DeckProfileDb,
  event: SwipeEvent,
): Promise<void> {
  const card = await getDeckCardById(db, event.cardId);

  if (!card || card.deckId !== event.deckId) {
    return;
  }

  const strength = event.strength;
  const now = Date.now();

  for (const tag of card.tags) {
    const existing = await getDeckTagScoreByDeckAndTag(db, event.deckId, tag);

    let pos = existing?.pos ?? 0;
    let neg = existing?.neg ?? 0;

    if (strength > 0) {
      pos += strength;
    } else if (strength < 0) {
      neg += Math.abs(strength);
    }

    const score = pos - neg;

    await upsertDeckTagScore(db, {
      deckId: event.deckId,
      tag,
      score,
      pos,
      neg,
      lastUpdated: now,
    });
  }

  const existingAffinity = await getDeckCardAffinityByDeckAndCard(
    db,
    event.deckId,
    event.cardId as string,
  );

  let pos = existingAffinity?.pos ?? 0;
  let neg = existingAffinity?.neg ?? 0;

  if (strength > 0) {
    pos += strength;
  } else if (strength < 0) {
    neg += Math.abs(strength);
  }

  const score = pos - neg;

  await upsertDeckCardAffinity(db, {
    deckId: event.deckId,
    cardId: event.cardId,
    score,
    pos,
    neg,
    lastUpdated: now,
  });
}

export async function recomputeDeckScoresFromEvents(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<void> {
  const events = await getSwipeEventsByDeckId(db, deckId);

  const tagScores = new Map<
    string,
    { pos: number; neg: number }
  >();
  const cardScores = new Map<
    string,
    { pos: number; neg: number }
  >();

  for (const event of events) {
    const card = await getDeckCardById(db, event.cardId);

    if (!card || card.deckId !== deckId) {
      continue;
    }

    const strength = event.strength;

    for (const tag of card.tags) {
      const current = tagScores.get(tag) ?? { pos: 0, neg: 0 };

      if (strength > 0) {
        current.pos += strength;
      } else if (strength < 0) {
        current.neg += Math.abs(strength);
      }

      tagScores.set(tag, current);
    }

    const cardKey = event.cardId as string;
    const cardCurrent = cardScores.get(cardKey) ?? { pos: 0, neg: 0 };

    if (strength > 0) {
      cardCurrent.pos += strength;
    } else if (strength < 0) {
      cardCurrent.neg += Math.abs(strength);
    }

    cardScores.set(cardKey, cardCurrent);
  }

  const now = Date.now();

  for (const [tag, { pos, neg }] of tagScores) {
    await upsertDeckTagScore(db, {
      deckId,
      tag,
      score: pos - neg,
      pos,
      neg,
      lastUpdated: now,
    });
  }

  for (const [cardId, { pos, neg }] of cardScores) {
    await upsertDeckCardAffinity(db, {
      deckId,
      cardId: cardId as DeckCardId,
      score: pos - neg,
      pos,
      neg,
      lastUpdated: now,
    });
  }
}

export async function computeDeckProfileSummary(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<DeckProfileSummary | null> {
  const deck = await getDeckById(db, deckId);

  if (!deck) {
    return null;
  }

  const swipeCount = await getSwipeEventCountByDeckId(db, deckId);
  const totalCards = await countDeckCardsByDeckId(db, deckId);
  const cardCoverage = totalCards > 0 ? swipeCount / totalCards : 0;

  let stage: DeckProfileStage = 'lightweight';

  if (swipeCount >= deck.minCardsForCompare) {
    stage = 'meaningful';
  } else if (swipeCount >= deck.minCardsForProfile) {
    stage = 'meaningful';
  }

  const confidenceValue = Math.min(
    1,
    swipeCount / Math.max(1, deck.minCardsForCompare),
  );
  const confidence: DeckProfileConfidence = {
    value: confidenceValue,
    label: confidenceLabel(confidenceValue),
    swipeCount,
    cardCoverage,
  };

  const tagScores = await getDeckTagScoresByDeckId(db, deckId);
  const cardAffinities = await getDeckCardAffinitiesByDeckId(db, deckId);

  const affinities: TagScoreSummary[] = tagScores
    .filter((t) => t.score > AFFINITY_THRESHOLD)
    .slice(0, TOP_N)
    .map((t) => ({ tag: t.tag, score: t.score }));

  const aversions: TagScoreSummary[] = tagScores
    .filter((t) => t.score < -AFFINITY_THRESHOLD)
    .slice(0, TOP_N)
    .map((t) => ({ tag: t.tag, score: t.score }));

  const unresolved: string[] = tagScores
    .filter((t) => Math.abs(t.score) < AFFINITY_THRESHOLD)
    .map((t) => t.tag)
    .slice(0, TOP_N);

  const topCardsLiked: DeckCardId[] = cardAffinities
    .filter((c) => c.score > AFFINITY_THRESHOLD)
    .slice(0, TOP_N)
    .map((c) => c.cardId);

  const topCardsDisliked: DeckCardId[] = cardAffinities
    .filter((c) => c.score < -AFFINITY_THRESHOLD)
    .slice(0, TOP_N)
    .map((c) => c.cardId);

  return {
    deckId,
    stage,
    confidence,
    affinities,
    aversions,
    unresolved,
    topCardsLiked,
    topCardsDisliked,
    generatedAt: Date.now(),
  };
}

export async function maybeCreateDeckProfileSnapshot(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<void> {
  const summary = await computeDeckProfileSummary(db, deckId);

  if (!summary || summary.stage === 'lightweight') {
    return;
  }

  const latest = await getLatestDeckProfileSnapshot(db, deckId);
  const now = Date.now();

  if (latest && now - latest.createdAt < SNAPSHOT_STALE_MS) {
    return;
  }

  const snapshot = {
    id: asSnapshotId(`snap_${deckId}_${now}`),
    deckId,
    createdAt: now,
    topTags: summary.affinities,
    topAversions: summary.aversions,
    summary: {
      stage: summary.stage,
      confidence: summary.confidence.value,
      swipeCount: summary.confidence.swipeCount,
      generatedAt: summary.generatedAt,
    },
  };

  await insertDeckProfileSnapshot(db, snapshot);
}
