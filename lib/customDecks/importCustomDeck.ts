import type { SQLiteDatabase } from 'expo-sqlite';

import { upsertDeck, upsertDeckCard } from '@/lib/db';
import type { CustomDeckInput, Deck, DeckCard } from '@/types/domain';

import { validateCustomDeck } from './validateCustomDeck';

type CustomDeckDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseImportedCard(value: unknown): CustomDeckInput['cards'][number] {
  if (typeof value === 'string') {
    return {
      title: value,
      kind: 'statement',
    };
  }

  if (!isRecord(value)) {
    throw new Error('Each imported card must be a string or object.');
  }

  return {
    title: typeof value.title === 'string' ? value.title : '',
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
    descriptionShort:
      typeof value.descriptionShort === 'string'
        ? value.descriptionShort
        : typeof value.description_short === 'string'
          ? value.description_short
          : '',
    kind:
      value.kind === 'entity' || value.kind === 'statement'
        ? value.kind
        : undefined,
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
  };
}

function parseCustomDeckInput(source: string): CustomDeckInput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error('Custom deck import must be valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('Custom deck import must be a JSON object.');
  }

  if (!Array.isArray(parsed.cards)) {
    throw new Error('Custom deck import must include a cards array.');
  }

  return {
    title: typeof parsed.title === 'string' ? parsed.title : '',
    description:
      typeof parsed.description === 'string' ? parsed.description : '',
    category: typeof parsed.category === 'string' ? parsed.category : 'custom',
    sensitivity:
      parsed.sensitivity === 'standard' ||
      parsed.sensitivity === 'sensitive' ||
      parsed.sensitivity === 'gated'
        ? parsed.sensitivity
        : 'standard',
    cards: parsed.cards.map(parseImportedCard),
  };
}

export async function importCustomDeck(
  db: CustomDeckDb,
  source: string,
): Promise<{
  deck: Deck;
  cards: DeckCard[];
}> {
  const validated = validateCustomDeck(parseCustomDeckInput(source));

  await upsertDeck(db, validated.deck);

  for (const card of validated.cards) {
    await upsertDeckCard(db, card);
  }

  return validated;
}
