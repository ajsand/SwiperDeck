import type { SQLiteDatabase } from 'expo-sqlite';

import {
  asDeckCardId,
  asDeckId,
  deckCardToRow,
  deckToRow,
  isCardKind,
  isDeckSensitivity,
  isDeckTier,
  rowToDeck,
  rowToDeckCard,
  type Deck,
  type DeckCard,
  type DeckCardRow,
  type DeckRow,
} from '@/types/domain';
import {
  countDeckCardsByDeckId,
  getAllDecks,
  getDeckById,
  getDeckCardById,
  getDeckCardsByDeckId,
  getDecksByCategory,
  upsertDeck,
  upsertDeckCard,
} from '../lib/db';

class FakeDeckBoundaryDb {
  private deckRowsById = new Map<string, DeckRow>();
  private deckCardRowsById = new Map<string, DeckCardRow>();

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (/INSERT OR REPLACE INTO decks/i.test(source)) {
      const [
        id,
        title,
        description,
        category,
        tier,
        cardCount,
        compareEligible,
        showdownEligible,
        sensitivity,
        minCardsForProfile,
        minCardsForCompare,
        isCustom,
        coverTileKey,
        createdAt,
        updatedAt,
      ] = params;

      const row: DeckRow = {
        id: String(id),
        title: String(title),
        description: String(description),
        category: String(category),
        tier: String(tier),
        card_count: Number(cardCount),
        compare_eligible: Number(compareEligible),
        showdown_eligible: Number(showdownEligible),
        sensitivity: String(sensitivity),
        min_cards_for_profile: Number(minCardsForProfile),
        min_cards_for_compare: Number(minCardsForCompare),
        is_custom: Number(isCustom),
        cover_tile_key: coverTileKey == null ? null : String(coverTileKey),
        created_at: Number(createdAt),
        updated_at: Number(updatedAt),
      };

      this.deckRowsById.set(row.id, row);

      return {
        changes: 1,
        lastInsertRowId: 1,
      };
    }

    if (/INSERT OR REPLACE INTO deck_cards/i.test(source)) {
      const [
        id,
        deckId,
        kind,
        title,
        subtitle,
        descriptionShort,
        tagsJson,
        popularity,
        tileKey,
        sortOrder,
        createdAt,
        updatedAt,
      ] = params;

      if (!this.deckRowsById.has(String(deckId))) {
        throw new Error(
          `FOREIGN KEY constraint failed: deck_cards.deck_id -> decks.id (${String(deckId)})`,
        );
      }

      const row: DeckCardRow = {
        id: String(id),
        deck_id: String(deckId),
        kind: String(kind),
        title: String(title),
        subtitle: String(subtitle),
        description_short: String(descriptionShort),
        tags_json: String(tagsJson),
        popularity: Number(popularity),
        tile_key: String(tileKey),
        sort_order: Number(sortOrder),
        created_at: Number(createdAt),
        updated_at: Number(updatedAt),
      };

      this.deckCardRowsById.set(row.id, row);

      return {
        changes: 1,
        lastInsertRowId: 1,
      };
    }

    throw new Error(`Unsupported SQL for runAsync: ${source}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    if (/COUNT\(\*\)\s+AS\s+count\s+FROM deck_cards/i.test(source)) {
      const deckId = String(params[0]);
      const count = Array.from(this.deckCardRowsById.values()).filter(
        (row) => row.deck_id === deckId,
      ).length;
      return { count } as T;
    }

    if (/FROM decks/i.test(source) && /WHERE id = \?/i.test(source)) {
      const deckId = String(params[0]);
      return (this.deckRowsById.get(deckId) ?? null) as T | null;
    }

    if (/FROM deck_cards/i.test(source) && /WHERE id = \?/i.test(source)) {
      const cardId = String(params[0]);
      return (this.deckCardRowsById.get(cardId) ?? null) as T | null;
    }

    throw new Error(`Unsupported SQL for getFirstAsync: ${source}`);
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    if (/FROM decks/i.test(source) && /WHERE category = \?/i.test(source)) {
      const category = String(params[0]);
      return Array.from(this.deckRowsById.values())
        .filter((row) => row.category === category)
        .sort((left, right) => left.title.localeCompare(right.title)) as T[];
    }

    if (/FROM decks/i.test(source)) {
      return Array.from(this.deckRowsById.values()).sort((left, right) =>
        left.title.localeCompare(right.title),
      ) as T[];
    }

    if (/FROM deck_cards/i.test(source) && /WHERE deck_id = \?/i.test(source)) {
      const deckId = String(params[0]);
      return Array.from(this.deckCardRowsById.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => {
          if (left.sort_order !== right.sort_order) {
            return left.sort_order - right.sort_order;
          }

          return left.title.localeCompare(right.title);
        }) as T[];
    }

    throw new Error(`Unsupported SQL for getAllAsync: ${source}`);
  }
}

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies'),
    title: 'Movies & TV',
    description: 'Shared taste in movies, shows, and watch habits.',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 24,
    compareEligible: true,
    showdownEligible: true,
    sensitivity: 'standard',
    minCardsForProfile: 15,
    minCardsForCompare: 30,
    isCustom: false,
    coverTileKey: 'deck:movies-tv',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildDeckCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: asDeckCardId('card_movie_night'),
    deckId: asDeckId('deck_movies'),
    kind: 'statement',
    title: 'I love a quiet movie night at home.',
    subtitle: '',
    descriptionShort:
      'A low-key night in usually sounds better than going out.',
    tags: ['movies', 'routines', 'homebody'],
    popularity: 0.77,
    tileKey: 'statement:movie-night',
    sortOrder: 2,
    createdAt: 1700000002000,
    updatedAt: 1700000003000,
    ...overrides,
  };
}

describe('deck row/domain models and mappers', () => {
  it('maps deck row to domain with boolean conversion', () => {
    const row: DeckRow = {
      id: 'deck_values',
      title: 'Values',
      description: 'What matters most in day-to-day life.',
      category: 'values',
      tier: 'tier_2',
      card_count: 40,
      compare_eligible: 1,
      showdown_eligible: 0,
      sensitivity: 'gated',
      min_cards_for_profile: 18,
      min_cards_for_compare: 32,
      is_custom: 1,
      cover_tile_key: null,
      created_at: 1700000010000,
      updated_at: 1700000011000,
    };

    const deck = rowToDeck(row);

    expect(deck.id).toBe(asDeckId('deck_values'));
    expect(deck.compareEligible).toBe(true);
    expect(deck.showdownEligible).toBe(false);
    expect(deck.isCustom).toBe(true);
    expect(deck.tier).toBe('tier_2');
    expect(deck.sensitivity).toBe('gated');
    expect(deck.category).toBe('values');
  });

  it('roundtrips deck domain to row and back', () => {
    const deck = buildDeck({
      id: asDeckId('deck_travel'),
      title: 'Travel',
      category: 'travel',
      tier: 'tier_3',
      showdownEligible: false,
      sensitivity: 'sensitive',
      isCustom: true,
      coverTileKey: null,
    });

    const row = deckToRow(deck);
    expect(row).toEqual({
      id: 'deck_travel',
      title: 'Travel',
      description: 'Shared taste in movies, shows, and watch habits.',
      category: 'travel',
      tier: 'tier_3',
      card_count: 24,
      compare_eligible: 1,
      showdown_eligible: 0,
      sensitivity: 'sensitive',
      min_cards_for_profile: 15,
      min_cards_for_compare: 30,
      is_custom: 1,
      cover_tile_key: null,
      created_at: 1700000000000,
      updated_at: 1700000001000,
    });
    expect(rowToDeck(row)).toEqual(deck);
  });

  it('roundtrips deck card row and domain with parsed tags', () => {
    const row: DeckCardRow = {
      id: 'card_1',
      deck_id: 'deck_movies',
      kind: 'entity',
      title: 'Before Sunrise',
      subtitle: 'Richard Linklater, 1995',
      description_short: 'Two strangers talk all night in Vienna.',
      tags_json: '["romance","conversation"]',
      popularity: 0.81,
      tile_key: 'movie:before-sunrise',
      sort_order: 4,
      created_at: 1700000020000,
      updated_at: 1700000021000,
    };

    const card = rowToDeckCard(row);
    expect(card.id).toBe(asDeckCardId('card_1'));
    expect(card.deckId).toBe(asDeckId('deck_movies'));
    expect(card.kind).toBe('entity');
    expect(card.tags).toEqual(['romance', 'conversation']);
    expect(deckCardToRow(card)).toEqual(row);
  });

  it('falls back to empty tags when deck card tags_json is malformed', () => {
    const card = rowToDeckCard({
      id: 'card_bad_json',
      deck_id: 'deck_movies',
      kind: 'statement',
      title: 'Bad JSON example',
      subtitle: '',
      description_short: '',
      tags_json: 'not-json',
      popularity: 0.5,
      tile_key: 'statement:bad-json',
      sort_order: 0,
      created_at: 1700000030000,
      updated_at: 1700000031000,
    });

    expect(card.tags).toEqual([]);
  });
});

describe('deck type guards and branded helpers', () => {
  it('validates card kinds', () => {
    expect(isCardKind('entity')).toBe(true);
    expect(isCardKind('statement')).toBe(true);
    expect(isCardKind('unknown')).toBe(false);
  });

  it('validates deck tiers', () => {
    expect(isDeckTier('tier_1')).toBe(true);
    expect(isDeckTier('tier_2')).toBe(true);
    expect(isDeckTier('tier_9')).toBe(false);
  });

  it('validates deck sensitivities', () => {
    expect(isDeckSensitivity('standard')).toBe(true);
    expect(isDeckSensitivity('sensitive')).toBe(true);
    expect(isDeckSensitivity('gated')).toBe(true);
    expect(isDeckSensitivity('extreme')).toBe(false);
  });

  it('creates branded IDs without runtime overhead', () => {
    expect(asDeckId('deck_1')).toBe('deck_1');
    expect(asDeckCardId('card_1')).toBe('card_1');
  });
});

describe('deck DB boundary uses row/domain mappers', () => {
  it('writes and reads decks through the repository boundary', async () => {
    const fakeDb = new FakeDeckBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const moviesDeck = buildDeck();
    const valuesDeck = buildDeck({
      id: asDeckId('deck_values'),
      title: 'Values',
      category: 'values',
    });

    await upsertDeck(db, moviesDeck);
    await upsertDeck(db, valuesDeck);

    expect(await getDeckById(db, moviesDeck.id)).toEqual(moviesDeck);
    expect(await getDeckById(db, asDeckId('missing_deck'))).toBeNull();
    expect(await getAllDecks(db)).toEqual([moviesDeck, valuesDeck]);
    expect(await getDecksByCategory(db, 'movies_tv')).toEqual([moviesDeck]);
  });

  it('writes and reads deck cards through the repository boundary', async () => {
    const fakeDb = new FakeDeckBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const deck = buildDeck();
    const laterCard = buildDeckCard();
    const earlierCard = buildDeckCard({
      id: asDeckCardId('card_first_date'),
      title: 'A first date should have a real destination.',
      tileKey: 'statement:first-date-destination',
      sortOrder: 1,
    });

    await upsertDeck(db, deck);
    await upsertDeckCard(db, laterCard);
    await upsertDeckCard(db, earlierCard);

    expect(await getDeckCardById(db, laterCard.id)).toEqual(laterCard);
    expect(await getDeckCardById(db, asDeckCardId('missing_card'))).toBeNull();
    expect(await getDeckCardsByDeckId(db, deck.id)).toEqual([
      earlierCard,
      laterCard,
    ]);
    expect(await countDeckCardsByDeckId(db, deck.id)).toBe(2);
  });
});
