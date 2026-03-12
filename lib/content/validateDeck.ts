import {
  asDeckCardId,
  asDeckId,
  type DeckCardTagLink,
  type DeckTagRole,
  DECK_CATEGORIES,
  DECK_SENSITIVITIES,
  DECK_TIERS,
  isDeckTagRole,
  isCardKind,
  isDeckSensitivity,
  isDeckTier,
  type Deck,
  type DeckCard,
} from '@/types/domain';
import { isRecord, parseStringArray } from '@/types/domain';
import type { NormalizedDeckTaxonomy } from './validateDeckTaxonomy';

const MAX_TAGS_PER_CARD = 15;
const MAX_TITLE_LENGTH = 200;
const MAX_SUBTITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 500;

const DECK_CATEGORY_SET: ReadonlySet<string> = new Set(DECK_CATEGORIES);

export interface PrebuiltDeckFile {
  version: number;
  decks: PrebuiltDeckEntry[];
}

export interface PrebuiltDeckEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  tier?: string;
  sensitivity?: string;
  compare_eligible?: boolean;
  showdown_eligible?: boolean;
  min_cards_for_profile?: number;
  min_cards_for_compare?: number;
  cover_tile_key?: string | null;
  cards: PrebuiltCardEntry[];
}

export interface PrebuiltCardEntry {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  description_short?: string;
  tags?: string[];
  tag_assignments?: PrebuiltCardTagAssignmentEntry[];
  popularity?: number;
  sort_order?: number;
  tile_key?: string;
}

export interface PrebuiltCardTagAssignmentEntry {
  tag_id: string;
  role: DeckTagRole;
}

export type DeckValidationResult =
  | { valid: true; deck: Deck; cards: PrebuiltCardEntry[] }
  | { valid: false; errors: string[] };

export type CardValidationResult =
  | { valid: true; card: DeckCard; tagLinks: DeckCardTagLink[] }
  | { valid: false; errors: string[] };

function normalizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeOptionalTileKey(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function normalizeTags(value: unknown): string[] {
  const tags = parseStringArray(value);
  const normalizedTags: string[] = [];
  const seen = new Set<string>();

  tags.forEach((tag) => {
    const normalizedTag = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalizedTag || seen.has(normalizedTag)) {
      return;
    }

    seen.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  });

  return normalizedTags.slice(0, MAX_TAGS_PER_CARD);
}

function normalizePopularity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

export function validateDeck(
  entry: unknown,
  timestamp: number = Date.now(),
): DeckValidationResult {
  if (!isRecord(entry)) {
    return {
      valid: false,
      errors: ['Deck entry must be an object.'],
    };
  }

  const errors: string[] = [];
  const id = normalizeString(entry.id, MAX_TITLE_LENGTH);
  const title = normalizeString(entry.title, MAX_TITLE_LENGTH);
  const description = normalizeString(
    entry.description,
    MAX_DESCRIPTION_LENGTH,
  );
  const category = normalizeString(
    entry.category,
    MAX_TITLE_LENGTH,
  ).toLowerCase();
  const tier = normalizeString(entry.tier, MAX_TITLE_LENGTH) || 'tier_1';
  const sensitivity =
    normalizeString(entry.sensitivity, MAX_TITLE_LENGTH) || 'standard';
  const minCardsForProfile = normalizePositiveInteger(
    entry.min_cards_for_profile,
    15,
  );
  const minCardsForCompare = normalizePositiveInteger(
    entry.min_cards_for_compare,
    30,
  );
  const cards = Array.isArray(entry.cards) ? entry.cards : null;

  if (!id) {
    errors.push('Deck id is required.');
  }

  if (!id.startsWith('deck_')) {
    errors.push(`Deck id "${id}" must start with "deck_".`);
  }

  if (!title) {
    errors.push(`Deck "${id || '(unknown)'}" is missing a title.`);
  }

  if (!description) {
    errors.push(`Deck "${id || '(unknown)'}" is missing a description.`);
  }

  if (!category) {
    errors.push(`Deck "${id || '(unknown)'}" is missing a category.`);
  } else if (!DECK_CATEGORY_SET.has(category)) {
    errors.push(
      `Deck "${id || '(unknown)'}" has invalid category "${category}".`,
    );
  }

  if (!isDeckTier(tier)) {
    errors.push(`Deck "${id || '(unknown)'}" has invalid tier "${tier}".`);
  }

  if (!isDeckSensitivity(sensitivity)) {
    errors.push(
      `Deck "${id || '(unknown)'}" has invalid sensitivity "${sensitivity}".`,
    );
  }

  if (minCardsForCompare < minCardsForProfile) {
    errors.push(
      `Deck "${id || '(unknown)'}" must have min_cards_for_compare >= min_cards_for_profile.`,
    );
  }

  if (!cards || cards.length === 0) {
    errors.push(`Deck "${id || '(unknown)'}" must contain at least one card.`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    deck: {
      id: asDeckId(id),
      title,
      description,
      category,
      tier: tier as (typeof DECK_TIERS)[number],
      cardCount: 0,
      compareEligible: normalizeBoolean(entry.compare_eligible, true),
      showdownEligible: normalizeBoolean(entry.showdown_eligible, true),
      sensitivity: sensitivity as (typeof DECK_SENSITIVITIES)[number],
      minCardsForProfile,
      minCardsForCompare,
      isCustom: false,
      coverTileKey: normalizeOptionalTileKey(entry.cover_tile_key),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    cards: cards as PrebuiltCardEntry[],
  };
}

export function validateCard(
  entry: unknown,
  deck: Pick<Deck, 'id' | 'category'>,
  deckTaxonomy: NormalizedDeckTaxonomy | null,
  index: number,
  timestamp: number = Date.now(),
): CardValidationResult {
  if (!isRecord(entry)) {
    return {
      valid: false,
      errors: [`Card ${index + 1} in ${deck.id} must be an object.`],
    };
  }

  const errors: string[] = [];
  const id = normalizeString(entry.id, MAX_TITLE_LENGTH);
  const kind = normalizeString(entry.kind, MAX_TITLE_LENGTH).toLowerCase();
  const title = normalizeString(entry.title, MAX_TITLE_LENGTH);
  const subtitle = normalizeString(entry.subtitle, MAX_SUBTITLE_LENGTH);
  const descriptionShort = normalizeString(
    entry.description_short,
    MAX_DESCRIPTION_LENGTH,
  );
  const rawAssignments = Array.isArray(entry.tag_assignments)
    ? entry.tag_assignments
    : [];

  if (!id) {
    errors.push(`Card ${index + 1} in ${deck.id} is missing an id.`);
  }

  if (!kind || !isCardKind(kind)) {
    errors.push(
      `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} has invalid kind "${String(entry.kind)}".`,
    );
  }

  if (!title) {
    errors.push(
      `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} is missing a title.`,
    );
  }

  if (!deckTaxonomy) {
    errors.push(
      `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} is missing taxonomy metadata.`,
    );
  }

  const normalizedAssignments = rawAssignments
    .filter((assignment): assignment is Record<string, unknown> =>
      isRecord(assignment),
    )
    .map((assignment) => ({
      tagId: normalizeString(assignment.tag_id, MAX_TITLE_LENGTH),
      role: normalizeString(assignment.role, MAX_TITLE_LENGTH).toLowerCase(),
    }));

  if (normalizedAssignments.length < 1 || normalizedAssignments.length > 3) {
    errors.push(
      `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} must include 1-3 tag assignments.`,
    );
  }

  const primaryAssignments = normalizedAssignments.filter(
    (assignment) => assignment.role === 'primary',
  );
  if (primaryAssignments.length !== 1) {
    errors.push(
      `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} must include exactly one primary tag assignment.`,
    );
  }

  const seenTagIds = new Set<string>();
  normalizedAssignments.forEach((assignment) => {
    if (!assignment.tagId) {
      errors.push(
        `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} contains a tag assignment with a missing tag_id.`,
      );
      return;
    }

    if (!isDeckTagRole(assignment.role)) {
      errors.push(
        `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} contains an invalid tag role "${assignment.role}".`,
      );
      return;
    }

    if (seenTagIds.has(assignment.tagId)) {
      errors.push(
        `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} contains duplicate tag assignment "${assignment.tagId}".`,
      );
      return;
    }

    seenTagIds.add(assignment.tagId);
  });

  if (deckTaxonomy) {
    normalizedAssignments.forEach((assignment) => {
      if (!deckTaxonomy.tagsById.has(assignment.tagId)) {
        errors.push(
          `Card "${id || `${deck.id}#${index + 1}`}" in ${deck.id} references unknown tag "${assignment.tagId}".`,
        );
      }
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  const explicitTileKey = normalizeOptionalTileKey(entry.tile_key);
  const assignedTags = normalizedAssignments.map((assignment) => {
    const tag = deckTaxonomy?.tagsById.get(assignment.tagId);
    if (!tag) {
      throw new Error(
        `Missing taxonomy tag "${assignment.tagId}" for ${String(deck.id)}.`,
      );
    }

    return { tag, role: assignment.role as DeckTagRole };
  });
  const derivedTags = assignedTags.map(({ tag }) => tag.slug);
  const normalizedDisplayTags = normalizeTags(entry.tags);
  const cardTags =
    normalizedDisplayTags.length > 0 ? normalizedDisplayTags : derivedTags;
  const derivedTagSet = new Set(derivedTags);

  const invalidDisplayTag = cardTags.find((tag) => !derivedTagSet.has(tag));
  if (invalidDisplayTag) {
    return {
      valid: false,
      errors: [
        `Card "${id}" in ${deck.id} uses display tag "${invalidDisplayTag}" that is not backed by a canonical assignment.`,
      ],
    };
  }

  const tagLinks: DeckCardTagLink[] = assignedTags.map(({ tag, role }) => ({
    cardId: asDeckCardId(id),
    tagId: tag.id,
    role,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  return {
    valid: true,
    card: {
      id: asDeckCardId(id),
      deckId: deck.id,
      kind: kind as DeckCard['kind'],
      title,
      subtitle,
      descriptionShort,
      tags: cardTags,
      popularity: normalizePopularity(entry.popularity),
      tileKey: explicitTileKey ?? `${deck.category}:${id}`,
      sortOrder: normalizeSortOrder(entry.sort_order, index),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    tagLinks,
  };
}
