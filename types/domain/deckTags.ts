import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  type DeckCardId,
  type DeckId,
  type DeckTagFacetId,
  type DeckTagId,
} from './ids';

export const DECK_TAG_ROLES = ['primary', 'secondary', 'supporting'] as const;
export type DeckTagRole = (typeof DECK_TAG_ROLES)[number];

const DECK_TAG_ROLE_SET: ReadonlySet<string> = new Set(DECK_TAG_ROLES);

export function isDeckTagRole(value: unknown): value is DeckTagRole {
  return typeof value === 'string' && DECK_TAG_ROLE_SET.has(value);
}

export function normalizeDeckTagRole(value: unknown): DeckTagRole {
  if (isDeckTagRole(value)) {
    return value;
  }

  throw new Error(`Invalid deck tag role: ${String(value)}`);
}

export interface DeckTagFacetRow {
  id: string;
  deck_id: string;
  key: string;
  label: string;
  description: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface DeckTagFacet {
  id: DeckTagFacetId;
  deckId: DeckId;
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeckTagRow {
  id: string;
  deck_id: string;
  facet_id: string;
  slug: string;
  label: string;
  description: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface DeckTag {
  id: DeckTagId;
  deckId: DeckId;
  facetId: DeckTagFacetId;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface DeckCardTagLinkRow {
  card_id: string;
  tag_id: string;
  role: string;
  created_at: number;
  updated_at: number;
}

export interface DeckCardTagLink {
  cardId: DeckCardId;
  tagId: DeckTagId;
  role: DeckTagRole;
  createdAt: number;
  updatedAt: number;
}

export function rowToDeckTagFacet(row: DeckTagFacetRow): DeckTagFacet {
  return {
    id: asDeckTagFacetId(row.id),
    deckId: asDeckId(row.deck_id),
    key: row.key,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckTagFacetToRow(facet: DeckTagFacet): DeckTagFacetRow {
  return {
    id: facet.id,
    deck_id: facet.deckId,
    key: facet.key,
    label: facet.label,
    description: facet.description,
    sort_order: facet.sortOrder,
    created_at: facet.createdAt,
    updated_at: facet.updatedAt,
  };
}

export function rowToDeckTag(row: DeckTagRow): DeckTag {
  return {
    id: asDeckTagId(row.id),
    deckId: asDeckId(row.deck_id),
    facetId: asDeckTagFacetId(row.facet_id),
    slug: row.slug,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckTagToRow(tag: DeckTag): DeckTagRow {
  return {
    id: tag.id,
    deck_id: tag.deckId,
    facet_id: tag.facetId,
    slug: tag.slug,
    label: tag.label,
    description: tag.description,
    sort_order: tag.sortOrder,
    created_at: tag.createdAt,
    updated_at: tag.updatedAt,
  };
}

export function rowToDeckCardTagLink(row: DeckCardTagLinkRow): DeckCardTagLink {
  return {
    cardId: asDeckCardId(row.card_id),
    tagId: asDeckTagId(row.tag_id),
    role: normalizeDeckTagRole(row.role),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function deckCardTagLinkToRow(
  link: DeckCardTagLink,
): DeckCardTagLinkRow {
  return {
    card_id: link.cardId,
    tag_id: link.tagId,
    role: link.role,
    created_at: link.createdAt,
    updated_at: link.updatedAt,
  };
}
