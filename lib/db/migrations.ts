import type { SQLiteDatabase } from 'expo-sqlite';
import { ACTIONS } from '@/types/domain';

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
];

export const DATABASE_VERSION =
  migrations.length > 0 ? migrations[migrations.length - 1].version : 0;
