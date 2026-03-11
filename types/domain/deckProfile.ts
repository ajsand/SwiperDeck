import {
  asDeckCardId,
  asDeckId,
  asSnapshotId,
  type DeckCardId,
  type DeckId,
  type SnapshotId,
} from './ids';
import { isRecord, safeJsonParse } from './parsers';
import type { TagScoreSummary } from './snapshots';

export type DeckProfileStage =
  | 'lightweight'
  | 'meaningful'
  | 'high_confidence';

export interface DeckProfileConfidence {
  value: number;
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number;
}

export interface DeckProfileSummary {
  deckId: DeckId;
  stage: DeckProfileStage;
  confidence: DeckProfileConfidence;
  affinities: TagScoreSummary[];
  aversions: TagScoreSummary[];
  unresolved: string[];
  topCardsLiked: DeckCardId[];
  topCardsDisliked: DeckCardId[];
  generatedAt: number;
}

export interface DeckTagScoreRow {
  deck_id: string;
  tag: string;
  score: number;
  pos: number;
  neg: number;
  last_updated: number;
}

export interface DeckTagScore {
  deckId: DeckId;
  tag: string;
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
    tag: row.tag,
    score: row.score,
    pos: row.pos,
    neg: row.neg,
    lastUpdated: row.last_updated,
  };
}

export function deckTagScoreToRow(score: DeckTagScore): DeckTagScoreRow {
  return {
    deck_id: score.deckId,
    tag: score.tag,
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
