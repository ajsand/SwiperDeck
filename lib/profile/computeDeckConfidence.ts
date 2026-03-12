import type {
  DeckProfileActionHint,
  DeckProfileConfidence,
  DeckProfileReadiness,
  DeckProfileStage,
} from '@/types/domain';

export interface ComputeDeckConfidenceInput {
  swipeCount: number;
  minCardsForProfile: number;
  minCardsForCompare: number;
  cardCoverage: number;
  tagCoverage: number;
  facetCoverage: number;
  ambiguityRatio: number;
  stabilityScore: number;
  retestPendingCount: number;
}

export interface ComputedDeckConfidence {
  confidence: DeckProfileConfidence;
  stage: DeckProfileStage;
  readiness: DeckProfileReadiness;
  nextSteps: DeckProfileActionHint[];
}

const HIGH_CONFIDENCE_THRESHOLD = 0.76;
const HIGH_CONFIDENCE_CARD_COVERAGE = 0.5;
const HIGH_CONFIDENCE_TAG_COVERAGE = 0.75;
const HIGH_CONFIDENCE_FACET_COVERAGE = 0.75;
const HIGH_CONFIDENCE_AMBIGUITY = 0.35;
const HIGH_CONFIDENCE_STABILITY = 0.55;

const COMPARE_READY_CARD_COVERAGE = 0.4;
const COMPARE_READY_TAG_COVERAGE = 0.6;
const COMPARE_READY_FACET_COVERAGE = 0.7;
const COMPARE_READY_AMBIGUITY = 0.45;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function confidenceLabel(value: number): 'low' | 'medium' | 'high' {
  if (value >= 0.72) {
    return 'high';
  }

  if (value >= 0.4) {
    return 'medium';
  }

  return 'low';
}

function sortHints(left: DeckProfileActionHint, right: DeckProfileActionHint) {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }

  return left.title.localeCompare(right.title);
}

export function computeDeckConfidence(
  input: ComputeDeckConfidenceInput,
): ComputedDeckConfidence {
  const swipeSignal = clamp01(
    input.swipeCount / Math.max(1, input.minCardsForCompare),
  );
  const confidenceValue = clamp01(
    swipeSignal * 0.3 +
      input.cardCoverage * 0.15 +
      input.tagCoverage * 0.2 +
      input.facetCoverage * 0.15 +
      input.stabilityScore * 0.2 -
      input.ambiguityRatio * 0.18,
  );
  const confidence: DeckProfileConfidence = {
    value: confidenceValue,
    label: confidenceLabel(confidenceValue),
    swipeCount: input.swipeCount,
    cardCoverage: input.cardCoverage,
    components: {
      swipeSignal,
      cardCoverage: clamp01(input.cardCoverage),
      tagCoverage: clamp01(input.tagCoverage),
      facetCoverage: clamp01(input.facetCoverage),
      stability: clamp01(input.stabilityScore),
      ambiguityPenalty: clamp01(input.ambiguityRatio),
    },
  };

  let stage: DeckProfileStage = 'lightweight';

  if (
    input.swipeCount >= input.minCardsForCompare &&
    confidenceValue >= HIGH_CONFIDENCE_THRESHOLD &&
    input.cardCoverage >= HIGH_CONFIDENCE_CARD_COVERAGE &&
    input.tagCoverage >= HIGH_CONFIDENCE_TAG_COVERAGE &&
    input.facetCoverage >= HIGH_CONFIDENCE_FACET_COVERAGE &&
    input.ambiguityRatio <= HIGH_CONFIDENCE_AMBIGUITY &&
    input.stabilityScore >= HIGH_CONFIDENCE_STABILITY
  ) {
    stage = 'high_confidence';
  } else if (input.swipeCount >= input.minCardsForProfile) {
    stage = 'meaningful';
  }

  const blockers: DeckProfileReadiness['blockers'] = [];

  if (input.swipeCount < input.minCardsForCompare) {
    blockers.push('not_enough_swipes');
  }

  if (input.cardCoverage < COMPARE_READY_CARD_COVERAGE) {
    blockers.push('not_enough_card_coverage');
  }

  if (input.tagCoverage < COMPARE_READY_TAG_COVERAGE) {
    blockers.push('not_enough_tag_coverage');
  }

  if (input.facetCoverage < COMPARE_READY_FACET_COVERAGE) {
    blockers.push('not_enough_facet_coverage');
  }

  if (input.ambiguityRatio > COMPARE_READY_AMBIGUITY) {
    blockers.push('high_ambiguity');
  }

  if (input.retestPendingCount > 0) {
    blockers.push('retest_needed');
  }

  const readiness: DeckProfileReadiness = {
    compareReady: blockers.length === 0 && stage !== 'lightweight',
    blockers,
  };

  const nextSteps: DeckProfileActionHint[] = [];

  if (input.swipeCount < input.minCardsForProfile) {
    nextSteps.push({
      kind: 'keep_swiping',
      title: 'Keep swiping',
      detail:
        'You have an early read, but this deck needs more cards before the profile becomes meaningful.',
      priority: 0,
    });
  }

  if (
    input.tagCoverage < COMPARE_READY_TAG_COVERAGE ||
    input.facetCoverage < COMPARE_READY_FACET_COVERAGE
  ) {
    nextSteps.push({
      kind: 'more_breadth_needed',
      title: 'Broaden coverage',
      detail:
        'Cover more themes inside this deck so later compare and report output is not lopsided.',
      priority: stage === 'lightweight' ? 2 : 0,
    });
  }

  if (input.retestPendingCount > 0) {
    nextSteps.push({
      kind: 'retest_pending',
      title: 'Revisit uncertain areas',
      detail:
        'Some themes still need reaffirmation before the profile is stable enough to trust.',
      priority: stage === 'high_confidence' ? 1 : 0,
    });
  }

  if (readiness.compareReady) {
    nextSteps.push({
      kind: 'compare_ready',
      title: 'Compare ready',
      detail:
        'This deck now has enough breadth, confidence, and stability for a deck-scoped compare flow.',
      priority: 0,
    });
  }

  return {
    confidence,
    stage,
    readiness,
    nextSteps: nextSteps.sort(sortHints),
  };
}
