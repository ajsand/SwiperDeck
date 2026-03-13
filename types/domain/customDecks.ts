import type { CardKind, DeckSensitivity } from './decks';

export interface CustomDeckCardInput {
  title: string;
  subtitle?: string;
  descriptionShort?: string;
  kind?: CardKind;
  tags?: string[];
}

export interface CustomDeckInput {
  title: string;
  description: string;
  category?: string;
  sensitivity?: DeckSensitivity;
  cards: CustomDeckCardInput[];
}

export interface CreateCustomDeckDraft {
  title: string;
  description: string;
  category: string;
  cardsText: string;
}
