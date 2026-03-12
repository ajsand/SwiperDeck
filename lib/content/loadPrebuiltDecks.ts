import type { SQLiteDatabase } from 'expo-sqlite';
import prebuiltDecksData from '@/assets/data/prebuilt-decks.json';
import prebuiltDeckTaxonomiesData from '@/assets/data/prebuilt-deck-taxonomies.json';

import { upsertDeck } from '@/lib/db/deckRepository';
import {
  countDeckCardsByDeckId,
  upsertDeckCard,
} from '@/lib/db/deckCardRepository';
import {
  replaceDeckCardTagLinks,
  upsertDeckTag,
  upsertDeckTagFacet,
} from '@/lib/db/deckTagRepository';
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
import {
  buildDeckTaxonomyLookup,
  validateDeckTaxonomyFile,
  type PrebuiltDeckTaxonomyFile,
} from './validateDeckTaxonomy';

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

type PresenceRow = {
  present: number;
};

type CountRow = {
  count: number;
};

type PrebuiltContentState = {
  prebuiltDeckCount: number;
  prebuiltCardCount: number;
  taxonomyFacetCount: number;
  taxonomyTagCount: number;
  tagLinkCount: number;
};

function normalizeLoaderError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isUnsupportedExclusiveTransactionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('withExclusiveTransactionAsync is not supported')
  );
}

async function runLoaderInTransaction(
  db: LoaderBoundaryDb,
  task: (txnDb: LoaderBoundaryDb) => Promise<void>,
): Promise<void> {
  if (typeof db.withExclusiveTransactionAsync === 'function') {
    try {
      await db.withExclusiveTransactionAsync(async (txnDb) => {
        await task(txnDb as LoaderBoundaryDb);
      });
      return;
    } catch (error) {
      if (
        !isUnsupportedExclusiveTransactionError(error) ||
        typeof db.withTransactionAsync !== 'function'
      ) {
        throw error;
      }
    }
  }

  if (typeof db.withTransactionAsync !== 'function') {
    throw new Error('Database transaction APIs are unavailable.');
  }

  await db.withTransactionAsync(async () => {
    await task(db);
  });
}

function readDeckSourceData(data: unknown): PrebuiltDeckFile {
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

function readDeckTaxonomySourceData(data: unknown): PrebuiltDeckTaxonomyFile {
  if (!isRecord(data)) {
    throw new Error('Prebuilt deck taxonomy source must be an object.');
  }

  if (data.version !== PREBUILT_DECK_VERSION) {
    throw new Error(
      `Prebuilt deck taxonomy version mismatch. Expected ${PREBUILT_DECK_VERSION}, received ${String(data.version)}.`,
    );
  }

  if (!Array.isArray(data.decks)) {
    throw new Error(
      'Prebuilt deck taxonomy source must contain a decks array.',
    );
  }

  return data as unknown as PrebuiltDeckTaxonomyFile;
}

async function hasDeckTagTaxonomyData(db: LoaderBoundaryDb): Promise<boolean> {
  try {
    const [facetRow, tagRow, linkRow] = await Promise.all([
      db.getFirstAsync<PresenceRow>(
        `
          SELECT 1 AS present
          FROM deck_tag_facets
          LIMIT 1
        `,
      ),
      db.getFirstAsync<PresenceRow>(
        `
          SELECT 1 AS present
          FROM deck_tag_taxonomy
          LIMIT 1
        `,
      ),
      db.getFirstAsync<PresenceRow>(
        `
          SELECT 1 AS present
          FROM deck_card_tag_links
          LIMIT 1
        `,
      ),
    ]);

    return Boolean(facetRow?.present && tagRow?.present && linkRow?.present);
  } catch {
    return false;
  }
}

async function readPrebuiltContentState(
  db: LoaderBoundaryDb,
): Promise<PrebuiltContentState> {
  try {
    const [deckRow, cardRow, facetRow, tagRow, linkRow] = await Promise.all([
      db.getFirstAsync<CountRow>(
        `
          SELECT COUNT(*) AS count
          FROM decks
          WHERE is_custom = 0
        `,
      ),
      db.getFirstAsync<CountRow>(
        `
          SELECT COUNT(*) AS count
          FROM deck_cards
        `,
      ),
      db.getFirstAsync<CountRow>(
        `
          SELECT COUNT(*) AS count
          FROM deck_tag_facets
        `,
      ),
      db.getFirstAsync<CountRow>(
        `
          SELECT COUNT(*) AS count
          FROM deck_tag_taxonomy
        `,
      ),
      db.getFirstAsync<CountRow>(
        `
          SELECT COUNT(*) AS count
          FROM deck_card_tag_links
        `,
      ),
    ]);

    return {
      prebuiltDeckCount: deckRow?.count ?? 0,
      prebuiltCardCount: cardRow?.count ?? 0,
      taxonomyFacetCount: facetRow?.count ?? 0,
      taxonomyTagCount: tagRow?.count ?? 0,
      tagLinkCount: linkRow?.count ?? 0,
    };
  } catch {
    return {
      prebuiltDeckCount: 0,
      prebuiltCardCount: 0,
      taxonomyFacetCount: 0,
      taxonomyTagCount: 0,
      tagLinkCount: 0,
    };
  }
}

function countDeckCardsInSource(source: PrebuiltDeckFile): number {
  return source.decks.reduce((count, deck) => {
    return count + (Array.isArray(deck.cards) ? deck.cards.length : 0);
  }, 0);
}

function hasExpectedBundledContent(
  state: PrebuiltContentState,
  expectedDeckCount: number,
  expectedCardCount: number,
): boolean {
  return (
    state.prebuiltDeckCount >= expectedDeckCount &&
    state.prebuiltCardCount >= expectedCardCount &&
    state.taxonomyFacetCount > 0 &&
    state.taxonomyTagCount > 0 &&
    state.tagLinkCount > 0
  );
}

export async function loadPrebuiltDecksIfNeeded(
  db: LoaderBoundaryDb,
  sourceData: unknown = prebuiltDecksData,
  taxonomySourceData: unknown = prebuiltDeckTaxonomiesData,
): Promise<LoadPrebuiltDecksResult> {
  try {
    const normalizedSource = readDeckSourceData(sourceData);
    const taxonomySource = readDeckTaxonomySourceData(taxonomySourceData);
    const expectedDeckCount = normalizedSource.decks.length;
    const expectedCardCount = countDeckCardsInSource(normalizedSource);
    const currentVersion = await getLoadedContentVersion(db);
    const contentState =
      currentVersion === null ? null : await readPrebuiltContentState(db);
    const taxonomyDataPresent =
      currentVersion === null ? false : await hasDeckTagTaxonomyData(db);
    const bundledContentPresent =
      contentState !== null &&
      hasExpectedBundledContent(
        contentState,
        expectedDeckCount,
        expectedCardCount,
      );

    if (
      currentVersion !== null &&
      currentVersion >= PREBUILT_DECK_VERSION &&
      taxonomyDataPresent &&
      bundledContentPresent
    ) {
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

    if (
      currentVersion !== null &&
      currentVersion >= PREBUILT_DECK_VERSION &&
      (!taxonomyDataPresent || !bundledContentPresent)
    ) {
      logDbWarn(
        `Prebuilt deck content version ${currentVersion} is marked current, but bundled prebuilt data is incomplete. Reloading bundled content.`,
      );
    }
    const timestamp = Date.now();

    const taxonomyValidation = validateDeckTaxonomyFile(
      taxonomySource,
      timestamp,
    );

    if (!taxonomyValidation.valid) {
      throw new Error(
        `Prebuilt deck taxonomy failed validation: ${taxonomyValidation.errors.join(' ')}`,
      );
    }

    const taxonomyLookup = buildDeckTaxonomyLookup(taxonomyValidation.decks);

    let deckCount = 0;
    let cardCount = 0;
    let skippedCardCount = 0;

    await runLoaderInTransaction(db, async (txnDb) => {
      for (const [deckIndex, entry] of normalizedSource.decks.entries()) {
        const deckValidation = validateDeck(entry, timestamp);
        if (!deckValidation.valid) {
          throw new Error(
            `Prebuilt deck ${deckIndex + 1} failed validation: ${deckValidation.errors.join(' ')}`,
          );
        }

        const { deck, cards } = deckValidation;
        const deckTaxonomy = taxonomyLookup.get(deck.id as string);

        if (!deckTaxonomy) {
          throw new Error(
            `Prebuilt deck ${deck.id} is missing taxonomy metadata.`,
          );
        }

        await upsertDeck(txnDb, deck);

        for (const facet of deckTaxonomy.facets) {
          await upsertDeckTagFacet(txnDb, facet);
        }

        for (const tag of deckTaxonomy.tags) {
          await upsertDeckTag(txnDb, tag);
        }

        let insertedCardsForDeck = 0;

        for (const [cardIndex, cardEntry] of cards.entries()) {
          const cardValidation = validateCard(
            cardEntry,
            deck,
            deckTaxonomy,
            cardIndex,
            timestamp,
          );

          if (!cardValidation.valid) {
            skippedCardCount += 1;
            logDbWarn(cardValidation.errors.join(' '));
            continue;
          }

          await upsertDeckCard(txnDb, cardValidation.card);
          await replaceDeckCardTagLinks(
            txnDb,
            cardValidation.card.id,
            cardValidation.tagLinks,
          );
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
