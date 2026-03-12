import type { SQLiteDatabase } from 'expo-sqlite';

import {
  PREBUILT_DECK_VERSION,
  getLoadedContentMeta,
  loadPrebuiltDecksIfNeeded,
  type PrebuiltDeckFile,
  type PrebuiltDeckTaxonomyFile,
} from '@/lib/content';
import type {
  DeckCardRow,
  DeckCardTagLinkRow,
  DeckRow,
  DeckTagFacetRow,
  DeckTagRow,
} from '@/types/domain';

class FakeContentLoaderDb {
  private deckRowsById = new Map<string, DeckRow>();
  private deckCardRowsById = new Map<string, DeckCardRow>();
  private facetRowsById = new Map<string, DeckTagFacetRow>();
  private tagRowsById = new Map<string, DeckTagRow>();
  private linkRowsByKey = new Map<string, DeckCardTagLinkRow>();
  private contentMetaRow: {
    id: number;
    version: number;
    imported_at: number;
    deck_count: number;
    card_count: number;
  } | null = null;
  private swipeEventCount = 0;
  exclusiveTransactionsSupported = true;

  seedSwipeEvent(): void {
    this.swipeEventCount += 1;
  }

  clearCanonicalTagData(): void {
    this.facetRowsById.clear();
    this.tagRowsById.clear();
    this.linkRowsByKey.clear();
  }

  clearPrebuiltDeckData(): void {
    this.deckRowsById.clear();
    this.deckCardRowsById.clear();
  }

  private linkKey(cardId: string, tagId: string): string {
    return `${cardId}:${tagId}`;
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (/INSERT OR REPLACE INTO __deck_content_meta/i.test(source)) {
      this.contentMetaRow = {
        id: Number(params[0]),
        version: Number(params[1]),
        imported_at: Number(params[2]),
        deck_count: Number(params[3]),
        card_count: Number(params[4]),
      };

      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO decks/i.test(source)) {
      const row: DeckRow = {
        id: String(params[0]),
        title: String(params[1]),
        description: String(params[2]),
        category: String(params[3]),
        tier: String(params[4]),
        card_count: Number(params[5]),
        compare_eligible: Number(params[6]),
        showdown_eligible: Number(params[7]),
        sensitivity: String(params[8]),
        min_cards_for_profile: Number(params[9]),
        min_cards_for_compare: Number(params[10]),
        is_custom: Number(params[11]),
        cover_tile_key: params[12] == null ? null : String(params[12]),
        created_at: Number(params[13]),
        updated_at: Number(params[14]),
      };

      this.deckRowsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_cards/i.test(source)) {
      const row: DeckCardRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        kind: String(params[2]),
        title: String(params[3]),
        subtitle: String(params[4]),
        description_short: String(params[5]),
        tags_json: String(params[6]),
        popularity: Number(params[7]),
        tile_key: String(params[8]),
        sort_order: Number(params[9]),
        created_at: Number(params[10]),
        updated_at: Number(params[11]),
      };

      this.deckCardRowsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_tag_facets/i.test(source)) {
      const row: DeckTagFacetRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        key: String(params[2]),
        label: String(params[3]),
        description: String(params[4]),
        sort_order: Number(params[5]),
        created_at: Number(params[6]),
        updated_at: Number(params[7]),
      };
      this.facetRowsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_tag_taxonomy/i.test(source)) {
      const row: DeckTagRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        facet_id: String(params[2]),
        slug: String(params[3]),
        label: String(params[4]),
        description: String(params[5]),
        sort_order: Number(params[6]),
        created_at: Number(params[7]),
        updated_at: Number(params[8]),
      };
      this.tagRowsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/DELETE FROM deck_card_tag_links/i.test(source)) {
      const cardId = String(params[0]);
      for (const [key, row] of this.linkRowsByKey.entries()) {
        if (row.card_id === cardId) {
          this.linkRowsByKey.delete(key);
        }
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/INSERT INTO deck_card_tag_links/i.test(source)) {
      const row: DeckCardTagLinkRow = {
        card_id: String(params[0]),
        tag_id: String(params[1]),
        role: String(params[2]),
        created_at: Number(params[3]),
        updated_at: Number(params[4]),
      };
      this.linkRowsByKey.set(this.linkKey(row.card_id, row.tag_id), row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    throw new Error(`Unsupported SQL for runAsync: ${source}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    if (/SELECT version FROM __deck_content_meta/i.test(source)) {
      return this.contentMetaRow
        ? ({ version: this.contentMetaRow.version } as T)
        : null;
    }

    if (/FROM __deck_content_meta/i.test(source)) {
      return (this.contentMetaRow as T) ?? null;
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_cards/i.test(source)) {
      if (/WHERE deck_id = \?/i.test(source)) {
        const deckId = String(params[0]);
        const count = Array.from(this.deckCardRowsById.values()).filter(
          (row) => row.deck_id === deckId,
        ).length;
        return { count } as T;
      }

      const count = this.deckCardRowsById.size;
      return { count } as T;
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM decks/i.test(source)) {
      const count = Array.from(this.deckRowsById.values()).filter(
        (row) => row.is_custom === 0,
      ).length;
      return { count } as T;
    }

    if (/SELECT 1 AS present\s+FROM deck_tag_facets/i.test(source)) {
      return this.facetRowsById.size > 0 ? ({ present: 1 } as T) : null;
    }

    if (/SELECT 1 AS present\s+FROM deck_tag_taxonomy/i.test(source)) {
      return this.tagRowsById.size > 0 ? ({ present: 1 } as T) : null;
    }

    if (/SELECT 1 AS present\s+FROM deck_card_tag_links/i.test(source)) {
      return this.linkRowsByKey.size > 0 ? ({ present: 1 } as T) : null;
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_tag_facets/i.test(source)) {
      return { count: this.facetRowsById.size } as T;
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_tag_taxonomy/i.test(source)) {
      return { count: this.tagRowsById.size } as T;
    }

    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_card_tag_links/i.test(source)) {
      return { count: this.linkRowsByKey.size } as T;
    }

    throw new Error(`Unsupported SQL for getFirstAsync: ${source}`);
  }

  async getAllAsync<T>(): Promise<T[]> {
    return [];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async withExclusiveTransactionAsync(
    task: (txn: FakeContentLoaderDb) => Promise<void>,
  ): Promise<void> {
    if (!this.exclusiveTransactionsSupported) {
      throw new Error('withExclusiveTransactionAsync is not supported on web');
    }

    await task(this);
  }

  getDeckRows(): DeckRow[] {
    return Array.from(this.deckRowsById.values()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  getDeckCardRows(): DeckCardRow[] {
    return Array.from(this.deckCardRowsById.values()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  getFacetRows(): DeckTagFacetRow[] {
    return Array.from(this.facetRowsById.values()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  getTagRows(): DeckTagRow[] {
    return Array.from(this.tagRowsById.values()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  getLinkRows(): DeckCardTagLinkRow[] {
    return Array.from(this.linkRowsByKey.values()).sort(
      (left, right) =>
        left.card_id.localeCompare(right.card_id) ||
        left.tag_id.localeCompare(right.tag_id),
    );
  }

  getSwipeEventCount(): number {
    return this.swipeEventCount;
  }
}

function buildFixture(
  overrides: Partial<PrebuiltDeckFile> = {},
): PrebuiltDeckFile {
  return {
    version: PREBUILT_DECK_VERSION,
    decks: [
      {
        id: 'deck_values',
        title: 'Values',
        description: 'Explore what matters most.',
        category: 'values',
        cards: [
          {
            id: 'values_001',
            kind: 'statement',
            title: 'Honesty matters more to me than being liked',
            tags: ['honesty', 'growth', 'justice'],
            tag_assignments: [
              { tag_id: 'values:honesty', role: 'primary' },
              { tag_id: 'values:growth', role: 'secondary' },
              { tag_id: 'values:justice', role: 'supporting' },
            ],
            popularity: 0.8,
          },
          {
            id: 'values_002',
            kind: 'statement',
            title: 'I value stability more than chaos',
            tags: ['stability', 'loyalty', 'growth'],
            tag_assignments: [
              { tag_id: 'values:stability', role: 'primary' },
              { tag_id: 'values:loyalty', role: 'secondary' },
              { tag_id: 'values:growth', role: 'supporting' },
            ],
            popularity: 0.6,
          },
        ],
      },
      {
        id: 'deck_music',
        title: 'Music',
        description: 'The sounds you replay and share.',
        category: 'music',
        cards: [
          {
            id: 'music_001',
            kind: 'entity',
            title: 'Beyonce',
            tags: ['pop', 'rnb', 'live-music'],
            tag_assignments: [
              { tag_id: 'music:pop', role: 'primary' },
              { tag_id: 'music:rnb', role: 'secondary' },
              { tag_id: 'music:live-music', role: 'supporting' },
            ],
            popularity: 0.95,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function buildTaxonomyFixture(
  overrides: Partial<PrebuiltDeckTaxonomyFile> = {},
): PrebuiltDeckTaxonomyFile {
  return {
    version: PREBUILT_DECK_VERSION,
    decks: [
      {
        deck_id: 'deck_values',
        category: 'values',
        facets: [
          { id: 'values:care', key: 'care', label: 'Care' },
          {
            id: 'values:self_direction',
            key: 'self_direction',
            label: 'Self direction',
          },
          { id: 'values:order', key: 'order', label: 'Order' },
        ],
        tags: [
          {
            id: 'values:honesty',
            facet_id: 'values:care',
            slug: 'honesty',
            label: 'Honesty',
          },
          {
            id: 'values:growth',
            facet_id: 'values:self_direction',
            slug: 'growth',
            label: 'Growth',
          },
          {
            id: 'values:justice',
            facet_id: 'values:care',
            slug: 'justice',
            label: 'Justice',
          },
          {
            id: 'values:stability',
            facet_id: 'values:order',
            slug: 'stability',
            label: 'Stability',
          },
          {
            id: 'values:loyalty',
            facet_id: 'values:care',
            slug: 'loyalty',
            label: 'Loyalty',
          },
          {
            id: 'values:compassion',
            facet_id: 'values:care',
            slug: 'compassion',
            label: 'Compassion',
          },
          {
            id: 'values:freedom',
            facet_id: 'values:self_direction',
            slug: 'freedom',
            label: 'Freedom',
          },
          {
            id: 'values:progress',
            facet_id: 'values:order',
            slug: 'progress',
            label: 'Progress',
          },
        ],
      },
      {
        deck_id: 'deck_music',
        category: 'music',
        facets: [
          { id: 'music:genres', key: 'genres', label: 'Genres' },
          { id: 'music:discovery', key: 'discovery', label: 'Discovery' },
          { id: 'music:energy', key: 'energy', label: 'Energy' },
        ],
        tags: [
          {
            id: 'music:pop',
            facet_id: 'music:genres',
            slug: 'pop',
            label: 'Pop',
          },
          {
            id: 'music:rnb',
            facet_id: 'music:genres',
            slug: 'rnb',
            label: 'R&B',
          },
          {
            id: 'music:live-music',
            facet_id: 'music:discovery',
            slug: 'live-music',
            label: 'Live music',
          },
          {
            id: 'music:rock',
            facet_id: 'music:genres',
            slug: 'rock',
            label: 'Rock',
          },
          {
            id: 'music:hiphop',
            facet_id: 'music:genres',
            slug: 'hiphop',
            label: 'Hip-hop',
          },
          {
            id: 'music:jazz',
            facet_id: 'music:genres',
            slug: 'jazz',
            label: 'Jazz',
          },
          {
            id: 'music:electronic',
            facet_id: 'music:energy',
            slug: 'electronic',
            label: 'Electronic',
          },
          {
            id: 'music:discovery',
            facet_id: 'music:discovery',
            slug: 'discovery',
            label: 'Discovery',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('loadPrebuiltDecksIfNeeded', () => {
  it('loads decks, cards, taxonomy, and content metadata', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(
      db,
      buildFixture(),
      buildTaxonomyFixture(),
    );

    expect(result).toMatchObject({
      status: 'loaded',
      version: 2,
      deckCount: 2,
      cardCount: 3,
      skippedCardCount: 0,
    });
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);
    expect(fakeDb.getFacetRows()).toHaveLength(6);
    expect(fakeDb.getTagRows()).toHaveLength(16);
    expect(fakeDb.getLinkRows()).toHaveLength(9);

    const meta = await getLoadedContentMeta(db);
    expect(meta).toMatchObject({
      version: 2,
      deckCount: 2,
      cardCount: 3,
    });
  });

  it('skips loading when the current content version is already present', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    await loadPrebuiltDecksIfNeeded(db, buildFixture(), buildTaxonomyFixture());
    const secondRun = await loadPrebuiltDecksIfNeeded(
      db,
      buildFixture(),
      buildTaxonomyFixture(),
    );

    expect(secondRun.status).toBe('skipped');
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);
  });

  it('reloads bundled content when the content version is current but taxonomy data is missing', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    await loadPrebuiltDecksIfNeeded(db, buildFixture(), buildTaxonomyFixture());
    fakeDb.clearCanonicalTagData();

    const secondRun = await loadPrebuiltDecksIfNeeded(
      db,
      buildFixture(),
      buildTaxonomyFixture(),
    );

    expect(secondRun.status).toBe('loaded');
    expect(fakeDb.getFacetRows()).toHaveLength(6);
    expect(fakeDb.getTagRows()).toHaveLength(16);
    expect(fakeDb.getLinkRows()).toHaveLength(9);
  });

  it('reloads bundled content when the content version is current but prebuilt deck rows are missing', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    await loadPrebuiltDecksIfNeeded(db, buildFixture(), buildTaxonomyFixture());
    fakeDb.clearPrebuiltDeckData();

    const secondRun = await loadPrebuiltDecksIfNeeded(
      db,
      buildFixture(),
      buildTaxonomyFixture(),
    );

    expect(secondRun.status).toBe('loaded');
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);
  });

  it('falls back to withTransactionAsync when exclusive transactions are unsupported', async () => {
    const fakeDb = new FakeContentLoaderDb();
    fakeDb.exclusiveTransactionsSupported = false;
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(
      db,
      buildFixture(),
      buildTaxonomyFixture(),
    );

    expect(result).toMatchObject({
      status: 'loaded',
      deckCount: 2,
      cardCount: 3,
    });
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);
  });

  it('handles an empty deck array gracefully', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(
      db,
      {
        version: PREBUILT_DECK_VERSION,
        decks: [],
      },
      {
        version: PREBUILT_DECK_VERSION,
        decks: [],
      },
    );

    expect(result).toMatchObject({
      status: 'loaded',
      deckCount: 0,
      cardCount: 0,
    });
    expect(fakeDb.getDeckRows()).toEqual([]);
    expect(fakeDb.getDeckCardRows()).toEqual([]);
  });

  it('skips malformed cards without aborting the entire load', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(
      db,
      {
        version: PREBUILT_DECK_VERSION,
        decks: [
          {
            id: 'deck_values',
            title: 'Values',
            description: 'Explore what matters most.',
            category: 'values',
            cards: [
              {
                id: 'values_001',
                kind: 'statement',
                title: 'Honesty matters more to me than being liked',
                tags: ['honesty', 'growth', 'justice'],
                tag_assignments: [
                  { tag_id: 'values:honesty', role: 'primary' },
                  { tag_id: 'values:growth', role: 'secondary' },
                  { tag_id: 'values:justice', role: 'supporting' },
                ],
                popularity: 0.8,
              },
              {
                id: 'values_002',
                kind: 'essay',
                title: 'This card should be skipped',
                tag_assignments: [
                  { tag_id: 'values:honesty', role: 'primary' },
                ],
              },
            ],
          },
        ],
      },
      {
        version: PREBUILT_DECK_VERSION,
        decks: [buildTaxonomyFixture().decks[0]],
      },
    );

    expect(result).toMatchObject({
      status: 'loaded',
      deckCount: 1,
      cardCount: 1,
      skippedCardCount: 1,
    });
    expect(fakeDb.getDeckCardRows()).toHaveLength(1);
    expect(fakeDb.getLinkRows()).toHaveLength(3);
    expect(fakeDb.getDeckRows()[0].card_count).toBe(1);
  });

  it('replaces card-tag links without wiping existing swipe data', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    fakeDb.seedSwipeEvent();
    await loadPrebuiltDecksIfNeeded(db, buildFixture(), buildTaxonomyFixture());

    expect(fakeDb.getSwipeEventCount()).toBe(1);
    const firstLinks = fakeDb
      .getLinkRows()
      .filter((row) => row.card_id === 'values_001');
    expect(firstLinks).toHaveLength(3);

    const updatedFixture = buildFixture();
    updatedFixture.decks[0].cards[0].tag_assignments = [
      { tag_id: 'values:honesty', role: 'primary' },
      { tag_id: 'values:justice', role: 'secondary' },
    ];
    updatedFixture.decks[0].cards[0].tags = ['honesty', 'justice'];

    const dbReload = new FakeContentLoaderDb();
    dbReload.seedSwipeEvent();
    await loadPrebuiltDecksIfNeeded(
      dbReload as unknown as SQLiteDatabase,
      updatedFixture,
      buildTaxonomyFixture(),
    );

    expect(dbReload.getSwipeEventCount()).toBe(1);
    const updatedLinks = dbReload
      .getLinkRows()
      .filter((row) => row.card_id === 'values_001');
    expect(updatedLinks).toHaveLength(2);
    expect(updatedLinks.map((row) => row.tag_id)).toEqual([
      'values:honesty',
      'values:justice',
    ]);
  });
});
