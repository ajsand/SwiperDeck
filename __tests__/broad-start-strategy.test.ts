import {
  buildDeckSequenceQueueEntries,
  type BroadStartSequenceContext,
  determineDeckSequenceStage,
} from '@/lib/sequence/broadStartStrategy';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  asSessionId,
  asSwipeEventId,
  type Deck,
  type DeckCard,
  type DeckCardTagLink,
  type DeckCardState,
  type DeckTag,
  type DeckCardAffinity,
  type DeckTagFacet,
  type DeckTagScore,
  type DeckTagState,
  type SwipeEvent,
} from '@/types/domain';

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies_tv'),
    title: 'Movies & TV',
    description: 'Test deck',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 12,
    compareEligible: true,
    showdownEligible: true,
    sensitivity: 'standard',
    minCardsForProfile: 15,
    minCardsForCompare: 30,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildCard(
  id: string,
  sortOrder: number,
  popularity: number,
): DeckCard {
  return {
    id: asDeckCardId(id),
    deckId: asDeckId('deck_movies_tv'),
    kind: 'entity',
    title: id,
    subtitle: '',
    descriptionShort: '',
    tags: [],
    popularity,
    tileKey: `tile:${id}`,
    sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildTag(id: string, facetId: string, sortOrder: number): DeckTag {
  const slug = id.split(':')[1] ?? id;

  return {
    id: asDeckTagId(id),
    deckId: asDeckId('deck_movies_tv'),
    facetId: asDeckTagFacetId(facetId),
    slug,
    label: slug,
    description: '',
    sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildFacet(id: string, key: string, sortOrder: number): DeckTagFacet {
  return {
    id: asDeckTagFacetId(id),
    deckId: asDeckId('deck_movies_tv'),
    key,
    label: key,
    description: '',
    sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildTagState(
  tagId: string,
  overrides: Partial<DeckTagState> = {},
): DeckTagState {
  return {
    deckId: asDeckId('deck_movies_tv'),
    tagId: asDeckTagId(tagId),
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
    updatedAt: 1700000002000,
    ...overrides,
  };
}

function buildPrimaryLink(cardId: string, tagId: string): DeckCardTagLink {
  return {
    cardId: asDeckCardId(cardId),
    tagId: asDeckTagId(tagId),
    role: 'primary',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildCardState(
  cardId: string,
  overrides: Partial<DeckCardState> = {},
): DeckCardState {
  return {
    deckId: asDeckId('deck_movies_tv'),
    cardId: asDeckCardId(cardId),
    presentationCount: 1,
    swipeCount: 0,
    lastPresentedAt: 1700000001000,
    lastSwipedAt: null,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildSwipeEvent(cardId: string, createdAt: number): SwipeEvent {
  return {
    id: asSwipeEventId(`event_${cardId}_${createdAt}`),
    sessionId: asSessionId(`session_${createdAt}`),
    deckId: asDeckId('deck_movies_tv'),
    cardId: asDeckCardId(cardId),
    action: 'yes',
    strength: 1,
    createdAt,
  };
}

function buildContext(args: {
  deck?: Deck;
  allCards: DeckCard[];
  seenCardIds?: Set<DeckCard['id']>;
  tagStates: DeckTagState[];
  tagScores?: DeckTagScore[];
  cardAffinities?: DeckCardAffinity[];
  tags: DeckTag[];
  facets?: DeckTagFacet[];
  links: Array<[string, DeckCardTagLink[]]>;
  recentSwipeEvents?: SwipeEvent[];
  cardStates?: DeckCardState[];
}): BroadStartSequenceContext {
  return {
    deck: args.deck ?? buildDeck(),
    allCards: args.allCards,
    seenCardIds: args.seenCardIds ?? new Set(),
    tagStates: args.tagStates,
    tagScores: args.tagScores ?? [],
    cardAffinities: args.cardAffinities ?? [],
    cardStates: args.cardStates ?? [],
    tags: args.tags,
    facets:
      args.facets ??
      args.tags.map((tag, index) =>
        buildFacet(
          tag.facetId,
          String(tag.facetId).split(':')[1] ?? `facet_${index}`,
          index,
        ),
      ),
    cardTagLinksByCardId: new Map(args.links),
    recentSwipeEvents: args.recentSwipeEvents ?? [],
  };
}

describe('broadStartStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts broad and covers a different facet after the first representative pick', () => {
    const cards = [
      buildCard('card_action', 0, 0.92),
      buildCard('card_comedy', 1, 0.76),
      buildCard('card_adventure', 2, 0.7),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:comedy', 'movies_tv:tone', 1),
      buildTag('movies_tv:adventure', 'movies_tv:pace', 2),
    ];
    const context = buildContext({
      allCards: cards,
      tagStates: [
        buildTagState('movies_tv:action'),
        buildTagState('movies_tv:comedy'),
        buildTagState('movies_tv:adventure'),
      ],
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:tone', 'tone', 1),
      ],
      links: [
        ['card_action', [buildPrimaryLink('card_action', 'movies_tv:action')]],
        ['card_comedy', [buildPrimaryLink('card_comedy', 'movies_tv:comedy')]],
        [
          'card_adventure',
          [buildPrimaryLink('card_adventure', 'movies_tv:adventure')],
        ],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(determineDeckSequenceStage(context)).toBe('broad_start');
    expect(queue[0].card.id).toBe(asDeckCardId('card_action'));
    expect(queue[1].card.id).toBe(asDeckCardId('card_comedy'));
    expect(queue[0].decision.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'undercovered_facet',
        'undercovered_tag',
        'representative_pick',
      ]),
    );
  });

  it('avoids collapsing into the same primary tag after an early positive streak', () => {
    const cards = [
      buildCard('card_action_2', 0, 0.98),
      buildCard('card_comedy_1', 1, 0.62),
      buildCard('card_drama_1', 2, 0.6),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:comedy', 'movies_tv:tone', 1),
      buildTag('movies_tv:drama', 'movies_tv:tone', 2),
    ];
    const context = buildContext({
      allCards: cards,
      seenCardIds: new Set([
        asDeckCardId('seen_action_1'),
        asDeckCardId('seen_action_2'),
        asDeckCardId('seen_action_3'),
      ]),
      tagStates: [
        buildTagState('movies_tv:action', {
          exposureCount: 3,
          distinctCardsSeen: 3,
          positiveWeight: 3,
          netWeight: 3,
          uncertaintyScore: 0.15,
        }),
        buildTagState('movies_tv:comedy'),
        buildTagState('movies_tv:drama'),
      ],
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:tone', 'tone', 1),
      ],
      links: [
        [
          'card_action_2',
          [buildPrimaryLink('card_action_2', 'movies_tv:action')],
        ],
        [
          'card_comedy_1',
          [buildPrimaryLink('card_comedy_1', 'movies_tv:comedy')],
        ],
        ['card_drama_1', [buildPrimaryLink('card_drama_1', 'movies_tv:drama')]],
        [
          'seen_action_1',
          [buildPrimaryLink('seen_action_1', 'movies_tv:action')],
        ],
        [
          'seen_action_2',
          [buildPrimaryLink('seen_action_2', 'movies_tv:action')],
        ],
        [
          'seen_action_3',
          [buildPrimaryLink('seen_action_3', 'movies_tv:action')],
        ],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_action_3', 3000),
        buildSwipeEvent('seen_action_2', 2000),
        buildSwipeEvent('seen_action_1', 1000),
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue[0].card.id).toBe(asDeckCardId('card_comedy_1'));
    expect(queue[0].decision.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['undercovered_facet', 'undercovered_tag']),
    );
  });

  it('surfaces a card from an undercovered facet even when mainstream cards are more popular', () => {
    const cards = [
      buildCard('card_action_mainstream', 0, 0.99),
      buildCard('card_action_alt', 1, 0.82),
      buildCard('card_prestige', 2, 0.41),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:prestige', 'movies_tv:tone', 1),
    ];
    const context = buildContext({
      allCards: cards,
      seenCardIds: new Set([asDeckCardId('seen_action')]),
      tagStates: [
        buildTagState('movies_tv:action', {
          exposureCount: 1,
          distinctCardsSeen: 1,
          positiveWeight: 1,
          netWeight: 1,
          uncertaintyScore: 0.45,
        }),
        buildTagState('movies_tv:prestige'),
      ],
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:tone', 'tone', 1),
      ],
      links: [
        [
          'card_action_mainstream',
          [buildPrimaryLink('card_action_mainstream', 'movies_tv:action')],
        ],
        [
          'card_action_alt',
          [buildPrimaryLink('card_action_alt', 'movies_tv:action')],
        ],
        [
          'card_prestige',
          [buildPrimaryLink('card_prestige', 'movies_tv:prestige')],
        ],
        ['seen_action', [buildPrimaryLink('seen_action', 'movies_tv:action')]],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue[0].card.id).toBe(asDeckCardId('card_prestige'));
    expect(queue[0].decision.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(['undercovered_facet', 'undercovered_tag']),
    );
  });

  it('uses deterministic tie-breaking by sort order and card id', () => {
    const cards = [buildCard('card_a', 0, 0.7), buildCard('card_b', 0, 0.7)];
    const tags = [buildTag('movies_tv:action', 'movies_tv:pace', 0)];
    const context = buildContext({
      allCards: cards,
      tagStates: [buildTagState('movies_tv:action')],
      tags,
      facets: [buildFacet('movies_tv:pace', 'pace', 0)],
      links: [
        ['card_a', [buildPrimaryLink('card_a', 'movies_tv:action')]],
        ['card_b', [buildPrimaryLink('card_b', 'movies_tv:action')]],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue.map((entry) => entry.card.id)).toEqual([
      asDeckCardId('card_a'),
      asDeckCardId('card_b'),
    ]);
  });

  it('suppresses a recently presented card when a session restarts', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000002000);

    const cards = [
      buildCard('card_recent', 0, 0.98),
      buildCard('card_fresh', 1, 0.66),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:comedy', 'movies_tv:tone', 1),
    ];
    const context = buildContext({
      allCards: cards,
      tagStates: [
        buildTagState('movies_tv:action'),
        buildTagState('movies_tv:comedy'),
      ],
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:tone', 'tone', 1),
      ],
      links: [
        ['card_recent', [buildPrimaryLink('card_recent', 'movies_tv:action')]],
        ['card_fresh', [buildPrimaryLink('card_fresh', 'movies_tv:comedy')]],
      ],
      cardStates: [
        buildCardState('card_recent', {
          lastPresentedAt: 1700000001500,
          updatedAt: 1700000001500,
        }),
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue[0].card.id).toBe(asDeckCardId('card_fresh'));
    expect(queue[1].decision.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'presentation_recency_penalty_applied',
        }),
      ]),
    );
  });

  it('falls back to adaptive ordering for custom decks', () => {
    const cards = [buildCard('card_b', 1, 0.5), buildCard('card_a', 0, 0.4)];
    const context = buildContext({
      deck: buildDeck({
        id: asDeckId('deck_custom'),
        isCustom: true,
        cardCount: 2,
      }),
      allCards: cards,
      tagStates: [],
      tags: [],
      facets: [],
      links: [
        ['card_a', []],
        ['card_b', []],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(determineDeckSequenceStage(context)).toBe('adaptive');
    expect(queue.map((entry) => entry.card.id)).toEqual([
      asDeckCardId('card_a'),
      asDeckCardId('card_b'),
    ]);
    expect(queue[0].decision.stage).toBe('adaptive');
  });
});
