import type { SQLiteDatabase } from 'expo-sqlite';

import {
  rowToDeckCardState,
  type DeckCardId,
  type DeckCardState,
  type DeckCardStateRow,
  type DeckId,
} from '@/types/domain';

type DeckCardStateDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

async function ensureDeckCardStateRow(
  db: DeckCardStateDb,
  deckId: DeckId,
  cardId: DeckCardId,
  now: number,
): Promise<void> {
  await db.runAsync(
    `
      INSERT OR IGNORE INTO deck_card_state (
        deck_id,
        card_id,
        presentation_count,
        swipe_count,
        last_presented_at,
        last_swiped_at,
        updated_at
      ) VALUES (?, ?, 0, 0, NULL, NULL, ?)
    `,
    deckId as string,
    cardId as string,
    now,
  );
}

export async function recordDeckCardPresentation(
  db: DeckCardStateDb,
  args: {
    deckId: DeckId;
    cardId: DeckCardId;
    presentedAt: number;
  },
): Promise<void> {
  await ensureDeckCardStateRow(db, args.deckId, args.cardId, args.presentedAt);

  await db.runAsync(
    `
      UPDATE deck_card_state
      SET presentation_count = presentation_count + 1,
          last_presented_at = ?,
          updated_at = ?
      WHERE deck_id = ?
        AND card_id = ?
    `,
    args.presentedAt,
    args.presentedAt,
    args.deckId as string,
    args.cardId as string,
  );
}

export async function recordDeckCardSwipe(
  db: DeckCardStateDb,
  args: {
    deckId: DeckId;
    cardId: DeckCardId;
    swipedAt: number;
  },
): Promise<void> {
  await ensureDeckCardStateRow(db, args.deckId, args.cardId, args.swipedAt);

  await db.runAsync(
    `
      UPDATE deck_card_state
      SET swipe_count = swipe_count + 1,
          last_swiped_at = ?,
          updated_at = ?
      WHERE deck_id = ?
        AND card_id = ?
    `,
    args.swipedAt,
    args.swipedAt,
    args.deckId as string,
    args.cardId as string,
  );
}

export async function getDeckCardStatesByDeckId(
  db: DeckCardStateDb,
  deckId: DeckId,
): Promise<DeckCardState[]> {
  const rows = await db.getAllAsync<DeckCardStateRow>(
    `
      SELECT
        deck_id,
        card_id,
        presentation_count,
        swipe_count,
        last_presented_at,
        last_swiped_at,
        updated_at
      FROM deck_card_state
      WHERE deck_id = ?
      ORDER BY updated_at DESC, card_id
    `,
    deckId as string,
  );

  return rows.map(rowToDeckCardState);
}
