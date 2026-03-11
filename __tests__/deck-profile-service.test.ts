import type { SQLiteDatabase } from 'expo-sqlite';

import {
  computeDeckProfileSummary,
  recomputeDeckScoresFromEvents,
  updateScoresFromSwipeEvent,
} from '@/lib/profile/deckProfileService';
import {
  actionToDbStrength,
  asDeckCardId,
  asDeckId,
  asSessionId,
  asSwipeEventId,
  type SwipeEvent,
} from '@/types/domain';

jest.mock('@/lib/content', () => ({
  loadPrebuiltDecksIfNeeded: jest.fn().mockResolvedValue({
    status: 'skipped',
    version: 1,
    deckCount: 0,
    cardCount: 0,
    skippedCardCount: 0,
  }),
}));

type MinimalDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

class FakeDeckProfileDb {
  private decks = new Map<string, Record<string, unknown>>();
  private deckCards = new Map<string, Record<string, unknown>>();
  private swipeSessions = new Map<string, Record<string, unknown>>();
  private swipeEvents = new Array<Record<string, unknown>>();
  private deckTagScores = new Map<string, Record<string, unknown>>();
  private deckCardAffinity = new Map<string, Record<string, unknown>>();

  constructor() {
    const now = Date.now();

    this.decks.set('deck_profile_test', {
      id: 'deck_profile_test',
      title: 'Test Deck',
      description: 'Test',
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

    this.deckCards.set('card_1', {
      id: 'card_1',
      deck_id: 'deck_profile_test',
      kind: 'entity',
      title: 'Card One',
      subtitle: 'Sub',
      description_short: 'Desc',
      tags_json: '["action","drama"]',
      popularity: 0.8,
      tile_key: 'tile_1',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    });

    this.deckCards.set('card_2', {
      id: 'card_2',
      deck_id: 'deck_profile_test',
      kind: 'entity',
      title: 'Card Two',
      subtitle: 'Sub',
      description_short: 'Desc',
      tags_json: '["comedy","drama"]',
      popularity: 0.7,
      tile_key: 'tile_2',
      sort_order: 2,
      created_at: now,
      updated_at: now,
    });

    this.swipeSessions.set('session_1', {
      id: 'session_1',
      deck_id: 'deck_profile_test',
      started_at: now,
      ended_at: now + 1000,
      filters_json: '{}',
    });
  }

  private tagKey(deckId: string, tag: string): string {
    return `${deckId}:${tag}`;
  }

  private cardKey(deckId: string, cardId: string): string {
    return `${deckId}:${cardId}`;
  }

  async runAsync(
    sql: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const values = params.length === 1 && Array.isArray(params[0])
      ? (params[0] as unknown[])
      : params;

    if (/INSERT OR REPLACE INTO deck_tag_scores/i.test(normalized)) {
      const row = {
        deck_id: values[0],
        tag: values[1],
        score: values[2],
        pos: values[3],
        neg: values[4],
        last_updated: values[5],
      };
      this.deckTagScores.set(this.tagKey(String(values[0]), String(values[1])), row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_card_affinity/i.test(normalized)) {
      const row = {
        deck_id: values[0],
        card_id: values[1],
        score: values[2],
        pos: values[3],
        neg: values[4],
        last_updated: values[5],
      };
      this.deckCardAffinity.set(
        this.cardKey(String(values[0]), String(values[1])),
        row,
      );
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT INTO swipe_events/i.test(normalized)) {
      this.swipeEvents.push({
        id: values[0],
        session_id: values[1],
        deck_id: values[2],
        card_id: values[3],
        action: values[4],
        strength: values[5],
        created_at: values[6],
      });
      return { changes: 1, lastInsertRowId: 1 };
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows.length > 0 ? rows[0] : null;
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const p = params.length === 1 && Array.isArray(params[0])
      ? (params[0] as unknown[])
      : params;

    if (/FROM deck_cards WHERE id/i.test(normalized) && p[0]) {
      const row = this.deckCards.get(String(p[0]));
      return (row ? [row] : []) as T[];
    }

    if (/FROM decks WHERE id/i.test(normalized) && p[0]) {
      const row = this.decks.get(String(p[0]));
      return (row ? [row] : []) as T[];
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM swipe_events/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const count = this.swipeEvents.filter((e) => e.deck_id === deckId).length;
      return [{ count }] as T[];
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_cards/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const count = Array.from(this.deckCards.values()).filter(
        (c) => c.deck_id === deckId,
      ).length;
      return [{ count }] as T[];
    }

    if (/FROM deck_tag_scores WHERE deck_id = \? AND tag = \?/i.test(normalized) && p.length >= 2) {
      const row = this.deckTagScores.get(this.tagKey(String(p[0]), String(p[1])));
      return (row ? [row] : []) as T[];
    }

    if (/FROM deck_tag_scores WHERE deck_id = \?/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const rows = Array.from(this.deckTagScores.values()).filter(
        (r) => r.deck_id === deckId,
      );
      rows.sort((a, b) => (b.score as number) - (a.score as number));
      return rows as T[];
    }

    if (/FROM deck_card_affinity WHERE deck_id = \? AND card_id = \?/i.test(normalized) && p.length >= 2) {
      const row = this.deckCardAffinity.get(
        this.cardKey(String(p[0]), String(p[1])),
      );
      return (row ? [row] : []) as T[];
    }

    if (/FROM deck_card_affinity WHERE deck_id = \?/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const rows = Array.from(this.deckCardAffinity.values()).filter(
        (r) => r.deck_id === deckId,
      );
      rows.sort((a, b) => (b.score as number) - (a.score as number));
      return rows as T[];
    }

    if (/FROM swipe_events WHERE deck_id/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const rows = [...this.swipeEvents]
        .filter((e) => e.deck_id === deckId)
        .sort((a, b) => (b.created_at as number) - (a.created_at as number));
      return rows as T[];
    }

    return [];
  }
}

describe('deck profile service', () => {
  it('updateScoresFromSwipeEvent updates tag and card scores', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    const event: SwipeEvent = {
      id: asSwipeEventId('evt_1'),
      sessionId: asSessionId('session_1'),
      deckId: asDeckId('deck_profile_test'),
      cardId: asDeckCardId('card_1'),
      action: 'strong_yes',
      strength: actionToDbStrength('strong_yes'),
      createdAt: Date.now(),
    };

    await db.runAsync(
      `
        INSERT INTO swipe_events (id, session_id, deck_id, card_id, action, strength, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      event.id,
      event.sessionId,
      event.deckId,
      event.cardId,
      event.action,
      event.strength,
      event.createdAt,
    );

    await updateScoresFromSwipeEvent(db, event);

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.confidence.swipeCount).toBe(1);
    expect(summary?.affinities.some((a) => a.tag === 'action')).toBe(true);
    expect(summary?.affinities.some((a) => a.tag === 'drama')).toBe(true);
  });

  it('computeDeckProfileSummary returns correct stage and confidence', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.stage).toBe('lightweight');
    expect(summary?.confidence.swipeCount).toBe(0);
    expect(summary?.deckId).toBe(asDeckId('deck_profile_test'));
  });

  it('computeDeckProfileSummary returns null for unknown deck', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('nonexistent_deck'),
    );

    expect(summary).toBeNull();
  });

  it('recomputeDeckScoresFromEvents processes events and updates scores', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    await db.runAsync(
      `
        INSERT INTO swipe_events (id, session_id, deck_id, card_id, action, strength, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      'evt_1',
      'session_1',
      'deck_profile_test',
      'card_1',
      'yes',
      1,
      Date.now(),
    );

    await db.runAsync(
      `
        INSERT INTO swipe_events (id, session_id, deck_id, card_id, action, strength, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      'evt_2',
      'session_1',
      'deck_profile_test',
      'card_2',
      'hard_no',
      -2,
      Date.now() + 1,
    );

    await recomputeDeckScoresFromEvents(db, asDeckId('deck_profile_test'));

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.confidence.swipeCount).toBe(2);
  });
});
