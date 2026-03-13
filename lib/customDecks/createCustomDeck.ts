import type { SQLiteDatabase } from 'expo-sqlite';

import { upsertDeck, upsertDeckCard } from '@/lib/db';
import type {
  CreateCustomDeckDraft,
  CustomDeckInput,
  Deck,
  DeckCard,
} from '@/types/domain';

import { validateCustomDeck } from './validateCustomDeck';

type CustomDeckDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

function draftToCustomDeckInput(draft: CreateCustomDeckDraft): CustomDeckInput {
  const cards = draft.cardsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((title) => ({
      title,
      kind: 'statement' as const,
    }));

  return {
    title: draft.title,
    description: draft.description,
    category: draft.category,
    cards,
  };
}

export async function createCustomDeck(
  db: CustomDeckDb,
  draft: CreateCustomDeckDraft,
): Promise<{
  deck: Deck;
  cards: DeckCard[];
}> {
  const validated = validateCustomDeck(draftToCustomDeckInput(draft));

  await upsertDeck(db, validated.deck);

  for (const card of validated.cards) {
    await upsertDeckCard(db, card);
  }

  return validated;
}
