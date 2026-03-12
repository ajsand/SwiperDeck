import type {
  DeckCard,
  DeckCardId,
  DeckTagFacetId,
  DeckTagId,
} from '@/types/domain';

export const DECK_SEQUENCE_STAGES = ['broad_start', 'adaptive'] as const;
export type DeckSequenceStage = (typeof DECK_SEQUENCE_STAGES)[number];

export const DECK_SEQUENCE_REASON_CODES = [
  'undercovered_facet',
  'undercovered_tag',
  'tag_affinity_signal',
  'coverage_bonus_applied',
  'novelty_bonus_applied',
  'representative_pick',
  'repeat_penalty_applied',
  'presentation_recency_penalty_applied',
  'already_seen_penalty_applied',
  'guardrail_boost_applied',
  'guardrail_penalty_applied',
  'guardrail_fallback_applied',
  'retest_candidate_selected',
  'fallback_order',
] as const;
export type DeckSequenceReasonCode =
  (typeof DECK_SEQUENCE_REASON_CODES)[number];

export const DECK_SEQUENCE_PRIMARY_REASONS = [
  'reinforce_positive_area',
  'probe_adjacent_tag',
  'clarify_low_coverage_tag',
  'retest_ambiguity',
  'reaffirm_stability',
  'revisit_compare_area',
  'fallback_order',
] as const;
export type DeckSequencePrimaryReason =
  (typeof DECK_SEQUENCE_PRIMARY_REASONS)[number];

export const DECK_CARD_SCORE_COMPONENT_KEYS = [
  'tag_affinity',
  'card_affinity',
  'coverage_bonus',
  'novelty_bonus',
  'representative_prior',
  'recent_repeat_penalty',
  'presentation_recency_penalty',
  'already_seen_penalty',
  'undercovered_facet_boost',
  'undercovered_tag_boost',
  'diversity_floor_boost',
  'primary_tag_streak_penalty',
  'facet_repeat_penalty',
  'guardrail_fallback_adjustment',
  'retest_priority_boost',
] as const;
export type DeckCardScoreComponentKey =
  (typeof DECK_CARD_SCORE_COMPONENT_KEYS)[number];

export const DECK_RETEST_REASONS = [
  'ambiguous_tag_signal',
  'mixed_card_signal',
  'stability_check',
  'important_compare_area',
] as const;
export type DeckRetestReason = (typeof DECK_RETEST_REASONS)[number];

export const DECK_GUARDRAIL_RULES = [
  'undercovered_facet_boost',
  'undercovered_tag_boost',
  'novelty_floor',
  'primary_tag_streak_cap',
  'facet_repeat_penalty',
  'fallback_relaxation',
] as const;
export type DeckGuardrailRule = (typeof DECK_GUARDRAIL_RULES)[number];

export interface DeckCardScoreComponent {
  key: DeckCardScoreComponentKey;
  scoreDelta: number;
  detail: string;
}

export interface DeckCardScoreBreakdown {
  baseScore?: number;
  guardrailScore?: number;
  totalScore: number;
  primaryTagId: DeckTagId | null;
  tagIds: DeckTagId[];
  components: DeckCardScoreComponent[];
}

export interface DeckCoverageDebt {
  kind: 'facet' | 'tag';
  facetId: DeckTagFacetId | null;
  tagId: DeckTagId | null;
  debt: number;
  detail: string;
}

export interface DeckGuardrailAdjustment {
  rule: DeckGuardrailRule;
  scoreDelta: number;
  detail: string;
}

export interface DeckGuardrailDecision {
  baseScore: number;
  finalScore: number;
  baseRank: number;
  finalRank: number;
  winnerChanged: boolean;
  fallbackApplied: boolean;
  fallbackReason: string | null;
  coverageDebt: DeckCoverageDebt[];
  adjustments: DeckGuardrailAdjustment[];
}

export interface DeckRetestCandidate {
  cardId: DeckCardId;
  reason: DeckRetestReason;
  priorityScore: number;
  retestCount: number;
  lastShownAt: number;
  lastRetestAt: number | null;
  retestDueAt: number;
  otherCardsSinceLastShown: number;
  cooldownSatisfied: boolean;
  recentRetestGapSatisfied: boolean;
  maxRetestsReached: boolean;
}

export interface DeckRetestDecision {
  reason: DeckRetestReason;
  priorityScore: number;
  retestCount: number;
  lastShownAt: number;
  lastRetestAt: number | null;
  retestDueAt: number;
  selectedBecause: string;
}

export interface DeckSequenceReason {
  code: DeckSequenceReasonCode;
  scoreDelta: number;
  detail: string;
}

export interface DeckSequenceDecision {
  cardId: DeckCardId;
  stage: DeckSequenceStage;
  score: number;
  primaryReason: DeckSequencePrimaryReason;
  reasons: DeckSequenceReason[];
  breakdown?: DeckCardScoreBreakdown;
  guardrails?: DeckGuardrailDecision;
  retest?: DeckRetestDecision;
}

export interface DeckAdaptiveSequenceDecision extends DeckSequenceDecision {
  stage: 'adaptive';
  breakdown: DeckCardScoreBreakdown;
}

export interface DeckSequenceQueueEntry {
  card: DeckCard;
  decision: DeckSequenceDecision;
}
