# Iteration 10: Introduce first-class decks and deck_cards

## 1. Objective

Add `decks` and `deck_cards` as first-class entities in the SQLite schema, TypeScript domain model, and repository layer. This establishes the data foundation the entire fork depends on: every downstream iteration (deck profiles, compare flows, deck browser, prebuilt content) requires deck-scoped tables and types to exist.

No UI changes. No modifications to existing tables. No action model changes.

## 2. Why this matters

The fork's core architectural shift (CLAUDE.md Section 13.3) is from "broad catalog and broad profile modeling" to "deck-first content, deck-scoped profile computation, deck-scoped compare/report payloads." Without first-class `decks` and `deck_cards` tables and domain types, nothing downstream can be built:

- Iteration 11 (action standardization) needs a stable deck model to validate semantics against
- Iteration 12 (deck selection UI) needs typed `Deck` objects to render deck browser cards
- Iteration 13 (prebuilt deck content) needs `deck_cards` to load cards into
- Iteration 14 (deck-scoped sessions) needs `deck_id` foreign keys to reference
- Iterations 15–18 (profiles, compare, reports) all operate on deck-scoped data

This iteration creates the schema and types. It does not populate content or wire UI.

## 3. Scope

### In scope

- **SQLite migration 003**: create `decks` and `deck_cards` tables with columns, constraints, indexes, and foreign keys
- **Branded IDs**: add `DeckId` and `DeckCardId` to `types/domain/ids.ts`
- **Domain types**: new `types/domain/decks.ts` with `Deck`, `DeckRow`, `DeckCard` (domain type), `DeckCardRow`, constants (`DECK_CATEGORIES`, `DECK_TIERS`, `DECK_SENSITIVITIES`, `CARD_KINDS`), type guards, and row↔domain mappers
- **Repository layer**: new `lib/db/deckRepository.ts` and `lib/db/deckCardRepository.ts` with basic CRUD functions
- **Barrel exports**: update `types/domain/index.ts` and `lib/db/index.ts`
- **Tests**: new domain model tests, updated schema introspection test, updated migration version assertions
- **Docs**: update `docs/db/SCHEMA.md` and `docs/domain/DOMAIN_TYPES.md`

### Out of scope

- **Modifying existing tables** (`catalog_entities`, `swipe_sessions`, `swipe_events`, `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, `profile_snapshots`) — these are preserved as-is
- **Modifying `CatalogEntity` type or `catalogRepository.ts`** — preserved for backward compatibility
- **Action model changes** (`love` → `strong_yes`) — deferred to Iteration 11
- **UI changes** — no screen, component, or navigation modifications
- **Deck content** — no actual cards or decks loaded; that is Iteration 13
- **Deck-scoped sessions or scoring** — deferred to Iterations 14–15
- **Custom deck creation flow** — deferred to Iteration 21

### Relationship to old TasteDeck code

| Category | What happens |
|----------|--------------|
| **Reused as-is** | Migration framework (`runMigrations.ts`), DB client (`client.ts`), DB init (`index.ts`), health check, logger, branded ID pattern, Row/Domain mapper pattern, repository pattern, parser utilities, test infrastructure (`FakeSchemaSQLiteDatabase`), tile system, all UI components |
| **Extended (additive only)** | `lib/db/migrations.ts` (add migration 003), `types/domain/ids.ts` (add DeckId, DeckCardId), `types/domain/index.ts` (add exports), `lib/db/index.ts` (add exports) |
| **Not modified, not deleted** | `catalog_entities` table and `CatalogEntity` type — the old broad catalog remains intact. It is no longer the primary card store for the fork, but it is not removed. Later iterations may formalize its deprecation. |
| **New** | `types/domain/decks.ts`, `lib/db/deckRepository.ts`, `lib/db/deckCardRepository.ts`, new test file(s) |

## 4. Multi-model execution strategy

| Step | Model | Task |
|------|-------|------|
| 1 | Claude Opus 4.6 | Write this iteration file with full schema design, type specifications, and file map (done) |
| 2 | GPT-5.4 | Implement migration 003, domain types, repositories, barrel exports |
| 3 | GPT-5.4 | Write new tests, update existing schema/migration tests |
| 4 | GPT-5.4 | Update documentation (SCHEMA.md, DOMAIN_TYPES.md) |
| 5 | GPT-5.4 | Run full validation suite |
| 6 | Claude Opus 4.6 | Review schema design for forward compatibility and spec alignment |

This is a data-layer iteration. All implementation is GPT-5.4. Claude reviews the final schema and types for alignment with CLAUDE.md Sections 5, 6, 8, 13, and 14.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document | Relevant sections |
|----------|-------------------|
| `/CLAUDE.md` Section 5 | Deck system design: core model, categories, tiers, prebuilt vs custom, card composition, authoring guidance |
| `/CLAUDE.md` Section 6 | Card model: kinds (entity/statement), fields, description guidance |
| `/CLAUDE.md` Section 8 | Deck profile model: profile scope, stages, confidence rules (informs threshold columns) |
| `/CLAUDE.md` Section 13 | Architecture direction: new conceptual entities list, schema philosophy |
| `/CLAUDE.md` Section 14 | Algorithm requirements: compare eligibility threshold (informs min_cards columns) |
| `/iterations/09-...md` Section 12 | Handoff notes: DB filename, action model state, migration versioning |

### Current repo implementation anchors

**Files to EXTEND (add to, not replace):**

| File | What to add |
|------|-------------|
| `lib/db/migrations.ts` | Migration version 3 (`003_decks_and_deck_cards`) |
| `types/domain/ids.ts` | `DeckId`, `DeckCardId`, `asDeckId()`, `asDeckCardId()` |
| `types/domain/index.ts` | Barrel export for new `decks.ts` module |
| `lib/db/index.ts` | Barrel exports for new repository modules |

**New files to CREATE:**

| File | Contents |
|------|----------|
| `types/domain/decks.ts` | Deck/DeckCard domain types, row types, constants, mappers |
| `lib/db/deckRepository.ts` | Deck table CRUD |
| `lib/db/deckCardRepository.ts` | DeckCard table CRUD |
| `__tests__/deck-domain-models.test.ts` | Deck and DeckCard mapper tests, type guard tests, branded ID tests |

**Files to UPDATE (test assertions, docs):**

| File | What changes |
|------|--------------|
| `__tests__/schema-check.test.ts` | Add `decks` and `deck_cards` to `REQUIRED_TABLES`, `REQUIRED_COLUMNS`, `REQUIRED_INDEXES`; add FK assertions; add smoke CRUD |
| `__tests__/db-migrations.test.ts` | Update expected version from 2 → 3; update `appliedMigrations` count from 2 → 3 |
| `docs/db/SCHEMA.md` | Add `decks` and `deck_cards` table docs, new indexes, new FK |
| `docs/domain/DOMAIN_TYPES.md` | Add Deck and DeckCard type docs, new file in map |

**Files to PRESERVE (do not modify):**

| File | Why |
|------|-----|
| `types/domain/actions.ts` | Action values unchanged until Iteration 11 |
| `types/domain/catalog.ts` | CatalogEntity preserved for backward compatibility |
| `types/domain/scores.ts` | Scoring types preserved; deck-scoped scoring is Iteration 15 |
| `types/domain/snapshots.ts` | Snapshot types preserved; deck-scoped snapshots are Iteration 15 |
| `types/domain/swipes.ts` | Swipe types preserved; deck-scoped sessions are Iteration 14 |
| `lib/db/catalogRepository.ts` | Old catalog repo preserved |
| All `components/*` files | No UI changes |
| All `hooks/*` files | No gesture/hook changes |
| All `app/*` screen files | No screen changes |

### Suggested file organization

```
types/domain/
  ids.ts           ← EXTEND (add DeckId, DeckCardId)
  decks.ts         ← NEW (Deck, DeckCard types, constants, mappers)
  index.ts         ← EXTEND (add 'decks' export)

lib/db/
  migrations.ts    ← EXTEND (add migration 003)
  deckRepository.ts     ← NEW
  deckCardRepository.ts ← NEW
  index.ts         ← EXTEND (add repository exports)

__tests__/
  deck-domain-models.test.ts ← NEW
  schema-check.test.ts       ← UPDATE
  db-migrations.test.ts      ← UPDATE
```

### External troubleshooting and learning resources

#### Official docs
- [Expo SQLite API](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite CREATE TABLE](https://www.sqlite.org/lang_createtable.html) — column constraints, CHECK, FOREIGN KEY, DEFAULT
- [SQLite CREATE INDEX](https://www.sqlite.org/lang_createindex.html)
- [SQLite ALTER TABLE](https://www.sqlite.org/lang_altertable.html) — relevant for future column additions
- [TypeScript branded types](https://www.typescriptlang.org/play#example/nominal-typing) — pattern used for IDs

#### Step-by-step guides
- [SQLite foreign key support](https://www.sqlite.org/foreignkeys.html) — explains `PRAGMA foreign_keys`, ON DELETE CASCADE/RESTRICT behavior
- [Expo SQLite migration patterns](https://docs.expo.dev/versions/latest/sdk/sqlite/#execute-queries) — exec, run, and transaction APIs

#### YouTube
- Search "SQLite foreign keys explained" for visual FK constraint walkthroughs
- Search "TypeScript branded types pattern" for branded ID implementation tutorials

#### GitHub repos
- [expo/expo SQLite source](https://github.com/expo/expo/tree/main/packages/expo-sqlite) — reference implementation
- This repo's own `lib/db/migrations.ts` and `lib/db/catalogRepository.ts` — the canonical patterns to follow

#### Stack Overflow / discussion boards
- [expo-sqlite tag on Stack Overflow](https://stackoverflow.com/questions/tagged/expo-sqlite)
- [SQLite CHECK constraint behavior](https://stackoverflow.com/questions/tagged/sqlite+check-constraints)

#### Books / long-form references
- _Using SQLite_ (O'Reilly) — schema design, constraints, and migration patterns
- _Effective TypeScript_ (O'Reilly) — Item 37 on branded types

## 6. When stuck

| Problem | Resolution |
|---------|------------|
| Migration fails with "table already exists" | Migrations use `CREATE TABLE IF NOT EXISTS`. If you're getting errors, check that the migration version number is 3 (not 2, which would collide with existing). Verify `assertValidMigrationRegistry()` passes — versions must be contiguous starting at 1. |
| Migration framework doesn't pick up version 3 | The migration must be appended to the `migrations` array in `lib/db/migrations.ts` with `version: 3`. The `DATABASE_VERSION` constant auto-computes from the array length. |
| FK constraint error on deck_cards insert | You must insert the parent `decks` row before inserting `deck_cards` rows that reference it. FK enforcement is ON by default via `PRAGMA foreign_keys = ON` in `client.ts`. |
| `DeckCard` type name collides with UI component | The domain type `DeckCard` in `types/domain/decks.ts` shares a name with the UI component `DeckCard` in `components/deck/DeckCard.tsx`. They live in different modules and won't collide unless both are imported in the same file. If both are needed, alias one: `import type { DeckCard as DeckCardData } from '@/types/domain'`. This collision will be resolved in Iteration 12 when the UI component is adapted. |
| Existing tests break after adding migration 003 | The `db-migrations.test.ts` expects specific version numbers. Update `toVersion` from 2 → 3 and `appliedMigrations` from 2 → 3. The `schema-check.test.ts` has `REQUIRED_TABLES`, `REQUIRED_COLUMNS`, and `REQUIRED_INDEXES` arrays — add the new tables. |
| Unsure how to structure Row vs Domain types | Follow the exact pattern in `types/domain/catalog.ts`: Row types use `snake_case` field names matching SQL columns, Domain types use `camelCase`. Provide `rowToX()` and `xToRow()` mapper functions. |
| Unsure how to structure repository functions | Follow the exact pattern in `lib/db/catalogRepository.ts`: define a narrow DB boundary type (`Pick<SQLiteDatabase, ...>`), accept domain types, convert to row via mapper, execute SQL. |
| CHECK constraint fails on insert | Verify the values match exactly. For `kind`, valid values are `'entity'` and `'statement'`. For `popularity`, range is 0.0–1.0. Boolean columns (`compare_eligible`, `showdown_eligible`, `is_custom`) use INTEGER 0/1 in SQLite. |
| `tags_json` parsing | Use the existing `parseStringArrayJson` from `types/domain/parsers.ts`. This is the same utility `catalog.ts` uses. Do not create a new parser. |

## 7. Implementation checklist

### 7.1 Add branded IDs for Deck and DeckCard

**File:** `types/domain/ids.ts`

Add these types and helpers alongside the existing ones:

```typescript
export type DeckId = Brand<string, 'DeckId'>;
export type DeckCardId = Brand<string, 'DeckCardId'>;

export function asDeckId(value: string): DeckId {
  return value as DeckId;
}

export function asDeckCardId(value: string): DeckCardId {
  return value as DeckCardId;
}
```

The `Brand` utility type is already defined at the top of `ids.ts`. No new imports needed.

### 7.2 Create deck domain types

**New file:** `types/domain/decks.ts`

This file contains all types, constants, guards, and mappers for both decks and deck cards. Follow the patterns established in `catalog.ts` and `swipes.ts`.

#### Constants

Define these constant arrays with `as const` and derive union types:

**Deck categories** (from CLAUDE.md Section 5.2):

```typescript
export const DECK_CATEGORIES = [
  'movies_tv',
  'music',
  'food_drinks',
  'travel',
  'lifestyle',
  'social_habits',
  'humor',
  'relationship_preferences',
  'values',
  'communication_style',
] as const;

export type DeckCategory = (typeof DECK_CATEGORIES)[number] | (string & {});
```

Use `| (string & {})` to allow custom category strings while keeping autocomplete for known categories. This matches the `CatalogEntityType` pattern in `catalog.ts`.

**Deck tiers:**

```typescript
export const DECK_TIERS = ['tier_1', 'tier_2', 'tier_3'] as const;
export type DeckTier = (typeof DECK_TIERS)[number];
```

**Deck sensitivity levels:**

```typescript
export const DECK_SENSITIVITIES = ['standard', 'sensitive', 'gated'] as const;
export type DeckSensitivity = (typeof DECK_SENSITIVITIES)[number];
```

**Card kinds** (from CLAUDE.md Section 6.1):

```typescript
export const CARD_KINDS = ['entity', 'statement'] as const;
export type CardKind = (typeof CARD_KINDS)[number];
```

Add type guard functions: `isDeckTier()`, `isDeckSensitivity()`, `isCardKind()` following the `isSwipeAction()` pattern.

#### Deck Row and Domain types

**DeckRow** (matches SQL column names exactly):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | PK |
| `title` | `string` | |
| `description` | `string` | |
| `category` | `string` | |
| `tier` | `string` | |
| `card_count` | `number` | Denormalized count, updated when cards change |
| `compare_eligible` | `number` | SQLite boolean (0/1) |
| `showdown_eligible` | `number` | SQLite boolean (0/1) |
| `sensitivity` | `string` | |
| `min_cards_for_profile` | `number` | |
| `min_cards_for_compare` | `number` | |
| `is_custom` | `number` | SQLite boolean (0/1) |
| `cover_tile_key` | `string \| null` | |
| `created_at` | `number` | |
| `updated_at` | `number` | |

**Deck** (domain type, camelCase):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `DeckId` | |
| `title` | `string` | |
| `description` | `string` | |
| `category` | `DeckCategory` | |
| `tier` | `DeckTier` | |
| `cardCount` | `number` | |
| `compareEligible` | `boolean` | Mapped from 0/1 |
| `showdownEligible` | `boolean` | Mapped from 0/1 |
| `sensitivity` | `DeckSensitivity` | |
| `minCardsForProfile` | `number` | |
| `minCardsForCompare` | `number` | |
| `isCustom` | `boolean` | Mapped from 0/1 |
| `coverTileKey` | `string \| null` | |
| `createdAt` | `number` | |
| `updatedAt` | `number` | |

Provide `rowToDeck(row: DeckRow): Deck` and `deckToRow(deck: Deck): DeckRow` mappers. The boolean↔integer mapping follows: `Boolean(row.compare_eligible)` for row→domain, `deck.compareEligible ? 1 : 0` for domain→row.

#### DeckCard Row and Domain types

**DeckCardRow** (matches SQL column names):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | PK |
| `deck_id` | `string` | FK |
| `kind` | `string` | |
| `title` | `string` | |
| `subtitle` | `string` | May be empty string |
| `description_short` | `string` | May be empty string |
| `tags_json` | `string` | JSON array |
| `popularity` | `number` | 0.0–1.0 |
| `tile_key` | `string` | |
| `sort_order` | `number` | |
| `created_at` | `number` | |
| `updated_at` | `number` | |

**DeckCard** (domain type):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `DeckCardId` | |
| `deckId` | `DeckId` | |
| `kind` | `CardKind` | |
| `title` | `string` | |
| `subtitle` | `string` | |
| `descriptionShort` | `string` | |
| `tags` | `string[]` | Parsed from JSON |
| `popularity` | `number` | |
| `tileKey` | `string` | |
| `sortOrder` | `number` | |
| `createdAt` | `number` | |
| `updatedAt` | `number` | |

Provide `rowToDeckCard(row: DeckCardRow): DeckCard` and `deckCardToRow(card: DeckCard): DeckCardRow` mappers. Use `parseStringArrayJson` from `parsers.ts` for `tags_json` — same utility `catalog.ts` uses.

**Important naming note:** The domain type `DeckCard` shares a name with the UI component `DeckCard` in `components/deck/DeckCard.tsx`. These are different concepts in different modules. If both are imported in the same file (unlikely until Iteration 12), alias one. This will be resolved when the UI component is adapted to accept the new domain type.

### 7.3 Update barrel exports

**File:** `types/domain/index.ts`

Add:
```typescript
export * from './decks';
```

**File:** `lib/db/index.ts`

Add:
```typescript
export * from './deckRepository';
export * from './deckCardRepository';
```

### 7.4 Create migration 003

**File:** `lib/db/migrations.ts`

Append a new migration object to the `migrations` array with `version: 3` and `name: '003_decks_and_deck_cards'`.

Import `CARD_KINDS` from `@/types/domain` (alongside the existing `ACTIONS` import) to generate the CHECK constraint for `kind` dynamically, matching the established pattern for action values.

#### SQL for the `decks` table

```sql
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
```

#### SQL for the `deck_cards` table

```sql
CREATE TABLE IF NOT EXISTS deck_cards (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'entity' CHECK(kind IN (<dynamic from CARD_KINDS>)),
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
```

Generate the `kind` CHECK constraint dynamically:

```typescript
const CARD_KIND_SQL_VALUES = CARD_KINDS.map((k) => `'${k}'`).join(',');
// Then in SQL template: CHECK(kind IN (${CARD_KIND_SQL_VALUES}))
```

#### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_decks_category ON decks(category);
CREATE INDEX IF NOT EXISTS idx_decks_tier ON decks(tier);
CREATE INDEX IF NOT EXISTS idx_decks_is_custom ON decks(is_custom);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_kind ON deck_cards(kind);
CREATE INDEX IF NOT EXISTS idx_deck_cards_popularity ON deck_cards(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_deck_cards_sort_order ON deck_cards(deck_id, sort_order);
```

#### Design rationale

| Column/Constraint | Why |
|-------------------|-----|
| `deck_cards.deck_id` FK ON DELETE CASCADE | Deleting a deck removes all its cards. Correct for both prebuilt deck updates and custom deck deletion. |
| `deck_cards.kind` CHECK from CARD_KINDS | Compile-time safety: adding a new card kind forces updating the constant array, which auto-updates the CHECK constraint on fresh DBs (existing DBs need a migration). |
| `decks.card_count` denormalized | Avoids a COUNT query every time the deck browser needs to display card counts. Must be maintained when cards are added/removed. |
| `decks.compare_eligible` / `showdown_eligible` as INTEGER | SQLite has no native boolean. 0/1 convention matches the domain mapper approach. |
| `deck_cards.sort_order` | Default card ordering within a deck. The ranking algorithm (Iteration 14) may override this, but sort_order provides a stable fallback for initial deck loading. |
| `deck_cards.subtitle` | Optional subtitle for entity cards (e.g., "by [creator], [year]"). Empty string for statement cards. Needed for tile rendering compatibility with `DeterministicTile`. |

### 7.5 Create deck repository

**New file:** `lib/db/deckRepository.ts`

Follow the `catalogRepository.ts` pattern exactly. Define a narrow boundary type:

```typescript
type DeckBoundaryDb = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;
```

Implement these functions:

| Function | Signature | SQL |
|----------|-----------|-----|
| `upsertDeck` | `(db, deck: Deck) => Promise<void>` | INSERT OR REPLACE INTO decks |
| `getDeckById` | `(db, deckId: DeckId) => Promise<Deck \| null>` | SELECT ... WHERE id = ? |
| `getAllDecks` | `(db) => Promise<Deck[]>` | SELECT ... ORDER BY title |
| `getDecksByCategory` | `(db, category: DeckCategory) => Promise<Deck[]>` | SELECT ... WHERE category = ? ORDER BY title |

Each function:
- Accepts domain types as input
- Converts to row via `deckToRow` before writing
- Converts from row via `rowToDeck` after reading
- Row types never leak past the repository boundary

### 7.6 Create deck card repository

**New file:** `lib/db/deckCardRepository.ts`

```typescript
type DeckCardBoundaryDb = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync'>;
```

Implement these functions:

| Function | Signature | SQL |
|----------|-----------|-----|
| `upsertDeckCard` | `(db, card: DeckCard) => Promise<void>` | INSERT OR REPLACE INTO deck_cards |
| `getDeckCardById` | `(db, cardId: DeckCardId) => Promise<DeckCard \| null>` | SELECT ... WHERE id = ? |
| `getDeckCardsByDeckId` | `(db, deckId: DeckId) => Promise<DeckCard[]>` | SELECT ... WHERE deck_id = ? ORDER BY sort_order, title |
| `countDeckCardsByDeckId` | `(db, deckId: DeckId) => Promise<number>` | SELECT COUNT(*) FROM deck_cards WHERE deck_id = ? |

### 7.7 Write new domain model tests

**New file:** `__tests__/deck-domain-models.test.ts`

Follow the patterns in `domain-models.test.ts`. Create a `FakeDeckBoundaryDb` (or extend the existing fake) that handles INSERT OR REPLACE and SELECT for both `decks` and `deck_cards`.

Test cases to include:

| Test | What it verifies |
|------|-----------------|
| Deck row→domain roundtrip | All fields map correctly, booleans convert from 0/1, category and tier parse |
| Deck domain→row roundtrip | Booleans convert to 0/1, all fields serialize correctly |
| DeckCard row→domain roundtrip | All fields map, `tags_json` parses via `parseStringArrayJson`, kind maps |
| DeckCard tags_json safety | Malformed JSON falls back to empty array (same as CatalogEntity behavior) |
| CardKind type guard | `isCardKind('entity')` → true, `isCardKind('statement')` → true, `isCardKind('unknown')` → false |
| DeckTier type guard | Valid/invalid values |
| DeckSensitivity type guard | Valid/invalid values |
| DeckId and DeckCardId branded helpers | `asDeckId('deck_1')` === `'deck_1'`, `asDeckCardId('card_1')` === `'card_1'` |
| Deck repository write/read via fake DB | `upsertDeck` + `getDeckById` roundtrip |
| DeckCard repository write/read via fake DB | `upsertDeckCard` + `getDeckCardById` roundtrip |

### 7.8 Update schema introspection test

**File:** `__tests__/schema-check.test.ts`

Add to `REQUIRED_TABLES`:

```typescript
const REQUIRED_TABLES = [
  // ...existing entries...
  'decks',
  'deck_cards',
];
```

Add to `REQUIRED_COLUMNS`:

```typescript
decks: [
  'id', 'title', 'description', 'category', 'tier',
  'card_count', 'compare_eligible', 'showdown_eligible', 'sensitivity',
  'min_cards_for_profile', 'min_cards_for_compare', 'is_custom',
  'cover_tile_key', 'created_at', 'updated_at',
],
deck_cards: [
  'id', 'deck_id', 'kind', 'title', 'subtitle', 'description_short',
  'tags_json', 'popularity', 'tile_key', 'sort_order',
  'created_at', 'updated_at',
],
```

Add to `REQUIRED_INDEXES`:

```typescript
decks: [
  'idx_decks_category',
  'idx_decks_tier',
  'idx_decks_is_custom',
],
deck_cards: [
  'idx_deck_cards_deck_id',
  'idx_deck_cards_kind',
  'idx_deck_cards_popularity',
  'idx_deck_cards_sort_order',
],
```

Add FK assertion for `deck_cards`:

```typescript
const deckCardForeignKeys = await db.getAllAsync<ForeignKeyRow>(
  "PRAGMA foreign_key_list('deck_cards')",
);
expect(deckCardForeignKeys).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      table: 'decks',
      from: 'deck_id',
      to: 'id',
    }),
  ]),
);
```

Add smoke CRUD rows for `decks` and `deck_cards` to the CRUD test. Insert a deck first (parent), then a deck_card (child referencing it).

### 7.9 Update migration version test

**File:** `__tests__/db-migrations.test.ts`

Update these assertions:

| Assertion | Old value | New value |
|-----------|-----------|-----------|
| `firstStartup.userVersion` | `2` | `3` |
| `firstStartup.targetVersion` | `2` | `3` |
| `secondStartup.userVersion` | `2` | `3` |
| `secondStartup.targetVersion` | `2` | `3` |
| `firstRun.toVersion` | `2` | `3` |
| `firstRun.appliedMigrations` | `2` | `3` |
| `secondRun.fromVersion` | `2` | `3` |
| `secondRun.toVersion` | `2` | `3` |
| `db.userVersion` (final) | `2` | `3` |
| `status.userVersion` | `2` | `3` |
| `status.targetVersion` | `2` | `3` |

### 7.10 Update docs

**File:** `docs/db/SCHEMA.md`

- Update header: version 2 → 3, add migration `003_decks_and_deck_cards`
- Add `decks` table documentation (column table matching format of existing tables)
- Add `deck_cards` table documentation
- Add new indexes to the index table (7 new indexes)
- Add new FK to the FK table: `deck_cards.deck_id → decks(id) ON DELETE CASCADE`
- Update total counts: tables, indexes, FKs

**File:** `docs/domain/DOMAIN_TYPES.md`

- Add `decks.ts` to the "Where Types Live" section
- Add Deck and DeckCard domain type documentation
- Add DeckRow and DeckCardRow documentation
- Add new constants (DECK_CATEGORIES, DECK_TIERS, DECK_SENSITIVITIES, CARD_KINDS)
- Add new branded IDs (DeckId, DeckCardId) to the branded IDs section
- Add column→property mapping for new tables

### 7.11 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

All four must exit 0.

## 8. Deliverables

1. Migration 003 creates `decks` and `deck_cards` tables with all columns, constraints, indexes, and FK
2. `DeckId` and `DeckCardId` branded types added to `types/domain/ids.ts`
3. `types/domain/decks.ts` contains all constants, row types, domain types, guards, and mappers
4. `lib/db/deckRepository.ts` provides deck CRUD against SQLite
5. `lib/db/deckCardRepository.ts` provides deck card CRUD against SQLite
6. Barrel exports updated in `types/domain/index.ts` and `lib/db/index.ts`
7. `__tests__/deck-domain-models.test.ts` covers all new types and mappers
8. `__tests__/schema-check.test.ts` validates new tables, columns, indexes, and FKs
9. `__tests__/db-migrations.test.ts` expects schema version 3
10. `docs/db/SCHEMA.md` documents new tables
11. `docs/domain/DOMAIN_TYPES.md` documents new types
12. All existing tables and types are unmodified
13. All validation commands pass

## 9. Acceptance criteria

1. **Migration succeeds**: `initializeDatabase()` completes without error and reports `userVersion: 3`.
2. **Tables exist**: `decks` and `deck_cards` tables are created with all specified columns.
3. **Constraints enforced**: `deck_cards.kind` CHECK rejects values outside `CARD_KINDS`. `deck_cards.popularity` CHECK rejects values outside 0–1. FK `deck_cards.deck_id` prevents inserting a card with a nonexistent deck_id.
4. **Indexes present**: All 7 new indexes exist (`idx_decks_category`, `idx_decks_tier`, `idx_decks_is_custom`, `idx_deck_cards_deck_id`, `idx_deck_cards_kind`, `idx_deck_cards_popularity`, `idx_deck_cards_sort_order`).
5. **Cascade works**: Deleting a `decks` row cascades to remove its `deck_cards` rows.
6. **Domain types compile**: `Deck`, `DeckCard`, `DeckRow`, `DeckCardRow`, all constants, and all branded IDs pass typecheck.
7. **Mappers roundtrip**: `rowToDeck(deckToRow(deck))` produces the original domain object. Same for DeckCard.
8. **Repositories work**: `upsertDeck` + `getDeckById` roundtrips correctly. Same for DeckCard.
9. **Existing tables untouched**: `catalog_entities`, `swipe_sessions`, `swipe_events`, `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, `profile_snapshots` have zero schema changes.
10. **Existing types untouched**: `git diff types/domain/actions.ts types/domain/catalog.ts types/domain/scores.ts types/domain/snapshots.ts types/domain/swipes.ts types/domain/parsers.ts` is empty.
11. **All tests pass**: `npm test` exits 0.
12. **Typecheck passes**: `npm run typecheck` exits 0.
13. **Lint passes**: `npm run lint` exits 0.
14. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence | Verification command |
|----------|---------------------|
| Schema version is 3 | `npm test -- db-migrations` — asserts userVersion 3 |
| `decks` table exists with all columns | `npm test -- schema-check` — REQUIRED_TABLES and REQUIRED_COLUMNS include `decks` |
| `deck_cards` table exists with all columns | `npm test -- schema-check` — REQUIRED_TABLES and REQUIRED_COLUMNS include `deck_cards` |
| New indexes exist | `npm test -- schema-check` — REQUIRED_INDEXES includes all 7 new indexes |
| deck_cards FK to decks | `npm test -- schema-check` — FK assertion for deck_cards.deck_id |
| Domain mappers work | `npm test -- deck-domain-models` |
| Repositories work | `npm test -- deck-domain-models` (or separate repo test) |
| Existing types untouched | `git diff types/domain/actions.ts types/domain/catalog.ts types/domain/scores.ts types/domain/snapshots.ts types/domain/swipes.ts types/domain/parsers.ts` — empty |
| Existing catalog repo untouched | `git diff lib/db/catalogRepository.ts` — empty |
| All tests pass | `npm test` exit code 0 |
| Typecheck passes | `npm run typecheck` exit code 0 |
| Lint passes | `npm run lint` exit code 0 |
| Format passes | `npm run format -- --check` exit code 0 |

## 11. Validation commands

```bash
# Full validation suite
npm run typecheck
npm run lint
npm run format -- --check
npm test

# Targeted test runs
npm test -- schema-check
npm test -- db-migrations
npm test -- deck-domain-models

# Verify existing types untouched
git diff types/domain/actions.ts types/domain/catalog.ts types/domain/scores.ts types/domain/snapshots.ts types/domain/swipes.ts types/domain/parsers.ts

# Verify existing repositories untouched
git diff lib/db/catalogRepository.ts

# Verbose test output (for debugging)
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 11 (Standardize universal dating-fork action model)

1. **Schema version**: The schema is now at version 3. Migration 003 added `decks` and `deck_cards`. Any new migration starts at version 4.

2. **Action rename scope**: The `love` → `strong_yes` rename will touch `types/domain/actions.ts` (the `ACTIONS`, `CORE_ACTIONS`, `ACTION_LABELS`, `CORE_ACTION_LABELS`, `ACTION_WEIGHTS` constants), the DB CHECK constraint in `swipe_events`, the `DeckActionButton` hints, and the `DeckActionBar` rendering. The new `deck_cards` table does NOT have an action CHECK constraint — cards don't store actions; swipe_events do. So the rename does not affect the new tables from this iteration.

3. **CARD_KINDS constant**: The `CARD_KINDS` array is imported in `migrations.ts` to generate the `deck_cards.kind` CHECK constraint. The same pattern should be followed when updating the `ACTIONS` array: the generated SQL CHECK in `swipe_events` should remain derived from the TypeScript constant. If `love` is removed from `ACTIONS` and `strong_yes` is added, a new migration (004) must update the CHECK constraint on `swipe_events.action`. The `CARD_KINDS` array and `deck_cards.kind` CHECK remain untouched.

4. **Existing `catalog_entities` status**: The old broad catalog table and `CatalogEntity` type remain in the codebase, untouched. They are not used by any new fork code. Iteration 11 can ignore them. The eventual deprecation or removal decision can be made in Iteration 25 (release hardening).

5. **DeckCard domain type naming**: The domain type `DeckCard` exists in `types/domain/decks.ts`. The UI component `DeckCard` exists in `components/deck/DeckCard.tsx`. Iteration 11 does not need to resolve this collision (it only touches action types). Iteration 12 will need to address it when wiring deck data to the UI.

6. **Repository layer**: `deckRepository.ts` and `deckCardRepository.ts` provide basic CRUD. They do not manage sessions, scoring, or profiles. Those will be built in Iterations 14–15.

7. **No content yet**: The `decks` and `deck_cards` tables are empty. Iteration 13 will populate them with Tier 1 prebuilt deck content. Iteration 12 will build the deck browser UI that reads from these tables.

8. **Forward compatibility with deck-scoped sessions (Iteration 14)**: The `swipe_sessions` and `swipe_events` tables do not yet have a `deck_id` column. Iteration 14 will add `deck_id` to `swipe_sessions` via migration 004 or 005 (depending on whether Iteration 11 needs a migration). The `deck_cards.id` column will serve as the FK target for `swipe_events.entity_id` once sessions are deck-scoped — this may require relaxing or updating the existing `swipe_events.entity_id` FK from `catalog_entities(id)` to `deck_cards(id)`.
