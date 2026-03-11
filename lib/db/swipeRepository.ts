import type { SQLiteDatabase } from 'expo-sqlite';
import {
  asSessionId,
  asSwipeEventId,
  rowToSwipeEvent,
  rowToSwipeSession,
  swipeEventToRow,
  swipeSessionToRow,
  type DeckCardId,
  type DeckId,
  type SessionFilters,
  type SessionId,
  type SwipeEvent,
  type SwipeEventRow,
  type SwipeSession,
  type SwipeSessionRow,
} from '@/types/domain';

type SwipeBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

type CountRow = {
  count: number;
};

type CardIdRow = {
  card_id: string;
};

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createSwipeSession(
  db: SwipeBoundaryDb,
  deckId: DeckId,
  filters: SessionFilters = {},
): Promise<SwipeSession> {
  const session: SwipeSession = {
    id: asSessionId(createId('session')),
    deckId,
    startedAt: Date.now(),
    endedAt: null,
    filters,
  };
  const row = swipeSessionToRow(session);

  await db.runAsync(
    `
      INSERT INTO swipe_sessions (
        id,
        deck_id,
        started_at,
        ended_at,
        filters_json
      ) VALUES (?, ?, ?, ?, ?)
    `,
    row.id,
    row.deck_id,
    row.started_at,
    row.ended_at,
    row.filters_json,
  );

  return session;
}

export async function endSwipeSession(
  db: SwipeBoundaryDb,
  sessionId: SessionId,
): Promise<void> {
  await db.runAsync(
    `
      UPDATE swipe_sessions
      SET ended_at = ?
      WHERE id = ?
    `,
    Date.now(),
    sessionId as string,
  );
}

export async function insertSwipeEvent(
  db: SwipeBoundaryDb,
  event: SwipeEvent,
): Promise<void> {
  const row = swipeEventToRow(event);

  await db.runAsync(
    `
      INSERT INTO swipe_events (
        id,
        session_id,
        deck_id,
        card_id,
        action,
        strength,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.session_id,
    row.deck_id,
    row.card_id,
    row.action,
    row.strength,
    row.created_at,
  );
}

export async function createSwipeEvent(
  event: Omit<SwipeEvent, 'id'>,
): Promise<SwipeEvent> {
  return {
    ...event,
    id: asSwipeEventId(createId('event')),
  };
}

export async function getSwipeEventsByDeckId(
  db: SwipeBoundaryDb,
  deckId: DeckId,
): Promise<SwipeEvent[]> {
  const rows = await db.getAllAsync<SwipeEventRow>(
    `
      SELECT
        id,
        session_id,
        deck_id,
        card_id,
        action,
        strength,
        created_at
      FROM swipe_events
      WHERE deck_id = ?
      ORDER BY created_at DESC
    `,
    deckId as string,
  );

  return rows.map(rowToSwipeEvent);
}

export async function getSwipeEventCountByDeckId(
  db: SwipeBoundaryDb,
  deckId: DeckId,
): Promise<number> {
  const row = await db.getFirstAsync<CountRow>(
    `
      SELECT COUNT(*) AS count
      FROM swipe_events
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  return row?.count ?? 0;
}

export async function getSwipedCardIdsByDeckId(
  db: SwipeBoundaryDb,
  deckId: DeckId,
): Promise<Set<DeckCardId>> {
  const rows = await db.getAllAsync<CardIdRow>(
    `
      SELECT DISTINCT card_id
      FROM swipe_events
      WHERE deck_id = ?
    `,
    deckId as string,
  );

  return new Set(rows.map((row) => row.card_id as DeckCardId));
}

export async function getDeckIdsWithSwipeEvents(
  db: SwipeBoundaryDb,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ deck_id: string }>(
    `
      SELECT DISTINCT deck_id
      FROM swipe_events
      ORDER BY deck_id
    `,
  );

  return rows.map((row) => row.deck_id);
}

export async function getSessionsByDeckId(
  db: SwipeBoundaryDb,
  deckId: DeckId,
): Promise<SwipeSession[]> {
  const rows = await db.getAllAsync<SwipeSessionRow>(
    `
      SELECT
        id,
        deck_id,
        started_at,
        ended_at,
        filters_json
      FROM swipe_sessions
      WHERE deck_id = ?
      ORDER BY started_at DESC
    `,
    deckId as string,
  );

  return rows.map(rowToSwipeSession);
}
