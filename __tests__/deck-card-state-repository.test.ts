import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDeckCardStatesByDeckId,
  recordDeckCardPresentation,
  recordDeckCardSwipe,
} from '@/lib/db';
import { asDeckCardId, asDeckId, type DeckCardStateRow } from '@/types/domain';

class FakeDeckCardStateDb {
  private rows = new Map<string, DeckCardStateRow>();
  private decks = new Set(['deck_movies_tv']);
  private cards = new Set(['movies_tv_001', 'movies_tv_002']);

  private key(deckId: string, cardId: string): string {
    return `${deckId}:${cardId}`;
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const normalized = source.replace(/\s+/g, ' ').trim();

    if (/INSERT OR IGNORE INTO deck_card_state/i.test(normalized)) {
      const row: DeckCardStateRow = {
        deck_id: String(params[0]),
        card_id: String(params[1]),
        presentation_count: 0,
        swipe_count: 0,
        last_presented_at: null,
        last_swiped_at: null,
        updated_at: Number(params[2]),
      };

      if (!this.decks.has(row.deck_id) || !this.cards.has(row.card_id)) {
        throw new Error('deck_card_state FK failed');
      }

      const key = this.key(row.deck_id, row.card_id);
      if (!this.rows.has(key)) {
        this.rows.set(key, row);
      }

      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/UPDATE deck_card_state SET presentation_count/i.test(normalized)) {
      const key = this.key(String(params[2]), String(params[3]));
      const row = this.rows.get(key);

      if (!row) {
        throw new Error('Missing deck_card_state row');
      }

      row.presentation_count += 1;
      row.last_presented_at = Number(params[0]);
      row.updated_at = Number(params[1]);
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/UPDATE deck_card_state SET swipe_count/i.test(normalized)) {
      const key = this.key(String(params[2]), String(params[3]));
      const row = this.rows.get(key);

      if (!row) {
        throw new Error('Missing deck_card_state row');
      }

      row.swipe_count += 1;
      row.last_swiped_at = Number(params[0]);
      row.updated_at = Number(params[1]);
      return { changes: 1, lastInsertRowId: 0 };
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }

  async getFirstAsync<T>(): Promise<T | null> {
    return null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    if (/FROM deck_card_state/i.test(source)) {
      const deckId = String(params[0]);
      return Array.from(this.rows.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => right.updated_at - left.updated_at) as T[];
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }
}

describe('deckCardStateRepository', () => {
  it('tracks presentations and swipes for one deck card over time', async () => {
    const db = new FakeDeckCardStateDb() as unknown as SQLiteDatabase;

    await recordDeckCardPresentation(db, {
      deckId: asDeckId('deck_movies_tv'),
      cardId: asDeckCardId('movies_tv_001'),
      presentedAt: 1700000001000,
    });
    await recordDeckCardPresentation(db, {
      deckId: asDeckId('deck_movies_tv'),
      cardId: asDeckCardId('movies_tv_001'),
      presentedAt: 1700000002000,
    });
    await recordDeckCardSwipe(db, {
      deckId: asDeckId('deck_movies_tv'),
      cardId: asDeckCardId('movies_tv_001'),
      swipedAt: 1700000003000,
    });

    const rows = await getDeckCardStatesByDeckId(
      db,
      asDeckId('deck_movies_tv'),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      deckId: asDeckId('deck_movies_tv'),
      cardId: asDeckCardId('movies_tv_001'),
      presentationCount: 2,
      swipeCount: 1,
      lastPresentedAt: 1700000002000,
      lastSwipedAt: 1700000003000,
    });
  });

  it('fails when state references a missing deck or card row', async () => {
    const db = new FakeDeckCardStateDb() as unknown as SQLiteDatabase;

    await expect(
      recordDeckCardPresentation(db, {
        deckId: asDeckId('deck_missing'),
        cardId: asDeckCardId('movies_tv_001'),
        presentedAt: Date.now(),
      }),
    ).rejects.toThrow('FK');
  });
});
