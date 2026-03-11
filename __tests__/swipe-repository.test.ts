import type { SQLiteDatabase } from 'expo-sqlite';

import {
  createSwipeSession,
  endSwipeSession,
  getSessionsByDeckId,
  getSwipedCardIdsByDeckId,
  getSwipeEventCountByDeckId,
  getSwipeEventsByDeckId,
  insertSwipeEvent,
} from '@/lib/db';
import {
  actionToDbStrength,
  asDeckCardId,
  asDeckId,
  asSessionId,
  asSwipeEventId,
  type SwipeEvent,
  type SwipeEventRow,
  type SwipeSessionRow,
} from '@/types/domain';

class FakeSwipeBoundaryDb {
  private decks = new Set<string>(['deck_values', 'deck_music']);
  private cardsById = new Map<string, { deckId: string }>([
    ['values_001', { deckId: 'deck_values' }],
    ['values_002', { deckId: 'deck_values' }],
    ['music_001', { deckId: 'deck_music' }],
  ]);
  private sessionsById = new Map<string, SwipeSessionRow>();
  private eventsById = new Map<string, SwipeEventRow>();

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (/INSERT INTO swipe_sessions/i.test(source)) {
      const row: SwipeSessionRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        started_at: Number(params[2]),
        ended_at: params[3] == null ? null : Number(params[3]),
        filters_json: String(params[4]),
      };

      if (!this.decks.has(row.deck_id)) {
        throw new Error(
          `FOREIGN KEY constraint failed: swipe_sessions.deck_id -> decks.id (${row.deck_id})`,
        );
      }

      this.sessionsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/UPDATE swipe_sessions/i.test(source)) {
      const endedAt = Number(params[0]);
      const sessionId = String(params[1]);
      const row = this.sessionsById.get(sessionId);
      if (!row) {
        return { changes: 0, lastInsertRowId: 0 };
      }

      this.sessionsById.set(sessionId, {
        ...row,
        ended_at: endedAt,
      });

      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/INSERT INTO swipe_events/i.test(source)) {
      const row: SwipeEventRow = {
        id: String(params[0]),
        session_id: String(params[1]),
        deck_id: String(params[2]),
        card_id: String(params[3]),
        action: String(params[4]),
        strength: Number(params[5]),
        created_at: Number(params[6]),
      };

      const session = this.sessionsById.get(row.session_id);
      const card = this.cardsById.get(row.card_id);

      if (!session) {
        throw new Error(
          `FOREIGN KEY constraint failed: swipe_events.session_id -> swipe_sessions.id (${row.session_id})`,
        );
      }

      if (!this.decks.has(row.deck_id)) {
        throw new Error(
          `FOREIGN KEY constraint failed: swipe_events.deck_id -> decks.id (${row.deck_id})`,
        );
      }

      if (!card) {
        throw new Error(
          `FOREIGN KEY constraint failed: swipe_events.card_id -> deck_cards.id (${row.card_id})`,
        );
      }

      if (session.deck_id !== row.deck_id || card.deckId !== row.deck_id) {
        throw new Error('Deck scoping mismatch for swipe event.');
      }

      this.eventsById.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    throw new Error(`Unsupported SQL for runAsync: ${source}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    if (/COUNT\(\*\)\s+AS\s+count\s+FROM swipe_events/i.test(source)) {
      const deckId = String(params[0]);
      const count = Array.from(this.eventsById.values()).filter(
        (row) => row.deck_id === deckId,
      ).length;
      return { count } as T;
    }

    throw new Error(`Unsupported SQL for getFirstAsync: ${source}`);
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    if (/SELECT DISTINCT card_id/i.test(source)) {
      const deckId = String(params[0]);
      const rows = Array.from(this.eventsById.values())
        .filter((row) => row.deck_id === deckId)
        .map((row) => ({ card_id: row.card_id }));
      const uniqueRows = Array.from(
        new Map(rows.map((row) => [row.card_id, row])).values(),
      );
      return uniqueRows as T[];
    }

    if (/FROM swipe_events/i.test(source)) {
      const deckId = String(params[0]);
      return Array.from(this.eventsById.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => right.created_at - left.created_at) as T[];
    }

    if (/FROM swipe_sessions/i.test(source)) {
      const deckId = String(params[0]);
      return Array.from(this.sessionsById.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => right.started_at - left.started_at) as T[];
    }

    throw new Error(`Unsupported SQL for getAllAsync: ${source}`);
  }
}

function buildSwipeEvent(overrides: Partial<SwipeEvent> = {}): SwipeEvent {
  return {
    id: asSwipeEventId('event_1'),
    sessionId: asSessionId('session_1'),
    deckId: asDeckId('deck_values'),
    cardId: asDeckCardId('values_001'),
    action: 'strong_yes',
    strength: actionToDbStrength('strong_yes'),
    createdAt: 1700000001000,
    ...overrides,
  };
}

describe('swipeRepository', () => {
  it('creates a swipe session with the correct deck id', async () => {
    const fakeDb = new FakeSwipeBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const session = await createSwipeSession(db, asDeckId('deck_values'));

    expect(session.deckId).toBe(asDeckId('deck_values'));
    expect(session.startedAt).toEqual(expect.any(Number));
    expect(session.endedAt).toBeNull();
  });

  it('ends a swipe session by setting endedAt', async () => {
    const fakeDb = new FakeSwipeBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const session = await createSwipeSession(db, asDeckId('deck_values'));
    await endSwipeSession(db, session.id);

    const sessions = await getSessionsByDeckId(db, asDeckId('deck_values'));
    expect(sessions[0].endedAt).toEqual(expect.any(Number));
  });

  it('persists deck-scoped swipe events and filters queries by deck', async () => {
    const fakeDb = new FakeSwipeBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const session = await createSwipeSession(db, asDeckId('deck_values'));
    const event = buildSwipeEvent({ sessionId: session.id });
    await insertSwipeEvent(db, event);

    const otherSession = await createSwipeSession(db, asDeckId('deck_music'));
    await insertSwipeEvent(
      db,
      buildSwipeEvent({
        id: asSwipeEventId('event_2'),
        sessionId: otherSession.id,
        deckId: asDeckId('deck_music'),
        cardId: asDeckCardId('music_001'),
        action: 'yes',
        strength: actionToDbStrength('yes'),
        createdAt: 1700000002000,
      }),
    );

    const valuesEvents = await getSwipeEventsByDeckId(
      db,
      asDeckId('deck_values'),
    );
    expect(valuesEvents).toHaveLength(1);
    expect(valuesEvents[0].cardId).toBe(asDeckCardId('values_001'));
    expect(valuesEvents[0].deckId).toBe(asDeckId('deck_values'));

    expect(await getSwipeEventCountByDeckId(db, asDeckId('deck_values'))).toBe(
      1,
    );
    expect(await getSwipeEventCountByDeckId(db, asDeckId('deck_music'))).toBe(
      1,
    );

    expect(await getSwipedCardIdsByDeckId(db, asDeckId('deck_values'))).toEqual(
      new Set([asDeckCardId('values_001')]),
    );
  });

  it('rejects events whose card id does not exist', async () => {
    const fakeDb = new FakeSwipeBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const session = await createSwipeSession(db, asDeckId('deck_values'));

    await expect(
      insertSwipeEvent(
        db,
        buildSwipeEvent({
          sessionId: session.id,
          cardId: asDeckCardId('missing_card'),
        }),
      ),
    ).rejects.toThrow('card_id');
  });
});
