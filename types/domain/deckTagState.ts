import { asDeckId, asDeckTagId, type DeckId, type DeckTagId } from './ids';

export interface DeckTagStateRow {
  deck_id: string;
  tag_id: string;
  exposure_count: number;
  distinct_cards_seen: number;
  positive_weight: number;
  negative_weight: number;
  skip_count: number;
  net_weight: number;
  uncertainty_score: number;
  first_seen_at: number | null;
  last_seen_at: number | null;
  last_positive_at: number | null;
  last_negative_at: number | null;
  last_retested_at: number | null;
  updated_at: number;
}

export interface DeckTagState {
  deckId: DeckId;
  tagId: DeckTagId;
  exposureCount: number;
  distinctCardsSeen: number;
  positiveWeight: number;
  negativeWeight: number;
  skipCount: number;
  netWeight: number;
  uncertaintyScore: number;
  firstSeenAt: number | null;
  lastSeenAt: number | null;
  lastPositiveAt: number | null;
  lastNegativeAt: number | null;
  lastRetestedAt: number | null;
  updatedAt: number;
}

export interface DeckTagCoverageSummary {
  deckId: DeckId;
  totalTagCount: number;
  seenTagCount: number;
  unseenTagCount: number;
  resolvedTagCount: number;
  uncertainTagCount: number;
  coverageRatio: number;
}

export function rowToDeckTagState(row: DeckTagStateRow): DeckTagState {
  return {
    deckId: asDeckId(row.deck_id),
    tagId: asDeckTagId(row.tag_id),
    exposureCount: row.exposure_count,
    distinctCardsSeen: row.distinct_cards_seen,
    positiveWeight: row.positive_weight,
    negativeWeight: row.negative_weight,
    skipCount: row.skip_count,
    netWeight: row.net_weight,
    uncertaintyScore: row.uncertainty_score,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    lastPositiveAt: row.last_positive_at,
    lastNegativeAt: row.last_negative_at,
    lastRetestedAt: row.last_retested_at,
    updatedAt: row.updated_at,
  };
}

export function deckTagStateToRow(state: DeckTagState): DeckTagStateRow {
  return {
    deck_id: state.deckId,
    tag_id: state.tagId,
    exposure_count: state.exposureCount,
    distinct_cards_seen: state.distinctCardsSeen,
    positive_weight: state.positiveWeight,
    negative_weight: state.negativeWeight,
    skip_count: state.skipCount,
    net_weight: state.netWeight,
    uncertainty_score: state.uncertaintyScore,
    first_seen_at: state.firstSeenAt,
    last_seen_at: state.lastSeenAt,
    last_positive_at: state.lastPositiveAt,
    last_negative_at: state.lastNegativeAt,
    last_retested_at: state.lastRetestedAt,
    updated_at: state.updatedAt,
  };
}

export function summarizeDeckTagCoverage(
  deckId: DeckId,
  tagStates: DeckTagState[],
  uncertaintyThreshold = 0.5,
): DeckTagCoverageSummary {
  const totalTagCount = tagStates.length;
  const seenTagCount = tagStates.filter(
    (state) => state.exposureCount > 0,
  ).length;
  const uncertainTagCount = tagStates.filter(
    (state) => state.uncertaintyScore >= uncertaintyThreshold,
  ).length;
  const unseenTagCount = totalTagCount - seenTagCount;
  const resolvedTagCount = totalTagCount - uncertainTagCount;

  return {
    deckId,
    totalTagCount,
    seenTagCount,
    unseenTagCount,
    resolvedTagCount,
    uncertainTagCount,
    coverageRatio: totalTagCount > 0 ? seenTagCount / totalTagCount : 0,
  };
}
