import type {
  DeckCardId,
  DeckCardTagLink,
  DeckTag,
  DeckTagFacetId,
  DeckTagId,
  DeckTagState,
} from '@/types/domain';

import {
  buildDeckSequenceQueueEntries,
  determineDeckSequenceStage,
  type BroadStartSequenceContext,
} from './broadStartStrategy';
import {
  buildSequenceExplainability,
  explainSequenceDecision,
  type DeckSequenceExplainability,
} from './explainSequenceDecision';
import type {
  DeckRetestReason,
  DeckSequencePrimaryReason,
  DeckSequenceQueueEntry,
  DeckSequenceStage,
} from './deckSequenceTypes';

export const DECK_SEQUENCE_CONFIDENCE_DRIVERS = [
  'new_tag_coverage',
  'new_facet_coverage',
  'low_coverage_clarification',
  'guardrail_coverage_recovery',
  'ambiguity_retest',
  'stability_retest',
  'compare_area_retest',
] as const;
export type DeckSequenceConfidenceDriver =
  (typeof DECK_SEQUENCE_CONFIDENCE_DRIVERS)[number];

export interface DeckSequenceEvaluationCandidate {
  rank: number;
  cardId: DeckCardId;
  stage: DeckSequenceStage;
  score: number;
  primaryReason: DeckSequencePrimaryReason;
  explanation: string | null;
  retestReason: DeckRetestReason | null;
  guardrailWinnerChanged: boolean;
}

export interface DeckSequenceEvaluationMetrics {
  seenCardCount: number;
  remainingCardCount: number;
  currentTagCoverageRatio: number;
  projectedTagCoverageRatio: number;
  currentFacetCoverageRatio: number;
  projectedFacetCoverageRatio: number;
  rollingTagDiversity: number;
  rollingFacetDiversity: number;
  selectedCardSeenBefore: boolean;
  selectedIntroducesNovelTag: boolean;
  selectedIntroducesNovelFacet: boolean;
  noveltyFloorSatisfied: boolean;
  selectedCoverageDebt: number;
  guardrailAdjusted: boolean;
  guardrailWinnerChanged: boolean;
  retestSelected: boolean;
  retestReason: DeckRetestReason | null;
  retestPriorityScore: number | null;
  confidenceBuildingDrivers: DeckSequenceConfidenceDriver[];
}

export interface DeckSequenceEvaluationResult {
  stage: DeckSequenceStage;
  queue: DeckSequenceQueueEntry[];
  candidates: DeckSequenceEvaluationCandidate[];
  selected: DeckSequenceEvaluationCandidate | null;
  explanation: DeckSequenceExplainability | null;
  metrics: DeckSequenceEvaluationMetrics | null;
}

interface CoverageSnapshot {
  seenTagCount: number;
  seenFacetCount: number;
  tagCoverageRatio: number;
  facetCoverageRatio: number;
  seenFacetIds: Set<string>;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function calculateCoverageSnapshot(
  tags: DeckTag[],
  tagStates: DeckTagState[],
): CoverageSnapshot {
  if (tags.length === 0) {
    return {
      seenTagCount: 0,
      seenFacetCount: 0,
      tagCoverageRatio: 1,
      facetCoverageRatio: 1,
      seenFacetIds: new Set(),
    };
  }

  const tagsById = new Map(tags.map((tag) => [tag.id as string, tag] as const));
  const tagStatesById = new Map(
    tagStates.map((state) => [state.tagId as string, state] as const),
  );
  const seenTagIds = tags
    .filter(
      (tag) => (tagStatesById.get(tag.id as string)?.exposureCount ?? 0) > 0,
    )
    .map((tag) => tag.id as string);
  const seenFacetIds = new Set(
    seenTagIds
      .map((tagId) => tagsById.get(tagId)?.facetId as string | undefined)
      .filter((facetId): facetId is string => Boolean(facetId)),
  );
  const allFacetIds = uniqueStrings(
    tags.map((tag) => tag.facetId as string | undefined),
  );

  return {
    seenTagCount: seenTagIds.length,
    seenFacetCount: seenFacetIds.size,
    tagCoverageRatio: seenTagIds.length / tags.length,
    facetCoverageRatio:
      allFacetIds.length === 0 ? 1 : seenFacetIds.size / allFacetIds.length,
    seenFacetIds,
  };
}

function calculateProjectedCoverage(args: {
  tags: DeckTag[];
  tagStates: DeckTagState[];
  selectedTagIds: DeckTagId[];
  selectedFacetIds: DeckTagFacetId[];
}): Pick<
  DeckSequenceEvaluationMetrics,
  | 'currentTagCoverageRatio'
  | 'projectedTagCoverageRatio'
  | 'currentFacetCoverageRatio'
  | 'projectedFacetCoverageRatio'
  | 'selectedIntroducesNovelTag'
  | 'selectedIntroducesNovelFacet'
> {
  const snapshot = calculateCoverageSnapshot(args.tags, args.tagStates);
  const tagStatesById = new Map(
    args.tagStates.map((state) => [state.tagId as string, state] as const),
  );
  const novelTagIds = uniqueStrings(
    args.selectedTagIds
      .filter(
        (tagId) =>
          (tagStatesById.get(tagId as string)?.exposureCount ?? 0) === 0,
      )
      .map((tagId) => tagId as string),
  );
  const novelFacetIds = uniqueStrings(
    args.selectedFacetIds
      .filter((facetId) => !snapshot.seenFacetIds.has(facetId as string))
      .map((facetId) => facetId as string),
  );
  const allFacetIds = uniqueStrings(
    args.tags.map((tag) => tag.facetId as string | undefined),
  );

  return {
    currentTagCoverageRatio: snapshot.tagCoverageRatio,
    projectedTagCoverageRatio:
      args.tags.length === 0
        ? 1
        : (snapshot.seenTagCount + novelTagIds.length) / args.tags.length,
    currentFacetCoverageRatio: snapshot.facetCoverageRatio,
    projectedFacetCoverageRatio:
      allFacetIds.length === 0
        ? 1
        : (snapshot.seenFacetCount + novelFacetIds.length) / allFacetIds.length,
    selectedIntroducesNovelTag: novelTagIds.length > 0,
    selectedIntroducesNovelFacet: novelFacetIds.length > 0,
  };
}

function calculateDiversity(values: Array<string | null | undefined>): number {
  const normalized = values.filter((value): value is string => Boolean(value));

  if (normalized.length === 0) {
    return 1;
  }

  return new Set(normalized).size / normalized.length;
}

function calculateRollingDiversity(args: {
  selectedPrimaryTagId: DeckTagId | null;
  selectedFacetIds: DeckTagFacetId[];
  recentPrimaryTagIds: string[];
  recentFacetIds: string[];
}): Pick<
  DeckSequenceEvaluationMetrics,
  'rollingTagDiversity' | 'rollingFacetDiversity'
> {
  return {
    rollingTagDiversity: calculateDiversity([
      args.selectedPrimaryTagId as string | null,
      ...args.recentPrimaryTagIds,
    ]),
    rollingFacetDiversity: calculateDiversity([
      ...args.selectedFacetIds.map((facetId) => facetId as string),
      ...args.recentFacetIds,
    ]),
  };
}

function buildRecentHistory(context: BroadStartSequenceContext): {
  recentPrimaryTagIds: string[];
  recentFacetIds: string[];
} {
  const tagsById = new Map(
    context.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const recentPrimaryTagIds: string[] = [];
  const recentFacetIds: string[] = [];

  for (const event of context.recentSwipeEvents.slice(0, 4)) {
    const links =
      (context.cardTagLinksByCardId.get(event.cardId as string) as
        | DeckCardTagLink[]
        | undefined) ?? [];
    const primary = links.find((link) => link.role === 'primary') ?? links[0];

    if (!primary) {
      continue;
    }

    recentPrimaryTagIds.push(primary.tagId as string);

    const facetId = tagsById.get(primary.tagId as string)?.facetId;
    if (facetId) {
      recentFacetIds.push(facetId as string);
    }
  }

  return {
    recentPrimaryTagIds,
    recentFacetIds,
  };
}

function buildConfidenceDrivers(args: {
  entry: DeckSequenceQueueEntry;
  projectedCoverage: ReturnType<typeof calculateProjectedCoverage>;
}): DeckSequenceConfidenceDriver[] {
  const drivers: DeckSequenceConfidenceDriver[] = [];

  if (
    args.projectedCoverage.projectedTagCoverageRatio >
    args.projectedCoverage.currentTagCoverageRatio
  ) {
    drivers.push('new_tag_coverage');
  }

  if (
    args.projectedCoverage.projectedFacetCoverageRatio >
    args.projectedCoverage.currentFacetCoverageRatio
  ) {
    drivers.push('new_facet_coverage');
  }

  if (args.entry.decision.primaryReason === 'clarify_low_coverage_tag') {
    drivers.push('low_coverage_clarification');
  }

  if (args.entry.decision.guardrails?.winnerChanged) {
    drivers.push('guardrail_coverage_recovery');
  }

  if (
    args.entry.decision.retest?.reason === 'ambiguous_tag_signal' ||
    args.entry.decision.retest?.reason === 'mixed_card_signal'
  ) {
    drivers.push('ambiguity_retest');
  }

  if (args.entry.decision.retest?.reason === 'stability_check') {
    drivers.push('stability_retest');
  }

  if (args.entry.decision.retest?.reason === 'important_compare_area') {
    drivers.push('compare_area_retest');
  }

  return drivers;
}

function mapCandidate(
  entry: DeckSequenceQueueEntry,
  rank: number,
): DeckSequenceEvaluationCandidate {
  return {
    rank,
    cardId: entry.card.id,
    stage: entry.decision.stage,
    score: entry.decision.score,
    primaryReason: entry.decision.primaryReason,
    explanation: explainSequenceDecision(entry.decision),
    retestReason: entry.decision.retest?.reason ?? null,
    guardrailWinnerChanged: entry.decision.guardrails?.winnerChanged ?? false,
  };
}

function buildMetrics(
  context: BroadStartSequenceContext,
  selectedEntry: DeckSequenceQueueEntry | null,
): DeckSequenceEvaluationMetrics | null {
  if (!selectedEntry) {
    return null;
  }

  const tagsById = new Map(
    context.tags.map((tag) => [tag.id as string, tag] as const),
  );
  const selectedLinks =
    context.cardTagLinksByCardId.get(selectedEntry.card.id as string) ?? [];
  const selectedPrimaryTagId =
    selectedLinks.find((link) => link.role === 'primary')?.tagId ??
    selectedLinks[0]?.tagId ??
    null;
  const selectedTagIds = uniqueStrings(
    selectedLinks.map((link) => link.tagId as string),
  ).map((tagId) => tagId as DeckTagId);
  const selectedFacetIds = uniqueStrings(
    selectedTagIds.map(
      (tagId) => tagsById.get(tagId as string)?.facetId as string | undefined,
    ),
  ).map((facetId) => facetId as DeckTagFacetId);
  const projectedCoverage = calculateProjectedCoverage({
    tags: context.tags,
    tagStates: context.tagStates,
    selectedTagIds,
    selectedFacetIds,
  });
  const recentHistory = buildRecentHistory(context);
  const diversity = calculateRollingDiversity({
    selectedPrimaryTagId,
    selectedFacetIds,
    recentPrimaryTagIds: recentHistory.recentPrimaryTagIds,
    recentFacetIds: recentHistory.recentFacetIds,
  });
  const diversityFloorComponent =
    selectedEntry.decision.breakdown?.components.find(
      (component) => component.key === 'diversity_floor_boost',
    );
  const selectedCoverageDebt = Math.max(
    0,
    ...(selectedEntry.decision.guardrails?.coverageDebt ?? []).map(
      (debt) => debt.debt,
    ),
  );
  const confidenceBuildingDrivers = buildConfidenceDrivers({
    entry: selectedEntry,
    projectedCoverage,
  });
  const remainingCardCount = context.allCards.filter(
    (card) => !context.seenCardIds.has(card.id),
  ).length;

  return {
    seenCardCount: context.seenCardIds.size,
    remainingCardCount,
    currentTagCoverageRatio: projectedCoverage.currentTagCoverageRatio,
    projectedTagCoverageRatio: projectedCoverage.projectedTagCoverageRatio,
    currentFacetCoverageRatio: projectedCoverage.currentFacetCoverageRatio,
    projectedFacetCoverageRatio: projectedCoverage.projectedFacetCoverageRatio,
    rollingTagDiversity: diversity.rollingTagDiversity,
    rollingFacetDiversity: diversity.rollingFacetDiversity,
    selectedCardSeenBefore: context.seenCardIds.has(selectedEntry.card.id),
    selectedIntroducesNovelTag: projectedCoverage.selectedIntroducesNovelTag,
    selectedIntroducesNovelFacet:
      projectedCoverage.selectedIntroducesNovelFacet,
    noveltyFloorSatisfied:
      projectedCoverage.currentTagCoverageRatio >= 0.85 ||
      projectedCoverage.selectedIntroducesNovelTag ||
      projectedCoverage.selectedIntroducesNovelFacet ||
      (diversityFloorComponent?.scoreDelta ?? 0) >= 0,
    selectedCoverageDebt,
    guardrailAdjusted:
      (selectedEntry.decision.guardrails?.adjustments.length ?? 0) > 0,
    guardrailWinnerChanged:
      selectedEntry.decision.guardrails?.winnerChanged ?? false,
    retestSelected: Boolean(selectedEntry.decision.retest),
    retestReason: selectedEntry.decision.retest?.reason ?? null,
    retestPriorityScore: selectedEntry.decision.retest?.priorityScore ?? null,
    confidenceBuildingDrivers,
  };
}

export function evaluateDeckSequenceScenario(
  context: BroadStartSequenceContext,
  options: { candidateLimit?: number } = {},
): DeckSequenceEvaluationResult {
  const queue = buildDeckSequenceQueueEntries(context);
  const selectedEntry = queue[0] ?? null;
  const candidateLimit = options.candidateLimit ?? 5;

  return {
    stage: selectedEntry?.decision.stage ?? determineDeckSequenceStage(context),
    queue,
    candidates: queue.slice(0, candidateLimit).map(mapCandidate),
    selected: selectedEntry ? mapCandidate(selectedEntry, 0) : null,
    explanation: buildSequenceExplainability(selectedEntry?.decision ?? null),
    metrics: buildMetrics(context, selectedEntry),
  };
}
