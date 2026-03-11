import {
  validateCard,
  validateDeck,
  type PrebuiltCardEntry,
  type PrebuiltDeckEntry,
} from '@/lib/content';
import { asDeckId } from '@/types/domain';

describe('validateDeck', () => {
  const timestamp = 1700000000000;

  it('accepts a well-formed deck entry and applies defaults', () => {
    const entry: PrebuiltDeckEntry = {
      id: 'deck_values',
      title: 'Values',
      description: 'Explore what matters most.',
      category: 'VALUES',
      cards: [{ id: 'values_001', kind: 'statement', title: 'Truth matters' }],
    };

    const result = validateDeck(entry, timestamp);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid deck.');
    }

    expect(result.deck.category).toBe('values');
    expect(result.deck.tier).toBe('tier_1');
    expect(result.deck.sensitivity).toBe('standard');
    expect(result.deck.minCardsForProfile).toBe(15);
    expect(result.deck.minCardsForCompare).toBe(30);
    expect(result.deck.createdAt).toBe(timestamp);
  });

  it('rejects decks with missing required fields', () => {
    const result = validateDeck(
      {
        id: '',
        title: '',
        description: '',
        category: '',
        cards: [],
      },
      timestamp,
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid deck.');
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Deck id is required.',
        'Deck "(unknown)" is missing a title.',
      ]),
    );
  });

  it('rejects decks with an empty cards array', () => {
    const result = validateDeck(
      {
        id: 'deck_music',
        title: 'Music',
        description: 'Deck description',
        category: 'music',
        cards: [],
      },
      timestamp,
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid deck.');
    }

    expect(result.errors).toContain(
      'Deck "deck_music" must contain at least one card.',
    );
  });
});

describe('validateCard', () => {
  const deck = {
    id: asDeckId('deck_movies_tv'),
    category: 'movies_tv',
  } as const;
  const timestamp = 1700000000000;

  it('accepts a well-formed card entry', () => {
    const entry: PrebuiltCardEntry = {
      id: 'movies_tv_001',
      kind: 'entity',
      title: 'The Shawshank Redemption',
      subtitle: 'Frank Darabont, 1994',
      description_short: 'Hope and friendship inside prison walls.',
      tags: ['Drama', ' classic ', 'drama'],
      popularity: 1.2,
      sort_order: 4,
    };

    const result = validateCard(entry, deck, 0, timestamp);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid card.');
    }

    expect(result.card.kind).toBe('entity');
    expect(result.card.tags).toEqual(['drama', 'classic']);
    expect(result.card.popularity).toBe(1);
    expect(result.card.sortOrder).toBe(4);
    expect(result.card.tileKey).toBe('movies_tv:movies_tv_001');
  });

  it('rejects cards with invalid kind or missing title', () => {
    const result = validateCard(
      {
        id: 'bad_card',
        kind: 'essay',
        title: '',
      },
      deck,
      2,
      timestamp,
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid card.');
    }

    expect(result.errors.join(' ')).toContain('invalid kind');
  });

  it('clamps popularity, truncates tags, and defaults sort order', () => {
    const result = validateCard(
      {
        id: 'movies_tv_002',
        kind: 'statement',
        title: 'x'.repeat(300),
        tags: [
          ' Drama ',
          'science fiction',
          'drama',
          'cinema',
          'binge',
          'classic',
          'indie',
          'romance',
          'documentary',
          'action',
          'scifi',
          'horror',
          'animation',
          'comedy',
          'extra-one',
          'extra-two',
        ],
        popularity: -5,
      },
      deck,
      7,
      timestamp,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid card.');
    }

    expect(result.card.title).toHaveLength(200);
    expect(result.card.tags).toHaveLength(15);
    expect(result.card.tags[1]).toBe('science-fiction');
    expect(result.card.popularity).toBe(0);
    expect(result.card.sortOrder).toBe(7);
  });
});
