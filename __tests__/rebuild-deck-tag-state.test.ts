import type { SQLiteDatabase } from 'expo-sqlite';

import { getDeckTagStateByDeckId } from '@/lib/db';
import { rebuildDeckTagState } from '@/lib/sequence/rebuildDeckTagState';
import {
  asDeckId,
  asDeckTagId,
  type DeckTagRow,
  type DeckTagStateRow,
  type SwipeEventRow,
} from '@/types/domain';

class FakeRebuildDeckTagStateDb {
  private decks = new Map<string, Record<string, unknown>>();
  private tags = new Map<string, DeckTagRow>();
  private links = new Array<Record<string, unknown>>();
  private swipeEvents = new Array<SwipeEventRow>();
  private states = new Map<string, DeckTagStateRow>();

  constructor() {
    const now = Date.now();

    this.decks.set('deck_movies_tv', {
      id: 'deck_movies_tv',
      title: 'Movies',
      description: 'Movies deck',
      category: 'movies_tv',
      tier: 'tier_1',
      card_count: 2,
      compare_eligible: 1,
      showdown_eligible: 1,
      sensitivity: 'standard',
      min_cards_for_profile: 2,
      min_cards_for_compare: 4,
      is_custom: 0,
      cover_tile_key: null,
      created_at: now,
      updated_at: now,
    });

    this.decks.set('deck_custom', {
      id: 'deck_custom',
      title: 'Custom',
      description: 'Custom deck',
      category: 'custom',
      tier: 'tier_1',
      card_count: 1,
      compare_eligible: 1,
      showdown_eligible: 1,
      sensitivity: 'standard',
      min_cards_for_profile: 2,
      min_cards_for_compare: 4,
      is_custom: 1,
      cover_tile_key: null,
      created_at: now,
      updated_at: now,
    });

    const tagRows: DeckTagRow[] = [
      {
        id: 'movies_tv:action',
        deck_id: 'deck_movies_tv',
        facet_id: 'movies_tv:lane',
        slug: 'action',
        label: 'Action',
        description: '',
        sort_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'movies_tv:drama',
        deck_id: 'deck_movies_tv',
        facet_id: 'movies_tv:tone',
        slug: 'drama',
        label: 'Drama',
        description: '',
        sort_order: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'movies_tv:comedy',
        deck_id: 'deck_movies_tv',
        facet_id: 'movies_tv:tone',
        slug: 'comedy',
        label: 'Comedy',
        description: '',
        sort_order: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'movies_tv:prestige',
        deck_id: 'deck_movies_tv',
        facet_id: 'movies_tv:tone',
        slug: 'prestige',
        label: 'Prestige',
        description: '',
        sort_order: 3,
        created_at: now,
        updated_at: now,
      },
    ];

    tagRows.forEach((row) => this.tags.set(row.id, row));

    this.links.push(
      {
        card_id: 'card_1',
        tag_id: 'movies_tv:action',
        role: 'primary',
        created_at: now,
        updated_at: now,
      },
      {
        card_id: 'card_1',
        tag_id: 'movies_tv:drama',
        role: 'secondary',
        created_at: now,
        updated_at: now,
      },
      {
        card_id: 'card_2',
        tag_id: 'movies_tv:comedy',
        role: 'primary',
        created_at: now,
        updated_at: now,
      },
      {
        card_id: 'card_2',
        tag_id: 'movies_tv:drama',
        role: 'secondary',
        created_at: now,
        updated_at: now,
      },
    );

    this.swipeEvents.push(
      {
        id: 'evt_1',
        session_id: 'session_1',
        deck_id: 'deck_movies_tv',
        card_id: 'card_1',
        action: 'yes',
        strength: 1,
        created_at: 1000,
      },
      {
        id: 'evt_2',
        session_id: 'session_1',
        deck_id: 'deck_movies_tv',
        card_id: 'card_2',
        action: 'hard_no',
        strength: -2,
        created_at: 2000,
      },
      {
        id: 'evt_3',
        session_id: 'session_2',
        deck_id: 'deck_movies_tv',
        card_id: 'card_1',
        action: 'skip',
        strength: 0,
        created_at: 3000,
      },
    );

    this.states.set('deck_custom:custom:legacy', {
      deck_id: 'deck_custom',
      tag_id: 'custom:legacy',
      exposure_count: 1,
      distinct_cards_seen: 1,
      positive_weight: 1,
      negative_weight: 0,
      skip_count: 0,
      net_weight: 1,
      uncertainty_score: 0.4,
      first_seen_at: 10,
      last_seen_at: 10,
      last_positive_at: 10,
      last_negative_at: null,
      last_retested_at: null,
      updated_at: 10,
    });
  }

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

    if (/FROM decks WHERE id = \?/i.test(normalized)) {
      const row = this.decks.get(String(params[0]));
      return row ? ([row] as T[]) : [];
    }

    if (/FROM deck_tag_taxonomy WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.tags.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => left.sort_order - right.sort_order) as T[];
    }

    if (/FROM swipe_events WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return this.swipeEvents
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => right.created_at - left.created_at) as T[];
    }

    if (/FROM deck_card_tag_links WHERE card_id = \?/i.test(normalized)) {
      const cardId = String(params[0]);
      return this.links.filter((row) => row.card_id === cardId) as T[];
    }

    if (/FROM deck_tag_state WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.states.values()).filter(
        (row) => row.deck_id === deckId,
      ) as T[];
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }
}

describe('rebuildDeckTagState', () => {
  it('rebuilds tag state deterministically from deck-scoped swipe history', async () => {
    const db = new FakeRebuildDeckTagStateDb() as unknown as SQLiteDatabase;

    const states = await rebuildDeckTagState(db, asDeckId('deck_movies_tv'));
    const persisted = await getDeckTagStateByDeckId(
      db,
      asDeckId('deck_movies_tv'),
    );

    expect(states).toHaveLength(4);
    expect(persisted).toHaveLength(4);

    const action = persisted.find(
      (state) => state.tagId === asDeckTagId('movies_tv:action'),
    );
    expect(action).toEqual(
      expect.objectContaining({
        exposureCount: 2,
        distinctCardsSeen: 1,
        positiveWeight: 1,
        negativeWeight: 0,
        skipCount: 1,
        netWeight: 1,
        firstSeenAt: 1000,
        lastSeenAt: 3000,
        lastPositiveAt: 1000,
        lastNegativeAt: null,
        lastRetestedAt: 3000,
      }),
    );
    expect(action?.uncertaintyScore).toBeCloseTo(2 / 3, 5);

    const drama = persisted.find(
      (state) => state.tagId === asDeckTagId('movies_tv:drama'),
    );
    expect(drama).toEqual(
      expect.objectContaining({
        exposureCount: 3,
        distinctCardsSeen: 2,
        positiveWeight: 1,
        negativeWeight: 2,
        skipCount: 1,
        netWeight: -1,
        firstSeenAt: 1000,
        lastSeenAt: 3000,
        lastPositiveAt: 1000,
        lastNegativeAt: 2000,
        lastRetestedAt: 3000,
      }),
    );
    expect(drama?.uncertaintyScore).toBeCloseTo(7 / 9, 5);

    const unseen = persisted.find(
      (state) => state.tagId === asDeckTagId('movies_tv:prestige'),
    );
    expect(unseen).toEqual(
      expect.objectContaining({
        exposureCount: 0,
        distinctCardsSeen: 0,
        netWeight: 0,
        uncertaintyScore: 1,
        firstSeenAt: null,
        lastSeenAt: null,
      }),
    );
  });

  it('keeps tag state scoped to prebuilt decks only', async () => {
    const db = new FakeRebuildDeckTagStateDb() as unknown as SQLiteDatabase;

    const result = await rebuildDeckTagState(db, asDeckId('deck_custom'));
    const persisted = await getDeckTagStateByDeckId(
      db,
      asDeckId('deck_custom'),
    );

    expect(result).toEqual([]);
    expect(persisted).toEqual([]);
  });
});
