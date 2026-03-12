import type { DeckId } from './ids';

export const DECK_COMPARE_REPORT_SCHEMA = 'datedeck.compare_report.v1' as const;

export type DeckCompareReportSchema = typeof DECK_COMPARE_REPORT_SCHEMA;

export const DECK_COMPARE_REPORT_SECTION_IDS = [
  'summary',
  'alignments',
  'contrasts',
  'unresolved_areas',
  'conversation_starters',
] as const;

export type DeckCompareReportSectionId =
  (typeof DECK_COMPARE_REPORT_SECTION_IDS)[number];

export type DeckCompareReportSourceKind = 'ai' | 'local_fallback';

export interface DeckCompareReportSection {
  id: DeckCompareReportSectionId;
  title: string;
  summary: string;
  tone: 'primary' | 'supporting' | 'caution';
}

export interface DeckCompareReportSource {
  kind: DeckCompareReportSourceKind;
  model: string | null;
  fallbackReason: string | null;
}

export interface DeckCompareReportConfidence {
  value: number;
  label: 'low' | 'medium' | 'high';
  note: string;
}

export interface DeckCompareReportInsight {
  title: string;
  detail: string;
  tag: string;
  facet: string;
  evidence: string[];
}

export interface DeckCompareReportUnresolvedArea {
  title: string;
  detail: string;
  tag: string;
  facet: string;
  confidenceNote: string;
}

export interface DeckCompareConversationPrompt {
  title: string;
  prompt: string;
  rationale: string;
  relatedTags: string[];
}

export interface DeckCompareReport {
  schema: DeckCompareReportSchema;
  generatedAt: number;
  deckId: DeckId;
  deckTitle: string;
  source: DeckCompareReportSource;
  confidence: DeckCompareReportConfidence;
  sections: DeckCompareReportSection[];
  summary: DeckCompareReportSection;
  alignments: DeckCompareReportInsight[];
  contrasts: DeckCompareReportInsight[];
  unresolvedAreas: DeckCompareReportUnresolvedArea[];
  conversationStarters: DeckCompareConversationPrompt[];
  guardrails: string[];
}
