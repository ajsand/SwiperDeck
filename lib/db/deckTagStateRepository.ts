import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deckTagStateToRow,
  rowToDeckTagState,
  type DeckId,
  type DeckTagId,
  type DeckTagState,
  type DeckTagStateRow,
} from '@/types/domain';

type DeckTagStateBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export async function upsertDeckTagState(
  db: DeckTagStateBoundaryDb,
  state: DeckTagState,
): Promise<void> {
  const row = deckTagStateToRow(state);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_tag_state (
        deck_id,
        tag_id,
        exposure_count,
        distinct_cards_seen,
        positive_weight,
        negative_weight,
        skip_count,
        net_weight,
        uncertainty_score,
        first_seen_at,
        last_seen_at,
        last_positive_at,
        last_negative_at,
        last_retested_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.deck_id,
    row.tag_id,
    row.exposure_count,
    row.distinct_cards_seen,
    row.positive_weight,
    row.negative_weight,
    row.skip_count,
    row.net_weight,
    row.uncertainty_score,
    row.first_seen_at,
    row.last_seen_at,
    row.last_positive_at,
    row.last_negative_at,
    row.last_retested_at,
    row.updated_at,
  );
}

export async function getDeckTagStateByDeckId(
  db: DeckTagStateBoundaryDb,
  deckId: DeckId,
): Promise<DeckTagState[]> {
  const rows = await db.getAllAsync<DeckTagStateRow>(
    `
      SELECT
        deck_id,
        tag_id,
        exposure_count,
        distinct_cards_seen,
        positive_weight,
        negative_weight,
        skip_count,
        net_weight,
        uncertainty_score,
        first_seen_at,
        last_seen_at,
        last_positive_at,
        last_negative_at,
        last_retested_at,
        updated_at
      FROM deck_tag_state
      WHERE deck_id = ?
      ORDER BY uncertainty_score DESC, last_seen_at DESC, tag_id
    `,
    deckId as string,
  );

  return rows.map(rowToDeckTagState);
}

export async function getDeckTagStateByTagId(
  db: DeckTagStateBoundaryDb,
  tagId: DeckTagId,
): Promise<DeckTagState | null> {
  const row = await db.getFirstAsync<DeckTagStateRow>(
    `
      SELECT
        deck_id,
        tag_id,
        exposure_count,
        distinct_cards_seen,
        positive_weight,
        negative_weight,
        skip_count,
        net_weight,
        uncertainty_score,
        first_seen_at,
        last_seen_at,
        last_positive_at,
        last_negative_at,
        last_retested_at,
        updated_at
      FROM deck_tag_state
      WHERE tag_id = ?
    `,
    tagId as string,
  );

  return row ? rowToDeckTagState(row) : null;
}

export async function replaceDeckTagStateForDeck(
  db: DeckTagStateBoundaryDb,
  deckId: DeckId,
  states: DeckTagState[],
): Promise<void> {
  await db.runAsync(
    `
      DELETE FROM deck_tag_state
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  for (const state of states) {
    await upsertDeckTagState(db, state);
  }
}
