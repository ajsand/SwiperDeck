import { asDeckCardId, asDeckId, type DeckCardId, type DeckId } from './ids';
import { parseStringArrayJson } from './parsers';

export const DECK_CATEGORIES = [
  'movies_tv',
  'music',
  'food_drinks',
  'travel',
  'lifestyle',
  'social_habits',
  'humor',
  'relationship_preferences',
  'values',
  'communication_style',
] as const;

export type DeckCategory = (typeof DECK_CATEGORIES)[number] | (string & {});

export const DECK_TIERS = ['tier_1', 'tier_2', 'tier_3'] as const;
export type DeckTier = (typeof DECK_TIERS)[number];

export const DECK_SENSITIVITIES = ['standard', 'sensitive', 'gated'] as const;
export type DeckSensitivity = (typeof DECK_SENSITIVITIES)[number];

export const CARD_KINDS = ['entity', 'statement'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

const DECK_TIER_SET: ReadonlySet<string> = new Set(DECK_TIERS);
const DECK_SENSITIVITY_SET: ReadonlySet<string> = new Set(DECK_SENSITIVITIES);
const CARD_KIND_SET: ReadonlySet<string> = new Set(CARD_KINDS);

export function isDeckTier(value: unknown): value is DeckTier {
  return typeof value === 'string' && DECK_TIER_SET.has(value);
}

export function isDeckSensitivity(value: unknown): value is DeckSensitivity {
  return typeof value === 'string' && DECK_SENSITIVITY_SET.has(value);
}

export function isCardKind(value: unknown): value is CardKind {
  return typeof value === 'string' && CARD_KIND_SET.has(value);
}

export function normalizeDeckTier(value: unknown): DeckTier {
  if (isDeckTier(value)) {
    return value;
  }

  throw new Error(`Invalid deck tier: ${String(value)}`);
}

export function normalizeDeckSensitivity(value: unknown): DeckSensitivity {
  if (isDeckSensitivity(value)) {
    return value;
  }

  throw new Error(`Invalid deck sensitivity: ${String(value)}`);
}

export function normalizeCardKind(value: unknown): CardKind {
  if (isCardKind(value)) {
    return value;
  }

  throw new Error(`Invalid card kind: ${String(value)}`);
}

export interface DeckRow {
  id: string;
  title: string;
  description: string;
  category: string;
  tier: string;
  card_count: number;
  compare_eligible: number;
  showdown_eligible: number;
  sensitivity: string;
  min_cards_for_profile: number;
  min_cards_for_compare: number;
  is_custom: number;
  cover_tile_key: string | null;
  created_at: number;
  updated_at: number;
}

export interface Deck {
  id: DeckId;
  title: string;
  description: string;
  category: DeckCategory;
  tier: DeckTier;
  cardCount: number;
  compareEligible: boolean;
  showdownEligible: boolean;
  sensitivity: DeckSensitivity;
  minCardsForProfile: number;
  minCardsForCompare: number;
  isCustom: boolean;
  coverTileKey: string | null;
  createdAt: number;
  updatedAt: number;
}

export function rowToDeck(row: DeckRow): Deck {
  return {
    id: asDeckId(row.id),
    title: row.title,
    description: row.description,
    category: row.category as DeckCategory,
    tier: normalizeDeckTier(row.tier),
    cardCount: row.card_count,
    compareEligible: Boolean(row.compare_eligible),
    showdownEligible: Boolean(row.showdown_eligible),
    sensitivity: normalizeDeckSensitivity(row.sensitivity),
    minCardsForProfile: row.min_cards_for_profile,
    minCardsForCompare: row.min_cards_for_compare,
    isCustom: Boolean(row.is_custom),
    coverTileKey: row.cover_tile_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckToRow(deck: Deck): DeckRow {
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    category: deck.category,
    tier: deck.tier,
    card_count: deck.cardCount,
    compare_eligible: deck.compareEligible ? 1 : 0,
    showdown_eligible: deck.showdownEligible ? 1 : 0,
    sensitivity: deck.sensitivity,
    min_cards_for_profile: deck.minCardsForProfile,
    min_cards_for_compare: deck.minCardsForCompare,
    is_custom: deck.isCustom ? 1 : 0,
    cover_tile_key: deck.coverTileKey,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt,
  };
}

export interface DeckCardRow {
  id: string;
  deck_id: string;
  kind: string;
  title: string;
  subtitle: string;
  description_short: string;
  tags_json: string;
  popularity: number;
  tile_key: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface DeckCard {
  id: DeckCardId;
  deckId: DeckId;
  kind: CardKind;
  title: string;
  subtitle: string;
  descriptionShort: string;
  tags: string[];
  popularity: number;
  tileKey: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export function rowToDeckCard(row: DeckCardRow): DeckCard {
  return {
    id: asDeckCardId(row.id),
    deckId: asDeckId(row.deck_id),
    kind: normalizeCardKind(row.kind),
    title: row.title,
    subtitle: row.subtitle,
    descriptionShort: row.description_short,
    tags: parseStringArrayJson(row.tags_json),
    popularity: row.popularity,
    tileKey: row.tile_key,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckCardToRow(card: DeckCard): DeckCardRow {
  return {
    id: card.id,
    deck_id: card.deckId,
    kind: card.kind,
    title: card.title,
    subtitle: card.subtitle,
    description_short: card.descriptionShort,
    tags_json: JSON.stringify(card.tags),
    popularity: card.popularity,
    tile_key: card.tileKey,
    sort_order: card.sortOrder,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}
