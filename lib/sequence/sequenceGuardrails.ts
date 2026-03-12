import {
  type Deck,
  type DeckCardTagLink,
  type DeckTag,
  type DeckTagFacetId,
  type DeckTagId,
  type DeckTagState,
  type SwipeEvent,
} from '@/types/domain';

import type {
  DeckCardScoreComponent,
  DeckCoverageDebt,
  DeckGuardrailAdjustment,
  DeckGuardrailDecision,
  DeckSequenceDecision,
  DeckSequencePrimaryReason,
  DeckSequenceQueueEntry,
  DeckSequenceReason,
} from './deckSequenceTypes';

export interface SequenceGuardrailContext {
  deck: Deck;
  tags: DeckTag[];
  tagStates: DeckTagState[];
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>;
  recentSwipeEvents: SwipeEvent[];
}

interface CandidateTagContext {
  primaryTagId: DeckTagId | null;
  tagIds: DeckTagId[];
  facetIds: DeckTagFacetId[];
}

interface RecentSequenceHistory {
  recentPrimaryTagIds: string[];
  recentFacetIds: string[];
}

interface GuardrailCoverageState {
  coverageRatio: number;
  facetDebtById: Map<string, number>;
  tagDebtById: Map<string, number>;
}

const RECENT_GUARDRAIL_WINDOW = 4;
const LOW_COVERAGE_RATIO = 0.85;
const PRIMARY_TAG_STREAK_THRESHOLD = 2;
const FACET_REPEAT_THRESHOLD = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function getPrimaryTagId(links: DeckCardTagLink[]): DeckTagId | null {
  const primary = links.find((link) => link.role === 'primary');
  return primary?.tagId ?? links[0]?.tagId ?? null;
}

function buildCandidateTagContext(
  cardId: string,
  cardTagLinksByCardId: Map<string, DeckCardTagLink[]>,
  tagsById: Map<string, DeckTag>,
): CandidateTagContext {
  const links = cardTagLinksByCardId.get(cardId) ?? [];
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
  const history: RecentSequenceHistory = {
    recentPrimaryTagIds: [],
    recentFacetIds: [],
  };

  for (const event of recentSwipeEvents.slice(0, RECENT_GUARDRAIL_WINDOW)) {
    const primaryTagId = getPrimaryTagId(
      cardTagLinksByCardId.get(event.cardId as string) ?? [],
    );

    if (!primaryTagId) {
      continue;
    }

    history.recentPrimaryTagIds.push(primaryTagId as string);

    const facetId = tagsById.get(primaryTagId as string)?.facetId;
    if (facetId) {
      history.recentFacetIds.push(facetId as string);
    }
  }

  return history;
}

function buildCoverageState(
  tagStates: DeckTagState[],
  tagsById: Map<string, DeckTag>,
): GuardrailCoverageState {
  if (tagStates.length === 0) {
    return {
      coverageRatio: 1,
      facetDebtById: new Map(),
      tagDebtById: new Map(),
    };
  }

  const seenTagCount = tagStates.filter(
    (state) => state.exposureCount > 0,
  ).length;
  const coverageRatio = seenTagCount / tagStates.length;
  const maxTagExposure = Math.max(
    1,
    ...tagStates.map((state) => state.exposureCount),
  );
  const facetExposureById = new Map<string, number>();

  for (const state of tagStates) {
    const facetId = tagsById.get(state.tagId as string)?.facetId;
    if (!facetId) {
      continue;
    }

    facetExposureById.set(
      facetId as string,
      (facetExposureById.get(facetId as string) ?? 0) + state.exposureCount,
    );
  }

  const maxFacetExposure = Math.max(1, ...facetExposureById.values(), 1);
  const tagDebtById = new Map<string, number>();
  const facetDebtById = new Map<string, number>();

  for (const state of tagStates) {
    const tagDebt = clamp(
      (maxTagExposure - state.exposureCount) / maxTagExposure +
        state.uncertaintyScore * 0.4,
      0,
      1.4,
    );
    tagDebtById.set(state.tagId as string, tagDebt);
  }

  for (const [facetId, facetExposure] of facetExposureById.entries()) {
    const facetDebt = clamp(
      (maxFacetExposure - facetExposure) / maxFacetExposure,
      0,
      1,
    );
    facetDebtById.set(facetId, facetDebt);
  }

  return {
    coverageRatio,
    facetDebtById,
    tagDebtById,
  };
}

function buildCoverageDebt(
  candidateTags: CandidateTagContext,
  coverageState: GuardrailCoverageState,
  tagsById: Map<string, DeckTag>,
): DeckCoverageDebt[] {
  const debts: DeckCoverageDebt[] = [];

  for (const facetId of candidateTags.facetIds) {
    const debt = coverageState.facetDebtById.get(facetId as string) ?? 0;
    if (debt > 0) {
      debts.push({
        kind: 'facet',
        facetId,
        tagId: null,
        debt,
        detail: `facet_debt_${String(facetId).split(':').pop()}`,
      });
    }
  }

  for (const tagId of candidateTags.tagIds) {
    const debt = coverageState.tagDebtById.get(tagId as string) ?? 0;
    if (debt > 0) {
      debts.push({
        kind: 'tag',
        facetId: tagsById.get(tagId as string)?.facetId ?? null,
        tagId,
        debt,
        detail: `tag_debt_${tagsById.get(tagId as string)?.slug ?? tagId}`,
      });
    }
  }

  return debts.sort((left, right) => right.debt - left.debt).slice(0, 4);
}

function getBaseScore(decision: DeckSequenceDecision): number {
  return (
    decision.breakdown?.baseScore ??
    decision.breakdown?.totalScore ??
    decision.score
  );
}

function buildGuardrailAdjustments(args: {
  candidateTags: CandidateTagContext;
  coverageState: GuardrailCoverageState;
  recentHistory: RecentSequenceHistory;
  tagsById: Map<string, DeckTag>;
}): DeckGuardrailAdjustment[] {
  const adjustments: DeckGuardrailAdjustment[] = [];
  const primaryTagRepeatCount = args.candidateTags.primaryTagId
    ? args.recentHistory.recentPrimaryTagIds.filter(
        (tagId) => tagId === (args.candidateTags.primaryTagId as string),
      ).length
    : 0;
  const facetRepeatCount = args.candidateTags.facetIds.reduce(
    (count, facetId) =>
      count +
      args.recentHistory.recentFacetIds.filter(
        (recentFacetId) => recentFacetId === (facetId as string),
      ).length,
    0,
  );
  const undercoveredFacetDebt = args.candidateTags.facetIds.reduce(
    (maxDebt, facetId) =>
      Math.max(
        maxDebt,
        args.coverageState.facetDebtById.get(facetId as string) ?? 0,
      ),
    0,
  );
  const undercoveredTagDebt = args.candidateTags.tagIds.reduce(
    (maxDebt, tagId) =>
      Math.max(
        maxDebt,
        args.coverageState.tagDebtById.get(tagId as string) ?? 0,
      ),
    0,
  );
  const mostUndercoveredFacetId =
    args.candidateTags.facetIds.find(
      (facetId) =>
        (args.coverageState.facetDebtById.get(facetId as string) ?? 0) ===
        undercoveredFacetDebt,
    ) ?? null;
  const mostUndercoveredTagId =
    args.candidateTags.tagIds.find(
      (tagId) =>
        (args.coverageState.tagDebtById.get(tagId as string) ?? 0) ===
        undercoveredTagDebt,
    ) ?? null;

  if (undercoveredFacetDebt > 0.2) {
    adjustments.push({
      rule: 'undercovered_facet_boost',
      scoreDelta: clamp(
        undercoveredFacetDebt *
          (args.coverageState.coverageRatio < LOW_COVERAGE_RATIO ? 9 : 6),
        0,
        9,
      ),
      detail: `undercovered_facet_boost_${String(mostUndercoveredFacetId)
        .split(':')
        .pop()}`,
    });
  }

  if (undercoveredTagDebt > 0.25) {
    adjustments.push({
      rule: 'undercovered_tag_boost',
      scoreDelta: clamp(
        undercoveredTagDebt *
          (args.coverageState.coverageRatio < LOW_COVERAGE_RATIO ? 6 : 4),
        0,
        6,
      ),
      detail: `undercovered_tag_boost_${
        mostUndercoveredTagId
          ? (args.tagsById.get(mostUndercoveredTagId as string)?.slug ??
            mostUndercoveredTagId)
          : 'unknown'
      }`,
    });
  }

  if (primaryTagRepeatCount >= PRIMARY_TAG_STREAK_THRESHOLD) {
    adjustments.push({
      rule: 'primary_tag_streak_cap',
      scoreDelta: -clamp((primaryTagRepeatCount - 1) * 8, 0, 16),
      detail: `primary_tag_streak_penalty_${
        args.candidateTags.primaryTagId
          ? (args.tagsById.get(args.candidateTags.primaryTagId as string)
              ?.slug ?? args.candidateTags.primaryTagId)
          : 'none'
      }`,
    });
  }

  if (facetRepeatCount >= FACET_REPEAT_THRESHOLD) {
    adjustments.push({
      rule: 'facet_repeat_penalty',
      scoreDelta: -clamp((facetRepeatCount - 1) * 4, 0, 12),
      detail: `facet_repeat_penalty_${
        args.candidateTags.facetIds[0]
          ? String(args.candidateTags.facetIds[0]).split(':').pop()
          : 'none'
      }`,
    });
  }

  if (args.coverageState.coverageRatio < LOW_COVERAGE_RATIO) {
    const introducesNovelArea =
      (args.candidateTags.primaryTagId &&
        !args.recentHistory.recentPrimaryTagIds.includes(
          args.candidateTags.primaryTagId as string,
        )) ||
      args.candidateTags.facetIds.some(
        (facetId) =>
          !args.recentHistory.recentFacetIds.includes(facetId as string),
      );

    adjustments.push({
      rule: 'novelty_floor',
      scoreDelta: introducesNovelArea ? 4 : -3,
      detail: introducesNovelArea
        ? 'diversity_floor_boost_novel_area'
        : 'diversity_floor_penalty_repeated_area',
    });
  }

  return adjustments;
}

function toGuardrailComponent(
  adjustment: DeckGuardrailAdjustment,
): DeckCardScoreComponent {
  switch (adjustment.rule) {
    case 'undercovered_facet_boost':
      return {
        key: 'undercovered_facet_boost',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
    case 'undercovered_tag_boost':
      return {
        key: 'undercovered_tag_boost',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
    case 'novelty_floor':
      return {
        key: 'diversity_floor_boost',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
    case 'primary_tag_streak_cap':
      return {
        key: 'primary_tag_streak_penalty',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
    case 'facet_repeat_penalty':
      return {
        key: 'facet_repeat_penalty',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
    case 'fallback_relaxation':
      return {
        key: 'guardrail_fallback_adjustment',
        scoreDelta: adjustment.scoreDelta,
        detail: adjustment.detail,
      };
  }
}

function toGuardrailReason(
  adjustment: DeckGuardrailAdjustment,
): DeckSequenceReason {
  if (adjustment.rule === 'fallback_relaxation') {
    return {
      code: 'guardrail_fallback_applied',
      scoreDelta: adjustment.scoreDelta,
      detail: adjustment.detail,
    };
  }

  return {
    code:
      adjustment.scoreDelta >= 0
        ? 'guardrail_boost_applied'
        : 'guardrail_penalty_applied',
    scoreDelta: adjustment.scoreDelta,
    detail: adjustment.detail,
  };
}

function determineGuardrailPrimaryReason(
  baseReason: DeckSequencePrimaryReason,
  adjustments: DeckGuardrailAdjustment[],
): DeckSequencePrimaryReason {
  const coverageBoost = adjustments
    .filter(
      (adjustment) =>
        adjustment.rule === 'undercovered_facet_boost' ||
        adjustment.rule === 'undercovered_tag_boost',
    )
    .reduce((total, adjustment) => total + adjustment.scoreDelta, 0);
  const diversityBoost = adjustments
    .filter(
      (adjustment) =>
        adjustment.rule === 'novelty_floor' && adjustment.scoreDelta > 0,
    )
    .reduce((total, adjustment) => total + adjustment.scoreDelta, 0);

  if (coverageBoost >= 4) {
    return 'clarify_low_coverage_tag';
  }

  if (diversityBoost > 0 && baseReason !== 'reinforce_positive_area') {
    return 'probe_adjacent_tag';
  }

  return baseReason;
}

function annotateEntry(args: {
  entry: DeckSequenceQueueEntry;
  adjustments: DeckGuardrailAdjustment[];
  coverageDebt: DeckCoverageDebt[];
  fallbackApplied: boolean;
  fallbackReason: string | null;
  baseRank: number;
  tagsById: Map<string, DeckTag>;
}): DeckSequenceQueueEntry {
  const baseScore = getBaseScore(args.entry.decision);
  const guardrailScore = args.adjustments.reduce(
    (total, adjustment) => total + adjustment.scoreDelta,
    0,
  );
  const guardrailComponents = args.adjustments.map(toGuardrailComponent);
  const guardrailReasons = args.adjustments.map(toGuardrailReason);
  const breakdown = args.entry.decision.breakdown
    ? {
        ...args.entry.decision.breakdown,
        baseScore,
        guardrailScore,
        totalScore: baseScore + guardrailScore,
        components: [
          ...args.entry.decision.breakdown.components,
          ...guardrailComponents,
        ],
      }
    : undefined;
  const guardrails: DeckGuardrailDecision = {
    baseScore,
    finalScore: baseScore + guardrailScore,
    baseRank: args.baseRank,
    finalRank: args.baseRank,
    winnerChanged: false,
    fallbackApplied: args.fallbackApplied,
    fallbackReason: args.fallbackReason,
    coverageDebt: args.coverageDebt,
    adjustments: args.adjustments,
  };

  return {
    card: args.entry.card,
    decision: {
      ...args.entry.decision,
      score: baseScore + guardrailScore,
      primaryReason: determineGuardrailPrimaryReason(
        args.entry.decision.primaryReason,
        args.adjustments,
      ),
      reasons: [...args.entry.decision.reasons, ...guardrailReasons],
      breakdown,
      guardrails,
    },
  };
}

function shouldRelaxGuardrails(entries: DeckSequenceQueueEntry[]): boolean {
  if (entries.length === 0) {
    return false;
  }

  return entries.every((entry) => {
    const adjustments = entry.decision.guardrails?.adjustments ?? [];

    return (
      adjustments.length > 0 &&
      adjustments.every((adjustment) => adjustment.scoreDelta <= 0)
    );
  });
}

function relaxAdjustments(
  adjustments: DeckGuardrailAdjustment[],
): DeckGuardrailAdjustment[] {
  const relaxed = adjustments.map((adjustment) => {
    if (
      adjustment.rule === 'primary_tag_streak_cap' ||
      adjustment.rule === 'facet_repeat_penalty' ||
      adjustment.rule === 'novelty_floor'
    ) {
      return {
        ...adjustment,
        scoreDelta: adjustment.scoreDelta * 0.5,
        detail: `${adjustment.detail}_relaxed`,
      };
    }

    return adjustment;
  });

  relaxed.push({
    rule: 'fallback_relaxation',
    scoreDelta: 0,
    detail: 'guardrail_fallback_relaxed_recent_constraints',
  });

  return relaxed;
}

export function applySequenceGuardrails(
  context: SequenceGuardrailContext,
  baseEntries: DeckSequenceQueueEntry[],
): DeckSequenceQueueEntry[] {
  if (context.deck.isCustom || baseEntries.length === 0) {
    return baseEntries;
  }

  const tagsById = new Map(
    context.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const recentHistory = buildRecentSequenceHistory(
    context.recentSwipeEvents,
    context.cardTagLinksByCardId,
    tagsById,
  );
  const coverageState = buildCoverageState(context.tagStates, tagsById);

  const annotated = baseEntries.map((entry, index) => {
    const candidateTags = buildCandidateTagContext(
      entry.card.id as string,
      context.cardTagLinksByCardId,
      tagsById,
    );
    const adjustments = buildGuardrailAdjustments({
      candidateTags,
      coverageState,
      recentHistory,
      tagsById,
    });

    return annotateEntry({
      entry,
      adjustments,
      coverageDebt: buildCoverageDebt(candidateTags, coverageState, tagsById),
      fallbackApplied: false,
      fallbackReason: null,
      baseRank: index,
      tagsById,
    });
  });

  const relaxed = shouldRelaxGuardrails(annotated)
    ? annotated.map((entry) =>
        annotateEntry({
          entry: {
            ...entry,
            decision: {
              ...entry.decision,
              score: getBaseScore(entry.decision),
              breakdown: entry.decision.breakdown
                ? {
                    ...entry.decision.breakdown,
                    totalScore:
                      entry.decision.breakdown.baseScore ??
                      entry.decision.breakdown.totalScore,
                    guardrailScore: 0,
                    components: entry.decision.breakdown.components.filter(
                      (component) =>
                        ![
                          'undercovered_facet_boost',
                          'undercovered_tag_boost',
                          'diversity_floor_boost',
                          'primary_tag_streak_penalty',
                          'facet_repeat_penalty',
                          'guardrail_fallback_adjustment',
                        ].includes(component.key),
                    ),
                  }
                : undefined,
              reasons: entry.decision.reasons.filter(
                (reason) =>
                  ![
                    'guardrail_boost_applied',
                    'guardrail_penalty_applied',
                    'guardrail_fallback_applied',
                  ].includes(reason.code),
              ),
            },
          },
          adjustments: relaxAdjustments(
            entry.decision.guardrails?.adjustments ?? [],
          ),
          coverageDebt: entry.decision.guardrails?.coverageDebt ?? [],
          fallbackApplied: true,
          fallbackReason: 'relaxed_recent_constraints',
          baseRank: entry.decision.guardrails?.baseRank ?? 0,
          tagsById,
        }),
      )
    : annotated;

  const baseWinnerId = baseEntries[0]?.card.id ?? null;
  const finalEntries = [...relaxed].sort(compareQueueEntries);
  const finalWinnerId = finalEntries[0]?.card.id ?? null;
  const winnerChanged = baseWinnerId !== null && finalWinnerId !== baseWinnerId;

  return finalEntries.map((entry, index) => ({
    card: entry.card,
    decision: entry.decision.guardrails
      ? {
          ...entry.decision,
          guardrails: {
            ...entry.decision.guardrails,
            finalRank: index,
            winnerChanged: winnerChanged && entry.card.id === finalWinnerId,
          },
        }
      : entry.decision,
  }));
}
