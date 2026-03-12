import type { DeckId } from './ids';

export const DECK_COMPARE_READINESS_STATES = [
  'not_started',
  'early_profile',
  'needs_more_breadth',
  'needs_more_stability',
  'compare_ready',
  'compare_ready_with_caution',
  'unavailable',
] as const;

export type DeckCompareReadinessState =
  (typeof DECK_COMPARE_READINESS_STATES)[number];

export const DECK_COMPARE_READINESS_REASONS = [
  'deck_policy_blocked',
  'custom_deck_not_supported',
  'no_profile_signal',
  'not_enough_swipes',
  'not_enough_card_coverage',
  'not_enough_tag_coverage',
  'not_enough_facet_coverage',
  'high_ambiguity',
  'retest_needed',
  'sensitive_threshold_not_met',
  'sensitive_tag_caution',
  'sensitive_deck',
  'gated_deck',
] as const;

export type DeckCompareReadinessReason =
  (typeof DECK_COMPARE_READINESS_REASONS)[number];

export interface DeckCompareReasonDetail {
  reason: DeckCompareReadinessReason;
  title: string;
  detail: string;
}

export interface DeckCompareReadiness {
  deckId: DeckId;
  state: DeckCompareReadinessState;
  ready: boolean;
  caution: boolean;
  title: string;
  detail: string;
  reasons: DeckCompareReasonDetail[];
  recommendedAction: string;
}

export const DECK_COMPARE_EXPORT_CATEGORIES = [
  'deck_metadata',
  'confidence_summary',
  'theme_summary',
  'unresolved_areas',
  'minimal_card_examples',
] as const;

export type DeckCompareExportCategory =
  (typeof DECK_COMPARE_EXPORT_CATEGORIES)[number];

export interface DeckCompareExportPreviewItem {
  category: DeckCompareExportCategory;
  title: string;
  detail: string;
}

export const DECK_COMPARE_CONSENT_CONFIRMATION_IDS = [
  'same_deck',
  'explicit_consent',
  'export_preview',
] as const;

export type DeckCompareConsentConfirmationId =
  (typeof DECK_COMPARE_CONSENT_CONFIRMATION_IDS)[number];

export interface DeckCompareConsentConfirmation {
  id: DeckCompareConsentConfirmationId;
  label: string;
  detail: string;
}

export interface DeckCompareConsentDraft {
  deckId: DeckId;
  readinessState: DeckCompareReadinessState;
  disclosure: string;
  caution: string | null;
  exportPreview: DeckCompareExportPreviewItem[];
  keepsLocal: string[];
  confirmations: DeckCompareConsentConfirmation[];
}
