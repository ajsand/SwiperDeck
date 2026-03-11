import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deckCardToRow,
  rowToDeckCard,
  type DeckCard,
  type DeckCardId,
  type DeckCardRow,
  type DeckId,
} from '@/types/domain';

type DeckCardBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

type CountRow = {
  count: number;
};

export async function upsertDeckCard(
  db: DeckCardBoundaryDb,
  card: DeckCard,
): Promise<void> {
  const row = deckCardToRow(card);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_cards (
        id,
        deck_id,
        kind,
        title,
        subtitle,
        description_short,
        tags_json,
        popularity,
        tile_key,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.deck_id,
    row.kind,
    row.title,
    row.subtitle,
    row.description_short,
    row.tags_json,
    row.popularity,
    row.tile_key,
    row.sort_order,
    row.created_at,
    row.updated_at,
  );
}

export async function getDeckCardById(
  db: DeckCardBoundaryDb,
  cardId: DeckCardId,
): Promise<DeckCard | null> {
  const row = await db.getFirstAsync<DeckCardRow>(
    `
      SELECT
        id,
        deck_id,
        kind,
        title,
        subtitle,
        description_short,
        tags_json,
        popularity,
        tile_key,
        sort_order,
        created_at,
        updated_at
      FROM deck_cards
      WHERE id = ?
    `,
    cardId as string,
  );

  if (!row) {
    return null;
  }

  return rowToDeckCard(row);
}

export async function getDeckCardsByDeckId(
  db: DeckCardBoundaryDb,
  deckId: DeckId,
): Promise<DeckCard[]> {
  const rows = await db.getAllAsync<DeckCardRow>(
    `
      SELECT
        id,
        deck_id,
        kind,
        title,
        subtitle,
        description_short,
        tags_json,
        popularity,
        tile_key,
        sort_order,
        created_at,
        updated_at
      FROM deck_cards
      WHERE deck_id = ?
      ORDER BY sort_order, title
    `,
    deckId as string,
  );

  return rows.map(rowToDeckCard);
}

export async function countDeckCardsByDeckId(
  db: DeckCardBoundaryDb,
  deckId: DeckId,
): Promise<number> {
  const row = await db.getFirstAsync<CountRow>(
    `
      SELECT COUNT(*) AS count
      FROM deck_cards
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  return row?.count ?? 0;
}
