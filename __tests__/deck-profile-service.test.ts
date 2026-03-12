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
    version: 2,
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
  private deckTagFacets = new Map<string, Record<string, unknown>>();
  private deckTags = new Map<string, Record<string, unknown>>();
  private cardTagLinks = new Array<Record<string, unknown>>();
  private swipeSessions = new Map<string, Record<string, unknown>>();
  private swipeEvents = new Array<Record<string, unknown>>();
  private deckTagState = new Map<string, Record<string, unknown>>();
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

    this.deckTagFacets.set('movies_tv:lane', {
      id: 'movies_tv:lane',
      deck_id: 'deck_profile_test',
      key: 'lane',
      label: 'Lane',
      description: '',
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    this.deckTagFacets.set('movies_tv:tone', {
      id: 'movies_tv:tone',
      deck_id: 'deck_profile_test',
      key: 'tone',
      label: 'Tone',
      description: '',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    });

    this.deckTags.set('movies_tv:action', {
      id: 'movies_tv:action',
      deck_id: 'deck_profile_test',
      facet_id: 'movies_tv:lane',
      slug: 'action',
      label: 'Action',
      description: '',
      sort_order: 0,
      created_at: now,
      updated_at: now,
    });
    this.deckTags.set('movies_tv:drama', {
      id: 'movies_tv:drama',
      deck_id: 'deck_profile_test',
      facet_id: 'movies_tv:tone',
      slug: 'drama',
      label: 'Drama',
      description: '',
      sort_order: 1,
      created_at: now,
      updated_at: now,
    });
    this.deckTags.set('movies_tv:comedy', {
      id: 'movies_tv:comedy',
      deck_id: 'deck_profile_test',
      facet_id: 'movies_tv:tone',
      slug: 'comedy',
      label: 'Comedy',
      description: '',
      sort_order: 2,
      created_at: now,
      updated_at: now,
    });

    this.cardTagLinks.push(
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

    this.swipeSessions.set('session_1', {
      id: 'session_1',
      deck_id: 'deck_profile_test',
      started_at: now,
      ended_at: now + 1000,
      filters_json: '{}',
    });
  }

  private tagKey(deckId: string, tagId: string): string {
    return `${deckId}:${tagId}`;
  }

  private cardKey(deckId: string, cardId: string): string {
    return `${deckId}:${cardId}`;
  }

  private stateKey(deckId: string, tagId: string): string {
    return `${deckId}:${tagId}`;
  }

  async runAsync(
    sql: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const normalized = sql.replace(/\s+/g, ' ').trim();
    const values =
      params.length === 1 && Array.isArray(params[0])
        ? (params[0] as unknown[])
        : params;

    if (/INSERT OR REPLACE INTO deck_tag_scores/i.test(normalized)) {
      const row = {
        deck_id: values[0],
        tag_id: values[1],
        score: values[2],
        pos: values[3],
        neg: values[4],
        last_updated: values[5],
      };
      this.deckTagScores.set(
        this.tagKey(String(values[0]), String(values[1])),
        row,
      );
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/DELETE FROM deck_tag_state/i.test(normalized)) {
      const deckId = String(values[0]);
      for (const [key, row] of this.deckTagState.entries()) {
        if (row.deck_id === deckId) {
          this.deckTagState.delete(key);
        }
      }

      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/INSERT OR REPLACE INTO deck_tag_state/i.test(normalized)) {
      const row = {
        deck_id: values[0],
        tag_id: values[1],
        exposure_count: values[2],
        distinct_cards_seen: values[3],
        positive_weight: values[4],
        negative_weight: values[5],
        skip_count: values[6],
        net_weight: values[7],
        uncertainty_score: values[8],
        first_seen_at: values[9],
        last_seen_at: values[10],
        last_positive_at: values[11],
        last_negative_at: values[12],
        last_retested_at: values[13],
        updated_at: values[14],
      };
      this.deckTagState.set(
        this.stateKey(String(values[0]), String(values[1])),
        row,
      );
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

    if (/DELETE FROM deck_tag_scores/i.test(normalized)) {
      const deckId = String(values[0]);
      for (const [key, row] of this.deckTagScores.entries()) {
        if (row.deck_id === deckId) {
          this.deckTagScores.delete(key);
        }
      }

      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/DELETE FROM deck_card_affinity/i.test(normalized)) {
      const deckId = String(values[0]);
      for (const [key, row] of this.deckCardAffinity.entries()) {
        if (row.deck_id === deckId) {
          this.deckCardAffinity.delete(key);
        }
      }

      return { changes: 1, lastInsertRowId: 0 };
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
    const p =
      params.length === 1 && Array.isArray(params[0])
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

    if (
      /COUNT\(\*\)\s+AS\s+count\s+FROM swipe_events/i.test(normalized) &&
      p[0]
    ) {
      const deckId = String(p[0]);
      const count = this.swipeEvents.filter((e) => e.deck_id === deckId).length;
      return [{ count }] as T[];
    }

    if (/SELECT DISTINCT card_id FROM swipe_events/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const distinctCardIds = Array.from(
        new Set(
          this.swipeEvents
            .filter((event) => event.deck_id === deckId)
            .map((event) => event.card_id),
        ),
      );

      return distinctCardIds.map((card_id) => ({ card_id })) as T[];
    }

    if (
      /COUNT\(\*\)\s+AS\s+count\s+FROM deck_cards/i.test(normalized) &&
      p[0]
    ) {
      const deckId = String(p[0]);
      const count = Array.from(this.deckCards.values()).filter(
        (c) => c.deck_id === deckId,
      ).length;
      return [{ count }] as T[];
    }

    if (
      /FROM deck_tag_scores WHERE deck_id = \? AND tag_id = \?/i.test(
        normalized,
      ) &&
      p.length >= 2
    ) {
      const row = this.deckTagScores.get(
        this.tagKey(String(p[0]), String(p[1])),
      );
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

    if (/FROM deck_tag_state WHERE deck_id = \?/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      const rows = Array.from(this.deckTagState.values()).filter(
        (row) => row.deck_id === deckId,
      );
      rows.sort((left, right) => {
        if (
          (left.uncertainty_score as number) !==
          (right.uncertainty_score as number)
        ) {
          return (
            (right.uncertainty_score as number) -
            (left.uncertainty_score as number)
          );
        }

        return (
          ((right.last_seen_at as number | null) ?? 0) -
          ((left.last_seen_at as number | null) ?? 0)
        );
      });
      return rows as T[];
    }

    if (
      /FROM deck_card_affinity WHERE deck_id = \? AND card_id = \?/i.test(
        normalized,
      ) &&
      p.length >= 2
    ) {
      const row = this.deckCardAffinity.get(
        this.cardKey(String(p[0]), String(p[1])),
      );
      return (row ? [row] : []) as T[];
    }

    if (
      /FROM deck_card_affinity WHERE deck_id = \?/i.test(normalized) &&
      p[0]
    ) {
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

    if (/FROM deck_card_tag_links WHERE card_id/i.test(normalized) && p[0]) {
      const cardId = String(p[0]);
      return this.cardTagLinks.filter((link) => link.card_id === cardId) as T[];
    }

    if (/FROM deck_tag_facets WHERE deck_id = \?/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      return Array.from(this.deckTagFacets.values()).filter(
        (facet) => facet.deck_id === deckId,
      ) as T[];
    }

    if (/FROM deck_tag_taxonomy WHERE id = \?/i.test(normalized) && p[0]) {
      const row = this.deckTags.get(String(p[0]));
      return row ? ([row] as T[]) : [];
    }

    if (/FROM deck_tag_taxonomy WHERE deck_id = \?/i.test(normalized) && p[0]) {
      const deckId = String(p[0]);
      return Array.from(this.deckTags.values()).filter(
        (tag) => tag.deck_id === deckId,
      ) as T[];
    }

    return [];
  }
}

async function insertSwipeEvent(
  db: MinimalDb,
  event: SwipeEvent,
): Promise<void> {
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
}

describe('deck profile service', () => {
  it('updateScoresFromSwipeEvent builds richer coverage and unresolved areas', async () => {
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

    await insertSwipeEvent(db, event);
    await updateScoresFromSwipeEvent(db, event);

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.confidence.swipeCount).toBe(1);
    expect(summary?.coverage.tags.totalTagCount).toBe(3);
    expect(summary?.coverage.tags.seenTagCount).toBe(2);
    expect(summary?.coverage.facets.seenFacetCount).toBe(2);
    expect(summary?.affinities.some((a) => a.tag === 'Action')).toBe(true);
    expect(summary?.affinities.some((a) => a.tag === 'Drama')).toBe(true);
    expect(
      summary?.unresolved.some(
        (area) => area.tag === 'Action' && area.reason === 'pending_retest',
      ),
    ).toBe(true);
    expect(summary?.readiness.blockers).toContain('not_enough_swipes');
  });

  it('computeDeckProfileSummary returns correct stage, coverage, and blockers with no swipes', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.stage).toBe('lightweight');
    expect(summary?.confidence.swipeCount).toBe(0);
    expect(summary?.coverage.tags.totalTagCount).toBe(3);
    expect(summary?.coverage.tags.seenTagCount).toBe(0);
    expect(summary?.coverage.facets.seenFacetCount).toBe(0);
    expect(summary?.deckId).toBe(asDeckId('deck_profile_test'));
    expect(summary?.readiness.compareReady).toBe(false);
    expect(summary?.readiness.blockers).toContain('not_enough_swipes');
    expect(summary?.confidence.components.tagCoverage).toBe(0);
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

  it('recomputeDeckScoresFromEvents processes events and updates stability-aware coverage', async () => {
    const fake = new FakeDeckProfileDb();
    const db = fake as unknown as MinimalDb;

    await insertSwipeEvent(db, {
      id: asSwipeEventId('evt_1'),
      sessionId: asSessionId('session_1'),
      deckId: asDeckId('deck_profile_test'),
      cardId: asDeckCardId('card_1'),
      action: 'yes',
      strength: 1,
      createdAt: Date.now(),
    });

    await insertSwipeEvent(db, {
      id: asSwipeEventId('evt_2'),
      sessionId: asSessionId('session_1'),
      deckId: asDeckId('deck_profile_test'),
      cardId: asDeckCardId('card_2'),
      action: 'hard_no',
      strength: -2,
      createdAt: Date.now() + 1,
    });

    await insertSwipeEvent(db, {
      id: asSwipeEventId('evt_3'),
      sessionId: asSessionId('session_1'),
      deckId: asDeckId('deck_profile_test'),
      cardId: asDeckCardId('card_2'),
      action: 'no',
      strength: -1,
      createdAt: Date.now() + 2,
    });

    await recomputeDeckScoresFromEvents(db, asDeckId('deck_profile_test'));

    const summary = await computeDeckProfileSummary(
      db,
      asDeckId('deck_profile_test'),
    );

    expect(summary).not.toBeNull();
    expect(summary?.confidence.swipeCount).toBe(3);
    expect(summary?.coverage.tags.seenTagCount).toBe(3);
    expect(summary?.coverage.facets.seenFacetCount).toBe(2);
    expect(summary?.stability.retestedTagCount).toBeGreaterThan(0);
    expect(summary?.aversions.some((area) => area.tag === 'Comedy')).toBe(true);
  });
});
