import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDeckTagStateByDeckId,
  getDeckTagStateByTagId,
  replaceDeckTagStateForDeck,
  upsertDeckTagState,
} from '@/lib/db';
import { asDeckId, asDeckTagId, type DeckTagStateRow } from '@/types/domain';

class FakeDeckTagStateDb {
  private states = new Map<string, DeckTagStateRow>();
  private decks = new Set(['deck_movies_tv']);
  private tags = new Set(['movies_tv:action', 'movies_tv:drama']);

  private stateKey(deckId: string, tagId: string): string {
    return `${deckId}:${tagId}`;
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (/DELETE FROM deck_tag_state/i.test(source)) {
      const deckId = String(params[0]);
      for (const [key, row] of this.states.entries()) {
        if (row.deck_id === deckId) {
          this.states.delete(key);
        }
      }

      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/INSERT OR REPLACE INTO deck_tag_state/i.test(source)) {
      const row: DeckTagStateRow = {
        deck_id: String(params[0]),
        tag_id: String(params[1]),
        exposure_count: Number(params[2]),
        distinct_cards_seen: Number(params[3]),
        positive_weight: Number(params[4]),
        negative_weight: Number(params[5]),
        skip_count: Number(params[6]),
        net_weight: Number(params[7]),
        uncertainty_score: Number(params[8]),
        first_seen_at: params[9] == null ? null : Number(params[9]),
        last_seen_at: params[10] == null ? null : Number(params[10]),
        last_positive_at: params[11] == null ? null : Number(params[11]),
        last_negative_at: params[12] == null ? null : Number(params[12]),
        last_retested_at: params[13] == null ? null : Number(params[13]),
        updated_at: Number(params[14]),
      };

      if (!this.decks.has(row.deck_id) || !this.tags.has(row.tag_id)) {
        throw new Error('deck_tag_state FK failed');
      }

      this.states.set(this.stateKey(row.deck_id, row.tag_id), row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    const normalized = source.replace(/\s+/g, ' ').trim();

    if (/FROM deck_tag_state WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.states.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => {
          if (left.uncertainty_score !== right.uncertainty_score) {
            return right.uncertainty_score - left.uncertainty_score;
          }

          return (right.last_seen_at ?? 0) - (left.last_seen_at ?? 0);
        }) as T[];
    }

    if (/FROM deck_tag_state WHERE tag_id = \?/i.test(normalized)) {
      const tagId = String(params[0]);
      return Array.from(this.states.values()).filter(
        (row) => row.tag_id === tagId,
      ) as T[];
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }
}

describe('deckTagStateRepository', () => {
  it('roundtrips deck-scoped tag state rows', async () => {
    const db = new FakeDeckTagStateDb() as unknown as SQLiteDatabase;
    const now = Date.now();

    await upsertDeckTagState(db, {
      deckId: asDeckId('deck_movies_tv'),
      tagId: asDeckTagId('movies_tv:action'),
      exposureCount: 2,
      distinctCardsSeen: 1,
      positiveWeight: 2,
      negativeWeight: 0,
      skipCount: 0,
      netWeight: 2,
      uncertaintyScore: 0.67,
      firstSeenAt: now - 10,
      lastSeenAt: now,
      lastPositiveAt: now,
      lastNegativeAt: null,
      lastRetestedAt: now,
      updatedAt: now,
    });

    const byDeck = await getDeckTagStateByDeckId(
      db,
      asDeckId('deck_movies_tv'),
    );
    expect(byDeck).toHaveLength(1);
    expect(byDeck[0].tagId).toBe(asDeckTagId('movies_tv:action'));

    const byTag = await getDeckTagStateByTagId(
      db,
      asDeckTagId('movies_tv:action'),
    );
    expect(byTag?.exposureCount).toBe(2);
  });

  it('replaces all state rows for a deck deterministically', async () => {
    const db = new FakeDeckTagStateDb() as unknown as SQLiteDatabase;
    const now = Date.now();

    await replaceDeckTagStateForDeck(db, asDeckId('deck_movies_tv'), [
      {
        deckId: asDeckId('deck_movies_tv'),
        tagId: asDeckTagId('movies_tv:action'),
        exposureCount: 1,
        distinctCardsSeen: 1,
        positiveWeight: 1,
        negativeWeight: 0,
        skipCount: 0,
        netWeight: 1,
        uncertaintyScore: 0.67,
        firstSeenAt: now - 100,
        lastSeenAt: now - 100,
        lastPositiveAt: now - 100,
        lastNegativeAt: null,
        lastRetestedAt: null,
        updatedAt: now - 100,
      },
    ]);

    await replaceDeckTagStateForDeck(db, asDeckId('deck_movies_tv'), [
      {
        deckId: asDeckId('deck_movies_tv'),
        tagId: asDeckTagId('movies_tv:drama'),
        exposureCount: 3,
        distinctCardsSeen: 2,
        positiveWeight: 1,
        negativeWeight: 2,
        skipCount: 1,
        netWeight: -1,
        uncertaintyScore: 0.78,
        firstSeenAt: now - 50,
        lastSeenAt: now,
        lastPositiveAt: now - 50,
        lastNegativeAt: now - 10,
        lastRetestedAt: now,
        updatedAt: now,
      },
    ]);

    const rows = await getDeckTagStateByDeckId(db, asDeckId('deck_movies_tv'));
    expect(rows).toHaveLength(1);
    expect(rows[0].tagId).toBe(asDeckTagId('movies_tv:drama'));
  });

  it('fails when state references a missing canonical tag', async () => {
    const db = new FakeDeckTagStateDb() as unknown as SQLiteDatabase;

    await expect(
      upsertDeckTagState(db, {
        deckId: asDeckId('deck_movies_tv'),
        tagId: asDeckTagId('movies_tv:missing'),
        exposureCount: 0,
        distinctCardsSeen: 0,
        positiveWeight: 0,
        negativeWeight: 0,
        skipCount: 0,
        netWeight: 0,
        uncertaintyScore: 1,
        firstSeenAt: null,
        lastSeenAt: null,
        lastPositiveAt: null,
        lastNegativeAt: null,
        lastRetestedAt: null,
        updatedAt: Date.now(),
      }),
    ).rejects.toThrow('FK');
  });
});
