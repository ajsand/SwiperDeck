import {
  asDeckCardId,
  asDeckId,
  asSnapshotId,
  asDeckTagId,
  type DeckCardId,
  type DeckId,
  type DeckTagId,
  type SnapshotId,
} from './ids';
import type { DeckTagCoverageSummary } from './deckTagState';
import { isRecord, safeJsonParse } from './parsers';
import type { TagScoreSummary } from './snapshots';

export type DeckProfileStage = 'lightweight' | 'meaningful' | 'high_confidence';

export interface DeckProfileConfidenceComponents {
  swipeSignal: number;
  cardCoverage: number;
  tagCoverage: number;
  facetCoverage: number;
  stability: number;
  ambiguityPenalty: number;
}

export interface DeckProfileConfidence {
  value: number;
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number;
  components: DeckProfileConfidenceComponents;
}

export interface DeckProfileFacetCoverageSummary {
  totalFacetCount: number;
  seenFacetCount: number;
  unseenFacetCount: number;
  coverageRatio: number;
}

export interface DeckProfileCoverageSummary {
  deckId: DeckId;
  cardsSeen: number;
  totalCards: number;
  cardCoverage: number;
  tags: DeckTagCoverageSummary;
  facets: DeckProfileFacetCoverageSummary;
}

export type DeckProfileThemeStability = 'emerging' | 'steady' | 'stable';

export interface DeckProfileThemeScore {
  tagId: DeckTagId;
  tag: string;
  facet: string | null;
  score: number;
  exposureCount: number;
  stability: DeckProfileThemeStability;
}

export const DECK_PROFILE_UNRESOLVED_REASONS = [
  'no_signal',
  'low_coverage',
  'mixed_signal',
  'pending_retest',
] as const;

export type DeckProfileUnresolvedReason =
  (typeof DECK_PROFILE_UNRESOLVED_REASONS)[number];

export interface DeckProfileUnresolvedArea {
  tagId: DeckTagId;
  tag: string;
  facet: string | null;
  reason: DeckProfileUnresolvedReason;
  uncertainty: number;
  exposureCount: number;
}

export interface DeckProfileStabilitySummary {
  stabilityScore: number;
  stableTagCount: number;
  emergingTagCount: number;
  mixedSignalTagCount: number;
  retestedTagCount: number;
  retestPendingCount: number;
}

export const DECK_PROFILE_ACTION_HINT_KINDS = [
  'keep_swiping',
  'more_breadth_needed',
  'retest_pending',
  'compare_ready',
] as const;

export type DeckProfileActionHintKind =
  (typeof DECK_PROFILE_ACTION_HINT_KINDS)[number];

export interface DeckProfileActionHint {
  kind: DeckProfileActionHintKind;
  title: string;
  detail: string;
  priority: number;
}

export const DECK_PROFILE_READINESS_BLOCKERS = [
  'not_enough_swipes',
  'not_enough_card_coverage',
  'not_enough_tag_coverage',
  'not_enough_facet_coverage',
  'high_ambiguity',
  'retest_needed',
] as const;

export type DeckProfileReadinessBlocker =
  (typeof DECK_PROFILE_READINESS_BLOCKERS)[number];

export interface DeckProfileReadiness {
  compareReady: boolean;
  blockers: DeckProfileReadinessBlocker[];
}

export interface DeckProfileSummary {
  deckId: DeckId;
  stage: DeckProfileStage;
  confidence: DeckProfileConfidence;
  coverage: DeckProfileCoverageSummary;
  stability: DeckProfileStabilitySummary;
  affinities: DeckProfileThemeScore[];
  aversions: DeckProfileThemeScore[];
  unresolved: DeckProfileUnresolvedArea[];
  nextSteps: DeckProfileActionHint[];
  readiness: DeckProfileReadiness;
  topCardsLiked: DeckCardId[];
  topCardsDisliked: DeckCardId[];
  generatedAt: number;
}

export interface DeckTagScoreRow {
  deck_id: string;
  tag_id: string;
  score: number;
  pos: number;
  neg: number;
  last_updated: number;
}

export interface DeckTagScore {
  deckId: DeckId;
  tagId: DeckTagId;
  score: number;
  pos: number;
  neg: number;
  lastUpdated: number;
}

export interface DeckCardAffinityRow {
  deck_id: string;
  card_id: string;
  score: number;
  pos: number;
  neg: number;
  last_updated: number;
}

export interface DeckCardAffinity {
  deckId: DeckId;
  cardId: DeckCardId;
  score: number;
  pos: number;
  neg: number;
  lastUpdated: number;
}

export interface DeckProfileSnapshotRow {
  id: string;
  deck_id: string;
  created_at: number;
  top_tags_json: string;
  top_aversions_json: string;
  summary_json: string;
}

export interface DeckProfileSnapshot {
  id: SnapshotId;
  deckId: DeckId;
  createdAt: number;
  topTags: TagScoreSummary[];
  topAversions: TagScoreSummary[];
  summary: Record<string, unknown>;
}

function isTagScoreSummary(value: unknown): value is TagScoreSummary {
  return (
    isRecord(value) &&
    typeof value.tag === 'string' &&
    typeof value.score === 'number'
  );
}

function parseTagScoreSummaries(jsonText: string): TagScoreSummary[] {
  const parsed = safeJsonParse<unknown>(jsonText, []);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter(isTagScoreSummary);
}

export function rowToDeckTagScore(row: DeckTagScoreRow): DeckTagScore {
  return {
    deckId: asDeckId(row.deck_id),
    tagId: asDeckTagId(row.tag_id),
    score: row.score,
    pos: row.pos,
    neg: row.neg,
    lastUpdated: row.last_updated,
  };
}

export function deckTagScoreToRow(score: DeckTagScore): DeckTagScoreRow {
  return {
    deck_id: score.deckId,
    tag_id: score.tagId,
    score: score.score,
    pos: score.pos,
    neg: score.neg,
    last_updated: score.lastUpdated,
  };
}

export function rowToDeckCardAffinity(
  row: DeckCardAffinityRow,
): DeckCardAffinity {
  return {
    deckId: asDeckId(row.deck_id),
    cardId: asDeckCardId(row.card_id),
    score: row.score,
    pos: row.pos,
    neg: row.neg,
    lastUpdated: row.last_updated,
  };
}

export function deckCardAffinityToRow(
  affinity: DeckCardAffinity,
): DeckCardAffinityRow {
  return {
    deck_id: affinity.deckId,
    card_id: affinity.cardId,
    score: affinity.score,
    pos: affinity.pos,
    neg: affinity.neg,
    last_updated: affinity.lastUpdated,
  };
}

export function rowToDeckProfileSnapshot(
  row: DeckProfileSnapshotRow,
): DeckProfileSnapshot {
  return {
    id: asSnapshotId(row.id),
    deckId: asDeckId(row.deck_id),
    createdAt: row.created_at,
    topTags: parseTagScoreSummaries(row.top_tags_json),
    topAversions: parseTagScoreSummaries(row.top_aversions_json),
    summary: safeJsonParse<Record<string, unknown>>(row.summary_json, {}),
  };
}

export function deckProfileSnapshotToRow(
  snapshot: DeckProfileSnapshot,
): DeckProfileSnapshotRow {
  return {
    id: snapshot.id,
    deck_id: snapshot.deckId,
    created_at: snapshot.createdAt,
    top_tags_json: JSON.stringify(snapshot.topTags),
    top_aversions_json: JSON.stringify(snapshot.topAversions),
    summary_json: JSON.stringify(snapshot.summary),
  };
}
