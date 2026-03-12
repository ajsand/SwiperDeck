import type {
  DeckCardScoreComponent,
  DeckCoverageDebt,
  DeckGuardrailAdjustment,
  DeckRetestDecision,
  DeckSequenceDecision,
  DeckSequenceReason,
  DeckSequenceStage,
} from './deckSequenceTypes';

export interface DeckSequenceExplainability {
  cardId: DeckSequenceDecision['cardId'];
  stage: DeckSequenceStage;
  score: number;
  primaryReason: DeckSequenceDecision['primaryReason'];
  summary: string;
  topComponents: DeckCardScoreComponent[];
  reasons: DeckSequenceReason[];
  guardrails: {
    adjustments: DeckGuardrailAdjustment[];
    coverageDebt: DeckCoverageDebt[];
    fallbackApplied: boolean;
    fallbackReason: string | null;
    winnerChanged: boolean;
  } | null;
  retest: DeckRetestDecision | null;
}

function formatReasonDetail(detail: string): string {
  return detail.replace(/_/g, ' ');
}

function formatPrimaryReason(
  reason: DeckSequenceDecision['primaryReason'],
): string {
  return reason.replace(/_/g, ' ');
}

function formatRetestReason(
  reason: NonNullable<DeckSequenceDecision['retest']>['reason'],
): string {
  return reason.replace(/_/g, ' ');
}

function getTopComponents(
  decision: DeckSequenceDecision,
): DeckCardScoreComponent[] {
  return (
    decision.breakdown?.components
      .filter((component) => Math.abs(component.scoreDelta) > 0.01)
      .sort(
        (left, right) => Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta),
      )
      .slice(0, 5) ?? []
  );
}

export function buildSequenceExplainability(
  decision: DeckSequenceDecision | null,
): DeckSequenceExplainability | null {
  if (!decision) {
    return null;
  }

  return {
    cardId: decision.cardId,
    stage: decision.stage,
    score: decision.score,
    primaryReason: decision.primaryReason,
    summary:
      explainSequenceDecision(decision) ??
      formatPrimaryReason(decision.primaryReason),
    topComponents: getTopComponents(decision),
    reasons: decision.reasons,
    guardrails: decision.guardrails
      ? {
          adjustments: decision.guardrails.adjustments,
          coverageDebt: decision.guardrails.coverageDebt,
          fallbackApplied: decision.guardrails.fallbackApplied,
          fallbackReason: decision.guardrails.fallbackReason,
          winnerChanged: decision.guardrails.winnerChanged,
        }
      : null,
    retest: decision.retest ?? null,
  };
}

export function explainSequenceDecision(
  decision: DeckSequenceDecision | null,
): string | null {
  if (!decision) {
    return null;
  }

  const componentDetails =
    getTopComponents(decision)
      .slice(0, 3)
      .map((component) => formatReasonDetail(component.detail)) ?? [];
  const reasonDetails = decision.reasons
    .map((reason) => formatReasonDetail(reason.detail))
    .filter((detail, index, values) => values.indexOf(detail) === index);
  const retestDetails = decision.retest
    ? [
        formatRetestReason(decision.retest.reason),
        formatReasonDetail(decision.retest.selectedBecause),
      ]
    : [];
  const details = [
    ...retestDetails,
    ...componentDetails,
    ...reasonDetails,
  ].filter((detail, index, values) => values.indexOf(detail) === index);

  if (details.length === 0) {
    if (
      decision.guardrails?.fallbackApplied &&
      decision.guardrails.fallbackReason
    ) {
      return `${formatPrimaryReason(decision.primaryReason)}: ${formatReasonDetail(
        decision.guardrails.fallbackReason,
      )}`;
    }

    return formatPrimaryReason(decision.primaryReason);
  }

  if (
    decision.guardrails?.fallbackApplied &&
    decision.guardrails.fallbackReason
  ) {
    details.push(formatReasonDetail(decision.guardrails.fallbackReason));
  }

  return `${formatPrimaryReason(decision.primaryReason)}: ${details.join(', ')}`;
}
