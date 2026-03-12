import type { SQLiteDatabase } from 'expo-sqlite';
import {
  deckCardTagLinkToRow,
  deckTagFacetToRow,
  deckTagToRow,
  rowToDeckCardTagLink,
  rowToDeckTag,
  rowToDeckTagFacet,
  rowToDeckCard,
  type DeckCard,
  type DeckCardId,
  type DeckCardRow,
  type DeckCardTagLink,
  type DeckCardTagLinkRow,
  type DeckId,
  type DeckTag,
  type DeckTagFacet,
  type DeckTagFacetId,
  type DeckTagFacetRow,
  type DeckTagId,
  type DeckTagRow,
} from '@/types/domain';

type DeckTagBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export async function upsertDeckTagFacet(
  db: DeckTagBoundaryDb,
  facet: DeckTagFacet,
): Promise<void> {
  const row = deckTagFacetToRow(facet);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_tag_facets (
        id,
        deck_id,
        key,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.deck_id,
    row.key,
    row.label,
    row.description,
    row.sort_order,
    row.created_at,
    row.updated_at,
  );
}

export async function upsertDeckTag(
  db: DeckTagBoundaryDb,
  tag: DeckTag,
): Promise<void> {
  const row = deckTagToRow(tag);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO deck_tag_taxonomy (
        id,
        deck_id,
        facet_id,
        slug,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.deck_id,
    row.facet_id,
    row.slug,
    row.label,
    row.description,
    row.sort_order,
    row.created_at,
    row.updated_at,
  );
}

export async function replaceDeckCardTagLinks(
  db: DeckTagBoundaryDb,
  cardId: DeckCardId,
  links: DeckCardTagLink[],
): Promise<void> {
  await db.runAsync(
    `
      DELETE FROM deck_card_tag_links
      WHERE card_id = ?
    `,
    cardId as string,
  );

  for (const link of links) {
    const row = deckCardTagLinkToRow(link);
    await db.runAsync(
      `
        INSERT INTO deck_card_tag_links (
          card_id,
          tag_id,
          role,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `,
      row.card_id,
      row.tag_id,
      row.role,
      row.created_at,
      row.updated_at,
    );
  }
}

export async function getDeckTagFacetsByDeckId(
  db: DeckTagBoundaryDb,
  deckId: DeckId,
): Promise<DeckTagFacet[]> {
  const rows = await db.getAllAsync<DeckTagFacetRow>(
    `
      SELECT
        id,
        deck_id,
        key,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      FROM deck_tag_facets
      WHERE deck_id = ?
      ORDER BY sort_order, key
    `,
    deckId as string,
  );

  return rows.map(rowToDeckTagFacet);
}

export async function getDeckTagsByDeckId(
  db: DeckTagBoundaryDb,
  deckId: DeckId,
): Promise<DeckTag[]> {
  const rows = await db.getAllAsync<DeckTagRow>(
    `
      SELECT
        id,
        deck_id,
        facet_id,
        slug,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      FROM deck_tag_taxonomy
      WHERE deck_id = ?
      ORDER BY sort_order, slug
    `,
    deckId as string,
  );

  return rows.map(rowToDeckTag);
}

export async function getDeckTagById(
  db: DeckTagBoundaryDb,
  tagId: DeckTagId,
): Promise<DeckTag | null> {
  const row = await db.getFirstAsync<DeckTagRow>(
    `
      SELECT
        id,
        deck_id,
        facet_id,
        slug,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      FROM deck_tag_taxonomy
      WHERE id = ?
    `,
    tagId as string,
  );

  return row ? rowToDeckTag(row) : null;
}

export async function getDeckTagsByIds(
  db: DeckTagBoundaryDb,
  tagIds: DeckTagId[],
): Promise<DeckTag[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const placeholders = tagIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<DeckTagRow>(
    `
      SELECT
        id,
        deck_id,
        facet_id,
        slug,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      FROM deck_tag_taxonomy
      WHERE id IN (${placeholders})
    `,
    ...(tagIds as string[]),
  );

  return rows.map(rowToDeckTag);
}

export async function getDeckCardTagLinksByCardId(
  db: DeckTagBoundaryDb,
  cardId: DeckCardId,
): Promise<DeckCardTagLink[]> {
  const rows = await db.getAllAsync<DeckCardTagLinkRow>(
    `
      SELECT
        card_id,
        tag_id,
        role,
        created_at,
        updated_at
      FROM deck_card_tag_links
      WHERE card_id = ?
      ORDER BY
        CASE role
          WHEN 'primary' THEN 0
          WHEN 'secondary' THEN 1
          ELSE 2
        END,
        tag_id
    `,
    cardId as string,
  );

  return rows.map(rowToDeckCardTagLink);
}

export async function getDeckCardsByTagId(
  db: DeckTagBoundaryDb,
  tagId: DeckTagId,
): Promise<DeckCard[]> {
  const rows = await db.getAllAsync<DeckCardRow>(
    `
      SELECT
        dc.id,
        dc.deck_id,
        dc.kind,
        dc.title,
        dc.subtitle,
        dc.description_short,
        dc.tags_json,
        dc.popularity,
        dc.tile_key,
        dc.sort_order,
        dc.created_at,
        dc.updated_at
      FROM deck_card_tag_links links
      INNER JOIN deck_cards dc
        ON dc.id = links.card_id
      WHERE links.tag_id = ?
      ORDER BY dc.sort_order, dc.title
    `,
    tagId as string,
  );

  return rows.map(rowToDeckCard);
}

export async function getDeckTagFacetById(
  db: DeckTagBoundaryDb,
  facetId: DeckTagFacetId,
): Promise<DeckTagFacet | null> {
  const row = await db.getFirstAsync<DeckTagFacetRow>(
    `
      SELECT
        id,
        deck_id,
        key,
        label,
        description,
        sort_order,
        created_at,
        updated_at
      FROM deck_tag_facets
      WHERE id = ?
    `,
    facetId as string,
  );

  return row ? rowToDeckTagFacet(row) : null;
}
