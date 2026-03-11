import type { SQLiteDatabase } from 'expo-sqlite';
import prebuiltDecksData from '@/assets/data/prebuilt-decks.json';

import { upsertDeck } from '@/lib/db/deckRepository';
import {
  countDeckCardsByDeckId,
  upsertDeckCard,
} from '@/lib/db/deckCardRepository';
import { logDbError, logDbInfo, logDbWarn } from '@/lib/db/logger';
import { isRecord } from '@/types/domain';

import {
  PREBUILT_DECK_VERSION,
  getLoadedContentVersion,
  setLoadedContentVersion,
  type DeckContentMeta,
} from './contentVersion';
import {
  validateCard,
  validateDeck,
  type PrebuiltDeckFile,
} from './validateDeck';

type LoaderBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
> &
  Partial<
    Pick<
      SQLiteDatabase,
      'withExclusiveTransactionAsync' | 'withTransactionAsync'
    >
  >;

export interface LoadPrebuiltDecksResult {
  status: 'loaded' | 'skipped' | 'failed';
  version: number;
  deckCount: number;
  cardCount: number;
  skippedCardCount: number;
  meta?: DeckContentMeta | null;
  error?: Error;
}

function normalizeLoaderError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function runLoaderInTransaction(
  db: LoaderBoundaryDb,
  task: (txnDb: LoaderBoundaryDb) => Promise<void>,
): Promise<void> {
  if (typeof db.withExclusiveTransactionAsync === 'function') {
    await db.withExclusiveTransactionAsync(async (txnDb) => {
      await task(txnDb as LoaderBoundaryDb);
    });
    return;
  }

  if (typeof db.withTransactionAsync !== 'function') {
    throw new Error('Database transaction APIs are unavailable.');
  }

  await db.withTransactionAsync(async () => {
    await task(db);
  });
}

function readSourceData(data: unknown): PrebuiltDeckFile {
  if (!isRecord(data)) {
    throw new Error('Prebuilt deck source must be an object.');
  }

  if (data.version !== PREBUILT_DECK_VERSION) {
    throw new Error(
      `Prebuilt deck content version mismatch. Expected ${PREBUILT_DECK_VERSION}, received ${String(data.version)}.`,
    );
  }

  if (!Array.isArray(data.decks)) {
    throw new Error('Prebuilt deck source must contain a decks array.');
  }

  return data as unknown as PrebuiltDeckFile;
}

export async function loadPrebuiltDecksIfNeeded(
  db: LoaderBoundaryDb,
  sourceData: unknown = prebuiltDecksData,
): Promise<LoadPrebuiltDecksResult> {
  try {
    const currentVersion = await getLoadedContentVersion(db);
    if (currentVersion !== null && currentVersion >= PREBUILT_DECK_VERSION) {
      logDbInfo(
        `Prebuilt deck content version ${currentVersion} is current. Skipping import.`,
      );
      return {
        status: 'skipped',
        version: currentVersion,
        deckCount: 0,
        cardCount: 0,
        skippedCardCount: 0,
      };
    }

    const normalizedSource = readSourceData(sourceData);
    const timestamp = Date.now();

    let deckCount = 0;
    let cardCount = 0;
    let skippedCardCount = 0;

    await runLoaderInTransaction(db, async (txnDb) => {
      await txnDb.runAsync(
        `
          DELETE FROM decks
          WHERE is_custom = ?
        `,
        0,
      );

      for (const [deckIndex, entry] of normalizedSource.decks.entries()) {
        const deckValidation = validateDeck(entry, timestamp);
        if (!deckValidation.valid) {
          throw new Error(
            `Prebuilt deck ${deckIndex + 1} failed validation: ${deckValidation.errors.join(' ')}`,
          );
        }

        const { deck, cards } = deckValidation;
        await upsertDeck(txnDb, deck);

        let insertedCardsForDeck = 0;

        for (const [cardIndex, cardEntry] of cards.entries()) {
          const cardValidation = validateCard(
            cardEntry,
            deck,
            cardIndex,
            timestamp,
          );

          if (!cardValidation.valid) {
            skippedCardCount += 1;
            logDbWarn(cardValidation.errors.join(' '));
            continue;
          }

          await upsertDeckCard(txnDb, cardValidation.card);
          insertedCardsForDeck += 1;
        }

        if (insertedCardsForDeck === 0) {
          throw new Error(`Deck ${deck.id} produced zero valid cards.`);
        }

        const actualCardCount = await countDeckCardsByDeckId(txnDb, deck.id);
        await upsertDeck(txnDb, {
          ...deck,
          cardCount: actualCardCount,
        });

        deckCount += 1;
        cardCount += actualCardCount;
      }

      await setLoadedContentVersion(
        txnDb,
        PREBUILT_DECK_VERSION,
        deckCount,
        cardCount,
      );
    });

    logDbInfo(
      `Loaded prebuilt deck content v${PREBUILT_DECK_VERSION}: ${deckCount} decks, ${cardCount} cards, ${skippedCardCount} skipped cards.`,
    );

    return {
      status: 'loaded',
      version: PREBUILT_DECK_VERSION,
      deckCount,
      cardCount,
      skippedCardCount,
    };
  } catch (error) {
    const normalizedError = normalizeLoaderError(error);
    logDbError('Prebuilt deck content load failed', normalizedError);
    return {
      status: 'failed',
      version: PREBUILT_DECK_VERSION,
      deckCount: 0,
      cardCount: 0,
      skippedCardCount: 0,
      error: normalizedError,
    };
  }
}
