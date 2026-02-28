import { asEntityId, type EntityId } from './ids';
import { parseStringArrayJson } from './parsers';

export const ENTITY_TYPES = [
  'book',
  'movie',
  'tv',
  'podcast',
  'album',
  'artist',
  'game',
  'team',
  'athlete',
  'thinker',
  'place',
  'concept',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
export type CatalogEntityType = EntityType | (string & {});

const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES);

export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && ENTITY_TYPE_SET.has(value);
}

export interface CatalogEntityRow {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  description_short: string;
  tags_json: string;
  popularity: number;
  tile_key: string;
  image_url: string | null;
  updated_at: number;
}

export interface CatalogEntity {
  id: EntityId;
  type: CatalogEntityType;
  title: string;
  subtitle: string;
  descriptionShort: string;
  tags: string[];
  popularity: number;
  tileKey: string;
  imageUrl: string | null;
  updatedAt: number;
}

export function rowToCatalogEntity(row: CatalogEntityRow): CatalogEntity {
  return {
    id: asEntityId(row.id),
    type: row.type as CatalogEntityType,
    title: row.title,
    subtitle: row.subtitle,
    descriptionShort: row.description_short,
    tags: parseStringArrayJson(row.tags_json),
    popularity: row.popularity,
    tileKey: row.tile_key,
    imageUrl: row.image_url,
    updatedAt: row.updated_at,
  };
}

export function catalogEntityToRow(entity: CatalogEntity): CatalogEntityRow {
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    subtitle: entity.subtitle,
    description_short: entity.descriptionShort,
    tags_json: JSON.stringify(entity.tags),
    popularity: entity.popularity,
    tile_key: entity.tileKey,
    image_url: entity.imageUrl,
    updated_at: entity.updatedAt,
  };
}
