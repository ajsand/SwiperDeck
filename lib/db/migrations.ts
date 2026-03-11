import type { SQLiteDatabase } from 'expo-sqlite';
import { ACTIONS, CARD_KINDS } from '@/types/domain';

export type MigrationDb = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;

export interface Migration {
  version: number;
  name: string;
  up: (db: MigrationDb) => Promise<void>;
}

const ACTION_SQL_VALUES = ACTIONS.map((action) => `'${action}'`).join(',');
const CARD_KIND_SQL_VALUES = CARD_KINDS.map((kind) => `'${kind}'`).join(',');
const LEGACY_LOVE_ACTION = 'love';
const LEGACY_DEFERRED_ACTIONS = ['respect', 'curious'] as const;
const LEGACY_LOVE_SQL_VALUE = `'${LEGACY_LOVE_ACTION}'`;
const LEGACY_DEFERRED_ACTION_SQL_VALUES = LEGACY_DEFERRED_ACTIONS.map(
  (action) => `'${action}'`,
).join(', ');

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_init',
    up: async (db) => {
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS __healthcheck (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          last_checked_at INTEGER NOT NULL
        );

        INSERT OR IGNORE INTO __healthcheck (id, last_checked_at)
        VALUES (1, CAST(strftime('%s', 'now') AS INTEGER));
      `);
    },
  },
  {
    version: 2,
    name: '002_base_schema',
    up: async (db) => {
      await db.execAsync(`
        -- Catalog entities powering deck candidates and metadata display.
        CREATE TABLE IF NOT EXISTS catalog_entities (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          description_short TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          popularity REAL NOT NULL CHECK(popularity BETWEEN 0 AND 1),
          tile_key TEXT NOT NULL,
          image_url TEXT,
          updated_at INTEGER NOT NULL
        );

        -- Session envelope for one swipe run with active filters.
        CREATE TABLE IF NOT EXISTS swipe_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          filters_json TEXT NOT NULL,
          CHECK(ended_at IS NULL OR ended_at >= started_at)
        );

        -- Per-entity user feedback events used for ranking and history.
        CREATE TABLE IF NOT EXISTS swipe_events (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN (${ACTION_SQL_VALUES})),
          strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
          created_at INTEGER NOT NULL,
          FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
          -- Defer catalog-row deletion semantics; keep historical events by default.
          FOREIGN KEY (entity_id) REFERENCES catalog_entities(id) ON DELETE RESTRICT
        );

        -- Aggregated affinity materializations for fast profile rendering.
        CREATE TABLE IF NOT EXISTS taste_tag_scores (
          tag TEXT PRIMARY KEY NOT NULL,
          score REAL NOT NULL,
          pos REAL NOT NULL CHECK(pos >= 0),
          neg REAL NOT NULL CHECK(neg >= 0),
          last_updated INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS taste_type_scores (
          type TEXT PRIMARY KEY NOT NULL,
          score REAL NOT NULL,
          pos REAL NOT NULL CHECK(pos >= 0),
          neg REAL NOT NULL CHECK(neg >= 0),
          last_updated INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS entity_affinity (
          entity_id TEXT PRIMARY KEY NOT NULL,
          score REAL NOT NULL,
          pos REAL NOT NULL CHECK(pos >= 0),
          neg REAL NOT NULL CHECK(neg >= 0),
          last_updated INTEGER NOT NULL,
          -- Defer catalog-row deletion semantics; keep affinity rows consistent with history policy.
          FOREIGN KEY (entity_id) REFERENCES catalog_entities(id) ON DELETE RESTRICT
        );

        -- Time-based profile snapshots for over-time visualizations.
        CREATE TABLE IF NOT EXISTS profile_snapshots (
          id TEXT PRIMARY KEY NOT NULL,
          created_at INTEGER NOT NULL,
          top_tags_json TEXT NOT NULL,
          top_types_json TEXT NOT NULL,
          summary_json TEXT NOT NULL
        );

        -- Catalog lookup indexes.
        CREATE INDEX IF NOT EXISTS idx_catalog_entities_type
          ON catalog_entities(type);
        CREATE INDEX IF NOT EXISTS idx_catalog_entities_popularity
          ON catalog_entities(popularity DESC);
        CREATE INDEX IF NOT EXISTS idx_catalog_entities_title
          ON catalog_entities(title);

        -- Session/event retrieval indexes.
        CREATE INDEX IF NOT EXISTS idx_swipe_sessions_started_at
          ON swipe_sessions(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_created_at
          ON swipe_events(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_session_id
          ON swipe_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_entity_id
          ON swipe_events(entity_id);

        -- Score board indexes for ranking and profile panes.
        CREATE INDEX IF NOT EXISTS idx_taste_tag_scores_score
          ON taste_tag_scores(score DESC);
        CREATE INDEX IF NOT EXISTS idx_taste_tag_scores_last_updated
          ON taste_tag_scores(last_updated DESC);
        CREATE INDEX IF NOT EXISTS idx_taste_type_scores_score
          ON taste_type_scores(score DESC);
        CREATE INDEX IF NOT EXISTS idx_taste_type_scores_last_updated
          ON taste_type_scores(last_updated DESC);
        CREATE INDEX IF NOT EXISTS idx_entity_affinity_score
          ON entity_affinity(score DESC);
        CREATE INDEX IF NOT EXISTS idx_entity_affinity_last_updated
          ON entity_affinity(last_updated DESC);
        CREATE INDEX IF NOT EXISTS idx_profile_snapshots_created_at
          ON profile_snapshots(created_at DESC);
      `);
    },
  },
  {
    version: 3,
    name: '003_decks_and_deck_cards',
    up: async (db) => {
      await db.execAsync(`
        -- First-class decks for the DateDeck fork.
        CREATE TABLE IF NOT EXISTS decks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          tier TEXT NOT NULL DEFAULT 'tier_1',
          card_count INTEGER NOT NULL DEFAULT 0,
          compare_eligible INTEGER NOT NULL DEFAULT 1,
          showdown_eligible INTEGER NOT NULL DEFAULT 1,
          sensitivity TEXT NOT NULL DEFAULT 'standard',
          min_cards_for_profile INTEGER NOT NULL DEFAULT 15,
          min_cards_for_compare INTEGER NOT NULL DEFAULT 30,
          is_custom INTEGER NOT NULL DEFAULT 0,
          cover_tile_key TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        -- Cards scoped to a single deck, preserving stable ordering and metadata.
        CREATE TABLE IF NOT EXISTS deck_cards (
          id TEXT PRIMARY KEY NOT NULL,
          deck_id TEXT NOT NULL,
          kind TEXT NOT NULL DEFAULT 'entity' CHECK(kind IN (${CARD_KIND_SQL_VALUES})),
          title TEXT NOT NULL,
          subtitle TEXT NOT NULL DEFAULT '',
          description_short TEXT NOT NULL DEFAULT '',
          tags_json TEXT NOT NULL DEFAULT '[]',
          popularity REAL NOT NULL DEFAULT 0.5 CHECK(popularity BETWEEN 0 AND 1),
          tile_key TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_decks_category
          ON decks(category);
        CREATE INDEX IF NOT EXISTS idx_decks_tier
          ON decks(tier);
        CREATE INDEX IF NOT EXISTS idx_decks_is_custom
          ON decks(is_custom);

        CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id
          ON deck_cards(deck_id);
        CREATE INDEX IF NOT EXISTS idx_deck_cards_kind
          ON deck_cards(kind);
        CREATE INDEX IF NOT EXISTS idx_deck_cards_popularity
          ON deck_cards(popularity DESC);
        CREATE INDEX IF NOT EXISTS idx_deck_cards_sort_order
          ON deck_cards(deck_id, sort_order);
      `);
    },
  },
  {
    version: 4,
    name: '004_standardize_action_model',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE swipe_events_new (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN (${ACTION_SQL_VALUES})),
          strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
          created_at INTEGER NOT NULL,
          FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (entity_id) REFERENCES catalog_entities(id) ON DELETE RESTRICT
        );

        INSERT INTO swipe_events_new (id, session_id, entity_id, action, strength, created_at)
        SELECT id, session_id, entity_id,
          CASE
            WHEN action = ${LEGACY_LOVE_SQL_VALUE} THEN 'strong_yes'
            WHEN action IN (${LEGACY_DEFERRED_ACTION_SQL_VALUES}) THEN 'skip'
            ELSE action
          END,
          CASE
            WHEN action IN (${LEGACY_DEFERRED_ACTION_SQL_VALUES}) THEN 0
            ELSE strength
          END,
          created_at
        FROM swipe_events;

        DROP TABLE swipe_events;

        ALTER TABLE swipe_events_new RENAME TO swipe_events;

        CREATE INDEX idx_swipe_events_created_at
          ON swipe_events(created_at DESC);
        CREATE INDEX idx_swipe_events_session_id
          ON swipe_events(session_id);
        CREATE INDEX idx_swipe_events_entity_id
          ON swipe_events(entity_id);
      `);
    },
  },
  {
    version: 5,
    name: '005_deck_content_meta',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS __deck_content_meta (
          id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
          version INTEGER NOT NULL,
          imported_at INTEGER NOT NULL,
          deck_count INTEGER NOT NULL,
          card_count INTEGER NOT NULL
        );
      `);
    },
  },
  {
    version: 6,
    name: '006_deck_scoped_sessions',
    up: async (db) => {
      await db.execAsync(`
        DROP TABLE IF EXISTS swipe_events;
        DROP TABLE IF EXISTS swipe_sessions;

        CREATE TABLE IF NOT EXISTS swipe_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          deck_id TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          ended_at INTEGER,
          filters_json TEXT NOT NULL DEFAULT '{}',
          CHECK(ended_at IS NULL OR ended_at >= started_at),
          FOREIGN KEY (deck_id) REFERENCES decks(id)
        );

        CREATE TABLE IF NOT EXISTS swipe_events (
          id TEXT PRIMARY KEY NOT NULL,
          session_id TEXT NOT NULL,
          deck_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN (${ACTION_SQL_VALUES})),
          strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
          created_at INTEGER NOT NULL,
          FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY (deck_id) REFERENCES decks(id),
          FOREIGN KEY (card_id) REFERENCES deck_cards(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_swipe_sessions_deck_id
          ON swipe_sessions(deck_id);
        CREATE INDEX IF NOT EXISTS idx_swipe_sessions_started_at
          ON swipe_sessions(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_created_at
          ON swipe_events(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_session_id
          ON swipe_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_deck_id
          ON swipe_events(deck_id);
        CREATE INDEX IF NOT EXISTS idx_swipe_events_card_id
          ON swipe_events(card_id);
      `);
    },
  },
  {
    version: 7,
    name: '007_deck_profile_tables',
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS deck_tag_scores (
          deck_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          score REAL NOT NULL,
          pos REAL NOT NULL CHECK(pos >= 0),
          neg REAL NOT NULL CHECK(neg >= 0),
          last_updated INTEGER NOT NULL,
          PRIMARY KEY (deck_id, tag),
          FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS deck_card_affinity (
          deck_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          score REAL NOT NULL,
          pos REAL NOT NULL CHECK(pos >= 0),
          neg REAL NOT NULL CHECK(neg >= 0),
          last_updated INTEGER NOT NULL,
          PRIMARY KEY (deck_id, card_id),
          FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE,
          FOREIGN KEY (card_id) REFERENCES deck_cards(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS deck_profile_snapshots (
          id TEXT PRIMARY KEY NOT NULL,
          deck_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          top_tags_json TEXT NOT NULL,
          top_aversions_json TEXT NOT NULL,
          summary_json TEXT NOT NULL,
          FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_deck_tag_scores_deck_id
          ON deck_tag_scores(deck_id);
        CREATE INDEX IF NOT EXISTS idx_deck_tag_scores_score
          ON deck_tag_scores(deck_id, score DESC);
        CREATE INDEX IF NOT EXISTS idx_deck_card_affinity_deck_id
          ON deck_card_affinity(deck_id);
        CREATE INDEX IF NOT EXISTS idx_deck_card_affinity_score
          ON deck_card_affinity(deck_id, score DESC);
        CREATE INDEX IF NOT EXISTS idx_deck_profile_snapshots_deck_id
          ON deck_profile_snapshots(deck_id);
        CREATE INDEX IF NOT EXISTS idx_deck_profile_snapshots_created_at
          ON deck_profile_snapshots(deck_id, created_at DESC);
      `);
    },
  },
];

export const DATABASE_VERSION =
  migrations.length > 0 ? migrations[migrations.length - 1].version : 0;
