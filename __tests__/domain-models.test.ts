import type { SQLiteDatabase } from 'expo-sqlite';

import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  asEntityId,
  asSessionId,
  asSnapshotId,
  asSwipeEventId,
  deckCardTagLinkToRow,
  deckCardStateToRow,
  deckTagStateToRow,
  deckTagFacetToRow,
  deckTagToRow,
  catalogEntityToRow,
  rowToDeckCardTagLink,
  rowToDeckCardState,
  rowToDeckTag,
  rowToDeckTagFacet,
  rowToDeckTagState,
  rowToCatalogEntity,
  rowToProfileSnapshot,
  rowToSwipeEvent,
  rowToSwipeSession,
  summarizeDeckTagCoverage,
  swipeEventToRow,
  swipeSessionToRow,
  type CatalogEntity,
  type CatalogEntityRow,
  type DeckCardTagLinkRow,
  type DeckCardStateRow,
  type DeckTagFacetRow,
  type DeckTagStateRow,
  type DeckTagRow,
  type SwipeEventRow,
  type SwipeSessionRow,
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
      deck_id: 'deck_1',
      card_id: 'card_1',
      action: 'hard_yes',
      strength: 2,
      created_at: 1700000001000,
    };

    expect(() => rowToSwipeEvent(invalidEventRow)).toThrow(
      'Invalid swipe action: hard_yes',
    );
  });

  it('roundtrips swipe session and swipe event rows through deck-scoped mappers', () => {
    const sessionRow: SwipeSessionRow = {
      id: 'session_1',
      deck_id: 'deck_values',
      started_at: 1700000001000,
      ended_at: null,
      filters_json: '{"category":"values"}',
    };
    const session = rowToSwipeSession(sessionRow);

    expect(session.deckId).toBe(asDeckId('deck_values'));
    expect(swipeSessionToRow(session)).toEqual(sessionRow);

    const eventRow: SwipeEventRow = {
      id: 'event_1',
      session_id: 'session_1',
      deck_id: 'deck_values',
      card_id: 'values_001',
      action: 'strong_yes',
      strength: 2,
      created_at: 1700000002000,
    };
    const event = rowToSwipeEvent(eventRow);

    expect(event.deckId).toBe(asDeckId('deck_values'));
    expect(event.cardId).toBe(asDeckCardId('values_001'));
    expect(swipeEventToRow(event)).toEqual(eventRow);
  });

  it('roundtrips deck taxonomy facet, tag, and card-tag link rows', () => {
    const facetRow: DeckTagFacetRow = {
      id: 'movies_tv:tone',
      deck_id: 'deck_movies_tv',
      key: 'tone',
      label: 'Tone',
      description: 'Mood lane',
      sort_order: 0,
      created_at: 1700000000000,
      updated_at: 1700000000000,
    };
    const facet = rowToDeckTagFacet(facetRow);

    expect(facet.id).toBe(asDeckTagFacetId('movies_tv:tone'));
    expect(deckTagFacetToRow(facet)).toEqual(facetRow);

    const tagRow: DeckTagRow = {
      id: 'movies_tv:drama',
      deck_id: 'deck_movies_tv',
      facet_id: 'movies_tv:tone',
      slug: 'drama',
      label: 'Drama',
      description: 'Drama cards',
      sort_order: 1,
      created_at: 1700000000000,
      updated_at: 1700000000000,
    };
    const tag = rowToDeckTag(tagRow);

    expect(tag.id).toBe(asDeckTagId('movies_tv:drama'));
    expect(deckTagToRow(tag)).toEqual(tagRow);

    const linkRow: DeckCardTagLinkRow = {
      card_id: 'movies_tv_001',
      tag_id: 'movies_tv:drama',
      role: 'primary',
      created_at: 1700000000000,
      updated_at: 1700000000000,
    };
    const link = rowToDeckCardTagLink(linkRow);

    expect(link.cardId).toBe(asDeckCardId('movies_tv_001'));
    expect(link.tagId).toBe(asDeckTagId('movies_tv:drama'));
    expect(deckCardTagLinkToRow(link)).toEqual(linkRow);
  });

  it('roundtrips deck tag state rows and preserves nullable timestamps', () => {
    const stateRow: DeckTagStateRow = {
      deck_id: 'deck_movies_tv',
      tag_id: 'movies_tv:drama',
      exposure_count: 3,
      distinct_cards_seen: 2,
      positive_weight: 1,
      negative_weight: 2,
      skip_count: 1,
      net_weight: -1,
      uncertainty_score: 0.78,
      first_seen_at: 1700000000000,
      last_seen_at: 1700000003000,
      last_positive_at: 1700000000000,
      last_negative_at: 1700000002000,
      last_retested_at: null,
      updated_at: 1700000004000,
    };
    const state = rowToDeckTagState(stateRow);

    expect(state.deckId).toBe(asDeckId('deck_movies_tv'));
    expect(state.tagId).toBe(asDeckTagId('movies_tv:drama'));
    expect(deckTagStateToRow(state)).toEqual(stateRow);
    expect(
      summarizeDeckTagCoverage(asDeckId('deck_movies_tv'), [state]),
    ).toEqual({
      deckId: asDeckId('deck_movies_tv'),
      totalTagCount: 1,
      seenTagCount: 1,
      unseenTagCount: 0,
      resolvedTagCount: 0,
      uncertainTagCount: 1,
      coverageRatio: 1,
    });
  });

  it('roundtrips deck card state rows and preserves presentation/swipe timestamps', () => {
    const stateRow: DeckCardStateRow = {
      deck_id: 'deck_movies_tv',
      card_id: 'movies_tv_001',
      presentation_count: 3,
      swipe_count: 2,
      last_presented_at: 1700000003000,
      last_swiped_at: 1700000004000,
      updated_at: 1700000005000,
    };
    const state = rowToDeckCardState(stateRow);

    expect(state.deckId).toBe(asDeckId('deck_movies_tv'));
    expect(state.cardId).toBe(asDeckCardId('movies_tv_001'));
    expect(deckCardStateToRow(state)).toEqual(stateRow);
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
    expect(asDeckId('deck_2')).toBe('deck_2');
    expect(asDeckCardId('card_2')).toBe('card_2');
    expect(asDeckTagFacetId('deck_2:tone')).toBe('deck_2:tone');
    expect(asDeckTagId('deck_2:drama')).toBe('deck_2:drama');
    expect(asSessionId('session_2')).toBe('session_2');
    expect(asSwipeEventId('event_2')).toBe('event_2');
    expect(asSnapshotId('snapshot_2')).toBe('snapshot_2');
  });
});
