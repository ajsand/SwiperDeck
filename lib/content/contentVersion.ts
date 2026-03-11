import type { SQLiteDatabase } from 'expo-sqlite';

export const PREBUILT_DECK_VERSION = 1;

type ContentMetaBoundaryDb = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync'>;

type DeckContentMetaRow = {
  id: number;
  version: number;
  imported_at: number;
  deck_count: number;
  card_count: number;
};

export interface DeckContentMeta {
  id: 1;
  version: number;
  importedAt: number;
  deckCount: number;
  cardCount: number;
}

function rowToDeckContentMeta(row: DeckContentMetaRow): DeckContentMeta {
  return {
    id: 1,
    version: row.version,
    importedAt: row.imported_at,
    deckCount: row.deck_count,
    cardCount: row.card_count,
  };
}

export async function getLoadedContentVersion(
  db: ContentMetaBoundaryDb,
): Promise<number | null> {
  const row = await db.getFirstAsync<Pick<DeckContentMetaRow, 'version'>>(
    `
      SELECT version
      FROM __deck_content_meta
      WHERE id = 1
    `,
  );

  return row?.version ?? null;
}

export async function getLoadedContentMeta(
  db: ContentMetaBoundaryDb,
): Promise<DeckContentMeta | null> {
  const row = await db.getFirstAsync<DeckContentMetaRow>(
    `
      SELECT
        id,
        version,
        imported_at,
        deck_count,
        card_count
      FROM __deck_content_meta
      WHERE id = 1
    `,
  );

  return row ? rowToDeckContentMeta(row) : null;
}

export async function setLoadedContentVersion(
  db: ContentMetaBoundaryDb,
  version: number,
  deckCount: number,
  cardCount: number,
): Promise<void> {
  await db.runAsync(
    `
      INSERT OR REPLACE INTO __deck_content_meta (
        id,
        version,
        imported_at,
        deck_count,
        card_count
      ) VALUES (?, ?, ?, ?, ?)
    `,
    1,
    version,
    Date.now(),
    deckCount,
    cardCount,
  );
}
