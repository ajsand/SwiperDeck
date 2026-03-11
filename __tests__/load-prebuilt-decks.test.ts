import type { SQLiteDatabase } from 'expo-sqlite';

import {
  PREBUILT_DECK_VERSION,
  getLoadedContentMeta,
  loadPrebuiltDecksIfNeeded,
  type PrebuiltDeckFile,
} from '@/lib/content';
import type { DeckCardRow, DeckRow } from '@/types/domain';

class FakeContentLoaderDb {
  private deckRowsById = new Map<string, DeckRow>();
  private deckCardRowsById = new Map<string, DeckCardRow>();
  private contentMetaRow: {
    id: number;
    version: number;
    imported_at: number;
    deck_count: number;
    card_count: number;
  } | null = null;

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

    if (/DELETE FROM decks/i.test(source)) {
      const isCustomValue = Number(params[0]);
      const deckIdsToDelete = Array.from(this.deckRowsById.values())
        .filter((row) => row.is_custom === isCustomValue)
        .map((row) => row.id);

      deckIdsToDelete.forEach((deckId) => {
        this.deckRowsById.delete(deckId);
        for (const [cardId, row] of this.deckCardRowsById.entries()) {
          if (row.deck_id === deckId) {
            this.deckCardRowsById.delete(cardId);
          }
        }
      });

      return {
        changes: deckIdsToDelete.length,
        lastInsertRowId: 0,
      };
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
      const deckId = String(params[0]);
      const count = Array.from(this.deckCardRowsById.values()).filter(
        (row) => row.deck_id === deckId,
      ).length;
      return { count } as T;
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
            popularity: 0.8,
          },
          {
            id: 'values_002',
            kind: 'statement',
            title: 'I value stability more than chaos',
            tags: ['stability', 'loyalty', 'growth'],
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
            title: 'Beyoncé',
            tags: ['pop', 'rnb', 'live-music'],
            popularity: 0.95,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('loadPrebuiltDecksIfNeeded', () => {
  it('loads decks and cards from a fixture and records content metadata', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(db, buildFixture());

    expect(result).toMatchObject({
      status: 'loaded',
      version: 1,
      deckCount: 2,
      cardCount: 3,
      skippedCardCount: 0,
    });
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);

    const meta = await getLoadedContentMeta(db);
    expect(meta).toMatchObject({
      version: 1,
      deckCount: 2,
      cardCount: 3,
    });
  });

  it('skips loading when the current content version is already present', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    await loadPrebuiltDecksIfNeeded(db, buildFixture());
    const secondRun = await loadPrebuiltDecksIfNeeded(db, buildFixture());

    expect(secondRun.status).toBe('skipped');
    expect(fakeDb.getDeckRows()).toHaveLength(2);
    expect(fakeDb.getDeckCardRows()).toHaveLength(3);
  });

  it('handles an empty deck array gracefully', async () => {
    const fakeDb = new FakeContentLoaderDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const result = await loadPrebuiltDecksIfNeeded(db, {
      version: PREBUILT_DECK_VERSION,
      decks: [],
    });

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

    const result = await loadPrebuiltDecksIfNeeded(db, {
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
              popularity: 0.8,
            },
            {
              id: 'values_002',
              kind: 'essay',
              title: 'This card should be skipped',
            },
          ],
        },
      ],
    });

    expect(result).toMatchObject({
      status: 'loaded',
      deckCount: 1,
      cardCount: 1,
      skippedCardCount: 1,
    });
    expect(fakeDb.getDeckCardRows()).toHaveLength(1);
    expect(fakeDb.getDeckRows()[0].card_count).toBe(1);
  });
});
