import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deckToRow,
  rowToDeck,
  type Deck,
  type DeckCategory,
  type DeckId,
  type DeckRow,
} from '@/types/domain';

type DeckBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export async function upsertDeck(
  db: DeckBoundaryDb,
  deck: Deck,
): Promise<void> {
  const row = deckToRow(deck);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO decks (
        id,
        title,
        description,
        category,
        tier,
        card_count,
        compare_eligible,
        showdown_eligible,
        sensitivity,
        min_cards_for_profile,
        min_cards_for_compare,
        is_custom,
        cover_tile_key,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.title,
    row.description,
    row.category,
    row.tier,
    row.card_count,
    row.compare_eligible,
    row.showdown_eligible,
    row.sensitivity,
    row.min_cards_for_profile,
    row.min_cards_for_compare,
    row.is_custom,
    row.cover_tile_key,
    row.created_at,
    row.updated_at,
  );
}

export async function getDeckById(
  db: DeckBoundaryDb,
  deckId: DeckId,
): Promise<Deck | null> {
  const row = await db.getFirstAsync<DeckRow>(
    `
      SELECT
        id,
        title,
        description,
        category,
        tier,
        card_count,
        compare_eligible,
        showdown_eligible,
        sensitivity,
        min_cards_for_profile,
        min_cards_for_compare,
        is_custom,
        cover_tile_key,
        created_at,
        updated_at
      FROM decks
      WHERE id = ?
    `,
    deckId as string,
  );

  if (!row) {
    return null;
  }

  return rowToDeck(row);
}

export async function getAllDecks(db: DeckBoundaryDb): Promise<Deck[]> {
  const rows = await db.getAllAsync<DeckRow>(
    `
      SELECT
        id,
        title,
        description,
        category,
        tier,
        card_count,
        compare_eligible,
        showdown_eligible,
        sensitivity,
        min_cards_for_profile,
        min_cards_for_compare,
        is_custom,
        cover_tile_key,
        created_at,
        updated_at
      FROM decks
      ORDER BY title
    `,
  );

  return rows.map(rowToDeck);
}

export async function getDecksByCategory(
  db: DeckBoundaryDb,
  category: DeckCategory,
): Promise<Deck[]> {
  const rows = await db.getAllAsync<DeckRow>(
    `
      SELECT
        id,
        title,
        description,
        category,
        tier,
        card_count,
        compare_eligible,
        showdown_eligible,
        sensitivity,
        min_cards_for_profile,
        min_cards_for_compare,
        is_custom,
        cover_tile_key,
        created_at,
        updated_at
      FROM decks
      WHERE category = ?
      ORDER BY title
    `,
    category as string,
  );

  return rows.map(rowToDeck);
}
