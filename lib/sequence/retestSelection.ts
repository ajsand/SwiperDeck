import {
  type Deck,
  type DeckCard,
  type DeckCardAffinity,
  type DeckCardId,
  type DeckCardTagLink,
  type DeckTag,
  type DeckTagScore,
  type DeckTagState,
  type SwipeAction,
  type SwipeEvent,
} from '@/types/domain';

import type {
  DeckAdaptiveSequenceDecision,
  DeckCardScoreBreakdown,
  DeckRetestCandidate,
  DeckRetestDecision,
  DeckRetestReason,
  DeckSequencePrimaryReason,
  DeckSequenceQueueEntry,
} from './deckSequenceTypes';

export interface RetestSelectionContext {
  deck: Deck;
  allCards: DeckCard[];
  seenCardIds: Set<DeckCardId>;
  tags: DeckTag[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  cardAffinities: DeckCardAffinity[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  recentSwipeEvents: SwipeEvent[];
}

interface DerivedCardRetestState {
  cardId: DeckCardId;
  exposureCount: number;
  retestCount: number;
  lastShownAt: number;
  lastRetestAt: number | null;
  otherCardsSinceLastShown: number;
  lastAction: SwipeAction;
  lastStrength: number;
  positiveCount: number;
  negativeCount: number;
  skipCount: number;
}

interface ScoredRetestCandidate extends DeckRetestCandidate {
  card: DeckCard;
  detail: string;
}

const MAX_RETEST_COUNT = 2;
const MIN_OTHER_CARDS_SINCE_LAST_SHOWN = 2;
const MIN_EVENTS_BETWEEN_RETESTS = 3;
const RETEST_COOLDOWN_MS = 1500;
const MIN_RETEST_PRIORITY = 7.5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sortCardsByFallback(cards: DeckCard[]): DeckCard[] {
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

function getPrimaryTagId(links: DeckCardTagLink[]): string | null {
  const primary = links.find((link) => link.role === 'primary');
  return (primary?.tagId ?? links[0]?.tagId ?? null) as string | null;
}

function buildCardRetestStateMap(
  recentSwipeEvents: SwipeEvent[],
): Map<string, DerivedCardRetestState> {
  const states = new Map<string, DerivedCardRetestState>();

  recentSwipeEvents.forEach((event, index) => {
    const key = event.cardId as string;
    const current = states.get(key);

    if (!current) {
      states.set(key, {
        cardId: event.cardId,
        exposureCount: 1,
        retestCount: 0,
        lastShownAt: event.createdAt,
        lastRetestAt: null,
        otherCardsSinceLastShown: index,
        lastAction: event.action,
        lastStrength: event.strength,
        positiveCount: event.strength > 0 ? 1 : 0,
        negativeCount: event.strength < 0 ? 1 : 0,
        skipCount: event.strength === 0 ? 1 : 0,
      });
      return;
    }

    current.exposureCount += 1;
    current.retestCount = current.exposureCount - 1;
    current.lastRetestAt = current.lastShownAt;
    current.positiveCount += event.strength > 0 ? 1 : 0;
    current.negativeCount += event.strength < 0 ? 1 : 0;
    current.skipCount += event.strength === 0 ? 1 : 0;
  });

  return states;
}

function getEventsSinceLatestRetest(
  recentSwipeEvents: SwipeEvent[],
  cardStateById: Map<string, DerivedCardRetestState>,
): number {
  const latestRetestIndex = recentSwipeEvents.findIndex((event) => {
    const state = cardStateById.get(event.cardId as string);
    return (
      (state?.retestCount ?? 0) > 0 && state?.lastShownAt === event.createdAt
    );
  });

  return latestRetestIndex === -1
    ? Number.POSITIVE_INFINITY
    : latestRetestIndex;
}

function reasonToPrimaryReason(
  reason: DeckRetestReason,
): DeckSequencePrimaryReason {
  if (reason === 'ambiguous_tag_signal' || reason === 'mixed_card_signal') {
    return 'retest_ambiguity';
  }

  if (reason === 'stability_check') {
    return 'reaffirm_stability';
  }

  return 'revisit_compare_area';
}

function buildRetestBreakdown(
  card: DeckCard,
  links: DeckCardTagLink[],
  priorityScore: number,
  detail: string,
): DeckCardScoreBreakdown {
  return {
    baseScore: priorityScore,
    guardrailScore: 0,
    totalScore: priorityScore,
    primaryTagId: (links.find((link) => link.role === 'primary')?.tagId ??
      links[0]?.tagId ??
      null) as DeckCardScoreBreakdown['primaryTagId'],
    tagIds: links.map((link) => link.tagId),
    components: [
      {
        key: 'retest_priority_boost',
        scoreDelta: priorityScore,
        detail,
      },
    ],
  };
}

function buildRetestDecision(args: {
  card: DeckCard;
  reason: DeckRetestReason;
  priorityScore: number;
  detail: string;
  state: DerivedCardRetestState;
  links: DeckCardTagLink[];
}): DeckAdaptiveSequenceDecision {
  const retest: DeckRetestDecision = {
    reason: args.reason,
    priorityScore: args.priorityScore,
    retestCount: args.state.retestCount,
    lastShownAt: args.state.lastShownAt,
    lastRetestAt: args.state.lastRetestAt,
    retestDueAt: args.state.lastShownAt + RETEST_COOLDOWN_MS,
    selectedBecause: args.detail,
  };

  return {
    cardId: args.card.id,
    stage: 'adaptive',
    score: args.priorityScore,
    primaryReason: reasonToPrimaryReason(args.reason),
    reasons: [
      {
        code: 'retest_candidate_selected',
        scoreDelta: args.priorityScore,
        detail: args.detail,
      },
    ],
    breakdown: buildRetestBreakdown(
      args.card,
      args.links,
      args.priorityScore,
      args.detail,
    ),
    retest,
  };
}

function scoreRetestReason(args: {
  card: DeckCard;
  links: DeckCardTagLink[];
  tagStatesById: Map<string, DeckTagState>;
  tagScoresById: Map<string, DeckTagScore>;
  cardAffinitiesById: Map<string, DeckCardAffinity>;
  state: DerivedCardRetestState;
  tagsById: Map<string, DeckTag>;
}): { reason: DeckRetestReason | null; priorityScore: number; detail: string } {
  const linkedTagStates = args.links
    .map((link) => args.tagStatesById.get(link.tagId as string))
    .filter((state): state is DeckTagState => Boolean(state));
  const linkedTagScores = args.links
    .map((link) => args.tagScoresById.get(link.tagId as string))
    .filter((score): score is DeckTagScore => Boolean(score));
  const cardAffinity = args.cardAffinitiesById.get(args.card.id as string);
  const maxUncertainty = Math.max(
    0,
    ...linkedTagStates.map((state) => state.uncertaintyScore),
  );
  const mixedTagSignal = linkedTagStates.some(
    (state) =>
      state.positiveWeight > 0 &&
      state.negativeWeight > 0 &&
      Math.abs(state.netWeight) <
        Math.max(1.5, state.positiveWeight + state.negativeWeight),
  );
  const ambiguousTagScore =
    clamp(maxUncertainty * 9, 0, 9) +
    (mixedTagSignal ? 2 : 0) +
    linkedTagStates.filter((state) => Math.abs(state.netWeight) <= 1).length;
  const mixedCardSignal =
    args.state.positiveCount > 0 && args.state.negativeCount > 0
      ? 7 + Math.min(args.state.positiveCount, args.state.negativeCount) * 1.5
      : cardAffinity && cardAffinity.pos > 0 && cardAffinity.neg > 0
        ? 7 + Math.min(cardAffinity.pos, cardAffinity.neg) * 1.5
        : 0;
  const strongestAbsoluteSignal = Math.max(
    Math.abs(cardAffinity?.score ?? 0),
    ...linkedTagScores.map((score) => Math.abs(score.score)),
    0,
  );
  const stabilityCheckScore =
    args.state.retestCount === 0 && args.state.exposureCount === 1
      ? 6 + strongestAbsoluteSignal * 1.5
      : 0;
  const compareAreaScore =
    linkedTagScores.some((score) => Math.abs(score.score) >= 2) ||
    Math.abs(cardAffinity?.score ?? 0) >= 2
      ? 4 +
        Math.max(
          Math.abs(cardAffinity?.score ?? 0),
          ...linkedTagScores.map((score) => Math.abs(score.score)),
          0,
        ) *
          1.1
      : 0;
  const rankedReasons: Array<{
    reason: DeckRetestReason;
    score: number;
    detail: string;
  }> = [
    {
      reason: 'ambiguous_tag_signal' as const,
      score: ambiguousTagScore,
      detail: `retest_ambiguous_tag_${
        args.links[0]
          ? (args.tagsById.get(args.links[0].tagId as string)?.slug ??
            args.links[0].tagId)
          : 'unknown'
      }`,
    },
    {
      reason: 'mixed_card_signal' as const,
      score: mixedCardSignal,
      detail: `retest_mixed_card_${args.card.id}`,
    },
    {
      reason: 'stability_check' as const,
      score: stabilityCheckScore,
      detail: `retest_stability_check_${args.card.id}`,
    },
    {
      reason: 'important_compare_area' as const,
      score: compareAreaScore,
      detail: `retest_compare_area_${
        args.links[0]
          ? (args.tagsById.get(args.links[0].tagId as string)?.slug ??
            args.links[0].tagId)
          : 'unknown'
      }`,
    },
  ].sort((left, right) => right.score - left.score);

  const winner = rankedReasons[0];

  if (!winner || winner.score <= 0) {
    return {
      reason: null,
      priorityScore: 0,
      detail: 'retest_not_applicable',
    };
  }

  return {
    reason: winner.reason,
    priorityScore: winner.score,
    detail: winner.detail,
  };
}

function buildRetestCandidate(args: {
  card: DeckCard;
  state: DerivedCardRetestState;
  eventsSinceLatestRetest: number;
  latestDeckEventAt: number;
  links: DeckCardTagLink[];
  tagStatesById: Map<string, DeckTagState>;
  tagScoresById: Map<string, DeckTagScore>;
  cardAffinitiesById: Map<string, DeckCardAffinity>;
  tagsById: Map<string, DeckTag>;
}): ScoredRetestCandidate | null {
  const retestDueAt = args.state.lastShownAt + RETEST_COOLDOWN_MS;
  const cooldownSatisfied =
    args.state.otherCardsSinceLastShown >= MIN_OTHER_CARDS_SINCE_LAST_SHOWN &&
    args.latestDeckEventAt >= retestDueAt;
  const recentRetestGapSatisfied =
    args.eventsSinceLatestRetest >= MIN_EVENTS_BETWEEN_RETESTS;
  const maxRetestsReached = args.state.retestCount >= MAX_RETEST_COUNT;

  if (!cooldownSatisfied || !recentRetestGapSatisfied || maxRetestsReached) {
    return null;
  }

  const reasonResult = scoreRetestReason({
    card: args.card,
    links: args.links,
    tagStatesById: args.tagStatesById,
    tagScoresById: args.tagScoresById,
    cardAffinitiesById: args.cardAffinitiesById,
    state: args.state,
    tagsById: args.tagsById,
  });

  if (
    !reasonResult.reason ||
    reasonResult.priorityScore < MIN_RETEST_PRIORITY
  ) {
    return null;
  }

  return {
    cardId: args.card.id,
    card: args.card,
    reason: reasonResult.reason,
    priorityScore: reasonResult.priorityScore,
    retestCount: args.state.retestCount,
    lastShownAt: args.state.lastShownAt,
    lastRetestAt: args.state.lastRetestAt,
    retestDueAt,
    otherCardsSinceLastShown: args.state.otherCardsSinceLastShown,
    cooldownSatisfied,
    recentRetestGapSatisfied,
    maxRetestsReached,
    detail: reasonResult.detail,
  };
}

function compareRetestCandidates(
  left: ScoredRetestCandidate,
  right: ScoredRetestCandidate,
): number {
  if (left.priorityScore !== right.priorityScore) {
    return right.priorityScore - left.priorityScore;
  }

  if (left.card.sortOrder !== right.card.sortOrder) {
    return left.card.sortOrder - right.card.sortOrder;
  }

  return String(left.card.id).localeCompare(String(right.card.id));
}

export function selectRetestQueueEntry(
  context: RetestSelectionContext,
  baseEntries: DeckSequenceQueueEntry[],
): DeckSequenceQueueEntry | null {
  if (context.deck.isCustom || context.seenCardIds.size === 0) {
    return null;
  }

  const seenCards = sortCardsByFallback(
    context.allCards.filter((card) => context.seenCardIds.has(card.id)),
  );

  if (seenCards.length === 0) {
    return null;
  }

  const tagsById = new Map(
    context.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const tagStatesById = new Map(
    context.tagStates.map((state) => [state.tagId as string, state] as const),
  );
  const tagScoresById = new Map(
    context.tagScores.map((score) => [score.tagId as string, score] as const),
  );
  const cardAffinitiesById = new Map(
    context.cardAffinities.map(
      (affinity) => [affinity.cardId as string, affinity] as const,
    ),
  );
  const cardStateById = buildCardRetestStateMap(context.recentSwipeEvents);
  const latestDeckEventAt = context.recentSwipeEvents[0]?.createdAt ?? 0;
  const eventsSinceLatestRetest = getEventsSinceLatestRetest(
    context.recentSwipeEvents,
    cardStateById,
  );
  const candidates = seenCards
    .map((card) => {
      const state = cardStateById.get(card.id as string);
      const links = context.cardTagLinksByCardId.get(card.id as string) ?? [];

      if (!state || links.length === 0) {
        return null;
      }

      return buildRetestCandidate({
        card,
        state,
        eventsSinceLatestRetest,
        latestDeckEventAt,
        links,
        tagStatesById,
        tagScoresById,
        cardAffinitiesById,
        tagsById,
      });
    })
    .filter((candidate): candidate is ScoredRetestCandidate =>
      Boolean(candidate),
    )
    .sort(compareRetestCandidates);

  const selected = candidates[0];

  if (!selected) {
    return null;
  }

  const topBaseScore = baseEntries[0]?.decision.score ?? 0;
  const baseScoreMultiplier =
    selected.reason === 'stability_check' ||
    selected.reason === 'important_compare_area'
      ? 0.4
      : 0.55;
  const requiredPriority =
    topBaseScore > 0
      ? Math.max(MIN_RETEST_PRIORITY, topBaseScore * baseScoreMultiplier)
      : MIN_RETEST_PRIORITY;

  if (selected.priorityScore < requiredPriority) {
    return null;
  }

  const links =
    context.cardTagLinksByCardId.get(selected.card.id as string) ?? [];

  return {
    card: selected.card,
    decision: buildRetestDecision({
      card: selected.card,
      reason: selected.reason,
      priorityScore: selected.priorityScore,
      detail: selected.detail,
      state: cardStateById.get(selected.card.id as string)!,
      links,
    }),
  };
}
