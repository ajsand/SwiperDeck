import {
  type Deck,
  type DeckCard,
  type DeckCardAffinity,
  type DeckCardId,
  type DeckCardState,
  type DeckCardTagLink,
  type DeckTag,
  type DeckTagFacetId,
  type DeckTagId,
  type DeckTagScore,
  type DeckTagState,
  type SwipeEvent,
} from '@/types/domain';

import type {
  DeckAdaptiveSequenceDecision,
  DeckCardScoreBreakdown,
  DeckCardScoreComponent,
  DeckSequencePrimaryReason,
  DeckSequenceQueueEntry,
  DeckSequenceReason,
} from './deckSequenceTypes';
import { selectRetestQueueEntry } from './retestSelection';
import { applySequenceGuardrails } from './sequenceGuardrails';

export interface TagAwareAdaptiveSequenceContext {
  deck: Deck;
  allCards: DeckCard[];
  remainingCards: DeckCard[];
  seenCardIds: Set<DeckCardId>;
  cardStates?: DeckCardState[];
  tags: DeckTag[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  cardAffinities: DeckCardAffinity[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  recentSwipeEvents: SwipeEvent[];
}

interface CandidateTagContext {
  primaryTagId: DeckTagId | null;
  tagIds: DeckTagId[];
  facetIds: DeckTagFacetId[];
}

interface RecentSequenceHistory {
  recentCardIds: string[];
  recentPrimaryTagIds: string[];
  recentFacetIds: string[];
}

const PRIMARY_LINK_WEIGHT = 1;
const SECONDARY_LINK_WEIGHT = 0.7;
const SUPPORTING_LINK_WEIGHT = 0.4;
const RECENT_REPEAT_WINDOW = 4;
const MAX_TAG_AFFINITY = 24;
const MAX_CARD_AFFINITY = 10;
const MAX_COVERAGE_BONUS = 12;
const MAX_NOVELTY_BONUS = 8;
const MAX_REPRESENTATIVE_PRIOR = 8;
const MAX_REPEAT_PENALTY = 18;
const MAX_PRESENTATION_RECENCY_PENALTY = 14;
const PRESENTATION_SUPPRESSION_WINDOW_MS = 30 * 60 * 1000;
const ALREADY_SEEN_PENALTY = -1000;

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

function compareQueueEntries(
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

function getLinkWeight(link: DeckCardTagLink): number {
  if (link.role === 'primary') {
    return PRIMARY_LINK_WEIGHT;
  }

  if (link.role === 'secondary') {
    return SECONDARY_LINK_WEIGHT;
  }

  return SUPPORTING_LINK_WEIGHT;
}

function getPrimaryTagId(links: DeckCardTagLink[]): DeckTagId | null {
  const primary = links.find((link) => link.role === 'primary');
  return primary?.tagId ?? links[0]?.tagId ?? null;
}

function buildCandidateTagContext(
  cardId: DeckCardId,
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>,
  tagsById: Map<string, DeckTag>,
): CandidateTagContext {
  const links = cardTagLinksByCardId.get(cardId as string) ?? [];
  const primaryTagId = getPrimaryTagId(links);
  const tagIds = links.map((link) => link.tagId);
  const facetIds = Array.from(
    new Set(
      tagIds
        .map((tagId) => tagsById.get(tagId as string)?.facetId ?? null)
        .filter((facetId): facetId is DeckTagFacetId => facetId !== null),
    ),
  );

  return {
    primaryTagId,
    tagIds,
    facetIds,
  };
}

function buildRecentSequenceHistory(
  recentSwipeEvents: SwipeEvent[],
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>,
  tagsById: Map<string, DeckTag>,
): RecentSequenceHistory {
  const recentEvents = recentSwipeEvents.slice(0, RECENT_REPEAT_WINDOW);

  return recentEvents.reduce<RecentSequenceHistory>(
    (history, event) => {
      history.recentCardIds.push(event.cardId as string);

      const primaryTagId = getPrimaryTagId(
        cardTagLinksByCardId.get(event.cardId as string) ?? [],
      );

      if (!primaryTagId) {
        return history;
      }

      history.recentPrimaryTagIds.push(primaryTagId as string);

      const facetId = tagsById.get(primaryTagId as string)?.facetId;
      if (facetId) {
        history.recentFacetIds.push(facetId as string);
      }

      return history;
    },
    {
      recentCardIds: [],
      recentPrimaryTagIds: [],
      recentFacetIds: [],
    },
  );
}

function calculateRepresentativePrior(
  card: DeckCard,
  maxSortOrder: number,
): number {
  const sortOrderPrior =
    maxSortOrder > 0 ? (1 - card.sortOrder / (maxSortOrder + 1)) * 3 : 3;

  return clamp(
    card.popularity * 5 + sortOrderPrior,
    0,
    MAX_REPRESENTATIVE_PRIOR,
  );
}

function calculateTagAffinityComponent(
  links: DeckCardTagLink[],
  tagScoresById: Map<string, DeckTagScore>,
  tagStatesById: Map<string, DeckTagState>,
  tagsById: Map<string, DeckTag>,
): {
  component: DeckCardScoreComponent;
  strongestPositiveTagId: DeckTagId | null;
  strongestPositiveSignal: number;
  strongestNegativeSignal: number;
} {
  if (links.length === 0) {
    return {
      component: {
        key: 'tag_affinity',
        scoreDelta: 0,
        detail: 'no_canonical_tags',
      },
      strongestPositiveTagId: null,
      strongestPositiveSignal: 0,
      strongestNegativeSignal: 0,
    };
  }

  let weightedSignal = 0;
  let totalWeight = 0;
  let strongestPositiveSignal = 0;
  let strongestNegativeSignal = 0;
  let strongestPositiveTagId: DeckTagId | null = null;

  for (const link of links) {
    const weight = getLinkWeight(link);
    const tagState = tagStatesById.get(link.tagId as string);
    const tagScore = tagScoresById.get(link.tagId as string);
    const baseSignal = tagScore?.score ?? tagState?.netWeight ?? 0;
    const uncertaintyDamping = 1 - (tagState?.uncertaintyScore ?? 1) * 0.35;
    const adjustedSignal = baseSignal * uncertaintyDamping;

    weightedSignal += adjustedSignal * weight;
    totalWeight += weight;

    if (adjustedSignal > strongestPositiveSignal) {
      strongestPositiveSignal = adjustedSignal;
      strongestPositiveTagId = link.tagId;
    }

    if (adjustedSignal < strongestNegativeSignal) {
      strongestNegativeSignal = adjustedSignal;
    }
  }

  const averageSignal = totalWeight > 0 ? weightedSignal / totalWeight : 0;
  const scoreDelta = clamp(
    averageSignal * 6,
    -MAX_TAG_AFFINITY,
    MAX_TAG_AFFINITY,
  );
  const detailTagId =
    strongestPositiveTagId ?? getPrimaryTagId(links) ?? links[0]?.tagId ?? null;
  const detailTag = detailTagId ? tagsById.get(detailTagId as string) : null;

  return {
    component: {
      key: 'tag_affinity',
      scoreDelta,
      detail: detailTag
        ? `tag_affinity_${detailTag.slug}`
        : 'tag_affinity_neutral',
    },
    strongestPositiveTagId,
    strongestPositiveSignal,
    strongestNegativeSignal,
  };
}

function calculateCardAffinityComponent(
  card: DeckCard,
  cardAffinitiesById: Map<string, DeckCardAffinity>,
): DeckCardScoreComponent {
  const affinity = cardAffinitiesById.get(card.id as string);
  const scoreDelta = clamp(
    affinity?.score ?? 0,
    -MAX_CARD_AFFINITY,
    MAX_CARD_AFFINITY,
  );

  return {
    key: 'card_affinity',
    scoreDelta,
    detail: affinity ? 'card_affinity_history' : 'card_affinity_none',
  };
}

function calculateCoverageBonusComponent(
  links: DeckCardTagLink[],
  tagStatesById: Map<string, DeckTagState>,
  tagsById: Map<string, DeckTag>,
): {
  component: DeckCardScoreComponent;
  needsClarification: boolean;
  mostNeedyTagId: DeckTagId | null;
} {
  if (links.length === 0) {
    return {
      component: {
        key: 'coverage_bonus',
        scoreDelta: 0,
        detail: 'coverage_bonus_none',
      },
      needsClarification: false,
      mostNeedyTagId: null,
    };
  }

  let weightedNeed = 0;
  let totalWeight = 0;
  let topNeed = Number.NEGATIVE_INFINITY;
  let mostNeedyTagId: DeckTagId | null = null;
  let needsClarification = false;

  for (const link of links) {
    const tagState = tagStatesById.get(link.tagId as string);
    const weight = getLinkWeight(link);
    const exposureNeed = 1 / (1 + (tagState?.exposureCount ?? 0));
    const uncertaintyNeed = (tagState?.uncertaintyScore ?? 1) * 0.8;
    const need = exposureNeed + uncertaintyNeed;
    weightedNeed += need * weight;
    totalWeight += weight;

    if (need > topNeed) {
      topNeed = need;
      mostNeedyTagId = link.tagId;
    }

    if (
      !needsClarification &&
      ((tagState?.exposureCount ?? 0) <= 1 ||
        (tagState?.uncertaintyScore ?? 1) >= 0.55)
    ) {
      needsClarification = true;
    }
  }

  const averageNeed = totalWeight > 0 ? weightedNeed / totalWeight : 0;
  const scoreDelta = clamp(averageNeed * 6, 0, MAX_COVERAGE_BONUS);
  const tag = mostNeedyTagId ? tagsById.get(mostNeedyTagId as string) : null;

  return {
    component: {
      key: 'coverage_bonus',
      scoreDelta,
      detail: tag ? `coverage_bonus_${tag.slug}` : 'coverage_bonus_none',
    },
    needsClarification,
    mostNeedyTagId,
  };
}

function calculateNoveltyBonusComponent(
  links: DeckCardTagLink[],
  candidateTags: CandidateTagContext,
  recentHistory: RecentSequenceHistory,
  tagsById: Map<string, DeckTag>,
): DeckCardScoreComponent {
  if (links.length === 0) {
    return {
      key: 'novelty_bonus',
      scoreDelta: 0,
      detail: 'novelty_bonus_none',
    };
  }

  let weightedNovelty = 0;
  let totalWeight = 0;

  for (const link of links) {
    const weight = getLinkWeight(link);
    const primaryRepeatCount = recentHistory.recentPrimaryTagIds.filter(
      (tagId) => tagId === (link.tagId as string),
    ).length;
    const facetId = tagsById.get(link.tagId as string)?.facetId ?? null;
    const facetRepeatCount = facetId
      ? recentHistory.recentFacetIds.filter(
          (recentFacetId) => recentFacetId === (facetId as string),
        ).length
      : 0;
    const novelty =
      primaryRepeatCount === 0 ? (facetRepeatCount === 0 ? 1 : 0.55) : 0.1;

    weightedNovelty += novelty * weight;
    totalWeight += weight;
  }

  const averageNovelty = totalWeight > 0 ? weightedNovelty / totalWeight : 0;
  const scoreDelta = clamp(averageNovelty * 6, 0, MAX_NOVELTY_BONUS);
  const detailTagId =
    candidateTags.primaryTagId ?? candidateTags.tagIds[0] ?? null;
  const detailTag = detailTagId ? tagsById.get(detailTagId as string) : null;

  return {
    key: 'novelty_bonus',
    scoreDelta,
    detail: detailTag
      ? `novelty_bonus_${detailTag.slug}`
      : 'novelty_bonus_none',
  };
}

function calculateRecentRepeatPenaltyComponent(
  candidateTags: CandidateTagContext,
  recentHistory: RecentSequenceHistory,
): DeckCardScoreComponent {
  const primaryRepeatCount = candidateTags.primaryTagId
    ? recentHistory.recentPrimaryTagIds.filter(
        (tagId) => tagId === (candidateTags.primaryTagId as string),
      ).length
    : 0;
  const facetRepeatCount = candidateTags.facetIds.reduce(
    (count, facetId) =>
      count +
      recentHistory.recentFacetIds.filter(
        (recentFacetId) => recentFacetId === (facetId as string),
      ).length,
    0,
  );
  const scoreDelta = -clamp(
    primaryRepeatCount * 7 + facetRepeatCount * 3,
    0,
    MAX_REPEAT_PENALTY,
  );

  return {
    key: 'recent_repeat_penalty',
    scoreDelta,
    detail:
      primaryRepeatCount > 0 || facetRepeatCount > 0
        ? 'recent_repeat_penalty_applied'
        : 'recent_repeat_penalty_none',
  };
}

function calculatePresentationRecencyPenaltyComponent(args: {
  cardId: DeckCardId;
  cardStatesById: Map<string, DeckCardState>;
  now: number;
}): DeckCardScoreComponent {
  const cardState = args.cardStatesById.get(args.cardId as string);

  if (!cardState?.lastPresentedAt) {
    return {
      key: 'presentation_recency_penalty',
      scoreDelta: 0,
      detail: 'presentation_recency_penalty_none',
    };
  }

  const lastInteractionAt = Math.max(
    cardState.lastPresentedAt,
    cardState.lastSwipedAt ?? 0,
  );
  const ageMs = Math.max(0, args.now - lastInteractionAt);

  if (ageMs >= PRESENTATION_SUPPRESSION_WINDOW_MS) {
    return {
      key: 'presentation_recency_penalty',
      scoreDelta: 0,
      detail: 'presentation_recency_penalty_none',
    };
  }

  const remainingRatio =
    (PRESENTATION_SUPPRESSION_WINDOW_MS - ageMs) /
    PRESENTATION_SUPPRESSION_WINDOW_MS;
  const penaltyBase =
    cardState.lastSwipedAt &&
    cardState.lastSwipedAt >= cardState.lastPresentedAt
      ? MAX_PRESENTATION_RECENCY_PENALTY
      : MAX_PRESENTATION_RECENCY_PENALTY * 0.65;

  return {
    key: 'presentation_recency_penalty',
    scoreDelta: -(penaltyBase * remainingRatio),
    detail: 'presentation_recency_penalty_applied',
  };
}

function calculateAlreadySeenPenaltyComponent(
  cardId: DeckCardId,
  seenCardIds: Set<DeckCardId>,
): DeckCardScoreComponent {
  return {
    key: 'already_seen_penalty',
    scoreDelta: seenCardIds.has(cardId) ? ALREADY_SEEN_PENALTY : 0,
    detail: seenCardIds.has(cardId)
      ? 'already_seen_penalty_applied'
      : 'already_seen_penalty_none',
  };
}

function buildSequenceReasons(
  components: DeckCardScoreComponent[],
): DeckSequenceReason[] {
  const reasons: DeckSequenceReason[] = [];

  for (const component of components) {
    if (component.key === 'tag_affinity' && component.scoreDelta !== 0) {
      reasons.push({
        code: 'tag_affinity_signal',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (component.key === 'coverage_bonus' && component.scoreDelta > 0) {
      reasons.push({
        code: 'coverage_bonus_applied',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (component.key === 'novelty_bonus' && component.scoreDelta > 0) {
      reasons.push({
        code: 'novelty_bonus_applied',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (
      component.key === 'representative_prior' &&
      component.scoreDelta > 0
    ) {
      reasons.push({
        code: 'representative_pick',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (
      component.key === 'recent_repeat_penalty' &&
      component.scoreDelta < 0
    ) {
      reasons.push({
        code: 'repeat_penalty_applied',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (
      component.key === 'presentation_recency_penalty' &&
      component.scoreDelta < 0
    ) {
      reasons.push({
        code: 'presentation_recency_penalty_applied',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    } else if (
      component.key === 'already_seen_penalty' &&
      component.scoreDelta < 0
    ) {
      reasons.push({
        code: 'already_seen_penalty_applied',
        scoreDelta: component.scoreDelta,
        detail: component.detail,
      });
    }
  }

  return reasons;
}

function determinePrimaryReason(args: {
  tagAffinity: number;
  coverageBonus: number;
  noveltyBonus: number;
  strongestPositiveSignal: number;
  strongestNegativeSignal: number;
  needsClarification: boolean;
}): DeckSequencePrimaryReason {
  if (args.needsClarification && args.coverageBonus >= 5) {
    return 'clarify_low_coverage_tag';
  }

  if (
    args.tagAffinity >= 2 &&
    args.strongestPositiveSignal > Math.abs(args.strongestNegativeSignal)
  ) {
    return 'reinforce_positive_area';
  }

  if (args.noveltyBonus > 0 || args.coverageBonus > 0) {
    return 'probe_adjacent_tag';
  }

  return 'fallback_order';
}

function buildBreakdown(
  candidateTags: CandidateTagContext,
  components: DeckCardScoreComponent[],
): DeckCardScoreBreakdown {
  const totalScore = components.reduce(
    (total, component) => total + component.scoreDelta,
    0,
  );

  return {
    baseScore: totalScore,
    guardrailScore: 0,
    totalScore,
    primaryTagId: candidateTags.primaryTagId,
    tagIds: candidateTags.tagIds,
    components,
  };
}

function buildAdaptiveDecision(args: {
  card: DeckCard;
  candidateTags: CandidateTagContext;
  components: DeckCardScoreComponent[];
  strongestPositiveSignal: number;
  strongestNegativeSignal: number;
  needsClarification: boolean;
}): DeckAdaptiveSequenceDecision {
  const breakdown = buildBreakdown(args.candidateTags, args.components);
  const tagAffinity =
    args.components.find((component) => component.key === 'tag_affinity')
      ?.scoreDelta ?? 0;
  const coverageBonus =
    args.components.find((component) => component.key === 'coverage_bonus')
      ?.scoreDelta ?? 0;
  const noveltyBonus =
    args.components.find((component) => component.key === 'novelty_bonus')
      ?.scoreDelta ?? 0;

  return {
    cardId: args.card.id,
    stage: 'adaptive',
    score: breakdown.totalScore,
    primaryReason: determinePrimaryReason({
      tagAffinity,
      coverageBonus,
      noveltyBonus,
      strongestPositiveSignal: args.strongestPositiveSignal,
      strongestNegativeSignal: args.strongestNegativeSignal,
      needsClarification: args.needsClarification,
    }),
    reasons: buildSequenceReasons(args.components),
    breakdown,
  };
}

export function buildBaseAdaptiveSequenceQueueEntries(
  context: TagAwareAdaptiveSequenceContext,
): DeckSequenceQueueEntry[] {
  if (context.deck.isCustom) {
    return sortCardsByFallback(context.remainingCards).map((card) => ({
      card,
      decision: {
        cardId: card.id,
        stage: 'adaptive',
        score: 0,
        primaryReason: 'fallback_order',
        reasons: [
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
        ],
      },
    }));
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
  const cardStatesById = new Map(
    (context.cardStates ?? []).map(
      (state) => [state.cardId as string, state] as const,
    ),
  );
  const recentHistory = buildRecentSequenceHistory(
    context.recentSwipeEvents,
    context.cardTagLinksByCardId,
    tagsById,
  );
  const maxSortOrder = context.remainingCards.reduce(
    (maxValue, card) => Math.max(maxValue, card.sortOrder),
    0,
  );
  const now = Date.now();

  return sortCardsByFallback(context.remainingCards)
    .map((card): DeckSequenceQueueEntry => {
      const links = context.cardTagLinksByCardId.get(card.id as string) ?? [];
      const candidateTags = buildCandidateTagContext(
        card.id,
        context.cardTagLinksByCardId,
        tagsById,
      );
      const {
        component: tagAffinityComponent,
        strongestPositiveSignal,
        strongestNegativeSignal,
      } = calculateTagAffinityComponent(
        links,
        tagScoresById,
        tagStatesById,
        tagsById,
      );
      const coverageResult = calculateCoverageBonusComponent(
        links,
        tagStatesById,
        tagsById,
      );
      const components: DeckCardScoreComponent[] = [
        tagAffinityComponent,
        calculateCardAffinityComponent(card, cardAffinitiesById),
        coverageResult.component,
        calculateNoveltyBonusComponent(
          links,
          candidateTags,
          recentHistory,
          tagsById,
        ),
        {
          key: 'representative_prior',
          scoreDelta: calculateRepresentativePrior(card, maxSortOrder),
          detail: 'representative_prior',
        },
        calculateRecentRepeatPenaltyComponent(candidateTags, recentHistory),
        calculatePresentationRecencyPenaltyComponent({
          cardId: card.id,
          cardStatesById,
          now,
        }),
        calculateAlreadySeenPenaltyComponent(card.id, context.seenCardIds),
      ];

      return {
        card,
        decision: buildAdaptiveDecision({
          card,
          candidateTags,
          components,
          strongestPositiveSignal,
          strongestNegativeSignal,
          needsClarification: coverageResult.needsClarification,
        }),
      };
    })
    .sort(compareQueueEntries);
}

export function buildAdaptiveSequenceQueueEntries(
  context: TagAwareAdaptiveSequenceContext,
): DeckSequenceQueueEntry[] {
  if (context.deck.isCustom) {
    return buildBaseAdaptiveSequenceQueueEntries(context);
  }

  const baseEntries = buildBaseAdaptiveSequenceQueueEntries(context);
  const guardrailedEntries = applySequenceGuardrails(
    {
      deck: context.deck,
      tags: context.tags,
      tagStates: context.tagStates,
      cardTagLinksByCardId: context.cardTagLinksByCardId,
      recentSwipeEvents: context.recentSwipeEvents,
    },
    baseEntries,
  );
  const retestEntry = selectRetestQueueEntry(
    {
      deck: context.deck,
      allCards: context.allCards,
      seenCardIds: context.seenCardIds,
      tags: context.tags,
      tagStates: context.tagStates,
      tagScores: context.tagScores,
      cardAffinities: context.cardAffinities,
      cardTagLinksByCardId: context.cardTagLinksByCardId,
      recentSwipeEvents: context.recentSwipeEvents,
    },
    guardrailedEntries,
  );

  if (!retestEntry) {
    return guardrailedEntries;
  }

  return [retestEntry, ...guardrailedEntries];
}
