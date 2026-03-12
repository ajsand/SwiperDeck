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
  type DeckTagFacet,
  type DeckTagScore,
  type DeckTagState,
  type SwipeEvent,
} from '@/types/domain';
import type {
  DeckRetestReason,
  DeckSequencePrimaryReason,
  DeckSequenceStage,
} from '@/lib/sequence/deckSequenceTypes';
import type { BroadStartSequenceContext } from '@/lib/sequence/broadStartStrategy';
import type { DeckSequenceConfidenceDriver } from '@/lib/sequence/sequenceEvaluation';

interface SequencingScenarioDeckFixture {
  id: string;
  title: string;
  description?: string;
  category: string;
  tier?: Deck['tier'];
  sensitivity?: Deck['sensitivity'];
  minCardsForProfile?: number;
  minCardsForCompare?: number;
  isCustom?: boolean;
  compareEligible?: boolean;
  showdownEligible?: boolean;
  cardCount?: number;
}

interface SequencingScenarioCardFixture {
  id: string;
  kind?: DeckCard['kind'];
  title?: string;
  subtitle?: string;
  descriptionShort?: string;
  tags?: string[];
  popularity: number;
  sortOrder: number;
  tileKey?: string | null;
}

interface SequencingScenarioFacetFixture {
  id: string;
  key: string;
  label?: string;
  description?: string;
  sortOrder: number;
}

interface SequencingScenarioTagFixture {
  id: string;
  facetId: string;
  slug?: string;
  label?: string;
  description?: string;
  sortOrder: number;
}

interface SequencingScenarioTagStateFixture {
  tagId: string;
  exposureCount: number;
  distinctCardsSeen: number;
  positiveWeight: number;
  negativeWeight: number;
  skipCount?: number;
  netWeight: number;
  uncertaintyScore: number;
  firstSeenAt?: number | null;
  lastSeenAt?: number | null;
  lastPositiveAt?: number | null;
  lastNegativeAt?: number | null;
  lastRetestedAt?: number | null;
  updatedAt?: number;
}

interface SequencingScenarioTagScoreFixture {
  tagId: string;
  score: number;
  pos?: number;
  neg?: number;
  lastUpdated?: number;
}

interface SequencingScenarioCardAffinityFixture {
  cardId: string;
  score: number;
  pos?: number;
  neg?: number;
  lastUpdated?: number;
}

interface SequencingScenarioLinkFixture {
  cardId: string;
  tagId: string;
  role?: DeckCardTagLink['role'];
}

interface SequencingScenarioEventFixture {
  cardId: string;
  createdAt: number;
  action?: SwipeEvent['action'];
  strength?: number;
}

interface SequencingScenarioExpectedFixture {
  stage: DeckSequenceStage;
  selectedCardId: string;
  primaryReason: DeckSequencePrimaryReason;
  topCardIds?: string[];
  retestReason?: DeckRetestReason | null;
  winnerChanged?: boolean;
  confidenceDrivers?: DeckSequenceConfidenceDriver[];
  summaryIncludes?: string[];
}

export interface SequencingScenarioFixture {
  name: string;
  deck: SequencingScenarioDeckFixture;
  cards: SequencingScenarioCardFixture[];
  facets: SequencingScenarioFacetFixture[];
  tags: SequencingScenarioTagFixture[];
  tagStates: SequencingScenarioTagStateFixture[];
  tagScores?: SequencingScenarioTagScoreFixture[];
  cardAffinities?: SequencingScenarioCardAffinityFixture[];
  seenCardIds?: string[];
  links: SequencingScenarioLinkFixture[];
  recentSwipeEvents?: SequencingScenarioEventFixture[];
  expected?: SequencingScenarioExpectedFixture;
}

function buildDeck(fixture: SequencingScenarioDeckFixture): Deck {
  return {
    id: asDeckId(fixture.id),
    title: fixture.title,
    description: fixture.description ?? `${fixture.title} scenario`,
    category: fixture.category,
    tier: fixture.tier ?? 'tier_1',
    cardCount: fixture.cardCount ?? 0,
    compareEligible: fixture.compareEligible ?? true,
    showdownEligible: fixture.showdownEligible ?? true,
    sensitivity: fixture.sensitivity ?? 'standard',
    minCardsForProfile: fixture.minCardsForProfile ?? 15,
    minCardsForCompare: fixture.minCardsForCompare ?? 30,
    isCustom: fixture.isCustom ?? false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildCard(
  deckId: Deck['id'],
  fixture: SequencingScenarioCardFixture,
): DeckCard {
  return {
    id: asDeckCardId(fixture.id),
    deckId,
    kind: fixture.kind ?? 'entity',
    title: fixture.title ?? fixture.id,
    subtitle: fixture.subtitle ?? '',
    descriptionShort: fixture.descriptionShort ?? '',
    tags: fixture.tags ?? [],
    popularity: fixture.popularity,
    tileKey: fixture.tileKey ?? `tile:${fixture.id}`,
    sortOrder: fixture.sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildFacet(
  deckId: Deck['id'],
  fixture: SequencingScenarioFacetFixture,
): DeckTagFacet {
  return {
    id: asDeckTagFacetId(fixture.id),
    deckId,
    key: fixture.key,
    label: fixture.label ?? fixture.key,
    description: fixture.description ?? '',
    sortOrder: fixture.sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildTag(
  deckId: Deck['id'],
  fixture: SequencingScenarioTagFixture,
): DeckTag {
  const slug = fixture.slug ?? fixture.id.split(':')[1] ?? fixture.id;

  return {
    id: asDeckTagId(fixture.id),
    deckId,
    facetId: asDeckTagFacetId(fixture.facetId),
    slug,
    label: fixture.label ?? slug,
    description: fixture.description ?? '',
    sortOrder: fixture.sortOrder,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildTagState(
  deckId: Deck['id'],
  fixture: SequencingScenarioTagStateFixture,
): DeckTagState {
  return {
    deckId,
    tagId: asDeckTagId(fixture.tagId),
    exposureCount: fixture.exposureCount,
    distinctCardsSeen: fixture.distinctCardsSeen,
    positiveWeight: fixture.positiveWeight,
    negativeWeight: fixture.negativeWeight,
    skipCount: fixture.skipCount ?? 0,
    netWeight: fixture.netWeight,
    uncertaintyScore: fixture.uncertaintyScore,
    firstSeenAt: fixture.firstSeenAt ?? null,
    lastSeenAt: fixture.lastSeenAt ?? null,
    lastPositiveAt: fixture.lastPositiveAt ?? null,
    lastNegativeAt: fixture.lastNegativeAt ?? null,
    lastRetestedAt: fixture.lastRetestedAt ?? null,
    updatedAt: fixture.updatedAt ?? 1700000003000,
  };
}

function buildTagScore(
  deckId: Deck['id'],
  fixture: SequencingScenarioTagScoreFixture,
): DeckTagScore {
  return {
    deckId,
    tagId: asDeckTagId(fixture.tagId),
    score: fixture.score,
    pos: fixture.pos ?? Math.max(fixture.score, 0),
    neg: fixture.neg ?? Math.max(fixture.score * -1, 0),
    lastUpdated: fixture.lastUpdated ?? 1700000004000,
  };
}

function buildCardAffinity(
  deckId: Deck['id'],
  fixture: SequencingScenarioCardAffinityFixture,
): DeckCardAffinity {
  return {
    deckId,
    cardId: asDeckCardId(fixture.cardId),
    score: fixture.score,
    pos: fixture.pos ?? Math.max(fixture.score, 0),
    neg: fixture.neg ?? Math.max(fixture.score * -1, 0),
    lastUpdated: fixture.lastUpdated ?? 1700000004000,
  };
}

function buildLink(fixture: SequencingScenarioLinkFixture): DeckCardTagLink {
  return {
    cardId: asDeckCardId(fixture.cardId),
    tagId: asDeckTagId(fixture.tagId),
    role: fixture.role ?? 'primary',
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
  };
}

function buildSwipeEvent(
  deckId: Deck['id'],
  fixture: SequencingScenarioEventFixture,
): SwipeEvent {
  const strength = fixture.strength ?? 1;

  return {
    id: asSwipeEventId(`event_${fixture.cardId}_${fixture.createdAt}`),
    sessionId: asSessionId(`session_${fixture.createdAt}`),
    deckId,
    cardId: asDeckCardId(fixture.cardId),
    action: fixture.action ?? (strength >= 0 ? 'yes' : 'no'),
    strength,
    createdAt: fixture.createdAt,
  };
}

export function buildSequencingScenarioContext(
  fixture: SequencingScenarioFixture,
): BroadStartSequenceContext {
  const deck = buildDeck({
    ...fixture.deck,
    cardCount: fixture.deck.cardCount ?? fixture.cards.length,
  });
  const cards = fixture.cards.map((card) => buildCard(deck.id, card));
  const tags = fixture.tags.map((tag) => buildTag(deck.id, tag));
  const facets = fixture.facets.map((facet) => buildFacet(deck.id, facet));
  const linksByCardId = new Map<string, DeckCardTagLink[]>();

  for (const linkFixture of fixture.links) {
    const link = buildLink(linkFixture);
    const key = link.cardId as string;
    const links = linksByCardId.get(key) ?? [];
    links.push(link);
    linksByCardId.set(key, links);
  }

  return {
    deck,
    allCards: cards,
    seenCardIds: new Set(
      (fixture.seenCardIds ?? []).map((cardId) => asDeckCardId(cardId)),
    ),
    tagStates: fixture.tagStates.map((tagState) =>
      buildTagState(deck.id, tagState),
    ),
    tagScores: (fixture.tagScores ?? []).map((tagScore) =>
      buildTagScore(deck.id, tagScore),
    ),
    cardAffinities: (fixture.cardAffinities ?? []).map((cardAffinity) =>
      buildCardAffinity(deck.id, cardAffinity),
    ),
    tags,
    facets,
    cardTagLinksByCardId: linksByCardId,
    recentSwipeEvents: (fixture.recentSwipeEvents ?? []).map((event) =>
      buildSwipeEvent(deck.id, event),
    ),
  };
}
