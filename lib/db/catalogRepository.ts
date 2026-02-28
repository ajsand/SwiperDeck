import type { SQLiteDatabase } from 'expo-sqlite';
import {
  catalogEntityToRow,
  rowToCatalogEntity,
  type CatalogEntity,
  type CatalogEntityRow,
  type EntityId,
} from '@/types/domain';

type CatalogBoundaryDb = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync'>;

export async function upsertCatalogEntity(
  db: CatalogBoundaryDb,
  entity: CatalogEntity,
): Promise<void> {
  const row = catalogEntityToRow(entity);

  await db.runAsync(
    `
      INSERT OR REPLACE INTO catalog_entities (
        id,
        type,
        title,
        subtitle,
        description_short,
        tags_json,
        popularity,
        tile_key,
        image_url,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    row.id,
    row.type,
    row.title,
    row.subtitle,
    row.description_short,
    row.tags_json,
    row.popularity,
    row.tile_key,
    row.image_url,
    row.updated_at,
  );
}

export async function getCatalogEntityById(
  db: CatalogBoundaryDb,
  entityId: EntityId,
): Promise<CatalogEntity | null> {
  const row = await db.getFirstAsync<CatalogEntityRow>(
    `
      SELECT
        id,
        type,
        title,
        subtitle,
        description_short,
        tags_json,
        popularity,
        tile_key,
        image_url,
        updated_at
      FROM catalog_entities
      WHERE id = ?
    `,
    entityId as string,
  );

  if (!row) {
    return null;
  }

  return rowToCatalogEntity(row);
}
