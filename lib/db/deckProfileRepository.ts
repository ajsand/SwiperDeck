import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deckCardAffinityToRow,
  deckProfileSnapshotToRow,
  deckTagScoreToRow,
  rowToDeckCardAffinity,
  rowToDeckProfileSnapshot,
  rowToDeckTagScore,
  type DeckCardAffinity,
  type DeckProfileSnapshot,
  type DeckTagScore,
  type DeckId,
} from '@/types/domain';

type DeckProfileDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export async function upsertDeckTagScore(
  db: DeckProfileDb,
  score: DeckTagScore,
): Promise<void> {
  const row = deckTagScoreToRow(score);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_tag_scores (
        deck_id,
        tag,
        score,
        pos,
        neg,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    row.deck_id,
    row.tag,
    row.score,
    row.pos,
    row.neg,
    row.last_updated,
  );
}

export async function getDeckTagScoreByDeckAndTag(
  db: DeckProfileDb,
  deckId: DeckId,
  tag: string,
): Promise<DeckTagScore | null> {
  const row = await db.getFirstAsync<{
    deck_id: string;
    tag: string;
    score: number;
    pos: number;
    neg: number;
    last_updated: number;
  }>(
    `
      SELECT deck_id, tag, score, pos, neg, last_updated
      FROM deck_tag_scores
      WHERE deck_id = ? AND tag = ?
    `,
    deckId as string,
    tag,
  );

  if (!row) {
    return null;
  }

  return rowToDeckTagScore(row);
}

export async function getDeckTagScoresByDeckId(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<DeckTagScore[]> {
  const rows = await db.getAllAsync<{
    deck_id: string;
    tag: string;
    score: number;
    pos: number;
    neg: number;
    last_updated: number;
  }>(
    `
      SELECT
        deck_id,
        tag,
        score,
        pos,
        neg,
        last_updated
      FROM deck_tag_scores
      WHERE deck_id = ?
      ORDER BY score DESC
    `,
    deckId as string,
  );

  return rows.map((r) =>
    rowToDeckTagScore({
      deck_id: r.deck_id,
      tag: r.tag,
      score: r.score,
      pos: r.pos,
      neg: r.neg,
      last_updated: r.last_updated,
    }),
  );
}

export async function upsertDeckCardAffinity(
  db: DeckProfileDb,
  affinity: DeckCardAffinity,
): Promise<void> {
  const row = deckCardAffinityToRow(affinity);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_card_affinity (
        deck_id,
        card_id,
        score,
        pos,
        neg,
        last_updated
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    row.deck_id,
    row.card_id,
    row.score,
    row.pos,
    row.neg,
    row.last_updated,
  );
}

export async function getDeckCardAffinityByDeckAndCard(
  db: DeckProfileDb,
  deckId: DeckId,
  cardId: string,
): Promise<DeckCardAffinity | null> {
  const row = await db.getFirstAsync<{
    deck_id: string;
    card_id: string;
    score: number;
    pos: number;
    neg: number;
    last_updated: number;
  }>(
    `
      SELECT deck_id, card_id, score, pos, neg, last_updated
      FROM deck_card_affinity
      WHERE deck_id = ? AND card_id = ?
    `,
    deckId as string,
    cardId,
  );

  if (!row) {
    return null;
  }

  return rowToDeckCardAffinity(row);
}

export async function getDeckCardAffinitiesByDeckId(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<DeckCardAffinity[]> {
  const rows = await db.getAllAsync<{
    deck_id: string;
    card_id: string;
    score: number;
    pos: number;
    neg: number;
    last_updated: number;
  }>(
    `
      SELECT
        deck_id,
        card_id,
        score,
        pos,
        neg,
        last_updated
      FROM deck_card_affinity
      WHERE deck_id = ?
      ORDER BY score DESC
    `,
    deckId as string,
  );

  return rows.map((row) =>
    rowToDeckCardAffinity({
      deck_id: row.deck_id,
      card_id: row.card_id,
      score: row.score,
      pos: row.pos,
      neg: row.neg,
      last_updated: row.last_updated,
    }),
  );
}

export async function insertDeckProfileSnapshot(
  db: DeckProfileDb,
  snapshot: DeckProfileSnapshot,
): Promise<void> {
  const row = deckProfileSnapshotToRow(snapshot);

  await db.runAsync(
    `
      INSERT INTO deck_profile_snapshots (
        id,
        deck_id,
        created_at,
        top_tags_json,
        top_aversions_json,
        summary_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.deck_id,
    row.created_at,
    row.top_tags_json,
    row.top_aversions_json,
    row.summary_json,
  );
}

export async function getLatestDeckProfileSnapshot(
  db: DeckProfileDb,
  deckId: DeckId,
): Promise<DeckProfileSnapshot | null> {
  const row = await db.getFirstAsync<{
    id: string;
    deck_id: string;
    created_at: number;
    top_tags_json: string;
    top_aversions_json: string;
    summary_json: string;
  }>(
    `
      SELECT
        id,
        deck_id,
        created_at,
        top_tags_json,
        top_aversions_json,
        summary_json
      FROM deck_profile_snapshots
      WHERE deck_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `,
    deckId as string,
  );

  if (!row) {
    return null;
  }

  return rowToDeckProfileSnapshot(row);
}
