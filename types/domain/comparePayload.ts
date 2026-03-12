import type {
  DeckCompareExportPreviewItem,
  DeckCompareReadinessReason,
  DeckCompareReadinessState,
} from './compare';
import type {
  DeckSafetyAiMode,
  DeckSafetyCautionLevel,
} from './deckSafetyPolicy';
import type {
  DeckProfileStage,
  DeckProfileThemeStability,
  DeckProfileUnresolvedReason,
} from './deckProfile';
import type {
  CardKind,
  DeckCategory,
  DeckSensitivity,
  DeckTier,
} from './decks';
import type { DeckCardId, DeckId, DeckTagId } from './ids';

export const COMPARE_PAYLOAD_SCHEMA = 'datedeck.compare_payload.v1' as const;

export type ComparePayloadSchema = typeof COMPARE_PAYLOAD_SCHEMA;

export const COMPARE_PAYLOAD_EVIDENCE_MODES = [
  'summary_only',
  'summary_with_minimal_evidence',
] as const;

export type ComparePayloadEvidenceMode =
  (typeof COMPARE_PAYLOAD_EVIDENCE_MODES)[number];

export interface ComparePayloadDeckSummary {
  deckId: DeckId;
  title: string;
  category: DeckCategory;
  tier: DeckTier;
  sensitivity: DeckSensitivity;
  contentVersion: number;
}

export interface ComparePayloadReadinessSummary {
  state: DeckCompareReadinessState;
  ready: boolean;
  caution: boolean;
  reasons: DeckCompareReadinessReason[];
  recommendedAction: string;
}

export interface ComparePayloadConfidenceSummary {
  stage: DeckProfileStage;
  value: number;
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number;
  tagCoverage: number;
  facetCoverage: number;
  stabilityScore: number;
  ambiguityRatio: number;
}

export interface ComparePayloadCoverageSummary {
  cardsSeen: number;
  totalCards: number;
  seenTagCount: number;
  totalTagCount: number;
  seenFacetCount: number;
  totalFacetCount: number;
}

export interface ComparePayloadThemeSummaryItem {
  tagId: DeckTagId;
  tag: string;
  facet: string | null;
  score: number;
  exposureCount: number;
  stability: DeckProfileThemeStability;
}

export interface ComparePayloadUnresolvedArea {
  tagId: DeckTagId;
  tag: string;
  facet: string | null;
  reason: DeckProfileUnresolvedReason;
  uncertainty: number;
  exposureCount: number;
}

export interface ComparePayloadEvidenceCard {
  cardId: DeckCardId;
  kind: CardKind;
  title: string;
  subtitle: string;
  leaning: 'affinity' | 'aversion';
  reason: string;
  supportingTagIds: DeckTagId[];
  supportingTags: string[];
}

export interface ComparePayloadPolicy {
  cautionLevel: DeckSafetyCautionLevel;
  maxAffinityThemes: number;
  maxAversionThemes: number;
  maxUnresolvedAreas: number;
  maxEvidenceCards: number;
  includeEvidenceCards: boolean;
  evidenceMode: ComparePayloadEvidenceMode;
  aiMode: DeckSafetyAiMode;
  showdownAllowed: boolean;
  safetyWarnings: string[];
  redactions: string[];
}

export interface ComparePayloadEvidenceSummary {
  mode: ComparePayloadEvidenceMode;
  includedCardCount: number;
  omittedRawCardCount: number;
  cards: ComparePayloadEvidenceCard[];
}

export interface ComparePayloadV1 {
  schema: ComparePayloadSchema;
  generatedAt: number;
  profileGeneratedAt: number;
  deck: ComparePayloadDeckSummary;
  readiness: ComparePayloadReadinessSummary;
  confidence: ComparePayloadConfidenceSummary;
  coverage: ComparePayloadCoverageSummary;
  affinities: ComparePayloadThemeSummaryItem[];
  aversions: ComparePayloadThemeSummaryItem[];
  unresolvedAreas: ComparePayloadUnresolvedArea[];
  evidence: ComparePayloadEvidenceSummary;
  policy: ComparePayloadPolicy;
}

export interface ComparePayloadPreviewDebugSummary {
  summaryLine: string;
  affinityCount: number;
  aversionCount: number;
  unresolvedCount: number;
  evidenceCardCount: number;
  evidenceMode: ComparePayloadEvidenceMode;
}

export interface ComparePayloadPreview {
  deckId: DeckId;
  generatedAt: number;
  categories: DeckCompareExportPreviewItem[];
  debugSummary: ComparePayloadPreviewDebugSummary;
}
