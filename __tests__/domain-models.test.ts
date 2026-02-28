import type { SQLiteDatabase } from 'expo-sqlite';

import {
  asEntityId,
  asSessionId,
  asSnapshotId,
  asSwipeEventId,
  catalogEntityToRow,
  rowToCatalogEntity,
  rowToProfileSnapshot,
  rowToSwipeEvent,
  type CatalogEntity,
  type CatalogEntityRow,
  type SwipeEventRow,
} from '@/types/domain';
import {
  getCatalogEntityById,
  upsertCatalogEntity,
} from '../lib/db/catalogRepository';

class FakeCatalogBoundaryDb {
  private rowsById = new Map<string, CatalogEntityRow>();

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (!/INSERT OR REPLACE INTO catalog_entities/i.test(source)) {
      throw new Error(`Unsupported SQL for runAsync: ${source}`);
    }

    const [
      id,
      type,
      title,
      subtitle,
      descriptionShort,
      tagsJson,
      popularity,
      tileKey,
      imageUrl,
      updatedAt,
    ] = params;

    const row: CatalogEntityRow = {
      id: String(id),
      type: String(type),
      title: String(title),
      subtitle: String(subtitle),
      description_short: String(descriptionShort),
      tags_json: String(tagsJson),
      popularity: Number(popularity),
      tile_key: String(tileKey),
      image_url: imageUrl == null ? null : String(imageUrl),
      updated_at: Number(updatedAt),
    };

    this.rowsById.set(row.id, row);

    return {
      changes: 1,
      lastInsertRowId: 1,
    };
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    if (!/FROM catalog_entities/i.test(source)) {
      throw new Error(`Unsupported SQL for getFirstAsync: ${source}`);
    }

    const entityId = String(params[0]);
    const row = this.rowsById.get(entityId) ?? null;
    return row as T | null;
  }
}

describe('domain row/domain models and mappers', () => {
  it('maps catalog entity row and domain with JSON safety', () => {
    const row: CatalogEntityRow = {
      id: 'entity_a',
      type: 'movie',
      title: 'Example Title',
      subtitle: 'Example Subtitle',
      description_short: 'Example Description',
      tags_json: '["drama",42,{"bad":"shape"}]',
      popularity: 0.72,
      tile_key: 'tile_key_a',
      image_url: null,
      updated_at: 1700000000000,
    };

    const domainEntity = rowToCatalogEntity(row);
    expect(domainEntity.tags).toEqual(['drama']);
    expect(domainEntity.descriptionShort).toBe('Example Description');

    const roundTripRow = catalogEntityToRow(domainEntity);
    expect(roundTripRow.description_short).toBe('Example Description');
    expect(roundTripRow.tags_json).toBe('["drama"]');
  });

  it('rejects invalid swipe action values at row boundary', () => {
    const invalidEventRow: SwipeEventRow = {
      id: 'event_1',
      session_id: 'session_1',
      entity_id: 'entity_1',
      action: 'hard_yes',
      strength: 2,
      created_at: 1700000001000,
    };

    expect(() => rowToSwipeEvent(invalidEventRow)).toThrow(
      'Invalid swipe action: hard_yes',
    );
  });

  it('parses profile snapshot JSON with safe fallbacks', () => {
    const snapshot = rowToProfileSnapshot({
      id: 'snapshot_1',
      created_at: 1700000002000,
      top_tags_json: 'not-json',
      top_types_json: '[{"type":"movie","score":"bad"}]',
      summary_json:
        '{"totalSwipes":10,"topAction":"hard_yes","generatedAt":1700000003000,"labels":[1,"valid"]}',
    });

    expect(snapshot.id).toBe(asSnapshotId('snapshot_1'));
    expect(snapshot.topTags).toEqual([]);
    expect(snapshot.topTypes).toEqual([]);
    expect(snapshot.summary.totalSwipes).toBe(10);
    expect(snapshot.summary.labels).toEqual(['valid']);
    expect(snapshot.summary.topAction).toBeUndefined();
  });
});

describe('catalog DB boundary uses row/domain mappers', () => {
  it('writes and reads catalog entities via mapper-driven boundary helpers', async () => {
    const fakeDb = new FakeCatalogBoundaryDb();
    const db = fakeDb as unknown as SQLiteDatabase;

    const catalogEntity: CatalogEntity = {
      id: asEntityId('entity_boundary_1'),
      type: 'movie',
      title: 'Boundary Title',
      subtitle: 'Boundary Subtitle',
      descriptionShort: 'Boundary Description',
      tags: ['drama', 'thriller'],
      popularity: 0.9,
      tileKey: 'tile_boundary_1',
      imageUrl: null,
      updatedAt: 1700000004000,
    };

    await upsertCatalogEntity(db, catalogEntity);
    const loadedEntity = await getCatalogEntityById(db, catalogEntity.id);

    expect(loadedEntity).toEqual(catalogEntity);
    expect(await getCatalogEntityById(db, asEntityId('missing'))).toBeNull();
  });
});

describe('id branding helpers', () => {
  it('creates branded IDs without runtime overhead', () => {
    expect(asEntityId('entity_2')).toBe('entity_2');
    expect(asSessionId('session_2')).toBe('session_2');
    expect(asSwipeEventId('event_2')).toBe('event_2');
    expect(asSnapshotId('snapshot_2')).toBe('snapshot_2');
  });
});
