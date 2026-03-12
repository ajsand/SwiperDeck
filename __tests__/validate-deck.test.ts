import {
  validateCard,
  validateDeck,
  type PrebuiltCardEntry,
  type PrebuiltDeckEntry,
} from '@/lib/content';
import {
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  type DeckTag,
  type DeckTagFacet,
} from '@/types/domain';
import type { NormalizedDeckTaxonomy } from '@/lib/content';

function buildMoviesTaxonomy(): NormalizedDeckTaxonomy {
  const deckId = asDeckId('deck_movies_tv');
  const facets: DeckTagFacet[] = [
    {
      id: asDeckTagFacetId('movies_tv:tone'),
      deckId,
      key: 'tone',
      label: 'Tone',
      description: '',
      sortOrder: 0,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      id: asDeckTagFacetId('movies_tv:format'),
      deckId,
      key: 'format',
      label: 'Format',
      description: '',
      sortOrder: 1,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      id: asDeckTagFacetId('movies_tv:lane'),
      deckId,
      key: 'lane',
      label: 'Lane',
      description: '',
      sortOrder: 2,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  const tags: DeckTag[] = [
    ['drama', 'movies_tv:tone'],
    ['classic', 'movies_tv:lane'],
    ['cinema', 'movies_tv:format'],
    ['comedy', 'movies_tv:tone'],
    ['binge', 'movies_tv:format'],
    ['action', 'movies_tv:lane'],
    ['indie', 'movies_tv:lane'],
    ['romance', 'movies_tv:tone'],
  ].map(([slug, facetId], index) => ({
    id: asDeckTagId(`movies_tv:${slug}`),
    deckId,
    facetId: asDeckTagFacetId(facetId),
    slug,
    label: slug,
    description: '',
    sortOrder: index,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  }));

  return {
    deckId,
    category: 'movies_tv',
    facets,
    tags,
    facetsById: new Map(facets.map((facet) => [facet.id as string, facet])),
    tagsById: new Map(tags.map((tag) => [tag.id as string, tag])),
    tagsBySlug: new Map(tags.map((tag) => [tag.slug, tag])),
  };
}

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
  const taxonomy = buildMoviesTaxonomy();
  const timestamp = 1700000000000;

  it('accepts a well-formed card entry and returns canonical tag links', () => {
    const entry: PrebuiltCardEntry = {
      id: 'movies_tv_001',
      kind: 'entity',
      title: 'The Shawshank Redemption',
      subtitle: 'Frank Darabont, 1994',
      description_short: 'Hope and friendship inside prison walls.',
      tags: ['Drama', ' classic ', 'drama'],
      tag_assignments: [
        { tag_id: 'movies_tv:drama', role: 'primary' },
        { tag_id: 'movies_tv:classic', role: 'secondary' },
      ],
      popularity: 1.2,
      sort_order: 4,
    };

    const result = validateCard(entry, deck, taxonomy, 0, timestamp);
    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid card.');
    }

    expect(result.card.kind).toBe('entity');
    expect(result.card.tags).toEqual(['drama', 'classic']);
    expect(result.card.popularity).toBe(1);
    expect(result.card.sortOrder).toBe(4);
    expect(result.card.tileKey).toBe('movies_tv:movies_tv_001');
    expect(result.tagLinks).toHaveLength(2);
    expect(result.tagLinks[0].role).toBe('primary');
    expect(result.tagLinks[0].tagId).toBe(asDeckTagId('movies_tv:drama'));
  });

  it('rejects cards with invalid kind, invalid assignments, or missing title', () => {
    const result = validateCard(
      {
        id: 'bad_card',
        kind: 'essay',
        title: '',
        tag_assignments: [
          { tag_id: 'movies_tv:drama', role: 'primary' },
          { tag_id: 'movies_tv:classic', role: 'primary' },
        ],
      },
      deck,
      taxonomy,
      2,
      timestamp,
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid card.');
    }

    expect(result.errors.join(' ')).toContain('invalid kind');
    expect(result.errors.join(' ')).toContain('exactly one primary');
  });

  it('clamps popularity, enforces canonical display tags, and defaults sort order', () => {
    const result = validateCard(
      {
        id: 'movies_tv_002',
        kind: 'statement',
        title: 'x'.repeat(300),
        tags: ['Drama', 'science fiction'],
        tag_assignments: [
          { tag_id: 'movies_tv:drama', role: 'primary' },
          { tag_id: 'movies_tv:cinema', role: 'secondary' },
        ],
        popularity: -5,
      },
      deck,
      taxonomy,
      7,
      timestamp,
    );

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid card.');
    }

    expect(result.errors[0]).toContain('display tag "science-fiction"');
  });

  it('derives display tags from canonical assignments when tags are omitted', () => {
    const result = validateCard(
      {
        id: 'movies_tv_003',
        kind: 'entity',
        title: 'Before Sunrise',
        tag_assignments: [
          { tag_id: 'movies_tv:romance', role: 'primary' },
          { tag_id: 'movies_tv:cinema', role: 'secondary' },
        ],
      },
      deck,
      taxonomy,
      3,
      timestamp,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid card.');
    }

    expect(result.card.tags).toEqual(['romance', 'cinema']);
    expect(result.card.popularity).toBe(0.5);
    expect(result.card.sortOrder).toBe(3);
  });
});
