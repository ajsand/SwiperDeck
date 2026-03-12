import type { DeckCategory, DeckSensitivity } from './decks';
import type { DeckId, DeckTagId } from './ids';

export const DECK_SAFETY_CAUTION_LEVELS = [
  'standard',
  'heightened',
  'strict',
] as const;

export type DeckSafetyCautionLevel =
  (typeof DECK_SAFETY_CAUTION_LEVELS)[number];

export const DECK_SAFETY_AI_MODES = [
  'allow',
  'prefer_local_fallback',
  'local_only',
] as const;

export type DeckSafetyAiMode = (typeof DECK_SAFETY_AI_MODES)[number];

export interface DeckSafetyWarnings {
  readiness: string;
  consent: string;
  report: string;
}

export interface DeckSafetyComparePolicy {
  minConfidence: number;
  minTagCoverage: number;
  minFacetCoverage: number;
  maxAmbiguityRatio: number;
  requireRetestSettled: boolean;
}

export interface DeckSafetyPayloadPolicy {
  maxAffinityThemes: number;
  maxAversionThemes: number;
  maxUnresolvedAreas: number;
  maxEvidenceCards: number;
}

export interface DeckSafetyReportPolicy {
  aiMode: DeckSafetyAiMode;
  preferLocalFallbackBelowConfidence: number;
  hideSensitiveConversationPrompts: boolean;
  additionalGuardrails: string[];
}

export interface DeckSafetyShowdownPolicy {
  allowed: boolean;
  reason: string | null;
}

export interface SensitiveTagRule {
  tagId: DeckTagId;
  cautionLevel: DeckSafetyCautionLevel;
  minExposureCount: number;
  requireStable: boolean;
  allowUnresolvedExport: boolean;
  allowConversationPrompt: boolean;
  note: string;
}

export interface DeckSafetyPolicy {
  deckId: DeckId;
  deckSensitivity: DeckSensitivity;
  cautionLevel: DeckSafetyCautionLevel;
  compare: DeckSafetyComparePolicy;
  payload: DeckSafetyPayloadPolicy;
  report: DeckSafetyReportPolicy;
  showdown: DeckSafetyShowdownPolicy;
  warnings: DeckSafetyWarnings;
  tagRules: SensitiveTagRule[];
}

export interface DeckSafetyPolicySourceDeck {
  deck_id: string;
  category?: DeckCategory;
  caution_level: DeckSafetyCautionLevel;
  compare: DeckSafetyComparePolicy;
  payload: DeckSafetyPayloadPolicy;
  report: DeckSafetyReportPolicy;
  showdown: DeckSafetyShowdownPolicy;
  warnings: DeckSafetyWarnings;
  tag_rules: Array<{
    tag_id: string;
    caution_level: DeckSafetyCautionLevel;
    min_exposure_count: number;
    require_stable: boolean;
    allow_unresolved_export: boolean;
    allow_conversation_prompt: boolean;
    note: string;
  }>;
}

export interface DeckSafetyPolicySource {
  version: number;
  default_policy: {
    compare: DeckSafetyComparePolicy;
    payload: DeckSafetyPayloadPolicy;
    report: DeckSafetyReportPolicy;
    warnings: DeckSafetyWarnings;
  };
  decks: DeckSafetyPolicySourceDeck[];
}
