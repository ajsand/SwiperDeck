import { asDeckCardId, asDeckId, type DeckCardId, type DeckId } from './ids';

export interface DeckCardStateRow {
  deck_id: string;
  card_id: string;
  presentation_count: number;
  swipe_count: number;
  last_presented_at: number | null;
  last_swiped_at: number | null;
  updated_at: number;
}

export interface DeckCardState {
  deckId: DeckId;
  cardId: DeckCardId;
  presentationCount: number;
  swipeCount: number;
  lastPresentedAt: number | null;
  lastSwipedAt: number | null;
  updatedAt: number;
}

export function rowToDeckCardState(row: DeckCardStateRow): DeckCardState {
  return {
    deckId: asDeckId(row.deck_id),
    cardId: asDeckCardId(row.card_id),
    presentationCount: row.presentation_count,
    swipeCount: row.swipe_count,
    lastPresentedAt: row.last_presented_at,
    lastSwipedAt: row.last_swiped_at,
    updatedAt: row.updated_at,
  };
}

export function deckCardStateToRow(state: DeckCardState): DeckCardStateRow {
  return {
    deck_id: state.deckId,
    card_id: state.cardId,
    presentation_count: state.presentationCount,
    swipe_count: state.swipeCount,
    last_presented_at: state.lastPresentedAt,
    last_swiped_at: state.lastSwipedAt,
    updated_at: state.updatedAt,
  };
}
