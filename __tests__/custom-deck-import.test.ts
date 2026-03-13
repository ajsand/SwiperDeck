import type { SQLiteDatabase } from 'expo-sqlite';

import { createCustomDeck } from '@/lib/customDecks/createCustomDeck';
import { importCustomDeck } from '@/lib/customDecks/importCustomDeck';
import { validateCustomDeck } from '@/lib/customDecks/validateCustomDeck';
import { getDeckById, getAllDecks, getDeckCardsByDeckId } from '@/lib/db';
import { asDeckId, type DeckCardRow, type DeckRow } from '@/types/domain';

class FakeCustomDeckDb {
  private decks = new Map<string, DeckRow>();
  private cards = new Map<string, DeckCardRow>();

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const normalized = source.replace(/\s+/g, ' ').trim();

    if (/INSERT OR REPLACE INTO decks/i.test(normalized)) {
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

      this.decks.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_cards/i.test(normalized)) {
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

      if (!this.decks.has(row.deck_id)) {
        throw new Error('deck_cards FK failed');
      }

      this.cards.set(row.id, row);
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

    if (/FROM decks ORDER BY title/i.test(normalized)) {
      return Array.from(this.decks.values()).sort((left, right) =>
        left.title.localeCompare(right.title),
      ) as T[];
    }

    if (/FROM deck_cards WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.cards.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => left.sort_order - right.sort_order) as T[];
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }
}

describe('custom deck create/import', () => {
  it('rejects invalid custom deck input', () => {
    expect(() =>
      validateCustomDeck({
        title: '  ',
        description: 'A deck',
        cards: [{ title: 'One card only' }],
      }),
    ).toThrow('Deck title is required');

    expect(() =>
      validateCustomDeck({
        title: 'Too short',
        description: 'A deck',
        cards: [{ title: 'One' }, { title: 'Two' }],
      }),
    ).toThrow('Custom decks need at least 3 cards');
  });

  it('creates a local custom deck with statement cards and stores it safely', async () => {
    const db = new FakeCustomDeckDb() as unknown as SQLiteDatabase;

    const created = await createCustomDeck(db, {
      title: 'Road trip rules',
      description: 'Prompts for planning and travel habits.',
      category: 'travel',
      cardsText:
        'I like to plan stops in advance.\nI care more about scenery than speed.\nI would rather detour than stick to the route.',
    });

    expect(created.deck.isCustom).toBe(true);
    expect(created.deck.compareEligible).toBe(false);
    expect(created.deck.showdownEligible).toBe(false);
    expect(created.cards).toHaveLength(3);

    const decks = await getAllDecks(db);
    const storedDeck = await getDeckById(db, created.deck.id);
    const storedCards = await getDeckCardsByDeckId(db, created.deck.id);

    expect(decks).toHaveLength(1);
    expect(storedDeck?.title).toBe('Road trip rules');
    expect(storedCards.map((card) => card.title)).toEqual([
      'I like to plan stops in advance.',
      'I care more about scenery than speed.',
      'I would rather detour than stick to the route.',
    ]);
  });

  it('imports local custom deck JSON and preserves the custom-deck boundary', async () => {
    const db = new FakeCustomDeckDb() as unknown as SQLiteDatabase;

    const imported = await importCustomDeck(
      db,
      JSON.stringify({
        title: 'Sunday reset',
        description: 'A few home-life prompts.',
        category: 'home_life',
        cards: [
          'I recharge best with quiet time at home.',
          {
            title: 'A great Sunday includes cooking something slow.',
            tags: ['food', 'slow'],
          },
          {
            title: 'I like to reset the week before Monday starts.',
            descriptionShort: 'Planning prompt',
            kind: 'statement',
          },
        ],
      }),
    );

    const storedDeck = await getDeckById(db, imported.deck.id);
    const storedCards = await getDeckCardsByDeckId(db, imported.deck.id);

    expect(storedDeck?.isCustom).toBe(true);
    expect(storedDeck?.compareEligible).toBe(false);
    expect(storedDeck?.category).toBe('home_life');
    expect(storedCards).toHaveLength(3);
    expect(storedCards[1].tags).toEqual(['food', 'slow']);
  });

  it('supports deck lookup after import so custom decks appear in normal deck flows', async () => {
    const db = new FakeCustomDeckDb() as unknown as SQLiteDatabase;

    const imported = await importCustomDeck(
      db,
      JSON.stringify({
        title: 'Tiny apartment living',
        description: 'Lifestyle prompts.',
        cards: ['One', 'Two', 'Three'],
      }),
    );

    const storedDeck = await getDeckById(db, imported.deck.id);
    expect(storedDeck?.id).toBe(imported.deck.id);
    expect(storedDeck?.isCustom).toBe(true);
    expect(storedDeck?.id).not.toBe(asDeckId('deck_movies_tv'));
  });
});
