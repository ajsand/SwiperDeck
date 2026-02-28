# Iteration 5A — Domain Type Plan + Schema Fidelity Contract

> **Status:** Codex-ready contract for 5B/5C implementation.
> **Source of truth:** Migration `002_base_schema` in `lib/db/migrations.ts`.
> **Schema version:** 2 (`PRAGMA user_version`).

---

## 1. Canonical Action Set

### 1.1 Source: DB CHECK constraint (line 65 of `lib/db/migrations.ts`)

```sql
action TEXT NOT NULL CHECK(action IN ('hard_no','no','skip','yes','love','respect','curious'))
```

### 1.2 SwipeAction — full union (7 values)

All seven values persisted in DB. This is the exhaustive union:

```ts
const SWIPE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'love', 'respect', 'curious'] as const;
type SwipeAction = (typeof SWIPE_ACTIONS)[number];
```

### 1.3 CoreSwipeAction — Phase 1 five-state subset

The five actions exposed in Phase 1 UI:

```ts
const CORE_SWIPE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'love'] as const;
type CoreSwipeAction = (typeof CORE_SWIPE_ACTIONS)[number];
```

### 1.4 Action weights (canonical mapping)

From CLAUDE.md Section 7.1:

| Action    | Weight | Phase   |
| --------- | ------ | ------- |
| `love`    | +2     | Core    |
| `yes`     | +1     | Core    |
| `skip`    |  0     | Core    |
| `no`      | -1     | Core    |
| `hard_no` | -2     | Core    |
| `respect` | +0.5   | Phase 2 |
| `curious` | +0.25  | Phase 2 |

```ts
const ACTION_WEIGHTS: Record<SwipeAction, number> = {
  love: 2,
  yes: 1,
  skip: 0,
  no: -1,
  hard_no: -2,
  respect: 0.5,
  curious: 0.25,
} as const satisfies Record<SwipeAction, number>;
```

### 1.5 Action labels (display strings)

```ts
const ACTION_LABELS: Record<SwipeAction, string> = {
  love: 'Love',
  yes: 'Yes',
  skip: 'Skip',
  no: 'No',
  hard_no: 'Hard No',
  respect: 'Respect',
  curious: 'Curious',
} as const satisfies Record<SwipeAction, string>;
```

### 1.6 DB strength column compatibility

**Current schema:** `strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2)`

**Problem:** `respect` (+0.5) and `curious` (+0.25) are fractional but `strength` is INTEGER.

**Decision:** In Phase 1, only core actions are used in UI, so strength values are always integers. The `ACTION_WEIGHTS` map stores the true fractional weights for use in scoring logic. The `strength` column in `swipe_events` stores the **integer-truncated** weight for now (0 for both `respect` and `curious` if written). A migration to REAL is planned for Phase 2 activation.

**Rule for Codex 5B:** Export `actionToDbStrength(action: SwipeAction): number` that returns `Math.round(ACTION_WEIGHTS[action])` for DB writes. Export `ACTION_WEIGHTS` separately for scoring math.

### 1.7 Alias normalization

**Decision:** No aliases at this time. The only canonical strings are the 7 DB values. If external data uses `hard_yes`, the parser rejects it (returns `undefined`). No silent normalization — fail loudly.

**Rationale:** Introducing aliases before there's a consumer creates dead code. Add `parseSwipeActionLenient()` in a future iteration if needed.

---

## 2. File Layout Contract

All domain types live under `types/domain/`. The `@/*` path alias in `tsconfig.json` enables imports like `@/types/domain/actions`.

### 2.1 Files

| File                       | Contents                                                   |
| -------------------------- | ---------------------------------------------------------- |
| `types/domain/actions.ts`  | `SwipeAction`, `CoreSwipeAction`, weights, labels, guards  |
| `types/domain/ids.ts`      | Branded ID types (EntityId, SessionId, etc.)               |
| `types/domain/catalog.ts`  | `CatalogEntityRow`, `CatalogEntity`, entity type union     |
| `types/domain/swipes.ts`   | `SwipeSessionRow`, `SwipeSession`, `SwipeEventRow`, `SwipeEvent` |
| `types/domain/scores.ts`   | Tag/type/affinity Row + Domain types                       |
| `types/domain/snapshots.ts`| `ProfileSnapshotRow`, `ProfileSnapshot`                    |
| `types/domain/parsers.ts`  | `safeJsonParse`, JSON column parsers, runtime guards       |
| `types/domain/index.ts`    | Barrel re-exports (everything)                             |

### 2.2 Import rules

- **Within `types/domain/`:** import siblings directly (e.g., `import { SwipeAction } from './actions'`).
- **Outside `types/domain/`:** always import from the barrel: `import { CatalogEntity, SwipeAction } from '@/types/domain'`.
- **No circular deps:** `parsers.ts` may import type-only from other domain files. No domain file imports from `parsers.ts` at the type level (parsers are runtime-only).

---

## 3. Schema-to-Type Mapping Matrix

### 3.1 `catalog_entities`

| SQL Column          | SQL Type | Nullable | Row Type Property   | Row TS Type        | Domain Property    | Domain TS Type     | Mapping Rule                                 |
| ------------------- | -------- | -------- | ------------------- | ------------------ | ------------------ | ------------------ | -------------------------------------------- |
| `id`                | TEXT     | NOT NULL | `id`                | `string`           | `id`               | `EntityId`         | Brand wrap                                   |
| `type`              | TEXT     | NOT NULL | `type`              | `string`           | `type`             | `EntityType`       | Validate against union                       |
| `title`             | TEXT     | NOT NULL | `title`             | `string`           | `title`            | `string`           | Pass-through                                 |
| `subtitle`          | TEXT     | NOT NULL | `subtitle`          | `string`           | `subtitle`         | `string`           | Pass-through                                 |
| `description_short` | TEXT     | NOT NULL | `description_short` | `string`           | `descriptionShort` | `string`           | Rename only                                  |
| `tags_json`         | TEXT     | NOT NULL | `tags_json`         | `string`           | `tags`             | `string[]`         | `safeJsonParse(row.tags_json, [])`           |
| `popularity`        | REAL     | NOT NULL | `popularity`        | `number`           | `popularity`       | `number`           | Pass-through                                 |
| `tile_key`          | TEXT     | NOT NULL | `tile_key`          | `string`           | `tileKey`          | `string`           | Rename only                                  |
| `image_url`         | TEXT     | NULL     | `image_url`         | `string \| null`   | `imageUrl`         | `string \| null`   | Rename only                                  |
| `updated_at`        | INTEGER  | NOT NULL | `updated_at`        | `number`           | `updatedAt`        | `number`           | Pass-through (epoch seconds)                 |

**EntityType union** (from CLAUDE.md Section 4.1):
```ts
const ENTITY_TYPES = [
  'book', 'movie', 'tv', 'podcast', 'album', 'artist',
  'game', 'team', 'athlete', 'thinker', 'place', 'concept',
] as const;
type EntityType = (typeof ENTITY_TYPES)[number];
```

> Note: The DB does not have a CHECK constraint on `type`, so the union is enforced at the app level. The parser should accept unknown types gracefully (log warning, pass through as `string`).

### 3.2 `swipe_sessions`

| SQL Column      | SQL Type | Nullable | Row Property   | Row TS Type      | Domain Property | Domain TS Type            | Mapping Rule                                  |
| --------------- | -------- | -------- | -------------- | ---------------- | --------------- | ------------------------- | --------------------------------------------- |
| `id`            | TEXT     | NOT NULL | `id`           | `string`         | `id`            | `SessionId`               | Brand wrap                                    |
| `started_at`    | INTEGER  | NOT NULL | `started_at`   | `number`         | `startedAt`     | `number`                  | Rename only                                   |
| `ended_at`      | INTEGER  | NULL     | `ended_at`     | `number \| null` | `endedAt`       | `number \| null`          | Rename only                                   |
| `filters_json`  | TEXT     | NOT NULL | `filters_json` | `string`         | `filters`       | `SessionFilters`          | `safeJsonParse(row.filters_json, {})` + type  |

**SessionFilters type** (shape TBD by filter modal iteration; define placeholder now):
```ts
interface SessionFilters {
  types?: EntityType[];
  diversityBoost?: boolean;
  mainstreamBias?: number; // 0..1
}
```

### 3.3 `swipe_events`

| SQL Column   | SQL Type | Nullable | Row Property | Row TS Type | Domain Property | Domain TS Type  | Mapping Rule                          |
| ------------ | -------- | -------- | ------------ | ----------- | --------------- | --------------- | ------------------------------------- |
| `id`         | TEXT     | NOT NULL | `id`         | `string`    | `id`            | `SwipeEventId`  | Brand wrap                            |
| `session_id` | TEXT     | NOT NULL | `session_id` | `string`    | `sessionId`     | `SessionId`     | Rename + brand                        |
| `entity_id`  | TEXT     | NOT NULL | `entity_id`  | `string`    | `entityId`      | `EntityId`      | Rename + brand                        |
| `action`     | TEXT     | NOT NULL | `action`     | `string`    | `action`        | `SwipeAction`   | Validate via `isSwipeAction()`        |
| `strength`   | INTEGER  | NOT NULL | `strength`   | `number`    | `strength`      | `number`        | Pass-through                          |
| `created_at` | INTEGER  | NOT NULL | `created_at` | `number`    | `createdAt`     | `number`        | Rename only                           |

### 3.4 `taste_tag_scores`

| SQL Column     | SQL Type | Nullable | Row Property   | Row TS Type | Domain Property | Domain TS Type | Mapping Rule   |
| -------------- | -------- | -------- | -------------- | ----------- | --------------- | -------------- | -------------- |
| `tag`          | TEXT     | NOT NULL | `tag`          | `string`    | `tag`           | `string`       | Pass-through   |
| `score`        | REAL     | NOT NULL | `score`        | `number`    | `score`         | `number`       | Pass-through   |
| `pos`          | REAL     | NOT NULL | `pos`          | `number`    | `pos`           | `number`       | Pass-through   |
| `neg`          | REAL     | NOT NULL | `neg`          | `number`    | `neg`           | `number`       | Pass-through   |
| `last_updated` | INTEGER  | NOT NULL | `last_updated` | `number`    | `lastUpdated`   | `number`       | Rename only    |

### 3.5 `taste_type_scores`

| SQL Column     | SQL Type | Nullable | Row Property   | Row TS Type | Domain Property | Domain TS Type | Mapping Rule   |
| -------------- | -------- | -------- | -------------- | ----------- | --------------- | -------------- | -------------- |
| `type`         | TEXT     | NOT NULL | `type`         | `string`    | `type`          | `EntityType`   | Validate union |
| `score`        | REAL     | NOT NULL | `score`        | `number`    | `score`         | `number`       | Pass-through   |
| `pos`          | REAL     | NOT NULL | `pos`          | `number`    | `pos`           | `number`       | Pass-through   |
| `neg`          | REAL     | NOT NULL | `neg`          | `number`    | `neg`           | `number`       | Pass-through   |
| `last_updated` | INTEGER  | NOT NULL | `last_updated` | `number`    | `lastUpdated`   | `number`       | Rename only    |

### 3.6 `entity_affinity`

| SQL Column     | SQL Type | Nullable | Row Property   | Row TS Type | Domain Property | Domain TS Type | Mapping Rule     |
| -------------- | -------- | -------- | -------------- | ----------- | --------------- | -------------- | ---------------- |
| `entity_id`    | TEXT     | NOT NULL | `entity_id`    | `string`    | `entityId`      | `EntityId`     | Rename + brand   |
| `score`        | REAL     | NOT NULL | `score`        | `number`    | `score`         | `number`       | Pass-through     |
| `pos`          | REAL     | NOT NULL | `pos`          | `number`    | `pos`           | `number`       | Pass-through     |
| `neg`          | REAL     | NOT NULL | `neg`          | `number`    | `neg`           | `number`       | Pass-through     |
| `last_updated` | INTEGER  | NOT NULL | `last_updated` | `number`    | `lastUpdated`   | `number`       | Rename only      |

### 3.7 `profile_snapshots`

| SQL Column       | SQL Type | Nullable | Row Property     | Row TS Type | Domain Property | Domain TS Type     | Mapping Rule                                    |
| ---------------- | -------- | -------- | ---------------- | ----------- | --------------- | ------------------ | ----------------------------------------------- |
| `id`             | TEXT     | NOT NULL | `id`             | `string`    | `id`            | `SnapshotId`       | Brand wrap                                      |
| `created_at`     | INTEGER  | NOT NULL | `created_at`     | `number`    | `createdAt`     | `number`           | Rename only                                     |
| `top_tags_json`  | TEXT     | NOT NULL | `top_tags_json`  | `string`    | `topTags`       | `TagScoreSummary[]`| `safeJsonParse(row.top_tags_json, [])`           |
| `top_types_json` | TEXT     | NOT NULL | `top_types_json` | `string`    | `topTypes`      | `TypeScoreSummary[]`| `safeJsonParse(row.top_types_json, [])`         |
| `summary_json`   | TEXT     | NOT NULL | `summary_json`   | `string`    | `summary`       | `ProfileSummary`   | `safeJsonParse(row.summary_json, {})`            |

**JSON column inner types** (define shapes for snapshot payloads):

```ts
interface TagScoreSummary {
  tag: string;
  score: number;
}

interface TypeScoreSummary {
  type: string;
  score: number;
}

interface ProfileSummary {
  totalSwipes?: number;
  topAction?: SwipeAction;
  generatedAt?: number;
  labels?: string[];
}
```

---

## 4. Branded ID Types

Use lightweight branded types for compile-time safety without runtime cost:

```ts
type EntityId = string & { readonly __brand: 'EntityId' };
type SessionId = string & { readonly __brand: 'SessionId' };
type SwipeEventId = string & { readonly __brand: 'SwipeEventId' };
type SnapshotId = string & { readonly __brand: 'SnapshotId' };
```

Helper constructors (unsafe casts, used at DB/API boundary only):

```ts
const asEntityId = (s: string) => s as EntityId;
const asSessionId = (s: string) => s as SessionId;
const asSwipeEventId = (s: string) => s as SwipeEventId;
const asSnapshotId = (s: string) => s as SnapshotId;
```

---

## 5. Runtime Validation Strategy

### 5.1 Decision: Handwritten guards (no new dependency)

**Rationale:**
- Only 3 validation scenarios exist: action string checks, JSON column parsing, entity type checks.
- Adding Zod/Valibot for 3 small guards is over-engineering.
- No untrusted external API input in Phase 1 (all data is bundled seed JSON or user-generated swipes).
- Bundle size matters for Expo/RN.

### 5.2 Required guards

| Guard                              | Input          | Output                         | Usage                           |
| ---------------------------------- | -------------- | ------------------------------ | ------------------------------- |
| `isSwipeAction(s: string)`         | unknown string | `s is SwipeAction`             | Validate DB reads, seed data    |
| `parseSwipeAction(s: string)`      | unknown string | `SwipeAction \| undefined`     | Safe parse with undefined       |
| `isEntityType(s: string)`          | unknown string | `s is EntityType`              | Validate catalog import         |
| `safeJsonParse<T>(json, fallback)` | string + T     | `T`                            | All `*_json` columns            |

### 5.3 `safeJsonParse` contract

```ts
function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
```

> **Note:** This does not validate the shape of the parsed JSON, only that it parses. For Phase 1 (trusted bundled data + own writes), this is sufficient. Add shape validation if external/untrusted JSON sources are introduced.

---

## 6. Row ↔ Domain Mapper Patterns

### 6.1 Naming convention

| Direction     | Pattern                           | Example                          |
| ------------- | --------------------------------- | -------------------------------- |
| Row → Domain  | `rowTo<DomainName>(row: XRow): X` | `rowToEntity(row: CatalogEntityRow): CatalogEntity` |
| Domain → Row  | `<domainName>ToRow(x: X): XRow`   | `entityToRow(e: CatalogEntity): CatalogEntityRow`   |

### 6.2 Location

Mappers for each table live in the same file as the Row + Domain type:
- `types/domain/catalog.ts` → `rowToEntity()`, `entityToRow()`
- `types/domain/swipes.ts` → `rowToSession()`, `sessionToRow()`, `rowToSwipeEvent()`, `swipeEventToRow()`
- `types/domain/scores.ts` → `rowToTagScore()`, `tagScoreToRow()`, etc.
- `types/domain/snapshots.ts` → `rowToSnapshot()`, `snapshotToRow()`

### 6.3 JSON serialization rule

- **Row → Domain:** Parse JSON columns via `safeJsonParse()`.
- **Domain → Row:** Serialize via `JSON.stringify()`.

---

## 7. Shared Score Shape

Three tables (`taste_tag_scores`, `taste_type_scores`, `entity_affinity`) share the same `score/pos/neg/last_updated` shape. Define a shared base:

```ts
interface ScoreFields {
  score: number;
  pos: number;
  neg: number;
  lastUpdated: number;
}
```

Each domain type extends this:

```ts
interface TasteTagScore extends ScoreFields { tag: string; }
interface TasteTypeScore extends ScoreFields { type: EntityType; }
interface EntityAffinityScore extends ScoreFields { entityId: EntityId; }
```

Row types use snake_case equivalents:

```ts
interface ScoreFieldsRow {
  score: number;
  pos: number;
  neg: number;
  last_updated: number;
}
```

---

## 8. Exhaustive Compile-Time Checks

### 8.1 `satisfies` pattern

All `Record<SwipeAction, T>` and `Record<EntityType, T>` objects must use `satisfies` to catch missing keys at compile time:

```ts
const ACTION_WEIGHTS = { ... } as const satisfies Record<SwipeAction, number>;
```

If a new action is added to `SwipeAction` but not to `ACTION_WEIGHTS`, TypeScript will error.

### 8.2 ESLint rule (optional enhancement)

If `@typescript-eslint/switch-exhaustiveness-check` is available, enable it. Not required for 5B/5C but recommended for later iterations using `switch` on action/type unions.

---

## Decisions Summary

| Decision                        | Value                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| **Canonical action set**        | `hard_no`, `no`, `skip`, `yes`, `love`, `respect`, `curious` (7)     |
| **Core action subset**          | `hard_no`, `no`, `skip`, `yes`, `love` (5)                           |
| **Alias normalization**         | None. Unknown strings → `undefined`. No silent rewriting.             |
| **Runtime validation approach** | Handwritten guards. No new dependencies.                              |
| **DB strength handling**        | `actionToDbStrength()` returns `Math.round(weight)`. REAL migration planned for Phase 2. |
| **Branded IDs**                 | Yes. `EntityId`, `SessionId`, `SwipeEventId`, `SnapshotId`.          |
| **JSON parsing**                | `safeJsonParse<T>(json, fallback)`. No shape validation in Phase 1.  |
| **File paths**                  | `types/domain/{actions,ids,catalog,swipes,scores,snapshots,parsers,index}.ts` |
| **Mapper location**             | Co-located in each domain file (not a separate mappers file).         |
| **Import rule**                 | External consumers use barrel `@/types/domain`. Internal use siblings.|

---

## Validation Checklist

- [x] Action values match DB CHECK: `hard_no, no, skip, yes, love, respect, curious`
- [x] All 7 schema tables have planned Row + Domain type pairs
- [x] JSON columns (`tags_json`, `filters_json`, `top_tags_json`, `top_types_json`, `summary_json`) have safe parsing strategy
- [x] Nullable columns (`image_url`, `ended_at`) reflected as `T | null` in Row types
- [x] Score tables share a common `ScoreFields` base
- [x] `EntityType` union defined from CLAUDE.md Section 4.1
- [x] Branded ID types specified for all PK/FK string IDs
- [x] `ACTION_WEIGHTS` uses `satisfies Record<SwipeAction, number>` for exhaustiveness
- [x] File layout avoids conflicts with existing `lib/db/` convention
- [x] No new npm dependencies introduced

---

## Acceptance: Codex Readiness

After this contract, Codex (5B/5C) can implement without:
- Guessing action strings (Section 1)
- Guessing row shapes (Section 3 matrix)
- Guessing module paths (Section 2)
- Guessing JSON parsing behavior (Section 5.3)
- Guessing mapper naming (Section 6)

Iteration 06 (catalog import) can reuse `CatalogEntityRow`, `entityToRow()`, and `safeJsonParse()` with no new type definitions.
