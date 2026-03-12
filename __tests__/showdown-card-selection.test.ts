import { getDeckSafetyPolicy } from '@/lib/policy/deckSafetyPolicy';
import { buildShowdownSummary } from '@/lib/showdown/buildShowdownSummary';
import { selectShowdownCards } from '@/lib/showdown/showdownCardSelection';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  asShowdownParticipantId,
  asShowdownSessionId,
  createShowdownResponse,
  type Deck,
  type DeckCard,
  type DeckCardTagLink,
  type DeckTag,
  type DeckTagFacet,
  type ShowdownSession,
  type ShowdownSelectedCard,
} from '@/types/domain';

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies_tv'),
    title: 'Movies & TV',
    description: 'Talk through shared rewatches and opinions.',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 8,
    compareEligible: true,
    showdownEligible: true,
    sensitivity: 'standard',
    minCardsForProfile: 12,
    minCardsForCompare: 24,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: asDeckCardId('card_1'),
    deckId: asDeckId('deck_movies_tv'),
    kind: 'entity',
    title: 'Knives Out',
    subtitle: 'Mystery with a big ensemble',
    descriptionShort: 'A playful whodunit.',
    tags: ['Mainstream'],
    popularity: 0.8,
    tileKey: 'movies:knives_out',
    sortOrder: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildFacet(overrides: Partial<DeckTagFacet> = {}): DeckTagFacet {
  return {
    id: asDeckTagFacetId('movies_tv:mood'),
    deckId: asDeckId('deck_movies_tv'),
    key: 'mood',
    label: 'Mood',
    description: 'How it feels.',
    sortOrder: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildTag(overrides: Partial<DeckTag> = {}): DeckTag {
  return {
    id: asDeckTagId('movies_tv:mainstream'),
    deckId: asDeckId('deck_movies_tv'),
    facetId: asDeckTagFacetId('movies_tv:mood'),
    slug: 'mainstream',
    label: 'Mainstream',
    description: 'Broad appeal picks.',
    sortOrder: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildLink(overrides: Partial<DeckCardTagLink> = {}): DeckCardTagLink {
  return {
    cardId: asDeckCardId('card_1'),
    tagId: asDeckTagId('movies_tv:mainstream'),
    role: 'primary',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

describe('showdown card selection', () => {
  it('keeps early showdown picks representative across facets', () => {
    const deck = buildDeck();
    const facets = [
      buildFacet(),
      buildFacet({
        id: asDeckTagFacetId('movies_tv:format'),
        key: 'format',
        label: 'Format',
      }),
    ];
    const tags = [
      buildTag(),
      buildTag({
        id: asDeckTagId('movies_tv:arthouse'),
        facetId: asDeckTagFacetId('movies_tv:format'),
        slug: 'arthouse',
        label: 'Arthouse',
      }),
      buildTag({
        id: asDeckTagId('movies_tv:comfort_watch'),
        slug: 'comfort_watch',
        label: 'Comfort watch',
      }),
    ];
    const cards = [
      buildCard(),
      buildCard({
        id: asDeckCardId('card_2'),
        title: 'Past Lives',
        popularity: 0.72,
        sortOrder: 2,
      }),
      buildCard({
        id: asDeckCardId('card_3'),
        title: 'Paddington 2',
        popularity: 0.7,
        sortOrder: 3,
      }),
      buildCard({
        id: asDeckCardId('card_4'),
        title: 'Anatomy of a Fall',
        popularity: 0.62,
        sortOrder: 4,
      }),
    ];
    const links = new Map<string, DeckCardTagLink[]>([
      ['card_1', [buildLink()]],
      [
        'card_2',
        [
          buildLink({
            cardId: asDeckCardId('card_2'),
            tagId: asDeckTagId('movies_tv:arthouse'),
          }),
        ],
      ],
      [
        'card_3',
        [
          buildLink({
            cardId: asDeckCardId('card_3'),
            tagId: asDeckTagId('movies_tv:comfort_watch'),
          }),
        ],
      ],
      [
        'card_4',
        [
          buildLink({
            cardId: asDeckCardId('card_4'),
            tagId: asDeckTagId('movies_tv:arthouse'),
          }),
        ],
      ],
    ]);

    const result = selectShowdownCards({
      deck,
      cards,
      tags,
      facets,
      cardTagLinksByCardId: links,
      policy: getDeckSafetyPolicy(deck),
      desiredCardCount: 3,
    });

    expect(result.available).toBe(true);
    expect(result.selectedCards).toHaveLength(3);
    expect(
      new Set(result.selectedCards.slice(0, 2).map((card) => card.facetLabel))
        .size,
    ).toBe(2);
  });

  it('excludes guarded sensitive tags from showdown selection', () => {
    const deck = buildDeck({
      id: asDeckId('deck_social_habits'),
      title: 'Social Habits',
      category: 'social_habits',
    });
    const facets = [
      buildFacet({
        id: asDeckTagFacetId('social_habits:style'),
        deckId: deck.id,
        key: 'style',
        label: 'Style',
      }),
    ];
    const tags = [
      buildTag({
        id: asDeckTagId('social_habits:group_energy'),
        deckId: deck.id,
        facetId: facets[0].id,
        slug: 'group_energy',
        label: 'Group energy',
      }),
      buildTag({
        id: asDeckTagId('social_habits:boundaries'),
        deckId: deck.id,
        facetId: facets[0].id,
        slug: 'boundaries',
        label: 'Boundaries',
      }),
    ];
    const cards = [
      buildCard({
        id: asDeckCardId('social_card_1'),
        deckId: deck.id,
        title: 'Big group dinner',
      }),
      buildCard({
        id: asDeckCardId('social_card_2'),
        deckId: deck.id,
        title: 'Leaving early matters',
      }),
    ];
    const links = new Map<string, DeckCardTagLink[]>([
      [
        'social_card_1',
        [
          buildLink({
            cardId: asDeckCardId('social_card_1'),
            tagId: asDeckTagId('social_habits:group_energy'),
          }),
        ],
      ],
      [
        'social_card_2',
        [
          buildLink({
            cardId: asDeckCardId('social_card_2'),
            tagId: asDeckTagId('social_habits:boundaries'),
          }),
        ],
      ],
    ]);

    const result = selectShowdownCards({
      deck,
      cards,
      tags,
      facets,
      cardTagLinksByCardId: links,
      policy: getDeckSafetyPolicy(deck),
      desiredCardCount: 2,
    });

    expect(result.available).toBe(true);
    expect(result.excludedCardCount).toBe(1);
    expect(result.selectedCards.map((card) => card.title)).toEqual([
      'Big group dinner',
    ]);
  });
});

describe('showdown summary builder', () => {
  function buildSelectedCard(
    overrides: Partial<ShowdownSelectedCard> = {},
  ): ShowdownSelectedCard {
    return {
      cardId: asDeckCardId('summary_card_1'),
      title: 'Road trip',
      subtitle: 'Travel',
      descriptionShort: 'See how the group handles spontaneity.',
      tileKey: 'travel:road_trip',
      cardKind: 'statement',
      tags: ['Road trip'],
      popularity: 0.6,
      primaryTagId: asDeckTagId('travel:road_trip'),
      primaryTagLabel: 'Road trip',
      facetId: asDeckTagFacetId('travel:pace'),
      facetLabel: 'Pace',
      selectionScore: 20,
      selectionReason: 'facet_coverage:Pace',
      ...overrides,
    };
  }

  it('produces lighter alignment and split sections from responses', () => {
    const selectedCards = [
      buildSelectedCard(),
      buildSelectedCard({
        cardId: asDeckCardId('summary_card_2'),
        title: 'Luxury resort',
        primaryTagId: asDeckTagId('travel:luxury'),
        primaryTagLabel: 'Luxury',
      }),
    ];
    const session: ShowdownSession = {
      id: asShowdownSessionId('showdown_test_1'),
      deckId: asDeckId('deck_travel'),
      deckTitle: 'Travel',
      deckCategory: 'travel',
      participants: [
        { id: asShowdownParticipantId('p1'), label: 'Player 1', seat: 1 },
        { id: asShowdownParticipantId('p2'), label: 'Player 2', seat: 2 },
        { id: asShowdownParticipantId('p3'), label: 'Player 3', seat: 3 },
      ],
      config: {
        cardCount: 6,
        responseSeconds: 30,
        participantCount: 3,
      },
      selectedCards,
      rounds: [
        {
          cardId: selectedCards[0].cardId,
          startedAt: 1,
          deadlineAt: 2,
          responses: [
            createShowdownResponse({
              participantId: asShowdownParticipantId('p1'),
              cardId: selectedCards[0].cardId,
              action: 'yes',
              respondedAt: 1,
            }),
            createShowdownResponse({
              participantId: asShowdownParticipantId('p2'),
              cardId: selectedCards[0].cardId,
              action: 'strong_yes',
              respondedAt: 2,
            }),
            createShowdownResponse({
              participantId: asShowdownParticipantId('p3'),
              cardId: selectedCards[0].cardId,
              action: 'yes',
              respondedAt: 3,
            }),
          ],
        },
        {
          cardId: selectedCards[1].cardId,
          startedAt: 4,
          deadlineAt: 5,
          responses: [
            createShowdownResponse({
              participantId: asShowdownParticipantId('p1'),
              cardId: selectedCards[1].cardId,
              action: 'yes',
              respondedAt: 4,
            }),
            createShowdownResponse({
              participantId: asShowdownParticipantId('p2'),
              cardId: selectedCards[1].cardId,
              action: 'hard_no',
              respondedAt: 5,
            }),
            createShowdownResponse({
              participantId: asShowdownParticipantId('p3'),
              cardId: selectedCards[1].cardId,
              action: 'no',
              respondedAt: 6,
            }),
          ],
        },
      ],
      currentCardIndex: 1,
      startedAt: 1,
      completedAt: 6,
      summary: null,
    };

    const summary = buildShowdownSummary(session);

    expect(summary.overview).toContain('3 players answered 2 cards in Travel.');
    expect(summary.strongestAlignments[0]?.title).toBe('Road trip');
    expect(summary.majorSplits[0]?.title).toBe('Luxury resort');
    expect(summary.conversationSparks.length).toBeGreaterThan(0);
  });
});
