import type { SQLiteDatabase } from 'expo-sqlite';

import {
  countDeckCardsByDeckId,
  getDeckById,
  getDeckCardById,
  getDeckCardTagLinksByCardId,
  getDeckTagFacetsByDeckId,
  getDeckTagsByDeckId,
  getSwipedCardIdsByDeckId,
  getSwipeEventCountByDeckId,
  getSwipeEventsByDeckId,
} from '@/lib/db';
import { getDeckTagStateByDeckId } from '@/lib/db/deckTagStateRepository';
import {
  getDeckCardAffinitiesByDeckId,
  getDeckCardAffinityByDeckAndCard,
  getDeckTagScoreByDeckAndTagId,
  getDeckTagScoresByDeckId,
  getLatestDeckProfileSnapshot,
  insertDeckProfileSnapshot,
  upsertDeckCardAffinity,
  upsertDeckTagScore,
} from '@/lib/db/deckProfileRepository';
import { rebuildDeckTagState } from '@/lib/sequence/rebuildDeckTagState';
import {
  asSnapshotId,
  summarizeDeckTagCoverage,
  type DeckCardId,
  type DeckId,
  type DeckProfileStabilitySummary,
  type DeckProfileSummary,
  type DeckProfileThemeScore,
  type DeckProfileThemeStability,
  type DeckProfileUnresolvedArea,
  type DeckProfileUnresolvedReason,
  type DeckTagId,
  type SwipeEvent,
  type TagScoreSummary,
} from '@/types/domain';
import { computeDeckConfidence } from './computeDeckConfidence';

type DeckProfileDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

const AFFINITY_THRESHOLD = 1.0;
const TOP_N = 10;
const SNAPSHOT_STALE_MS = 24 * 60 * 60 * 1000;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toThemeStability(
  uncertaintyScore: number,
  exposureCount: number,
  lastRetestedAt: number | null,
): DeckProfileThemeStability {
  if (lastRetestedAt !== null && uncertaintyScore < 0.35) {
    return 'stable';
  }

  if (exposureCount >= 2 && uncertaintyScore < 0.5) {
    return 'steady';
  }

  return 'emerging';
}

function unresolvedReasonPriority(reason: DeckProfileUnresolvedReason): number {
  switch (reason) {
    case 'pending_retest':
      return 0;
    case 'mixed_signal':
      return 1;
    case 'low_coverage':
      return 2;
    case 'no_signal':
      return 3;
    default:
      return 4;
  }
}

function getUnresolvedReason(args: {
  exposureCount: number;
  distinctCardsSeen: number;
  positiveWeight: number;
  negativeWeight: number;
  uncertaintyScore: number;
  lastRetestedAt: number | null;
}): DeckProfileUnresolvedReason | null {
  if (args.exposureCount === 0) {
    return 'no_signal';
  }

  if (args.positiveWeight > 0 && args.negativeWeight > 0) {
    return 'mixed_signal';
  }

  if (args.uncertaintyScore >= 0.5 && args.lastRetestedAt === null) {
    return 'pending_retest';
  }

  if (args.exposureCount < 2 || args.distinctCardsSeen < 2) {
    return 'low_coverage';
  }

  if (args.uncertaintyScore >= 0.45) {
    return 'low_coverage';
  }

  return null;
}

function buildThemeScore(
  tagId: DeckTagId,
  score: number,
  exposureCount: number,
  uncertaintyScore: number,
  lastRetestedAt: number | null,
  tagLabelById: Map<DeckTagId, string>,
  facetLabelByTagId: Map<DeckTagId, string | null>,
): DeckProfileThemeScore {
  return {
    tagId,
    tag: tagLabelById.get(tagId) ?? (tagId as string),
    facet: facetLabelByTagId.get(tagId) ?? null,
    score,
    exposureCount,
    stability: toThemeStability(
      uncertaintyScore,
      exposureCount,
      lastRetestedAt,
    ),
  };
}

function toTagScoreSummary(score: DeckProfileThemeScore): TagScoreSummary {
  return {
    tag: score.tag,
    score: score.score,
  };
}

async function getCanonicalDeckTagState(
  db: DeckProfileDb,
  deckId: DeckId,
  isCustom: boolean,
) {
  if (isCustom) {
    return [];
  }

  const existing = await getDeckTagStateByDeckId(db, deckId);
  if (existing.length > 0) {
    return existing;
  }

  return rebuildDeckTagState(db, deckId);
}

export async function updateScoresFromSwipeEvent(
  db: DeckProfileDb,
  event: SwipeEvent,
): Promise<void> {
  const card = await getDeckCardById(db, event.cardId);
  const tagLinks = await getDeckCardTagLinksByCardId(db, event.cardId);

  if (!card || card.deckId !== event.deckId || tagLinks.length === 0) {
    return;
  }

  const strength = event.strength;
  const now = Date.now();

  for (const link of tagLinks) {
    const existing = await getDeckTagScoreByDeckAndTagId(
      db,
      event.deckId,
      link.tagId,
    );

    let pos = existing?.pos ?? 0;
    let neg = existing?.neg ?? 0;

    if (strength > 0) {
      pos += strength;
    } else if (strength < 0) {
      neg += Math.abs(strength);
    }

    await upsertDeckTagScore(db, {
      deckId: event.deckId,
      tagId: link.tagId,
      score: pos - neg,
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

  await upsertDeckCardAffinity(db, {
    deckId: event.deckId,
    cardId: event.cardId,
    score: pos - neg,
    pos,
    neg,
    lastUpdated: now,
  });

  await rebuildDeckTagState(db, event.deckId);
}

export async function recomputeDeckScoresFromEvents(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<void> {
  const events = await getSwipeEventsByDeckId(db, deckId);

  const tagScores = new Map<string, { pos: number; neg: number }>();
  const cardScores = new Map<string, { pos: number; neg: number }>();

  for (const event of events) {
    const card = await getDeckCardById(db, event.cardId);
    const tagLinks = await getDeckCardTagLinksByCardId(db, event.cardId);

    if (!card || card.deckId !== deckId || tagLinks.length === 0) {
      continue;
    }

    const strength = event.strength;

    for (const link of tagLinks) {
      const tagKey = link.tagId as string;
      const current = tagScores.get(tagKey) ?? { pos: 0, neg: 0 };

      if (strength > 0) {
        current.pos += strength;
      } else if (strength < 0) {
        current.neg += Math.abs(strength);
      }

      tagScores.set(tagKey, current);
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

  await db.runAsync(
    `
      DELETE FROM deck_tag_scores
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  await db.runAsync(
    `
      DELETE FROM deck_card_affinity
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  for (const [tagId, { pos, neg }] of tagScores) {
    await upsertDeckTagScore(db, {
      deckId,
      tagId: tagId as DeckTagId,
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

  await rebuildDeckTagState(db, deckId);
}

export async function computeDeckProfileSummary(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<DeckProfileSummary | null> {
  const deck = await getDeckById(db, deckId);

  if (!deck) {
    return null;
  }

  const [
    swipeCount,
    totalCards,
    seenCardIds,
    tagStates,
    tagScores,
    cardAffinities,
    tagMetadata,
    facetMetadata,
  ] = await Promise.all([
    getSwipeEventCountByDeckId(db, deckId),
    countDeckCardsByDeckId(db, deckId),
    getSwipedCardIdsByDeckId(db, deckId),
    getCanonicalDeckTagState(db, deckId, deck.isCustom),
    getDeckTagScoresByDeckId(db, deckId),
    getDeckCardAffinitiesByDeckId(db, deckId),
    getDeckTagsByDeckId(db, deckId),
    getDeckTagFacetsByDeckId(db, deckId),
  ]);

  const cardsSeen = seenCardIds.size;
  const cardCoverage = totalCards > 0 ? cardsSeen / totalCards : 0;

  const tagLabelById = new Map(
    tagMetadata.map((tag) => [tag.id, tag.label] as const),
  );
  const tagById = new Map(tagMetadata.map((tag) => [tag.id, tag] as const));
  const facetLabelById = new Map(
    facetMetadata.map((facet) => [facet.id, facet.label] as const),
  );
  const facetLabelByTagId = new Map<DeckTagId, string | null>(
    tagMetadata.map((tag) => [tag.id, facetLabelById.get(tag.facetId) ?? null]),
  );
  const tagScoreById = new Map(
    tagScores.map((tagScore) => [tagScore.tagId, tagScore] as const),
  );

  const tagCoverage = summarizeDeckTagCoverage(deckId, tagStates);
  const seenFacetIds = new Set(
    tagStates
      .filter((state) => state.exposureCount > 0)
      .map((state) => tagById.get(state.tagId)?.facetId ?? null)
      .filter(
        (facetId): facetId is NonNullable<typeof facetId> => facetId !== null,
      ),
  );
  const totalFacetCount = facetMetadata.length;
  const seenFacetCount = seenFacetIds.size;
  const facetCoverageRatio =
    totalFacetCount > 0 ? seenFacetCount / totalFacetCount : 0;

  const coverage = {
    deckId,
    cardsSeen,
    totalCards,
    cardCoverage,
    tags: tagCoverage,
    facets: {
      totalFacetCount,
      seenFacetCount,
      unseenFacetCount: Math.max(0, totalFacetCount - seenFacetCount),
      coverageRatio: facetCoverageRatio,
    },
  };

  const seenTagStates = tagStates.filter((state) => state.exposureCount > 0);
  let stableTagCount = 0;
  let steadyTagCount = 0;
  let emergingTagCount = 0;
  let mixedSignalTagCount = 0;
  let retestedTagCount = 0;
  let retestPendingCount = 0;

  for (const state of seenTagStates) {
    const stability = toThemeStability(
      state.uncertaintyScore,
      state.exposureCount,
      state.lastRetestedAt,
    );

    if (stability === 'stable') {
      stableTagCount += 1;
    } else if (stability === 'steady') {
      steadyTagCount += 1;
    } else {
      emergingTagCount += 1;
    }

    if (state.positiveWeight > 0 && state.negativeWeight > 0) {
      mixedSignalTagCount += 1;
    }

    if (state.lastRetestedAt !== null) {
      retestedTagCount += 1;
    }

    if (
      getUnresolvedReason({
        exposureCount: state.exposureCount,
        distinctCardsSeen: state.distinctCardsSeen,
        positiveWeight: state.positiveWeight,
        negativeWeight: state.negativeWeight,
        uncertaintyScore: state.uncertaintyScore,
        lastRetestedAt: state.lastRetestedAt,
      }) === 'pending_retest'
    ) {
      retestPendingCount += 1;
    }
  }

  const stabilityBase =
    seenTagStates.length > 0
      ? (stableTagCount + steadyTagCount * 0.7 + emergingTagCount * 0.35) /
        seenTagStates.length
      : 0;
  const stabilityScore = clamp01(
    stabilityBase -
      (seenTagStates.length > 0
        ? mixedSignalTagCount / seenTagStates.length
        : 0) *
        0.2 -
      (seenTagStates.length > 0
        ? retestPendingCount / seenTagStates.length
        : 0) *
        0.15,
  );
  const stability: DeckProfileStabilitySummary = {
    stabilityScore,
    stableTagCount,
    emergingTagCount,
    mixedSignalTagCount,
    retestedTagCount,
    retestPendingCount,
  };

  const ambiguityRatio =
    tagCoverage.totalTagCount > 0
      ? tagCoverage.uncertainTagCount / tagCoverage.totalTagCount
      : 1;
  const { confidence, stage, readiness, nextSteps } = computeDeckConfidence({
    swipeCount,
    minCardsForProfile: deck.minCardsForProfile,
    minCardsForCompare: deck.minCardsForCompare,
    cardCoverage,
    tagCoverage: tagCoverage.coverageRatio,
    facetCoverage: facetCoverageRatio,
    ambiguityRatio,
    stabilityScore,
    retestPendingCount,
  });

  const affinities: DeckProfileThemeScore[] = tagScores
    .filter((tagScore) => tagScore.score > AFFINITY_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, TOP_N)
    .map((tagScore) => {
      const tagState = tagStates.find(
        (state) => state.tagId === tagScore.tagId,
      );
      return buildThemeScore(
        tagScore.tagId,
        tagScore.score,
        tagState?.exposureCount ?? 0,
        tagState?.uncertaintyScore ?? 1,
        tagState?.lastRetestedAt ?? null,
        tagLabelById,
        facetLabelByTagId,
      );
    });

  const aversions: DeckProfileThemeScore[] = tagScores
    .filter((tagScore) => tagScore.score < -AFFINITY_THRESHOLD)
    .sort((left, right) => left.score - right.score)
    .slice(0, TOP_N)
    .map((tagScore) => {
      const tagState = tagStates.find(
        (state) => state.tagId === tagScore.tagId,
      );
      return buildThemeScore(
        tagScore.tagId,
        tagScore.score,
        tagState?.exposureCount ?? 0,
        tagState?.uncertaintyScore ?? 1,
        tagState?.lastRetestedAt ?? null,
        tagLabelById,
        facetLabelByTagId,
      );
    });

  const unresolved: DeckProfileUnresolvedArea[] = tagStates
    .map((state) => {
      const reason = getUnresolvedReason({
        exposureCount: state.exposureCount,
        distinctCardsSeen: state.distinctCardsSeen,
        positiveWeight: state.positiveWeight,
        negativeWeight: state.negativeWeight,
        uncertaintyScore: state.uncertaintyScore,
        lastRetestedAt: state.lastRetestedAt,
      });

      if (!reason) {
        return null;
      }

      const tag = tagById.get(state.tagId);

      return {
        tagId: state.tagId,
        tag: tag?.label ?? (state.tagId as string),
        facet: tag ? (facetLabelById.get(tag.facetId) ?? null) : null,
        reason,
        uncertainty: state.uncertaintyScore,
        exposureCount: state.exposureCount,
      };
    })
    .filter((area): area is DeckProfileUnresolvedArea => area !== null)
    .sort((left, right) => {
      const reasonDiff =
        unresolvedReasonPriority(left.reason) -
        unresolvedReasonPriority(right.reason);

      if (reasonDiff !== 0) {
        return reasonDiff;
      }

      if (left.uncertainty !== right.uncertainty) {
        return right.uncertainty - left.uncertainty;
      }

      if (left.exposureCount !== right.exposureCount) {
        return left.exposureCount - right.exposureCount;
      }

      return left.tag.localeCompare(right.tag);
    })
    .slice(0, TOP_N);

  const topCardsLiked: DeckCardId[] = [...cardAffinities]
    .filter((cardAffinity) => cardAffinity.score > AFFINITY_THRESHOLD)
    .sort((left, right) => right.score - left.score)
    .slice(0, TOP_N)
    .map((cardAffinity) => cardAffinity.cardId);

  const topCardsDisliked: DeckCardId[] = [...cardAffinities]
    .filter((cardAffinity) => cardAffinity.score < -AFFINITY_THRESHOLD)
    .sort((left, right) => left.score - right.score)
    .slice(0, TOP_N)
    .map((cardAffinity) => cardAffinity.cardId);

  return {
    deckId,
    stage,
    confidence,
    coverage,
    stability,
    affinities,
    aversions,
    unresolved,
    nextSteps,
    readiness,
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
    topTags: summary.affinities.map(toTagScoreSummary),
    topAversions: summary.aversions.map(toTagScoreSummary),
    summary: {
      stage: summary.stage,
      confidence: summary.confidence.value,
      confidenceLabel: summary.confidence.label,
      swipeCount: summary.confidence.swipeCount,
      coverage: {
        cardsSeen: summary.coverage.cardsSeen,
        totalCards: summary.coverage.totalCards,
        cardCoverage: summary.coverage.cardCoverage,
        tagCoverage: summary.coverage.tags.coverageRatio,
        facetCoverage: summary.coverage.facets.coverageRatio,
      },
      stability: summary.stability,
      readiness: summary.readiness,
      unresolved: summary.unresolved.slice(0, 5).map((area) => ({
        tag: area.tag,
        reason: area.reason,
        uncertainty: area.uncertainty,
      })),
      nextSteps: summary.nextSteps.slice(0, 3).map((hint) => ({
        kind: hint.kind,
        title: hint.title,
      })),
      generatedAt: summary.generatedAt,
    },
  };

  await insertDeckProfileSnapshot(db, snapshot);
}
