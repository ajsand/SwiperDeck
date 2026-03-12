import {
  buildDeckSequenceQueueEntries,
  determineDeckSequenceStage,
  type BroadStartSequenceContext,
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
  type DeckCardAffinity,
  type DeckCardState,
  type DeckCardTagLink,
  type DeckTag,
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
    exposureCount: 3,
    distinctCardsSeen: 3,
    positiveWeight: 1,
    negativeWeight: 0,
    skipCount: 0,
    netWeight: 1,
    uncertaintyScore: 0.2,
    firstSeenAt: 1700000001000,
    lastSeenAt: 1700000002000,
    lastPositiveAt: 1700000002000,
    lastNegativeAt: null,
    lastRetestedAt: null,
    updatedAt: 1700000003000,
    ...overrides,
  };
}

function buildTagScore(tagId: string, score: number): DeckTagScore {
  return {
    deckId: asDeckId('deck_movies_tv'),
    tagId: asDeckTagId(tagId),
    score,
    pos: Math.max(score, 0),
    neg: Math.max(score * -1, 0),
    lastUpdated: 1700000004000,
  };
}

function buildCardAffinity(cardId: string, score: number): DeckCardAffinity {
  return {
    deckId: asDeckId('deck_movies_tv'),
    cardId: asDeckCardId(cardId),
    score,
    pos: Math.max(score, 0),
    neg: Math.max(score * -1, 0),
    lastUpdated: 1700000004000,
  };
}

function buildLink(
  cardId: string,
  tagId: string,
  role: DeckCardTagLink['role'] = 'primary',
): DeckCardTagLink {
  return {
    cardId: asDeckCardId(cardId),
    tagId: asDeckTagId(tagId),
    role,
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

function buildSeenCardIds(count: number): Set<DeckCard['id']> {
  return new Set(
    Array.from({ length: count }, (_, index) =>
      asDeckCardId(`seen_card_${index + 1}`),
    ),
  );
}

function buildContext(args: {
  allCards: DeckCard[];
  tags: DeckTag[];
  facets: DeckTagFacet[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  cardAffinities?: DeckCardAffinity[];
  cardStates?: DeckCardState[];
  links: Array<[string, DeckCardTagLink[]]>;
  recentSwipeEvents?: SwipeEvent[];
}): BroadStartSequenceContext {
  return {
    deck: buildDeck(),
    allCards: args.allCards,
    seenCardIds: buildSeenCardIds(8),
    tagStates: args.tagStates,
    tagScores: args.tagScores,
    cardAffinities: args.cardAffinities ?? [],
    cardStates: args.cardStates ?? [],
    tags: args.tags,
    facets: args.facets,
    cardTagLinksByCardId: new Map(args.links),
    recentSwipeEvents: args.recentSwipeEvents ?? [],
  };
}

describe('tag-aware scoring', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reinforces positive tag areas during adaptive sequencing', () => {
    const cards = [
      buildCard('card_action', 1, 0.85),
      buildCard('card_drama', 0, 0.78),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:drama', 'movies_tv:tone', 1),
    ];
    const context = buildContext({
      allCards: cards,
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:tone', 'tone', 1),
      ],
      tagStates: [
        buildTagState('movies_tv:action', {
          positiveWeight: 4,
          netWeight: 4,
          uncertaintyScore: 0.15,
        }),
        buildTagState('movies_tv:drama', {
          positiveWeight: 1,
          netWeight: 0.4,
          uncertaintyScore: 0.3,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:action', 3.2),
        buildTagScore('movies_tv:drama', 0.3),
      ],
      links: [
        ['card_action', [buildLink('card_action', 'movies_tv:action')]],
        ['card_drama', [buildLink('card_drama', 'movies_tv:drama')]],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(determineDeckSequenceStage(context)).toBe('adaptive');
    expect(queue[0].card.id).toBe(asDeckCardId('card_action'));
    expect(queue[0].decision.primaryReason).toBe('reinforce_positive_area');
    expect(
      queue[0].decision.breakdown?.components.map((component) => component.key),
    ).toEqual(
      expect.arrayContaining([
        'tag_affinity',
        'card_affinity',
        'coverage_bonus',
        'novelty_bonus',
        'representative_prior',
        'recent_repeat_penalty',
        'already_seen_penalty',
      ]),
    );
    expect(
      queue[0].decision.breakdown?.components.find(
        (component) => component.key === 'tag_affinity',
      )?.scoreDelta,
    ).toBeGreaterThan(0);
  });

  it('avoids strongly negative tags even when those cards have higher editorial priority', () => {
    const cards = [
      buildCard('card_horror', 0, 0.95),
      buildCard('card_romcom', 1, 0.62),
    ];
    const tags = [
      buildTag('movies_tv:horror', 'movies_tv:tone', 0),
      buildTag('movies_tv:romcom', 'movies_tv:tone', 1),
    ];
    const context = buildContext({
      allCards: cards,
      tags,
      facets: [buildFacet('movies_tv:tone', 'tone', 0)],
      tagStates: [
        buildTagState('movies_tv:horror', {
          positiveWeight: 0,
          negativeWeight: 4,
          netWeight: -4,
          uncertaintyScore: 0.2,
        }),
        buildTagState('movies_tv:romcom', {
          positiveWeight: 1,
          netWeight: 0.8,
          uncertaintyScore: 0.25,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:horror', -4.5),
        buildTagScore('movies_tv:romcom', 0.6),
      ],
      links: [
        ['card_horror', [buildLink('card_horror', 'movies_tv:horror')]],
        ['card_romcom', [buildLink('card_romcom', 'movies_tv:romcom')]],
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);
    const horrorEntry = queue.find(
      (entry) => entry.card.id === asDeckCardId('card_horror'),
    );

    expect(queue[0].card.id).toBe(asDeckCardId('card_romcom'));
    expect(
      horrorEntry?.decision.breakdown?.components.find(
        (component) => component.key === 'tag_affinity',
      )?.scoreDelta,
    ).toBeLessThan(0);
  });

  it('probes adjacent tags when direct-match cards are recently overrepresented', () => {
    const cards = [
      buildCard('card_action_repeat', 0, 0.88),
      buildCard('card_adjacent_probe', 1, 0.72),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:arthouse', 'movies_tv:style', 1),
      buildTag('movies_tv:prestige', 'movies_tv:style', 2),
    ];
    const context = buildContext({
      allCards: cards,
      tags,
      facets: [
        buildFacet('movies_tv:pace', 'pace', 0),
        buildFacet('movies_tv:style', 'style', 1),
      ],
      tagStates: [
        buildTagState('movies_tv:action', {
          positiveWeight: 4,
          netWeight: 3.5,
          uncertaintyScore: 0.12,
        }),
        buildTagState('movies_tv:arthouse', {
          exposureCount: 1,
          distinctCardsSeen: 1,
          positiveWeight: 0,
          negativeWeight: 1.2,
          netWeight: -1.2,
          uncertaintyScore: 0.4,
        }),
        buildTagState('movies_tv:prestige', {
          exposureCount: 2,
          distinctCardsSeen: 2,
          positiveWeight: 2,
          netWeight: 1.8,
          uncertaintyScore: 0.3,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:action', 2.4),
        buildTagScore('movies_tv:arthouse', -1.2),
        buildTagScore('movies_tv:prestige', 2.5),
      ],
      links: [
        [
          'card_action_repeat',
          [buildLink('card_action_repeat', 'movies_tv:action')],
        ],
        [
          'card_adjacent_probe',
          [
            buildLink('card_adjacent_probe', 'movies_tv:arthouse'),
            buildLink('card_adjacent_probe', 'movies_tv:prestige', 'secondary'),
          ],
        ],
        ['seen_action_1', [buildLink('seen_action_1', 'movies_tv:action')]],
        ['seen_action_2', [buildLink('seen_action_2', 'movies_tv:action')]],
        ['seen_action_3', [buildLink('seen_action_3', 'movies_tv:action')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_action_3', 3000),
        buildSwipeEvent('seen_action_2', 2000),
        buildSwipeEvent('seen_action_1', 1000),
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue[0].card.id).toBe(asDeckCardId('card_adjacent_probe'));
    expect(queue[0].decision.primaryReason).toBe('probe_adjacent_tag');
    expect(
      queue[0].decision.breakdown?.components.find(
        (component) => component.key === 'coverage_bonus',
      )?.scoreDelta,
    ).toBeGreaterThan(0);
  });

  it('keeps adaptive tie-breaking deterministic by sort order then card id', () => {
    const cards = [buildCard('card_a', 0, 0.75), buildCard('card_b', 0, 0.75)];
    const tags = [buildTag('movies_tv:comfort_watch', 'movies_tv:mood', 0)];
    const context = buildContext({
      allCards: cards,
      tags,
      facets: [buildFacet('movies_tv:mood', 'mood', 0)],
      tagStates: [
        buildTagState('movies_tv:comfort_watch', {
          positiveWeight: 2,
          netWeight: 1.5,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:comfort_watch', 1.5)],
      links: [
        ['card_a', [buildLink('card_a', 'movies_tv:comfort_watch')]],
        ['card_b', [buildLink('card_b', 'movies_tv:comfort_watch')]],
      ],
      cardAffinities: [
        buildCardAffinity('card_a', 0),
        buildCardAffinity('card_b', 0),
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);

    expect(queue.map((entry) => entry.card.id)).toEqual([
      asDeckCardId('card_a'),
      asDeckCardId('card_b'),
    ]);
  });

  it('suppresses a recently presented candidate when adaptive scoring recomputes on resume', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000002000);

    const cards = [
      buildCard('card_recent', 0, 0.91),
      buildCard('card_fresh', 1, 0.72),
    ];
    const tags = [buildTag('movies_tv:comfort_watch', 'movies_tv:mood', 0)];
    const context = buildContext({
      allCards: cards,
      tags,
      facets: [buildFacet('movies_tv:mood', 'mood', 0)],
      tagStates: [
        buildTagState('movies_tv:comfort_watch', {
          positiveWeight: 2,
          netWeight: 1.5,
          uncertaintyScore: 0.18,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:comfort_watch', 1.8)],
      links: [
        ['card_recent', [buildLink('card_recent', 'movies_tv:comfort_watch')]],
        ['card_fresh', [buildLink('card_fresh', 'movies_tv:comfort_watch')]],
      ],
      cardStates: [
        buildCardState('card_recent', {
          lastPresentedAt: 1700000001500,
          updatedAt: 1700000001500,
        }),
      ],
    });

    const queue = buildDeckSequenceQueueEntries(context);
    const recentEntry = queue.find(
      (entry) => entry.card.id === asDeckCardId('card_recent'),
    );

    expect(queue[0].card.id).toBe(asDeckCardId('card_fresh'));
    expect(recentEntry?.decision.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'presentation_recency_penalty_applied',
        }),
      ]),
    );
  });
});
