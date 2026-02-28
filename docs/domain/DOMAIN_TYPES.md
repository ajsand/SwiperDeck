# Domain Types Reference

> Canonical typed vocabulary for TasteDeck.
> Source of truth: `types/domain/` modules.
> All domain types mirror the SQLite schema from Iteration 04 (`lib/db/migrations.ts`).

## Where Types Live

```
types/domain/
  actions.ts     — SwipeAction union, weights, labels, guards, assertNever
  ids.ts         — Branded ID types (EntityId, SessionId, SwipeEventId, SnapshotId)
  catalog.ts     — CatalogEntityRow, CatalogEntity, entity type union, mappers
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
  type CatalogEntity,
  type SwipeAction,
  ACTION_WEIGHTS,
  rowToCatalogEntity,
} from '@/types/domain';
```

Never import directly from sub-modules (e.g., `'@/types/domain/catalog'`) unless you're inside the `types/domain/` directory itself.

## Row Types vs Domain Types

| Layer      | Naming                            | Casing            | Used By                        |
| ---------- | --------------------------------- | ----------------- | ------------------------------ |
| **Row**    | `XRow` (e.g., `CatalogEntityRow`) | snake_case fields | DB boundary code, repositories |
| **Domain** | `X` (e.g., `CatalogEntity`)       | camelCase fields  | Ranking, scoring, UI, tests    |

Row types match SQLite column names exactly. Domain types are the app's working vocabulary.

### JSON Columns

| Row Field        | Domain Field | Parsed Type          | Parser                        |
| ---------------- | ------------ | -------------------- | ----------------------------- |
| `tags_json`      | `tags`       | `string[]`           | `parseStringArrayJson`        |
| `filters_json`   | `filters`    | `SessionFilters`     | `parseRecordJson` + normalize |
| `top_tags_json`  | `topTags`    | `TagScoreSummary[]`  | custom typed parser           |
| `top_types_json` | `topTypes`   | `TypeScoreSummary[]` | custom typed parser           |
| `summary_json`   | `summary`    | `ProfileSummary`     | custom typed parser           |

All JSON parsers use `safeJsonParse` which never throws — invalid JSON returns the fallback value.

## Actions

### Canonical Values (match DB CHECK constraint)

```typescript
const ACTIONS = [
  'hard_no',
  'no',
  'skip',
  'yes',
  'love',
  'respect',
  'curious',
] as const;
type SwipeAction = (typeof ACTIONS)[number];
```

### Core Actions (Phase 1 UI)

```typescript
const CORE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'love'] as const;
type CoreSwipeAction = (typeof CORE_ACTIONS)[number];
```

### Weights

```typescript
const ACTION_WEIGHTS: Record<SwipeAction, number> = {
  hard_no: -2,
  no: -1,
  skip: 0,
  yes: 1,
  love: 2,
  respect: 0.5,
  curious: 0.25,
};
```

The `satisfies Record<SwipeAction, number>` constraint ensures adding a new action forces updating weights at compile time.

## How to Add a New Swipe Action

1. Add the value to `ACTIONS` array in `types/domain/actions.ts`.
2. TypeScript will immediately error on `ACTION_LABELS` and `ACTION_WEIGHTS` (they use `satisfies Record<SwipeAction, ...>`). Add the new entries.
3. Update `CORE_ACTIONS` if the action is part of Phase 1 UI.
4. Add a new migration in `lib/db/migrations.ts` to update the CHECK constraint (the constraint is generated from the `ACTIONS` array, so this happens automatically on fresh DBs, but existing DBs need a migration).
5. Run `npm run typecheck` and `npm run test` to verify exhaustiveness.

## How to Add a New DB Column

1. Add a migration in `lib/db/migrations.ts` with `ALTER TABLE ... ADD COLUMN`.
2. Add the column to the corresponding `XRow` interface in `types/domain/`.
3. Add the mapped property to the `X` domain interface.
4. Update the `rowToX` and `xToRow` mapper functions.
5. Update `docs/db/SCHEMA.md`.
6. Run `npm run typecheck` — any code consuming the row/domain type will catch missing fields.

## Branded IDs

IDs use TypeScript branding to prevent mixing entity IDs with session IDs:

```typescript
type EntityId = string & { readonly __brand: 'EntityId' };
```

Create branded IDs with helper functions: `asEntityId('...')`, `asSessionId('...')`, etc. At runtime these are plain strings — zero overhead.

## DB Boundary Pattern

Repositories (e.g., `lib/db/catalogRepository.ts`) follow this pattern:

```typescript
// Write: domain → row → SQL
export async function upsertEntity(db, entity: CatalogEntity): Promise<void> {
  const row = catalogEntityToRow(entity);
  await db.runAsync('INSERT OR REPLACE INTO ...', row.id, row.type, ...);
}

// Read: SQL → row → domain
export async function getEntityById(db, id: EntityId): Promise<CatalogEntity | null> {
  const row = await db.getFirstAsync<CatalogEntityRow>('SELECT ... WHERE id = ?', id);
  return row ? rowToCatalogEntity(row) : null;
}
```

Row types never leak past the repository boundary. All app code uses domain types.
