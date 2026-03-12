import {
  buildAdaptiveSequenceQueueEntries,
  buildBaseAdaptiveSequenceQueueEntries,
  type TagAwareAdaptiveSequenceContext,
} from '@/lib/sequence/tagAwareScoring';
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
  type DeckCardTagLink,
  type DeckTag,
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
    cardCount: 20,
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
    uncertaintyScore: 0.25,
    firstSeenAt: 1700000000000,
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

function buildSwipeEvent(
  cardId: string,
  createdAt: number,
  strength: number = 1,
): SwipeEvent {
  return {
    id: asSwipeEventId(`event_${cardId}_${createdAt}`),
    sessionId: asSessionId(`session_${createdAt}`),
    deckId: asDeckId('deck_movies_tv'),
    cardId: asDeckCardId(cardId),
    action: strength >= 0 ? 'yes' : 'no',
    strength,
    createdAt,
  };
}

function buildContext(args: {
  remainingCards: DeckCard[];
  tags: DeckTag[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  links: Array<[string, DeckCardTagLink[]]>;
  recentSwipeEvents?: SwipeEvent[];
  cardAffinities?: DeckCardAffinity[];
}): TagAwareAdaptiveSequenceContext {
  return {
    deck: buildDeck(),
    allCards: args.remainingCards,
    remainingCards: args.remainingCards,
    seenCardIds: new Set(
      Array.from({ length: 10 }, (_, index) =>
        asDeckCardId(`seen_card_${index + 1}`),
      ),
    ),
    tags: args.tags,
    tagStates: args.tagStates,
    tagScores: args.tagScores,
    cardAffinities: args.cardAffinities ?? [],
    cardTagLinksByCardId: new Map(args.links),
    recentSwipeEvents: args.recentSwipeEvents ?? [],
  };
}

describe('sequence guardrails', () => {
  it('breaks a narrow positive-streak collapse by promoting an undercovered area', () => {
    const cards = [
      buildCard('card_action_repeat', 0, 0.95),
      buildCard('card_comedy_recovery', 2, 0.35),
    ];
    const tags = [
      buildTag('movies_tv:action', 'movies_tv:pace', 0),
      buildTag('movies_tv:comedy', 'movies_tv:tone', 1),
    ];
    const context = buildContext({
      remainingCards: cards,
      tags,
      tagStates: [
        buildTagState('movies_tv:action', {
          exposureCount: 6,
          distinctCardsSeen: 6,
          positiveWeight: 6,
          netWeight: 6,
          uncertaintyScore: 0.1,
        }),
        buildTagState('movies_tv:comedy', {
          exposureCount: 1,
          distinctCardsSeen: 1,
          positiveWeight: 0,
          netWeight: -0.2,
          uncertaintyScore: 0.45,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:action', 4.8),
        buildTagScore('movies_tv:comedy', -0.2),
      ],
      links: [
        [
          'card_action_repeat',
          [buildLink('card_action_repeat', 'movies_tv:action')],
        ],
        [
          'card_comedy_recovery',
          [buildLink('card_comedy_recovery', 'movies_tv:comedy')],
        ],
        ['seen_action_1', [buildLink('seen_action_1', 'movies_tv:action')]],
        ['seen_action_2', [buildLink('seen_action_2', 'movies_tv:action')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_action_2', 2000, 1),
        buildSwipeEvent('seen_action_1', 1000, 1),
      ],
    });

    const baseQueue = buildBaseAdaptiveSequenceQueueEntries(context);
    const finalQueue = buildAdaptiveSequenceQueueEntries(context);

    expect(baseQueue[0].card.id).toBe(asDeckCardId('card_action_repeat'));
    expect(finalQueue[0].card.id).toBe(asDeckCardId('card_comedy_recovery'));
    expect(finalQueue[0].decision.guardrails?.winnerChanged).toBe(true);
    expect(
      finalQueue[0].decision.guardrails?.adjustments.map(
        (adjustment) => adjustment.rule,
      ),
    ).toEqual(
      expect.arrayContaining([
        'undercovered_facet_boost',
        'undercovered_tag_boost',
      ]),
    );
  });

  it('breaks a narrow negative-streak collapse instead of staying in the same pocket', () => {
    const cards = [
      buildCard('card_luxury_repeat', 0, 0.92),
      buildCard('card_nature_recovery', 1, 0.42),
    ];
    const tags = [
      buildTag('travel:luxury', 'travel:style', 0),
      buildTag('travel:nature', 'travel:trip_type', 1),
    ];
    const context = buildContext({
      remainingCards: cards,
      tags,
      tagStates: [
        buildTagState('travel:luxury', {
          exposureCount: 5,
          distinctCardsSeen: 5,
          positiveWeight: 4,
          negativeWeight: 1,
          netWeight: 3,
          uncertaintyScore: 0.2,
        }),
        buildTagState('travel:nature', {
          exposureCount: 1,
          distinctCardsSeen: 1,
          positiveWeight: 0,
          negativeWeight: 1.5,
          netWeight: -1.5,
          uncertaintyScore: 0.5,
        }),
      ],
      tagScores: [
        buildTagScore('travel:luxury', 3),
        buildTagScore('travel:nature', -1.5),
      ],
      links: [
        [
          'card_luxury_repeat',
          [buildLink('card_luxury_repeat', 'travel:luxury')],
        ],
        [
          'card_nature_recovery',
          [buildLink('card_nature_recovery', 'travel:nature')],
        ],
        ['seen_luxury_1', [buildLink('seen_luxury_1', 'travel:luxury')]],
        ['seen_luxury_2', [buildLink('seen_luxury_2', 'travel:luxury')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_luxury_2', 2000, -1),
        buildSwipeEvent('seen_luxury_1', 1000, -1),
      ],
    });

    const baseQueue = buildBaseAdaptiveSequenceQueueEntries(context);
    const finalQueue = buildAdaptiveSequenceQueueEntries(context);

    expect(baseQueue[0].card.id).toBe(asDeckCardId('card_luxury_repeat'));
    expect(finalQueue[0].card.id).toBe(asDeckCardId('card_nature_recovery'));
    expect(
      finalQueue[0].decision.breakdown?.components.find(
        (component) => component.key === 'undercovered_facet_boost',
      )?.scoreDelta,
    ).toBeGreaterThan(0);
  });

  it('recovers an undercovered facet even without a direct streak cap trigger', () => {
    const cards = [
      buildCard('card_mainstream_action', 0, 0.96),
      buildCard('card_prestige_recovery', 1, 0.28),
    ];
    const tags = [
      buildTag('movies_tv:mainstream', 'movies_tv:audience', 0),
      buildTag('movies_tv:prestige', 'movies_tv:style', 1),
    ];
    const context = buildContext({
      remainingCards: cards,
      tags,
      tagStates: [
        buildTagState('movies_tv:mainstream', {
          exposureCount: 7,
          distinctCardsSeen: 7,
          positiveWeight: 4,
          netWeight: 4,
          uncertaintyScore: 0.1,
        }),
        buildTagState('movies_tv:prestige', {
          exposureCount: 0,
          distinctCardsSeen: 0,
          positiveWeight: 0,
          negativeWeight: 0,
          netWeight: 0,
          uncertaintyScore: 1,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:mainstream', 1.8),
        buildTagScore('movies_tv:prestige', 0),
      ],
      links: [
        [
          'card_mainstream_action',
          [buildLink('card_mainstream_action', 'movies_tv:mainstream')],
        ],
        [
          'card_prestige_recovery',
          [buildLink('card_prestige_recovery', 'movies_tv:prestige')],
        ],
      ],
      recentSwipeEvents: [buildSwipeEvent('seen_mainstream', 1000, 1)],
    });

    const baseQueue = buildBaseAdaptiveSequenceQueueEntries(context);
    const finalQueue = buildAdaptiveSequenceQueueEntries(context);

    expect(baseQueue[0].card.id).toBe(asDeckCardId('card_mainstream_action'));
    expect(finalQueue[0].card.id).toBe(asDeckCardId('card_prestige_recovery'));
    expect(finalQueue[0].decision.primaryReason).toBe(
      'clarify_low_coverage_tag',
    );
  });

  it('uses deterministic fallback selection when every candidate violates the same recent-area guardrails', () => {
    const cards = [buildCard('card_a', 0, 0.74), buildCard('card_b', 0, 0.74)];
    const tags = [buildTag('movies_tv:comfort_watch', 'movies_tv:mood', 0)];
    const context = buildContext({
      remainingCards: cards,
      tags,
      tagStates: [
        buildTagState('movies_tv:comfort_watch', {
          exposureCount: 4,
          distinctCardsSeen: 4,
          positiveWeight: 2,
          netWeight: 2,
          uncertaintyScore: 0.2,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:comfort_watch', 2)],
      cardAffinities: [
        buildCardAffinity('card_a', 0),
        buildCardAffinity('card_b', 0),
      ],
      links: [
        ['card_a', [buildLink('card_a', 'movies_tv:comfort_watch')]],
        ['card_b', [buildLink('card_b', 'movies_tv:comfort_watch')]],
        [
          'seen_comfort_1',
          [buildLink('seen_comfort_1', 'movies_tv:comfort_watch')],
        ],
        [
          'seen_comfort_2',
          [buildLink('seen_comfort_2', 'movies_tv:comfort_watch')],
        ],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_comfort_2', 2000, 1),
        buildSwipeEvent('seen_comfort_1', 1000, 1),
      ],
    });

    const baseQueue = buildBaseAdaptiveSequenceQueueEntries(context);
    const finalQueue = buildAdaptiveSequenceQueueEntries(context);

    expect(baseQueue.map((entry) => entry.card.id)).toEqual([
      asDeckCardId('card_a'),
      asDeckCardId('card_b'),
    ]);
    expect(finalQueue.map((entry) => entry.card.id)).toEqual([
      asDeckCardId('card_a'),
      asDeckCardId('card_b'),
    ]);
    expect(finalQueue[0].decision.guardrails?.fallbackApplied).toBe(true);
    expect(finalQueue[0].decision.guardrails?.fallbackReason).toBe(
      'relaxed_recent_constraints',
    );
  });
});
