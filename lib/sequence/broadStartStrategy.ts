import type { SQLiteDatabase } from 'expo-sqlite';

import { getDeckById } from '@/lib/db/deckRepository';
import {
  getDeckCardAffinitiesByDeckId,
  getDeckTagScoresByDeckId,
} from '@/lib/db/deckProfileRepository';
import { getDeckCardStatesByDeckId } from '@/lib/db/deckCardStateRepository';
import {
  getDeckCardTagLinksByCardId,
  getDeckTagFacetsByDeckId,
  getDeckTagsByDeckId,
} from '@/lib/db/deckTagRepository';
import { getDeckTagStateByDeckId } from '@/lib/db/deckTagStateRepository';
import {
  getSwipeEventsByDeckId,
  getSwipedCardIdsByDeckId,
} from '@/lib/db/swipeRepository';
import { rebuildDeckTagState } from '@/lib/sequence/rebuildDeckTagState';
import {
  type Deck,
  type DeckCard,
  type DeckCardAffinity,
  type DeckCardId,
  type DeckCardState,
  type DeckCardTagLink,
  type DeckId,
  type DeckTag,
  type DeckTagFacet,
  type DeckTagFacetId,
  type DeckTagId,
  type DeckTagScore,
  type DeckTagState,
  type SwipeEvent,
} from '@/types/domain';

import type {
  DeckSequenceDecision,
  DeckSequenceQueueEntry,
  DeckSequenceReason,
  DeckSequenceStage,
} from './deckSequenceTypes';
import { buildAdaptiveSequenceQueueEntries } from './tagAwareScoring';

type DeckSequenceDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export interface BroadStartSequenceContext {
  deck: Deck;
  allCards: DeckCard[];
  seenCardIds: Set<DeckCardId>;
  cardStates?: DeckCardState[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  cardAffinities: DeckCardAffinity[];
  tags: DeckTag[];
  facets: DeckTagFacet[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  recentSwipeEvents: SwipeEvent[];
}

interface SequenceCandidate {
  card: DeckCard;
  primaryTagId: DeckTagId | null;
  facetId: DeckTagFacetId | null;
}

interface RollingHistory {
  recentPrimaryTagIds: string[];
  recentFacetIds: string[];
}

const BROAD_START_MIN_WINDOW = 8;
const BROAD_START_CARD_RATIO = 0.2;
const BROAD_START_TAG_COVERAGE_THRESHOLD = 0.6;
const RECENT_REPEAT_WINDOW = 3;
const PLANNED_REPEAT_WINDOW = 2;
const PRESENTATION_SUPPRESSION_WINDOW_MS = 30 * 60 * 1000;
const MAX_PRESENTATION_RECENCY_PENALTY = 24;

export function calculateBroadStartWindow(cardCount: number): number {
  return Math.max(
    BROAD_START_MIN_WINDOW,
    Math.ceil(cardCount * BROAD_START_CARD_RATIO),
  );
}

export function sortCardsByFallback(cards: DeckCard[]): DeckCard[] {
  return [...cards].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.popularity !== right.popularity) {
      return right.popularity - left.popularity;
    }

    return String(left.id).localeCompare(String(right.id));
  });
}

function getPrimaryTagId(links: DeckCardTagLink[]): DeckTagId | null {
  const primary = links.find((link) => link.role === 'primary');
  return primary?.tagId ?? links[0]?.tagId ?? null;
}

function buildRollingHistory(
  recentSwipeEvents: SwipeEvent[],
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>,
  tagsById: Map<string, DeckTag>,
): RollingHistory {
  const recentPrimaryTagIds: string[] = [];
  const recentFacetIds: string[] = [];

  for (const event of recentSwipeEvents.slice(0, RECENT_REPEAT_WINDOW)) {
    const links = cardTagLinksByCardId.get(event.cardId as string) ?? [];
    const primaryTagId = getPrimaryTagId(links);

    if (!primaryTagId) {
      continue;
    }

    recentPrimaryTagIds.push(primaryTagId as string);

    const tag = tagsById.get(primaryTagId as string);
    if (tag) {
      recentFacetIds.push(tag.facetId as string);
    }
  }

  return {
    recentPrimaryTagIds,
    recentFacetIds,
  };
}

function determineBroadStartSlots(
  cardCount: number,
  seenCardCount: number,
): number {
  const window = Math.min(cardCount, calculateBroadStartWindow(cardCount));

  if (seenCardCount < window) {
    return Math.max(1, window - seenCardCount);
  }

  return 1;
}

function countTagCoverage(tagStates: DeckTagState[]): number {
  if (tagStates.length === 0) {
    return 1;
  }

  const seenTagCount = tagStates.filter(
    (state) => state.exposureCount > 0,
  ).length;
  return seenTagCount / tagStates.length;
}

export function determineDeckSequenceStage(
  context: BroadStartSequenceContext,
): DeckSequenceStage {
  if (context.deck.isCustom) {
    return 'adaptive';
  }

  const seenCardCount = context.seenCardIds.size;
  const broadStartWindow = Math.min(
    context.allCards.length,
    calculateBroadStartWindow(context.allCards.length),
  );
  const tagCoverageRatio = countTagCoverage(context.tagStates);

  if (
    seenCardCount < broadStartWindow ||
    tagCoverageRatio < BROAD_START_TAG_COVERAGE_THRESHOLD
  ) {
    return 'broad_start';
  }

  return 'adaptive';
}

function createFallbackDecision(card: DeckCard): DeckSequenceDecision {
  const reasons: DeckSequenceReason[] = [
    {
      code: 'fallback_order',
      scoreDelta: 0,
      detail: 'fallback_order',
    },
    {
      code: 'representative_pick',
      scoreDelta: 0,
      detail: 'representative_editorial_order',
    },
  ];

  return {
    cardId: card.id,
    stage: 'adaptive',
    score: 0,
    primaryReason: 'fallback_order',
    reasons,
  };
}

function buildCandidates(
  remainingCards: DeckCard[],
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>,
  tagsById: Map<string, DeckTag>,
): SequenceCandidate[] {
  return remainingCards.map((card) => {
    const links = cardTagLinksByCardId.get(card.id as string) ?? [];
    const primaryTagId = getPrimaryTagId(links);
    const facetId = primaryTagId
      ? (tagsById.get(primaryTagId as string)?.facetId ?? null)
      : null;

    return {
      card,
      primaryTagId,
      facetId,
    };
  });
}

function buildFacetExposureById(
  tagStates: DeckTagState[],
  tagsById: Map<string, DeckTag>,
): Map<string, number> {
  const exposures = new Map<string, number>();

  for (const state of tagStates) {
    const tag = tagsById.get(state.tagId as string);
    if (!tag) {
      continue;
    }

    const facetId = tag.facetId as string;
    exposures.set(facetId, (exposures.get(facetId) ?? 0) + state.exposureCount);
  }

  return exposures;
}

function buildTagStateById(
  tagStates: DeckTagState[],
): Map<string, DeckTagState> {
  return new Map(
    tagStates.map((state) => [state.tagId as string, state] as const),
  );
}

function buildCardStateById(
  cardStates: DeckCardState[] | undefined,
): Map<string, DeckCardState> {
  return new Map(
    (cardStates ?? []).map((state) => [state.cardId as string, state] as const),
  );
}

function clampPositive(value: number): number {
  return Math.max(0, value);
}

function calculateEditorialPriority(
  card: DeckCard,
  maxSortOrder: number,
): number {
  const sortOrderScore =
    maxSortOrder >= 0 ? (1 - card.sortOrder / (maxSortOrder + 1)) * 6 : 6;

  return card.popularity * 8 + sortOrderScore;
}

function calculatePresentationRecencyPenalty(args: {
  cardId: DeckCardId;
  cardStateById: Map<string, DeckCardState>;
  now: number;
}): number {
  const cardState = args.cardStateById.get(args.cardId as string);

  if (!cardState?.lastPresentedAt) {
    return 0;
  }

  const lastInteractionAt = Math.max(
    cardState.lastPresentedAt,
    cardState.lastSwipedAt ?? 0,
  );
  const ageMs = Math.max(0, args.now - lastInteractionAt);

  if (ageMs >= PRESENTATION_SUPPRESSION_WINDOW_MS) {
    return 0;
  }

  const remainingRatio =
    (PRESENTATION_SUPPRESSION_WINDOW_MS - ageMs) /
    PRESENTATION_SUPPRESSION_WINDOW_MS;
  const penaltyBase =
    cardState.lastSwipedAt &&
    cardState.lastSwipedAt >= cardState.lastPresentedAt
      ? MAX_PRESENTATION_RECENCY_PENALTY
      : MAX_PRESENTATION_RECENCY_PENALTY * 0.65;

  return penaltyBase * remainingRatio;
}

function buildDecisionForCandidate(args: {
  candidate: SequenceCandidate;
  tagsById: Map<string, DeckTag>;
  facetExposureById: Map<string, number>;
  tagStateById: Map<string, DeckTagState>;
  cardStateById: Map<string, DeckCardState>;
  recentHistory: RollingHistory;
  plannedPrimaryTagIds: string[];
  plannedFacetIds: string[];
  maxSortOrder: number;
  now: number;
}): DeckSequenceDecision {
  const {
    candidate,
    tagsById,
    facetExposureById,
    tagStateById,
    cardStateById,
    recentHistory,
    plannedPrimaryTagIds,
    plannedFacetIds,
    maxSortOrder,
    now,
  } = args;

  const reasons: DeckSequenceReason[] = [];
  let score = 0;

  const representativeBonus = calculateEditorialPriority(
    candidate.card,
    maxSortOrder,
  );
  score += representativeBonus;
  reasons.push({
    code: 'representative_pick',
    scoreDelta: representativeBonus,
    detail: 'representative_pick',
  });

  if (candidate.facetId) {
    const plannedFacetCount = plannedFacetIds.filter(
      (facetId) => facetId === (candidate.facetId as string),
    ).length;
    const facetExposure =
      (facetExposureById.get(candidate.facetId as string) ?? 0) +
      plannedFacetCount;
    const facetBonus = 40 / (1 + facetExposure);
    score += facetBonus;
    reasons.push({
      code: 'undercovered_facet',
      scoreDelta: facetBonus,
      detail: `undercovered_facet_${String(candidate.facetId)
        .split(':')
        .pop()}`,
    });
  }

  if (candidate.primaryTagId) {
    const plannedPrimaryTagCount = plannedPrimaryTagIds.filter(
      (tagId) => tagId === (candidate.primaryTagId as string),
    ).length;
    const tagState = tagStateById.get(candidate.primaryTagId as string);
    const tagExposure = (tagState?.exposureCount ?? 0) + plannedPrimaryTagCount;
    const tagBonus = 28 / (1 + tagExposure);
    score += tagBonus;
    reasons.push({
      code: 'undercovered_tag',
      scoreDelta: tagBonus,
      detail: `undercovered_tag_${
        tagsById.get(candidate.primaryTagId as string)?.slug ??
        candidate.primaryTagId
      }`,
    });
  }

  const recentPrimaryTagRepeatCount = candidate.primaryTagId
    ? recentHistory.recentPrimaryTagIds.filter(
        (tagId) => tagId === (candidate.primaryTagId as string),
      ).length
    : 0;
  const recentFacetRepeatCount = candidate.facetId
    ? recentHistory.recentFacetIds.filter(
        (facetId) => facetId === (candidate.facetId as string),
      ).length
    : 0;
  const plannedPrimaryRepeatCount = candidate.primaryTagId
    ? plannedPrimaryTagIds
        .slice(-PLANNED_REPEAT_WINDOW)
        .filter((tagId) => tagId === (candidate.primaryTagId as string)).length
    : 0;
  const plannedFacetRepeatCount = candidate.facetId
    ? plannedFacetIds
        .slice(-PLANNED_REPEAT_WINDOW)
        .filter((facetId) => facetId === (candidate.facetId as string)).length
    : 0;
  const repeatPenalty = clampPositive(
    recentPrimaryTagRepeatCount * 18 +
      recentFacetRepeatCount * 10 +
      plannedPrimaryRepeatCount * 12 +
      plannedFacetRepeatCount * 6,
  );

  if (repeatPenalty > 0) {
    score -= repeatPenalty;
    reasons.push({
      code: 'repeat_penalty_applied',
      scoreDelta: -repeatPenalty,
      detail: 'repeat_penalty_applied',
    });
  }

  const presentationRecencyPenalty = calculatePresentationRecencyPenalty({
    cardId: candidate.card.id,
    cardStateById,
    now,
  });

  if (presentationRecencyPenalty > 0) {
    score -= presentationRecencyPenalty;
    reasons.push({
      code: 'presentation_recency_penalty_applied',
      scoreDelta: -presentationRecencyPenalty,
      detail: 'presentation_recency_penalty_applied',
    });
  }

  return {
    cardId: candidate.card.id,
    stage: 'broad_start',
    score,
    primaryReason: 'clarify_low_coverage_tag',
    reasons,
  };
}

function compareDecisions(
  left: DeckSequenceQueueEntry,
  right: DeckSequenceQueueEntry,
): number {
  if (left.decision.score !== right.decision.score) {
    return right.decision.score - left.decision.score;
  }

  if (left.card.sortOrder !== right.card.sortOrder) {
    return left.card.sortOrder - right.card.sortOrder;
  }

  return String(left.card.id).localeCompare(String(right.card.id));
}

export function buildDeckSequenceQueueEntries(
  context: BroadStartSequenceContext,
): DeckSequenceQueueEntry[] {
  const remainingCards = sortCardsByFallback(
    context.allCards.filter((card) => !context.seenCardIds.has(card.id)),
  );

  if (remainingCards.length === 0) {
    return [];
  }

  const stage = determineDeckSequenceStage(context);

  if (stage === 'adaptive') {
    if (context.deck.isCustom) {
      return remainingCards.map((card) => ({
        card,
        decision: createFallbackDecision(card),
      }));
    }

    return buildAdaptiveSequenceQueueEntries({
      deck: context.deck,
      allCards: context.allCards,
      remainingCards,
      seenCardIds: context.seenCardIds,
      cardStates: context.cardStates,
      tags: context.tags,
      tagStates: context.tagStates,
      tagScores: context.tagScores,
      cardAffinities: context.cardAffinities,
      cardTagLinksByCardId: context.cardTagLinksByCardId,
      recentSwipeEvents: context.recentSwipeEvents,
    });
  }

  const tagsById = new Map(
    context.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const facetExposureById = buildFacetExposureById(context.tagStates, tagsById);
  const tagStateById = buildTagStateById(context.tagStates);
  const cardStateById = buildCardStateById(context.cardStates);
  const recentHistory = buildRollingHistory(
    context.recentSwipeEvents,
    context.cardTagLinksByCardId,
    tagsById,
  );
  const candidates = buildCandidates(
    remainingCards,
    context.cardTagLinksByCardId,
    tagsById,
  );
  const maxSortOrder = remainingCards.reduce(
    (maxValue, card) => Math.max(maxValue, card.sortOrder),
    0,
  );
  const plannedPrimaryTagIds: string[] = [];
  const plannedFacetIds: string[] = [];
  const selectedEntries: DeckSequenceQueueEntry[] = [];
  const remainingCandidates = [...candidates];
  const now = Date.now();
  const broadStartSlots = Math.min(
    remainingCards.length,
    determineBroadStartSlots(context.allCards.length, context.seenCardIds.size),
  );

  while (
    selectedEntries.length < broadStartSlots &&
    remainingCandidates.length > 0
  ) {
    const rankedEntries = remainingCandidates
      .map((candidate) => ({
        card: candidate.card,
        decision: buildDecisionForCandidate({
          candidate,
          tagsById,
          facetExposureById,
          tagStateById,
          cardStateById,
          recentHistory,
          plannedPrimaryTagIds,
          plannedFacetIds,
          maxSortOrder,
          now,
        }),
      }))
      .sort(compareDecisions);

    const selected = rankedEntries[0];
    selectedEntries.push(selected);

    const selectedCandidateIndex = remainingCandidates.findIndex(
      (candidate) => candidate.card.id === selected.card.id,
    );
    const selectedCandidate = remainingCandidates[selectedCandidateIndex];

    if (selectedCandidate) {
      if (selectedCandidate.primaryTagId) {
        plannedPrimaryTagIds.push(selectedCandidate.primaryTagId as string);
      }

      if (selectedCandidate.facetId) {
        plannedFacetIds.push(selectedCandidate.facetId as string);
      }

      remainingCandidates.splice(selectedCandidateIndex, 1);
    }
  }

  const selectedCardIds = new Set(
    selectedEntries.map((entry) => entry.card.id as string),
  );
  const fallbackEntries = remainingCards
    .filter((card) => !selectedCardIds.has(card.id as string))
    .map((card) => ({
      card,
      decision: createFallbackDecision(card),
    }));

  return [...selectedEntries, ...fallbackEntries];
}

async function getCanonicalTagState(
  db: DeckSequenceDb,
  deck: Deck,
): Promise<DeckTagState[]> {
  if (deck.isCustom) {
    return [];
  }

  const existing = await getDeckTagStateByDeckId(db, deck.id);

  if (existing.length > 0) {
    return existing;
  }

  return rebuildDeckTagState(db, deck.id);
}

export async function buildDeckSequenceQueue(
  db: DeckSequenceDb,
  deckId: DeckId,
  allCards: DeckCard[],
): Promise<DeckSequenceQueueEntry[]> {
  const deck = await getDeckById(db, deckId);

  if (!deck || allCards.length === 0) {
    return [];
  }

  const [
    seenCardIds,
    tags,
    facets,
    recentSwipeEvents,
    cardStates,
    tagStates,
    tagScores,
    cardAffinities,
  ] = await Promise.all([
    getSwipedCardIdsByDeckId(db, deckId),
    getDeckTagsByDeckId(db, deckId),
    getDeckTagFacetsByDeckId(db, deckId),
    getSwipeEventsByDeckId(db, deckId),
    getDeckCardStatesByDeckId(db, deckId),
    getCanonicalTagState(db, deck),
    getDeckTagScoresByDeckId(db, deckId),
    getDeckCardAffinitiesByDeckId(db, deckId),
  ]);
  const linkEntries = await Promise.all(
    allCards.map(
      async (card): Promise<readonly [string, DeckCardTagLink[]]> =>
        [
          card.id as string,
          await getDeckCardTagLinksByCardId(db, card.id),
        ] as const,
    ),
  );
  const cardTagLinksByCardId = new Map(linkEntries);

  return buildDeckSequenceQueueEntries({
    deck,
    allCards,
    seenCardIds,
    cardStates,
    tagStates,
    tagScores,
    cardAffinities,
    tags,
    facets,
    cardTagLinksByCardId,
    recentSwipeEvents,
  });
}
