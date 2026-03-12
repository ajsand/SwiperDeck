import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getDeckCardTagLinksByCardId,
  getDeckTagById,
  getDeckTagFacetsByDeckId,
  getDeckTagsByDeckId,
  replaceDeckCardTagLinks,
  upsertDeckTag,
  upsertDeckTagFacet,
} from '@/lib/db';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  type DeckCardTagLinkRow,
  type DeckTagFacetRow,
  type DeckTagRow,
} from '@/types/domain';

class FakeDeckTagDb {
  private facets = new Map<string, DeckTagFacetRow>();
  private tags = new Map<string, DeckTagRow>();
  private links = new Map<string, DeckCardTagLinkRow>();
  private cards = new Set(['movies_tv_001']);
  private decks = new Set(['deck_movies_tv']);

  private linkKey(cardId: string, tagId: string): string {
    return `${cardId}:${tagId}`;
  }

  async runAsync(
    source: string,
    ...params: unknown[]
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    if (/INSERT OR REPLACE INTO deck_tag_facets/i.test(source)) {
      const row: DeckTagFacetRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        key: String(params[2]),
        label: String(params[3]),
        description: String(params[4]),
        sort_order: Number(params[5]),
        created_at: Number(params[6]),
        updated_at: Number(params[7]),
      };

      if (!this.decks.has(row.deck_id)) {
        throw new Error('deck_id FK failed');
      }

      this.facets.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/INSERT OR REPLACE INTO deck_tag_taxonomy/i.test(source)) {
      const row: DeckTagRow = {
        id: String(params[0]),
        deck_id: String(params[1]),
        facet_id: String(params[2]),
        slug: String(params[3]),
        label: String(params[4]),
        description: String(params[5]),
        sort_order: Number(params[6]),
        created_at: Number(params[7]),
        updated_at: Number(params[8]),
      };

      if (!this.decks.has(row.deck_id) || !this.facets.has(row.facet_id)) {
        throw new Error('tag FK failed');
      }

      this.tags.set(row.id, row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (/DELETE FROM deck_card_tag_links/i.test(source)) {
      const cardId = String(params[0]);
      for (const [key, link] of this.links.entries()) {
        if (link.card_id === cardId) {
          this.links.delete(key);
        }
      }

      return { changes: 1, lastInsertRowId: 0 };
    }

    if (/INSERT INTO deck_card_tag_links/i.test(source)) {
      const row: DeckCardTagLinkRow = {
        card_id: String(params[0]),
        tag_id: String(params[1]),
        role: String(params[2]),
        created_at: Number(params[3]),
        updated_at: Number(params[4]),
      };

      if (!this.cards.has(row.card_id) || !this.tags.has(row.tag_id)) {
        throw new Error('link FK failed');
      }

      this.links.set(this.linkKey(row.card_id, row.tag_id), row);
      return { changes: 1, lastInsertRowId: 1 };
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }

  async getFirstAsync<T>(
    source: string,
    ...params: unknown[]
  ): Promise<T | null> {
    const rows = await this.getAllAsync<T>(source, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    const normalized = source.replace(/\s+/g, ' ').trim();

    if (/FROM deck_tag_facets WHERE deck_id/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.facets.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => left.sort_order - right.sort_order) as T[];
    }

    if (/FROM deck_tag_facets WHERE id/i.test(normalized)) {
      const row = this.facets.get(String(params[0]));
      return row ? ([row] as T[]) : [];
    }

    if (/FROM deck_tag_taxonomy WHERE id IN/i.test(normalized)) {
      const ids = params.map((value) => String(value));
      return ids.map((id) => this.tags.get(id)).filter(Boolean) as T[];
    }

    if (/FROM deck_tag_taxonomy WHERE id = \?/i.test(normalized)) {
      const row = this.tags.get(String(params[0]));
      return row ? ([row] as T[]) : [];
    }

    if (/FROM deck_tag_taxonomy WHERE deck_id = \?/i.test(normalized)) {
      const deckId = String(params[0]);
      return Array.from(this.tags.values())
        .filter((row) => row.deck_id === deckId)
        .sort((left, right) => left.sort_order - right.sort_order) as T[];
    }

    if (/FROM deck_card_tag_links WHERE card_id/i.test(normalized)) {
      const cardId = String(params[0]);
      return Array.from(this.links.values()).filter(
        (row) => row.card_id === cardId,
      ) as T[];
    }

    throw new Error(`Unsupported SQL: ${source}`);
  }
}

describe('deckTagRepository', () => {
  it('roundtrips facets and tags for a deck', async () => {
    const db = new FakeDeckTagDb() as unknown as SQLiteDatabase;
    const now = Date.now();

    await upsertDeckTagFacet(db, {
      id: asDeckTagFacetId('movies_tv:tone'),
      deckId: asDeckId('deck_movies_tv'),
      key: 'tone',
      label: 'Tone',
      description: 'Mood lane',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    await upsertDeckTag(db, {
      id: asDeckTagId('movies_tv:drama'),
      deckId: asDeckId('deck_movies_tv'),
      facetId: asDeckTagFacetId('movies_tv:tone'),
      slug: 'drama',
      label: 'Drama',
      description: 'Drama cards',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    expect(
      await getDeckTagFacetsByDeckId(db, asDeckId('deck_movies_tv')),
    ).toHaveLength(1);
    expect(
      await getDeckTagsByDeckId(db, asDeckId('deck_movies_tv')),
    ).toHaveLength(1);

    const tag = await getDeckTagById(db, asDeckTagId('movies_tv:drama'));
    expect(tag?.slug).toBe('drama');
  });

  it('replaces card tag links atomically for a card', async () => {
    const db = new FakeDeckTagDb() as unknown as SQLiteDatabase;
    const now = Date.now();

    await upsertDeckTagFacet(db, {
      id: asDeckTagFacetId('movies_tv:tone'),
      deckId: asDeckId('deck_movies_tv'),
      key: 'tone',
      label: 'Tone',
      description: 'Mood lane',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    await upsertDeckTag(db, {
      id: asDeckTagId('movies_tv:drama'),
      deckId: asDeckId('deck_movies_tv'),
      facetId: asDeckTagFacetId('movies_tv:tone'),
      slug: 'drama',
      label: 'Drama',
      description: 'Drama cards',
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    await upsertDeckTag(db, {
      id: asDeckTagId('movies_tv:classic'),
      deckId: asDeckId('deck_movies_tv'),
      facetId: asDeckTagFacetId('movies_tv:tone'),
      slug: 'classic',
      label: 'Classic',
      description: 'Classic cards',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    });

    await replaceDeckCardTagLinks(db, asDeckCardId('movies_tv_001'), [
      {
        cardId: asDeckCardId('movies_tv_001'),
        tagId: asDeckTagId('movies_tv:drama'),
        role: 'primary',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await replaceDeckCardTagLinks(db, asDeckCardId('movies_tv_001'), [
      {
        cardId: asDeckCardId('movies_tv_001'),
        tagId: asDeckTagId('movies_tv:classic'),
        role: 'primary',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const links = await getDeckCardTagLinksByCardId(
      db,
      asDeckCardId('movies_tv_001'),
    );
    expect(links).toHaveLength(1);
    expect(links[0].tagId).toBe(asDeckTagId('movies_tv:classic'));
  });

  it('fails when a link references a nonexistent tag', async () => {
    const db = new FakeDeckTagDb() as unknown as SQLiteDatabase;

    await expect(
      replaceDeckCardTagLinks(db, asDeckCardId('movies_tv_001'), [
        {
          cardId: asDeckCardId('movies_tv_001'),
          tagId: asDeckTagId('movies_tv:missing'),
          role: 'primary',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]),
    ).rejects.toThrow('FK');
  });
});
