# Domain Types Reference

> Canonical typed vocabulary for the DateDeck fork.
> Source of truth: `types/domain/` modules.
> Domain types mirror the evolving SQLite schema in `lib/db/migrations.ts`.

## Where Types Live

```text
types/domain/
  actions.ts     — SwipeAction unions, weights, labels, guards, assertNever
  ids.ts         — Branded ID types (EntityId, SessionId, SwipeEventId, SnapshotId, DeckId, DeckCardId)
  catalog.ts     — CatalogEntityRow, CatalogEntity, entity type union, mappers
  deckProfile.ts — DeckTagScore, DeckCardAffinity, DeckProfileSnapshot, DeckProfileSummary, stage, confidence
  decks.ts       — DeckRow, Deck, DeckCardRow, DeckCard, constants, guards, mappers
  swipes.ts      — SwipeSessionRow/SwipeSession, SwipeEventRow/SwipeEvent, mappers
  scores.ts      — TasteTagScoreRow/Score, TasteTypeScoreRow/Score, EntityAffinityRow/Affinity, mappers
  snapshots.ts   — ProfileSnapshotRow/Snapshot, summary types, mappers
  parsers.ts     — safeJsonParse, parseStringArrayJson, parseRecordJson, isRecord
  index.ts       — Barrel re-exports (import from '@/types/domain')
```

## Import Convention

Always import from the barrel:

```typescript
import {
  type Deck,
  type DeckCard,
  type SwipeAction,
  rowToDeck,
  ACTION_WEIGHTS,
} from '@/types/domain';
```

Avoid importing sub-modules directly unless you are editing `types/domain/` itself.

## Row Types vs Domain Types

| Layer    | Naming                         | Casing            | Used By                        |
| -------- | ------------------------------ | ----------------- | ------------------------------ |
| `Row`    | `XRow` (for example `DeckRow`) | snake_case fields | DB boundary code, repositories |
| `Domain` | `X` (for example `Deck`)       | camelCase fields  | App logic, UI, tests           |

Row types match SQLite column names exactly. Domain types are the app's working vocabulary.

### JSON Columns

| Row Field        | Domain Field | Parsed Type          | Parser                        |
| ---------------- | ------------ | -------------------- | ----------------------------- |
| `tags_json`      | `tags`       | `string[]`           | `parseStringArrayJson`        |
| `filters_json`   | `filters`    | `SessionFilters`     | `parseRecordJson` + normalize |
| `top_tags_json`  | `topTags`    | `TagScoreSummary[]`  | custom typed parser           |
| `top_types_json` | `topTypes`   | `TypeScoreSummary[]` | custom typed parser           |
| `summary_json`   | `summary`    | `ProfileSummary`     | custom typed parser           |

All JSON parsers are safe: invalid JSON falls back instead of throwing.

## Decks and Deck Cards

Iteration 10 introduces first-class deck-scoped types.

### Constants

```typescript
const DECK_CATEGORIES = [
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

const DECK_TIERS = ['tier_1', 'tier_2', 'tier_3'] as const;
const DECK_SENSITIVITIES = ['standard', 'sensitive', 'gated'] as const;
const CARD_KINDS = ['entity', 'statement'] as const;
```

### Domain Types

| Type          | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `Deck`        | App-facing deck metadata with booleans and camelCase fields |
| `DeckRow`     | SQLite row for `decks`                                      |
| `DeckCard`    | App-facing deck card with parsed `tags`                     |
| `DeckCardRow` | SQLite row for `deck_cards`                                 |

### Column -> property mapping

| SQL Column              | Domain Property      |
| ----------------------- | -------------------- |
| `card_count`            | `cardCount`          |
| `compare_eligible`      | `compareEligible`    |
| `showdown_eligible`     | `showdownEligible`   |
| `min_cards_for_profile` | `minCardsForProfile` |
| `min_cards_for_compare` | `minCardsForCompare` |
| `is_custom`             | `isCustom`           |
| `cover_tile_key`        | `coverTileKey`       |
| `deck_id`               | `deckId`             |
| `description_short`     | `descriptionShort`   |
| `sort_order`            | `sortOrder`          |
| `tags_json`             | `tagsJson` / `tags`  |

### Mappers

Deck and deck-card modules follow the same boundary pattern as the earlier catalog types:

- `rowToDeck(row)` converts SQLite rows into app-facing `Deck` objects.
- `deckToRow(deck)` serializes booleans back to SQLite `0` / `1`.
- `rowToDeckCard(row)` parses `tags_json` and validates `kind`.
- `deckCardToRow(card)` serializes `tags` back to JSON text.

## Actions

### Canonical values

```typescript
const ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'strong_yes'] as const;
```

### Core actions

```typescript
const CORE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'strong_yes'] as const;
```

### Weights

```typescript
const ACTION_WEIGHTS: Record<SwipeAction, number> = {
  hard_no: -2,
  no: -1,
  skip: 0,
  yes: 1,
  strong_yes: 2,
};
```

The `satisfies Record<SwipeAction, ...>` pattern keeps these tables exhaustive when action values change.

`strong_yes` is the fork's final MVP replacement for TasteDeck's old `love` value. `respect` and `curious` are not part of the canonical DateDeck action set.

## Branded IDs

IDs use TypeScript branding to prevent mixing unrelated identifiers.

```typescript
type DeckId = string & { readonly __brand: 'DeckId' };
type DeckCardId = string & { readonly __brand: 'DeckCardId' };
```

Helpers create branded IDs with zero runtime overhead:

- `asEntityId(...)`
- `asSessionId(...)`
- `asSwipeEventId(...)`
- `asSnapshotId(...)`
- `asDeckId(...)`
- `asDeckCardId(...)`

## Prebuilt Content Shapes

Iteration 13 adds the bundled prebuilt deck import pipeline in `lib/content/`.

```text
lib/content/
  validateDeck.ts      — PrebuiltDeckFile, PrebuiltDeckEntry, PrebuiltCardEntry, deck/card validation results
  contentVersion.ts    — PREBUILT_DECK_VERSION and content-meta helpers
  loadPrebuiltDecks.ts — startup loader orchestration
```

### Validation contract

- `validateDeck(entry, timestamp)` normalizes one deck entry and returns either a typed `Deck` plus its raw card list or a list of validation errors.
- `validateCard(entry, deck, index, timestamp)` normalizes one bundled card entry into a typed `DeckCard`.
- Validation trims strings, lowercases categories and tags, clamps popularity to `[0, 1]`, limits tags to 15, and defaults missing optional values.

### Content versioning

`PREBUILT_DECK_VERSION` is the bundled content version constant used by the startup loader and the `__deck_content_meta` table. Bumping this value in a future release triggers a full reimport of the bundled prebuilt decks.

## Swipe Sessions And Events

Iteration 14 moves swipe persistence to deck scope.

### `SwipeSession`

`SwipeSessionRow` now includes:

- `id`
- `deck_id`
- `started_at`
- `ended_at`
- `filters_json`

The app-facing `SwipeSession` maps those fields to:

- `id: SessionId`
- `deckId: DeckId`
- `startedAt: number`
- `endedAt: number | null`
- `filters: SessionFilters`

### `SwipeEvent`

`SwipeEventRow` now includes:

- `id`
- `session_id`
- `deck_id`
- `card_id`
- `action`
- `strength`
- `created_at`

The app-facing `SwipeEvent` maps those fields to:

- `id: SwipeEventId`
- `sessionId: SessionId`
- `deckId: DeckId`
- `cardId: DeckCardId`
- `action: SwipeAction`
- `strength: number`
- `createdAt: number`

This replaces the old broad-catalog `entityId` event reference with a deck-card `cardId` reference.

## Deck Profile Types (Iteration 15)

Deck-scoped profile computation uses new types in `deckProfile.ts`:

### `DeckProfileStage`

```typescript
type DeckProfileStage = 'lightweight' | 'meaningful' | 'high_confidence';
```

### `DeckProfileConfidence`

```typescript
interface DeckProfileConfidence {
  value: number;        // 0..1
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number; // fraction of deck cards swiped
}
```

### `DeckProfileSummary`

Computed output from `computeDeckProfileSummary`:

```typescript
interface DeckProfileSummary {
  deckId: DeckId;
  stage: DeckProfileStage;
  confidence: DeckProfileConfidence;
  affinities: TagScoreSummary[];   // top positive tags
  aversions: TagScoreSummary[];     // top negative tags
  unresolved: string[];             // tags with weak signal
  topCardsLiked: DeckCardId[];
  topCardsDisliked: DeckCardId[];
  generatedAt: number;
}
```

### Row types

- `DeckTagScoreRow` / `DeckTagScore` — deck-scoped tag scores
- `DeckCardAffinityRow` / `DeckCardAffinity` — deck-scoped card affinity
- `DeckProfileSnapshotRow` / `DeckProfileSnapshot` — deck-scoped snapshots with `topTags`, `topAversions`, `summary`

## DB Boundary Pattern

Repositories keep row types inside the DB boundary.

```typescript
// Write: domain -> row -> SQL
export async function upsertDeck(db, deck: Deck): Promise<void> {
  const row = deckToRow(deck);
  await db.runAsync('INSERT OR REPLACE INTO decks (...) VALUES (...)', row.id);
}

// Read: SQL -> row -> domain
export async function getDeckById(db, id: DeckId): Promise<Deck | null> {
  const row = await db.getFirstAsync<DeckRow>('SELECT ... WHERE id = ?', id);
  return row ? rowToDeck(row) : null;
}
```

App code should work with domain types, not raw row types.

## Change Checklist

When adding a new DB-backed domain type:

1. Add or update the migration in `lib/db/migrations.ts`.
2. Add the branded IDs in `ids.ts` if needed.
3. Create the `Row` and domain interfaces.
4. Add mapper functions and any guards or normalizers.
5. Add repository helpers in `lib/db/`.
6. Export the module from `types/domain/index.ts`.
7. Update `docs/db/SCHEMA.md` and this document.
8. Run `npm run typecheck`, `npm run lint`, and `npm test`.
