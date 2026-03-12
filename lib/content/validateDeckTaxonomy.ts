import {
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  type DeckTag,
  type DeckTagFacet,
} from '@/types/domain';
import { isRecord } from '@/types/domain';

const ID_PATTERN = /^[a-z0-9_]+:[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const MIN_FACETS_PER_DECK = 3;
const MAX_FACETS_PER_DECK = 6;
const MIN_TAGS_PER_DECK = 8;
const MAX_TAGS_PER_DECK = 20;

export interface PrebuiltDeckTaxonomyFile {
  version: number;
  decks: PrebuiltDeckTaxonomyEntry[];
}

export interface PrebuiltDeckTaxonomyEntry {
  deck_id: string;
  category: string;
  facets: PrebuiltDeckTagFacetEntry[];
  tags: PrebuiltDeckTagEntry[];
}

export interface PrebuiltDeckTagFacetEntry {
  id: string;
  key: string;
  label: string;
  description?: string;
  sort_order?: number;
}

export interface PrebuiltDeckTagEntry {
  id: string;
  facet_id: string;
  slug: string;
  label: string;
  description?: string;
  sort_order?: number;
}

export interface NormalizedDeckTaxonomy {
  deckId: ReturnType<typeof asDeckId>;
  category: string;
  facets: DeckTagFacet[];
  tags: DeckTag[];
  facetsById: Map<string, DeckTagFacet>;
  tagsById: Map<string, DeckTag>;
  tagsBySlug: Map<string, DeckTag>;
}

export type DeckTaxonomyValidationResult =
  | {
      valid: true;
      taxonomyFile: PrebuiltDeckTaxonomyFile;
      decks: NormalizedDeckTaxonomy[];
    }
  | { valid: false; errors: string[] };

function normalizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
}

function normalizeOptionalString(value: unknown, maxLength: number): string {
  return normalizeString(value, maxLength);
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function isValidPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

export function validateDeckTaxonomyFile(
  value: unknown,
  timestamp: number = Date.now(),
): DeckTaxonomyValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      errors: ['Deck taxonomy file must be an object.'],
    };
  }

  if (!Array.isArray(value.decks)) {
    return {
      valid: false,
      errors: ['Deck taxonomy file must contain a decks array.'],
    };
  }

  const errors: string[] = [];
  const normalizedDecks: NormalizedDeckTaxonomy[] = [];
  const seenDeckIds = new Set<string>();

  value.decks.forEach((deckEntry, deckIndex) => {
    if (!isRecord(deckEntry)) {
      errors.push(`Taxonomy deck ${deckIndex + 1} must be an object.`);
      return;
    }

    const deckId = normalizeString(deckEntry.deck_id, 100);
    const category = normalizeString(deckEntry.category, 100).toLowerCase();
    const facetsInput = Array.isArray(deckEntry.facets) ? deckEntry.facets : [];
    const tagsInput = Array.isArray(deckEntry.tags) ? deckEntry.tags : [];

    if (!deckId) {
      errors.push(`Taxonomy deck ${deckIndex + 1} is missing deck_id.`);
      return;
    }

    if (seenDeckIds.has(deckId)) {
      errors.push(`Taxonomy deck "${deckId}" is duplicated.`);
      return;
    }
    seenDeckIds.add(deckId);

    if (!category) {
      errors.push(`Taxonomy deck "${deckId}" is missing category.`);
    }

    if (
      facetsInput.length < MIN_FACETS_PER_DECK ||
      facetsInput.length > MAX_FACETS_PER_DECK
    ) {
      errors.push(
        `Taxonomy deck "${deckId}" must define ${MIN_FACETS_PER_DECK}-${MAX_FACETS_PER_DECK} facets.`,
      );
    }

    if (
      tagsInput.length < MIN_TAGS_PER_DECK ||
      tagsInput.length > MAX_TAGS_PER_DECK
    ) {
      errors.push(
        `Taxonomy deck "${deckId}" must define ${MIN_TAGS_PER_DECK}-${MAX_TAGS_PER_DECK} tags.`,
      );
    }

    const normalizedDeckId = asDeckId(deckId);
    const facetsById = new Map<string, DeckTagFacet>();
    const tagsById = new Map<string, DeckTag>();
    const tagsBySlug = new Map<string, DeckTag>();
    const facetKeys = new Set<string>();
    const tagSlugs = new Set<string>();

    facetsInput.forEach((facetEntry, facetIndex) => {
      if (!isRecord(facetEntry)) {
        errors.push(
          `Facet ${facetIndex + 1} in "${deckId}" must be an object.`,
        );
        return;
      }

      const id = normalizeString(facetEntry.id, 100);
      const key = normalizeString(facetEntry.key, 100).toLowerCase();
      const label = normalizeString(facetEntry.label, 120);
      const description = normalizeOptionalString(facetEntry.description, 240);
      const sortOrder = normalizeSortOrder(facetEntry.sort_order, facetIndex);

      if (!id || !isValidPattern(id, ID_PATTERN)) {
        errors.push(
          `Facet "${id || `${deckId}#${facetIndex + 1}`}" in "${deckId}" has an invalid id.`,
        );
        return;
      }

      if (!key || !isValidPattern(key, KEY_PATTERN)) {
        errors.push(
          `Facet "${id}" in "${deckId}" has an invalid key "${key}".`,
        );
        return;
      }

      if (!label) {
        errors.push(`Facet "${id}" in "${deckId}" is missing a label.`);
        return;
      }

      if (facetsById.has(id)) {
        errors.push(`Facet id "${id}" is duplicated in "${deckId}".`);
        return;
      }

      if (facetKeys.has(key)) {
        errors.push(`Facet key "${key}" is duplicated in "${deckId}".`);
        return;
      }

      facetKeys.add(key);

      const facet: DeckTagFacet = {
        id: asDeckTagFacetId(id),
        deckId: normalizedDeckId,
        key,
        label,
        description,
        sortOrder,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      facetsById.set(id, facet);
    });

    tagsInput.forEach((tagEntry, tagIndex) => {
      if (!isRecord(tagEntry)) {
        errors.push(`Tag ${tagIndex + 1} in "${deckId}" must be an object.`);
        return;
      }

      const id = normalizeString(tagEntry.id, 120);
      const facetId = normalizeString(tagEntry.facet_id, 120);
      const slug = normalizeString(tagEntry.slug, 120).toLowerCase();
      const label = normalizeString(tagEntry.label, 120);
      const description = normalizeOptionalString(tagEntry.description, 240);
      const sortOrder = normalizeSortOrder(tagEntry.sort_order, tagIndex);

      if (!id || !isValidPattern(id, ID_PATTERN)) {
        errors.push(
          `Tag "${id || `${deckId}#${tagIndex + 1}`}" in "${deckId}" has an invalid id.`,
        );
        return;
      }

      if (!facetId || !facetsById.has(facetId)) {
        errors.push(
          `Tag "${id}" in "${deckId}" references missing facet "${facetId}".`,
        );
        return;
      }

      if (!slug || !isValidPattern(slug, KEY_PATTERN)) {
        errors.push(
          `Tag "${id}" in "${deckId}" has an invalid slug "${slug}".`,
        );
        return;
      }

      if (!label) {
        errors.push(`Tag "${id}" in "${deckId}" is missing a label.`);
        return;
      }

      if (tagsById.has(id)) {
        errors.push(`Tag id "${id}" is duplicated in "${deckId}".`);
        return;
      }

      if (tagSlugs.has(slug)) {
        errors.push(`Tag slug "${slug}" is duplicated in "${deckId}".`);
        return;
      }

      tagSlugs.add(slug);

      const tag: DeckTag = {
        id: asDeckTagId(id),
        deckId: normalizedDeckId,
        facetId: asDeckTagFacetId(facetId),
        slug,
        label,
        description,
        sortOrder,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      tagsById.set(id, tag);
      tagsBySlug.set(slug, tag);
    });

    normalizedDecks.push({
      deckId: normalizedDeckId,
      category,
      facets: Array.from(facetsById.values()).sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.key.localeCompare(right.key),
      ),
      tags: Array.from(tagsById.values()).sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.slug.localeCompare(right.slug),
      ),
      facetsById,
      tagsById,
      tagsBySlug,
    });
  });

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    taxonomyFile: value as unknown as PrebuiltDeckTaxonomyFile,
    decks: normalizedDecks,
  };
}

export function buildDeckTaxonomyLookup(
  decks: NormalizedDeckTaxonomy[],
): Map<string, NormalizedDeckTaxonomy> {
  return new Map(decks.map((deck) => [deck.deckId as string, deck]));
}
