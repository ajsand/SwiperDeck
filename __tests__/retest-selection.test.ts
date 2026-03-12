import { selectRetestQueueEntry } from '@/lib/sequence/retestSelection';
import { buildAdaptiveSequenceQueueEntries } from '@/lib/sequence/tagAwareScoring';
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
import type { DeckSequenceQueueEntry } from '@/lib/sequence/deckSequenceTypes';
import type { RetestSelectionContext } from '@/lib/sequence/retestSelection';
import type { TagAwareAdaptiveSequenceContext } from '@/lib/sequence/tagAwareScoring';

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
    exposureCount: 1,
    distinctCardsSeen: 1,
    positiveWeight: 1,
    negativeWeight: 0,
    skipCount: 0,
    netWeight: 1,
    uncertaintyScore: 0.4,
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

function buildBaseEntry(cardId: string, score: number): DeckSequenceQueueEntry {
  const card = buildCard(cardId, 0, 0.5);

  return {
    card,
    decision: {
      cardId: card.id,
      stage: 'adaptive',
      score,
      primaryReason: 'probe_adjacent_tag',
      reasons: [],
    },
  };
}

function buildRetestContext(args: {
  allCards: DeckCard[];
  seenCardIds: string[];
  tags: DeckTag[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  links: Array<[string, DeckCardTagLink[]]>;
  recentSwipeEvents: SwipeEvent[];
  cardAffinities?: DeckCardAffinity[];
}): RetestSelectionContext {
  return {
    deck: buildDeck(),
    allCards: args.allCards,
    seenCardIds: new Set(args.seenCardIds.map((id) => asDeckCardId(id))),
    tags: args.tags,
    tagStates: args.tagStates,
    tagScores: args.tagScores,
    cardAffinities: args.cardAffinities ?? [],
    cardTagLinksByCardId: new Map(args.links),
    recentSwipeEvents: args.recentSwipeEvents,
  };
}

function buildAdaptiveContext(args: {
  allCards: DeckCard[];
  remainingCards: DeckCard[];
  seenCardIds: string[];
  tags: DeckTag[];
  tagStates: DeckTagState[];
  tagScores: DeckTagScore[];
  links: Array<[string, DeckCardTagLink[]]>;
  recentSwipeEvents: SwipeEvent[];
  cardAffinities?: DeckCardAffinity[];
}): TagAwareAdaptiveSequenceContext {
  return {
    deck: buildDeck(),
    allCards: args.allCards,
    remainingCards: args.remainingCards,
    seenCardIds: new Set(args.seenCardIds.map((id) => asDeckCardId(id))),
    tags: args.tags,
    tagStates: args.tagStates,
    tagScores: args.tagScores,
    cardAffinities: args.cardAffinities ?? [],
    cardTagLinksByCardId: new Map(args.links),
    recentSwipeEvents: args.recentSwipeEvents,
  };
}

describe('retest selection', () => {
  it('targets ambiguous tag areas for clarification', () => {
    const ambiguousCard = buildCard('card_ambiguous', 3, 0.4);
    const context = buildRetestContext({
      allCards: [ambiguousCard],
      seenCardIds: ['card_ambiguous'],
      tags: [buildTag('movies_tv:arthouse', 'movies_tv:style', 0)],
      tagStates: [
        buildTagState('movies_tv:arthouse', {
          uncertaintyScore: 0.95,
          positiveWeight: 1,
          negativeWeight: 1,
          netWeight: 0,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:arthouse', 0.2)],
      links: [
        ['card_ambiguous', [buildLink('card_ambiguous', 'movies_tv:arthouse')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_other_2', 5000, 1),
        buildSwipeEvent('seen_other_1', 3500, 1),
        buildSwipeEvent('card_ambiguous', 1000, 1),
      ],
      cardAffinities: [buildCardAffinity('card_ambiguous', 0.3)],
    });

    const entry = selectRetestQueueEntry(context, []);

    expect(entry?.card.id).toBe(asDeckCardId('card_ambiguous'));
    expect(entry?.decision.retest?.reason).toBe('ambiguous_tag_signal');
    expect(entry?.decision.primaryReason).toBe('retest_ambiguity');
  });

  it('can resurface a strong early signal for stability confirmation ahead of new cards', () => {
    const reaffirmCard = buildCard('card_reaffirm', 2, 0.55);
    const newCard = buildCard('card_new', 0, 0.85);
    const tags = [
      buildTag('movies_tv:comfort_watch', 'movies_tv:mood', 0),
      buildTag('movies_tv:mainstream', 'movies_tv:audience', 1),
    ];
    const context = buildAdaptiveContext({
      allCards: [reaffirmCard, newCard],
      remainingCards: [newCard],
      seenCardIds: ['card_reaffirm'],
      tags,
      tagStates: [
        buildTagState('movies_tv:comfort_watch', {
          uncertaintyScore: 0.2,
          positiveWeight: 3,
          netWeight: 3,
        }),
        buildTagState('movies_tv:mainstream', {
          uncertaintyScore: 0.35,
          positiveWeight: 0.6,
          netWeight: 0.6,
        }),
      ],
      tagScores: [
        buildTagScore('movies_tv:comfort_watch', 3.2),
        buildTagScore('movies_tv:mainstream', 0.4),
      ],
      links: [
        [
          'card_reaffirm',
          [buildLink('card_reaffirm', 'movies_tv:comfort_watch')],
        ],
        ['card_new', [buildLink('card_new', 'movies_tv:mainstream')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_other_2', 5000, 1),
        buildSwipeEvent('seen_other_1', 3500, 1),
        buildSwipeEvent('card_reaffirm', 1000, 1),
      ],
      cardAffinities: [
        buildCardAffinity('card_reaffirm', 3),
        buildCardAffinity('card_new', 0.2),
      ],
    });

    const queue = buildAdaptiveSequenceQueueEntries(context);

    expect(queue[0].card.id).toBe(asDeckCardId('card_reaffirm'));
    expect(queue[0].decision.retest?.reason).toBe('stability_check');
    expect(queue[0].decision.primaryReason).toBe('reaffirm_stability');
  });

  it('enforces cooldowns so cards do not resurface immediately', () => {
    const context = buildRetestContext({
      allCards: [buildCard('card_cooldown', 0, 0.5)],
      seenCardIds: ['card_cooldown'],
      tags: [buildTag('movies_tv:thriller', 'movies_tv:genre', 0)],
      tagStates: [
        buildTagState('movies_tv:thriller', {
          uncertaintyScore: 0.92,
          positiveWeight: 1,
          negativeWeight: 1,
          netWeight: 0,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:thriller', 0)],
      links: [
        ['card_cooldown', [buildLink('card_cooldown', 'movies_tv:thriller')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_other', 2200, 1),
        buildSwipeEvent('card_cooldown', 1000, 1),
      ],
    });

    expect(selectRetestQueueEntry(context, [])).toBeNull();
  });

  it('enforces repetition caps so the same card cannot loop forever', () => {
    const context = buildRetestContext({
      allCards: [buildCard('card_capped', 0, 0.5)],
      seenCardIds: ['card_capped'],
      tags: [buildTag('movies_tv:prestige', 'movies_tv:style', 0)],
      tagStates: [
        buildTagState('movies_tv:prestige', {
          uncertaintyScore: 0.8,
          positiveWeight: 1,
          negativeWeight: 1,
          netWeight: 0,
        }),
      ],
      tagScores: [buildTagScore('movies_tv:prestige', 0.4)],
      links: [
        ['card_capped', [buildLink('card_capped', 'movies_tv:prestige')]],
      ],
      recentSwipeEvents: [
        buildSwipeEvent('seen_other_2', 7000, 1),
        buildSwipeEvent('seen_other_1', 5000, 1),
        buildSwipeEvent('card_capped', 3000, 1),
        buildSwipeEvent('seen_filler', 2000, 1),
        buildSwipeEvent('card_capped', 1500, -1),
        buildSwipeEvent('card_capped', 1000, 1),
      ],
      cardAffinities: [buildCardAffinity('card_capped', 0.3)],
    });

    expect(
      selectRetestQueueEntry(context, [buildBaseEntry('base_card', 4)]),
    ).toBeNull();
  });
});
