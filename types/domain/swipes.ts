import { normalizeSwipeAction, type SwipeAction } from './actions';
import { type EntityType } from './catalog';
import {
  asDeckCardId,
  asDeckId,
  asSessionId,
  asSwipeEventId,
  type DeckCardId,
  type DeckId,
  type SessionId,
  type SwipeEventId,
} from './ids';
import { isRecord, parseStringArray, parseRecordJson } from './parsers';

export interface SessionFilters extends Record<string, unknown> {
  types?: EntityType[] | string[];
  diversityBoost?: boolean;
  mainstreamBias?: number;
}

export interface SwipeSessionRow {
  id: string;
  deck_id: string;
  started_at: number;
  ended_at: number | null;
  filters_json: string;
}

export interface SwipeSession {
  id: SessionId;
  deckId: DeckId;
  startedAt: number;
  endedAt: number | null;
  filters: SessionFilters;
}

function normalizeSessionFilters(value: unknown): SessionFilters {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: SessionFilters = { ...value };

  if ('types' in value) {
    normalized.types = parseStringArray(value.types);
  }

  if ('diversityBoost' in value) {
    normalized.diversityBoost =
      typeof value.diversityBoost === 'boolean'
        ? value.diversityBoost
        : undefined;
  }

  if ('mainstreamBias' in value) {
    normalized.mainstreamBias =
      typeof value.mainstreamBias === 'number'
        ? value.mainstreamBias
        : undefined;
  }

  return normalized;
}

export function rowToSwipeSession(row: SwipeSessionRow): SwipeSession {
  return {
    id: asSessionId(row.id),
    deckId: asDeckId(row.deck_id),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    filters: normalizeSessionFilters(parseRecordJson(row.filters_json, {})),
  };
}

export function swipeSessionToRow(session: SwipeSession): SwipeSessionRow {
  return {
    id: session.id,
    deck_id: session.deckId,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    filters_json: JSON.stringify(session.filters),
  };
}

export interface SwipeEventRow {
  id: string;
  session_id: string;
  deck_id: string;
  card_id: string;
  action: string;
  strength: number;
  created_at: number;
}

export interface SwipeEvent {
  id: SwipeEventId;
  sessionId: SessionId;
  deckId: DeckId;
  cardId: DeckCardId;
  action: SwipeAction;
  strength: number;
  createdAt: number;
}

export function rowToSwipeEvent(row: SwipeEventRow): SwipeEvent {
  return {
    id: asSwipeEventId(row.id),
    sessionId: asSessionId(row.session_id),
    deckId: asDeckId(row.deck_id),
    cardId: asDeckCardId(row.card_id),
    action: normalizeSwipeAction(row.action),
    strength: row.strength,
    createdAt: row.created_at,
  };
}

export function swipeEventToRow(event: SwipeEvent): SwipeEventRow {
  return {
    id: event.id,
    session_id: event.sessionId,
    deck_id: event.deckId,
    card_id: event.cardId,
    action: event.action,
    strength: event.strength,
    created_at: event.createdAt,
  };
}
