import {
  asDeckCardId,
  asDeckId,
  normalizeCardKind,
  normalizeDeckSensitivity,
  type CustomDeckInput,
  type Deck,
  type DeckCard,
  type DeckId,
} from '@/types/domain';

const MIN_CUSTOM_CARD_COUNT = 3;
const MAX_CUSTOM_CARD_COUNT = 200;
const MAX_DISPLAY_TAG_COUNT = 8;
const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 280;
const MAX_CARD_TITLE_LENGTH = 180;
const MAX_CARD_DESCRIPTION_LENGTH = 240;

export interface ValidatedCustomDeck {
  deck: Deck;
  cards: DeckCard[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeCustomCategory(value: string | undefined): string {
  const normalized = normalizeWhitespace(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.length > 0 ? normalized : 'custom';
}

function normalizeDisplayTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    if (typeof rawTag !== 'string') {
      continue;
    }

    const tag = normalizeWhitespace(rawTag).toLowerCase();

    if (!tag || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);

    if (normalized.length >= MAX_DISPLAY_TAG_COUNT) {
      break;
    }
  }

  return normalized;
}

function createId(prefix: string, seed: string): string {
  const entropy = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${seed}_${entropy}`;
}

function buildDeckId(title: string, now: number): DeckId {
  const titleSeed = normalizeWhitespace(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);

  return asDeckId(createId('custom_deck', `${titleSeed || 'deck'}_${now}`));
}

function validateTitle(value: string, label: string, maxLength: number): void {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  if (value.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
}

function validateCardCount(count: number): void {
  if (count < MIN_CUSTOM_CARD_COUNT) {
    throw new Error(
      `Custom decks need at least ${MIN_CUSTOM_CARD_COUNT} cards.`,
    );
  }

  if (count > MAX_CUSTOM_CARD_COUNT) {
    throw new Error(
      `Custom decks support at most ${MAX_CUSTOM_CARD_COUNT} cards in this iteration.`,
    );
  }
}

export function validateCustomDeck(
  input: CustomDeckInput,
  options?: {
    now?: number;
    deckId?: DeckId;
  },
): ValidatedCustomDeck {
  const now = options?.now ?? Date.now();
  const title = normalizeWhitespace(input.title);
  const description = normalizeWhitespace(input.description);
  const category = normalizeCustomCategory(input.category);

  validateTitle(title, 'Deck title', MAX_TITLE_LENGTH);
  validateTitle(description, 'Deck description', MAX_DESCRIPTION_LENGTH);
  validateCardCount(input.cards.length);

  const deckId = options?.deckId ?? buildDeckId(title, now);
  const cards: DeckCard[] = input.cards.map((rawCard, index) => {
    const cardTitle = normalizeWhitespace(rawCard.title);
    const cardSubtitle = normalizeWhitespace(rawCard.subtitle ?? '');
    const descriptionShort = normalizeWhitespace(
      rawCard.descriptionShort ?? '',
    );

    validateTitle(cardTitle, `Card ${index + 1} title`, MAX_CARD_TITLE_LENGTH);

    if (descriptionShort.length > MAX_CARD_DESCRIPTION_LENGTH) {
      throw new Error(
        `Card ${index + 1} description must be ${MAX_CARD_DESCRIPTION_LENGTH} characters or fewer.`,
      );
    }

    return {
      id: asDeckCardId(`${deckId as string}_card_${index + 1}`),
      deckId,
      kind: normalizeCardKind(rawCard.kind ?? 'statement'),
      title: cardTitle,
      subtitle: cardSubtitle,
      descriptionShort,
      tags: normalizeDisplayTags(rawCard.tags),
      popularity: 0.5,
      tileKey: `custom:${deckId as string}:${index + 1}`,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
    };
  });

  const minCardsForProfile = Math.max(
    MIN_CUSTOM_CARD_COUNT,
    Math.min(cards.length, 12),
  );

  return {
    deck: {
      id: deckId,
      title,
      description,
      category,
      tier: 'tier_1',
      cardCount: cards.length,
      compareEligible: false,
      showdownEligible: false,
      sensitivity: normalizeDeckSensitivity(input.sensitivity ?? 'standard'),
      minCardsForProfile,
      minCardsForCompare: cards.length,
      isCustom: true,
      coverTileKey: `custom:${deckId as string}`,
      createdAt: now,
      updatedAt: now,
    },
    cards,
  };
}
