# Iteration 14: Refactor swipe and session logic to deck scope

## 1. Objective

Make `deck_id` a first-class, required dimension of every swipe session and swipe event. This iteration rewires the inherited broad-catalog persistence model so that every swipe action is recorded against a specific deck and a specific deck card — not against the old unscoped `catalog_entities` table.

Concretely:

1. **Schema migration 006**: rebuild `swipe_sessions` to require `deck_id`; rebuild `swipe_events` to replace `entity_id` (FK → `catalog_entities`) with `card_id` (FK → `deck_cards`) and add `deck_id`.
2. **Domain types**: update `SwipeSession` and `SwipeEvent` types, row types, and mappers to include `deckId` and use `DeckCardId`.
3. **Persistence layer**: create a deck-scoped swipe repository with session creation and event insertion.
4. **UI wiring**: build a swipe session screen at `app/deck/[deckId]/play.tsx` that loads cards from `deck_cards`, creates a deck-scoped session, renders the existing swipe UI primitives, and persists each action.
5. **Rename `DeckCard` UI component** to `SwipeCard` to resolve the long-standing naming collision with the `DeckCard` domain type.

After this iteration, a user can tap "Start Swiping" on a deck detail screen, enter a full-screen swipe session scoped to that deck, and every swipe is recorded with the correct `deck_id` and `card_id`.

## 2. Why this matters

Without deck-scoped persistence, the entire downstream stack is blocked:

- **Deck profiles** (Iteration 15) aggregate scores per deck — they need `WHERE deck_id = ?` queries on swipe events.
- **Compare flows** (Iterations 16–18) match two users by deck — the shared card set must be queryable by `deck_id`.
- **Confidence modeling** (Iteration 23) depends on card coverage within a single deck — requires `card_id` FK to `deck_cards`.
- **History/Library** (future) will need to show swipe history per deck — requires the `deck_id` dimension.

This iteration transitions the app from "UI prototype with no persistence" to "functional swipe loop with real data." It is the single most important integration point in the fork.

## 3. Scope

### In scope

- **Migration 006**: rebuild `swipe_sessions` with `deck_id TEXT NOT NULL` and FK to `decks(id)`; rebuild `swipe_events` with `deck_id TEXT NOT NULL`, `card_id TEXT NOT NULL` (replacing `entity_id`), FK to `deck_cards(id)` and `decks(id)`; add indexes
- **Domain type updates**: `SwipeSession` gains `deckId: DeckId`; `SwipeEvent` changes `entityId: EntityId` → `cardId: DeckCardId` and gains `deckId: DeckId`; row types and mappers updated
- **New repository**: `lib/db/swipeRepository.ts` with deck-scoped CRUD functions
- **Rename UI component**: `DeckCard.tsx` → `SwipeCard.tsx` with a decoupled prop interface
- **New screen**: `app/deck/[deckId]/play.tsx` — swipe session screen
- **New hook**: `hooks/useDeckSwipeSession.ts` — manages card queue, current card, session lifecycle, and persistence
- **Wire CTA**: deck detail "Start Swiping" button navigates to the play route
- **Cold-start card ordering**: cards served by `sort_order` ascending, then `popularity` descending (no warm-start algorithm yet)
- **Tests**: migration version, schema introspection, domain mapper, repository, component rename
- **Doc updates**: SCHEMA.md, DOMAIN_TYPES.md, DECK_ACTION_CONTRACT.md

### Out of scope

- **Profile computation** — Iteration 15
- **Warm-start ranking / adaptive card ordering** — future
- **Undo last swipe** — can be re-enabled later on the new schema
- **Scoring table refactoring** (`taste_tag_scores`, `taste_type_scores`, `entity_affinity`) — Iteration 15 will introduce deck-scoped scoring; the old tables are not modified here
- **Old `catalog_entities` cleanup** — preserved but unused
- **Compare/showdown flows** — Iteration 16+

### Relationship to old TasteDeck code

| Category                     | What happens                                                                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Replaced (schema)**        | `swipe_sessions` rebuilt with `deck_id` column and FK. `swipe_events` rebuilt: `entity_id` column replaced by `card_id`, new `deck_id` column, FK targets changed from `catalog_entities` to `deck_cards`/`decks`. Old dev-only data is dropped during rebuild.                              |
| **Replaced (domain types)**  | `SwipeSessionRow`/`SwipeSession` gain `deck_id`/`deckId`. `SwipeEventRow`/`SwipeEvent` change `entity_id` → `card_id` and gain `deck_id`. All mappers updated.                                                                                                                               |
| **Replaced (UI component)**  | `DeckCard.tsx` renamed to `SwipeCard.tsx` with a new decoupled prop interface. Old `CatalogEntity` coupling removed.                                                                                                                                                                         |
| **Reused**                   | `DeckActionBar`, `DeckActionButton`, `DeckStatePlaceholder`, `DeckTagsRow`, `DeterministicTile`, `dispatchDeckAction`, `useDeckGestures`, `deckActionPayload.ts`, `deckState.ts` — all reused as-is. The action model (`hard_no`/`no`/`skip`/`yes`/`strong_yes`) is final from Iteration 11. |
| **Preserved (not modified)** | Old `catalog_entities` table, old scoring tables, old `catalogRepository.ts`, old snapshot types. These become legacy artifacts; some may be removed in Iteration 25 (release hardening).                                                                                                    |

## 4. Multi-model execution strategy

| Step | Model           | Task                                                                                    |
| ---- | --------------- | --------------------------------------------------------------------------------------- |
| 1    | Claude Opus 4.6 | Write this iteration file with full schema diff, type contracts, and wiring spec (done) |
| 2    | GPT-5.4         | Implement migration 006                                                                 |
| 3    | GPT-5.4         | Update domain types and mappers in `swipes.ts`                                          |
| 4    | GPT-5.4         | Create swipe repository                                                                 |
| 5    | GPT-5.4         | Rename `DeckCard` → `SwipeCard` component, update barrel exports and tests              |
| 6    | GPT-5.4         | Build `useDeckSwipeSession` hook and `play.tsx` screen                                  |
| 7    | GPT-5.4         | Wire deck detail CTA, register route                                                    |
| 8    | GPT-5.4         | Update all tests, run full validation                                                   |
| 9    | Claude Opus 4.6 | Review: schema correctness, FK integrity, session lifecycle, state handling             |

### Implementation order

The safest sequence:

1. Migration 006 first — schema must be correct before any code references new columns.
2. Domain types and mappers second — TypeScript will flag every downstream consumer.
3. Swipe repository third — depends on correct types.
4. Component rename fourth — decoupled from persistence; can be done in parallel.
5. Hook and screen last — depends on all of the above.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document                          | Relevant sections                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `/CLAUDE.md` Section 4.3          | Swiping through a deck: one card at a time, algorithm starts broad                         |
| `/CLAUDE.md` Section 8.1          | One profile per deck — sessions must be deck-scoped                                        |
| `/CLAUDE.md` Section 13.3         | Key architectural shift: deck-scoped profile computation                                   |
| `/CLAUDE.md` Section 14.1         | Algorithm: begin with common/representative, then adapt                                    |
| `/CLAUDE.md` Section 15.1–15.4    | UX/accessibility requirements                                                              |
| `/iterations/13-...md` Section 12 | Handoff: content loaded, schema v5, DeckCard collision flagged, card sort_order documented |

### Schema diff: before and after

#### `swipe_sessions` — before (migration 002)

```sql
CREATE TABLE swipe_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  filters_json TEXT NOT NULL,
  CHECK(ended_at IS NULL OR ended_at >= started_at)
);
```

#### `swipe_sessions` — after (migration 006)

```sql
CREATE TABLE swipe_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  filters_json TEXT NOT NULL,
  CHECK(ended_at IS NULL OR ended_at >= started_at),
  FOREIGN KEY (deck_id) REFERENCES decks(id)
);
```

Changes: `deck_id TEXT NOT NULL` added with FK to `decks(id)`.

#### `swipe_events` — before (migration 004)

```sql
CREATE TABLE swipe_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN (...)),
  strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES catalog_entities(id) ON DELETE RESTRICT
);
```

#### `swipe_events` — after (migration 006)

```sql
CREATE TABLE swipe_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN (...)),
  strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (deck_id) REFERENCES decks(id),
  FOREIGN KEY (card_id) REFERENCES deck_cards(id) ON DELETE RESTRICT
);
```

Changes: `entity_id` → `card_id` (FK target changed to `deck_cards`), `deck_id TEXT NOT NULL` added (FK to `decks`), old `catalog_entities` FK removed.

### Domain type diff

#### `SwipeSessionRow` — before → after

| Field          | Before           | After                        |
| -------------- | ---------------- | ---------------------------- |
| `id`           | `string`         | `string` (unchanged)         |
| `deck_id`      | _(absent)_       | `string` **NEW**             |
| `started_at`   | `number`         | `number` (unchanged)         |
| `ended_at`     | `number \| null` | `number \| null` (unchanged) |
| `filters_json` | `string`         | `string` (unchanged)         |

#### `SwipeSession` — before → after

| Field       | Before           | After                        |
| ----------- | ---------------- | ---------------------------- |
| `id`        | `SessionId`      | `SessionId` (unchanged)      |
| `deckId`    | _(absent)_       | `DeckId` **NEW**             |
| `startedAt` | `number`         | `number` (unchanged)         |
| `endedAt`   | `number \| null` | `number \| null` (unchanged) |
| `filters`   | `SessionFilters` | `SessionFilters` (unchanged) |

#### `SwipeEventRow` — before → after

| Field        | Before     | After                                 |
| ------------ | ---------- | ------------------------------------- |
| `id`         | `string`   | `string` (unchanged)                  |
| `session_id` | `string`   | `string` (unchanged)                  |
| `deck_id`    | _(absent)_ | `string` **NEW**                      |
| `entity_id`  | `string`   | _(removed)_                           |
| `card_id`    | _(absent)_ | `string` **NEW (replaces entity_id)** |
| `action`     | `string`   | `string` (unchanged)                  |
| `strength`   | `number`   | `number` (unchanged)                  |
| `created_at` | `number`   | `number` (unchanged)                  |

#### `SwipeEvent` — before → after

| Field       | Before         | After                      |
| ----------- | -------------- | -------------------------- |
| `id`        | `SwipeEventId` | `SwipeEventId` (unchanged) |
| `sessionId` | `SessionId`    | `SessionId` (unchanged)    |
| `deckId`    | _(absent)_     | `DeckId` **NEW**           |
| `entityId`  | `EntityId`     | _(removed)_                |
| `cardId`    | _(absent)_     | `DeckCardId` **NEW**       |
| `action`    | `SwipeAction`  | `SwipeAction` (unchanged)  |
| `strength`  | `number`       | `number` (unchanged)       |
| `createdAt` | `number`       | `number` (unchanged)       |

### SwipeCard component prop interface (replaces DeckCard)

```typescript
interface SwipeCardProps {
  title: string;
  subtitle: string;
  tags: string[];
  tileKey: string;
  tileType: string;
  style?: StyleProp<ViewStyle>;
}
```

The `tileType` prop receives the deck's `category` string — this drives the icon selection in `DeterministicTile`. The component is fully decoupled from both `CatalogEntity` and the `DeckCard` domain type.

### New files to CREATE

| File                                   | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `app/deck/[deckId]/play.tsx`           | Swipe session screen                                        |
| `lib/db/swipeRepository.ts`            | Deck-scoped session/event CRUD                              |
| `hooks/useDeckSwipeSession.ts`         | Session state management (card queue, persistence, advance) |
| `__tests__/swipe-repository.test.ts`   | Repository tests                                            |
| `__tests__/deck-swipe-session.test.ts` | Hook/integration tests                                      |

### Files to MODIFY

| File                                 | What changes                                                           |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `lib/db/migrations.ts`               | Add migration 006                                                      |
| `types/domain/swipes.ts`             | Update session/event row types, domain types, mappers                  |
| `components/deck/DeckCard.tsx`       | Rename to `SwipeCard.tsx`, change prop interface                       |
| `components/deck/index.ts`           | Update barrel: `DeckCard` → `SwipeCard`                                |
| `app/deck/[deckId].tsx`              | Wire "Start Swiping" CTA to navigate to `play` route                   |
| `app/_layout.tsx`                    | Register `deck/[deckId]/play` route (or let Expo Router auto-discover) |
| `lib/db/index.ts`                    | Add barrel export for `swipeRepository`                                |
| `__tests__/schema-check.test.ts`     | Update columns, FKs, indexes for rebuilt tables                        |
| `__tests__/db-migrations.test.ts`    | Update expected version to 6                                           |
| `__tests__/domain-models.test.ts`    | Update session/event mapper tests                                      |
| `__tests__/deck-action-bar.test.tsx` | Update if it imported `DeckCard`                                       |

### Files to PRESERVE (do not modify)

| File                                       | Why                                              |
| ------------------------------------------ | ------------------------------------------------ |
| `components/deck/DeckActionBar.tsx`        | Action bar — stable                              |
| `components/deck/DeckActionButton.tsx`     | Action buttons — stable                          |
| `components/deck/DeckStatePlaceholder.tsx` | Placeholder states — reused in play screen       |
| `components/deck/DeckTagsRow.tsx`          | Tag chips — reused in SwipeCard                  |
| `components/deck/deckActionPayload.ts`     | Callback contract — stable                       |
| `components/deck/dispatchDeckAction.ts`    | Dispatch lock — stable                           |
| `components/deck/deckState.ts`             | View states — stable                             |
| `hooks/useDeckGestures.ts`                 | Gesture system — stable                          |
| `hooks/useDeckGestures.constants.ts`       | Gesture constants — stable                       |
| `types/domain/actions.ts`                  | Action model — finalized in Iteration 11         |
| `types/domain/decks.ts`                    | Deck/DeckCard types — stable from Iteration 10   |
| `types/domain/scores.ts`                   | Old scoring types — preserved until Iteration 15 |
| `lib/db/deckRepository.ts`                 | Deck CRUD — stable                               |
| `lib/db/deckCardRepository.ts`             | DeckCard CRUD — stable                           |
| `lib/content/*`                            | Content pipeline — stable from Iteration 13      |

### External troubleshooting and learning resources

#### Official docs

- [Expo Router — Nested dynamic routes](https://docs.expo.dev/router/create-pages/#dynamic-routes) — for `app/deck/[deckId]/play.tsx`
- [Expo SQLite — Transactions](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [React Native Pressable](https://reactnative.dev/docs/pressable) — for CTA button
- [SQLite table rebuild pattern](https://www.sqlite.org/lang_altertable.html#otheralter)

#### Guides

- This repo's migration 004 — the exact pattern for SQLite table rebuild (create new, copy, drop, rename)
- This repo's `docs/deck/DECK_ACTION_CONTRACT.md` — callback contract to preserve

## 6. When stuck

| Problem                                            | Resolution                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration rebuild drops data                       | This is intentional. Old `swipe_events` reference `catalog_entities` which is not the fork's data store. There is no production data. The migration creates clean tables with the new FKs.                                                            |
| FK error: `deck_id` references nonexistent deck    | The `decks` table must be populated (Iteration 13) before any swipe session can be created. The swipe session screen should guard against this by verifying the deck exists before creating a session.                                                |
| `SwipeCard` import breaks existing tests           | After renaming, `grep -r "DeckCard" __tests__/` will show stale imports. Update all to `SwipeCard`. The barrel in `components/deck/index.ts` should export `SwipeCard` (not `DeckCard`).                                                              |
| Route `deck/[deckId]/play` not found               | Create the directory `app/deck/[deckId]/` and add `play.tsx`. Expo Router supports nested dynamic segments. The route will auto-resolve to `/deck/{id}/play`.                                                                                         |
| Card queue runs out                                | When all cards are exhausted, the session should show a completion state: "You've seen all cards in this deck!" with a "Back to Deck" button. Track `seenCardIds` in the hook.                                                                        |
| Gesture system doesn't work in play screen         | Ensure `GestureHandlerRootView` wraps the screen (it already does via root layout). The `useDeckGestures` hook needs `enabled: true` and a valid `screenWidth`.                                                                                       |
| `tileType` produces fallback icon                  | The `iconForEntityType` function maps `type` strings to icons. Deck category strings (like `movies_tv`) may not be in the entity type map. Use the `iconForDeckCategory` helper from Iteration 12 (if created), or extend the map.                    |
| TypeScript errors after changing SwipeEvent fields | Expected. `entityId` is removed, `cardId` and `deckId` are added. Every consumer of `SwipeEvent` will error — fix each one. Since no code was previously consuming `SwipeEvent` from the DB (persistence wasn't wired), most errors will be in tests. |

## 7. Implementation checklist

### 7.1 Add migration 006

**File:** `lib/db/migrations.ts`

Append migration version 6, name `'006_deck_scoped_sessions'`.

The migration rebuilds both `swipe_sessions` and `swipe_events` tables. Since no production data exists (persistence was not wired until this iteration), the migration creates fresh tables.

```sql
-- Rebuild swipe_sessions with deck_id
DROP TABLE IF EXISTS swipe_events;
DROP TABLE IF EXISTS swipe_sessions;

CREATE TABLE swipe_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  filters_json TEXT NOT NULL DEFAULT '{}',
  CHECK(ended_at IS NULL OR ended_at >= started_at),
  FOREIGN KEY (deck_id) REFERENCES decks(id)
);

CREATE TABLE swipe_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  deck_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN (<ACTION_SQL_VALUES>)),
  strength INTEGER NOT NULL CHECK(strength BETWEEN -2 AND 2),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES swipe_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (deck_id) REFERENCES decks(id),
  FOREIGN KEY (card_id) REFERENCES deck_cards(id) ON DELETE RESTRICT
);

CREATE INDEX idx_swipe_sessions_deck_id ON swipe_sessions(deck_id);
CREATE INDEX idx_swipe_sessions_started_at ON swipe_sessions(started_at DESC);
CREATE INDEX idx_swipe_events_created_at ON swipe_events(created_at DESC);
CREATE INDEX idx_swipe_events_session_id ON swipe_events(session_id);
CREATE INDEX idx_swipe_events_deck_id ON swipe_events(deck_id);
CREATE INDEX idx_swipe_events_card_id ON swipe_events(card_id);
```

**Design note:** `DROP TABLE` before `CREATE TABLE` is safe because: (a) no production data exists, (b) `swipe_events` references `swipe_sessions` via CASCADE so dropping sessions first would fail — drop events first. The `DROP IF EXISTS` handles fresh installs where the tables may have been created by the new migration 002 already. Since we are dropping before recreating, the indexes don't need `IF NOT EXISTS`.

### 7.2 Update domain types and mappers

**File:** `types/domain/swipes.ts`

Update both row and domain types. The full set of changes:

**SwipeSessionRow:**

```typescript
export interface SwipeSessionRow {
  id: string;
  deck_id: string; // NEW
  started_at: number;
  ended_at: number | null;
  filters_json: string;
}
```

**SwipeSession:**

```typescript
export interface SwipeSession {
  id: SessionId;
  deckId: DeckId; // NEW
  startedAt: number;
  endedAt: number | null;
  filters: SessionFilters;
}
```

**SwipeEventRow:**

```typescript
export interface SwipeEventRow {
  id: string;
  session_id: string;
  deck_id: string; // NEW
  card_id: string; // RENAMED from entity_id
  action: string;
  strength: number;
  created_at: number;
}
```

**SwipeEvent:**

```typescript
export interface SwipeEvent {
  id: SwipeEventId;
  sessionId: SessionId;
  deckId: DeckId; // NEW
  cardId: DeckCardId; // RENAMED from entityId
  action: SwipeAction;
  strength: number;
  createdAt: number;
}
```

Update all four mapper functions (`rowToSwipeSession`, `swipeSessionToRow`, `rowToSwipeEvent`, `swipeEventToRow`) to handle the new fields. Import `DeckId`, `DeckCardId`, `asDeckId`, `asDeckCardId` from the ids module.

### 7.3 Create swipe repository

**New file:** `lib/db/swipeRepository.ts`

```typescript
type SwipeBoundaryDb = Pick<
  SQLiteDatabase,
  'runAsync' | 'getFirstAsync' | 'getAllAsync'
>;
```

Functions:

| Function                     | Signature                                          | Purpose                                                                      |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `createSwipeSession`         | `(db, deckId: DeckId) => Promise<SwipeSession>`    | Creates a new session row with generated ID and current timestamp            |
| `endSwipeSession`            | `(db, sessionId: SessionId) => Promise<void>`      | Sets `ended_at` to current timestamp                                         |
| `insertSwipeEvent`           | `(db, event: SwipeEvent) => Promise<void>`         | Inserts a single event row                                                   |
| `getSwipeEventsByDeckId`     | `(db, deckId: DeckId) => Promise<SwipeEvent[]>`    | All events for a deck, ordered by `created_at DESC`                          |
| `getSwipeEventCountByDeckId` | `(db, deckId: DeckId) => Promise<number>`          | Count of events for a deck (for confidence checks)                           |
| `getSwipedCardIdsByDeckId`   | `(db, deckId: DeckId) => Promise<Set<DeckCardId>>` | Distinct card IDs already swiped in this deck (for filtering the card queue) |
| `getSessionsByDeckId`        | `(db, deckId: DeckId) => Promise<SwipeSession[]>`  | All sessions for a deck                                                      |

For ID generation, use a simple `crypto.randomUUID()` or a timestamp-based UUID. The branded `asSessionId(uuid)` and `asSwipeEventId(uuid)` wrappers apply.

Export from `lib/db/index.ts`.

### 7.4 Rename DeckCard → SwipeCard

**Rename:** `components/deck/DeckCard.tsx` → `components/deck/SwipeCard.tsx`

Replace the component's props interface. The new interface is decoupled from any domain type:

```typescript
export interface SwipeCardProps {
  title: string;
  subtitle: string;
  tags: string[];
  tileKey: string;
  tileType: string;
  style?: StyleProp<ViewStyle>;
}
```

The component's internal logic stays mostly the same — it renders a `DeterministicTile` and a `DeckTagsRow`. The accessibility label builder uses the new props instead of `entity.xxx`.

**Update barrel:** `components/deck/index.ts` — change `export * from './DeckCard'` to `export * from './SwipeCard'`.

**Update all imports and tests** that reference `DeckCard` as a UI component. Search for `from '@/components/deck'` and `from './DeckCard'`.

### 7.5 Build the swipe session hook

**New file:** `hooks/useDeckSwipeSession.ts`

This hook manages the full lifecycle of a deck swipe session:

```typescript
interface UseDeckSwipeSessionOptions {
  deckId: DeckId;
  deckCategory: string;
}

interface UseDeckSwipeSessionResult {
  state: 'loading' | 'ready' | 'empty' | 'complete' | 'error';
  currentCard: DeckCard | null;
  cardsRemaining: number;
  totalCards: number;
  errorMessage?: string;
  onAction: DeckActionHandler;
}
```

**Lifecycle:**

1. **On mount**: query `getDeckCardsByDeckId(db, deckId)` to get all cards. Query `getSwipedCardIdsByDeckId(db, deckId)` to get already-swiped cards. Filter the card pool to unseen cards. Sort by `sort_order` ascending, then `popularity` descending. Call `createSwipeSession(db, deckId)`.
2. **Ready state**: expose `currentCard` (first card in queue).
3. **On action callback**: call `insertSwipeEvent(db, event)` with the current card's ID, the session ID, and the action. Then advance to the next card.
4. **When cards exhausted**: set state to `'complete'`.
5. **On unmount**: call `endSwipeSession(db, sessionId)`.

The `onAction` callback returned by the hook has the `DeckActionHandler` signature — it plugs directly into `DeckActionBar` and `useDeckGestures` without any adapter.

### 7.6 Build the swipe session screen

**New file:** `app/deck/[deckId]/play.tsx`

This is a full-screen Stack screen that hosts the deck-scoped swipe session.

**Structure:**

```
View (full screen, dark background)
  ├── Header: deck title + cards remaining counter
  ├── Viewport: GestureDetector + Animated.View + SwipeCard
  │   ├── Loading state: DeckStatePlaceholder
  │   ├── Complete state: "All cards swiped!" + back button
  │   └── Error state: error + retry
  ├── ActionBar region: DeckActionBar + last-action debug text
```

**Data flow:**

1. Extract `deckId` from route params
2. Load deck metadata via `useDeckById(deckId)` for title display
3. Use `useDeckSwipeSession({ deckId, deckCategory })` for session state
4. Map `currentCard` (DeckCard domain type) → SwipeCard props: `{ title: card.title, subtitle: card.subtitle, tags: card.tags, tileKey: card.tileKey, tileType: deck.category }`
5. Pass `session.onAction` to both `DeckActionBar` and `useDeckGestures`
6. `dispatchDeckAction` lock semantics work exactly as before

The screen reuses every existing swipe primitive: `DeckActionBar`, `DeckActionButton`, `DeckStatePlaceholder`, `DeckTagsRow`, `useDeckGestures`, `dispatchDeckAction`.

### 7.7 Wire deck detail CTA

**File:** `app/deck/[deckId].tsx`

Replace the placeholder "Start Swiping" behavior with real navigation:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
// On CTA press:
router.push(`/deck/${deckId}/play`);
```

### 7.8 Register the play route

Expo Router auto-discovers `app/deck/[deckId]/play.tsx`. Optionally register it in `app/_layout.tsx` for custom header options:

```typescript
<Stack.Screen
  name="deck/[deckId]/play"
  options={{ headerShown: false, gestureEnabled: false }}
/>
```

`headerShown: false` for an immersive swipe experience. `gestureEnabled: false` prevents the iOS back-swipe gesture from conflicting with card swipe gestures.

### 7.9 Write tests

#### `__tests__/swipe-repository.test.ts`

- `createSwipeSession` returns a session with correct `deckId` and timestamps
- `insertSwipeEvent` persists an event with correct `deckId`, `cardId`, `action`, `strength`
- `getSwipeEventsByDeckId` returns events filtered by deck
- `getSwipedCardIdsByDeckId` returns the correct set of swiped card IDs
- `getSwipeEventCountByDeckId` returns accurate count
- FK constraint: inserting an event with nonexistent `card_id` fails

#### `__tests__/domain-models.test.ts` (update)

- Update `SwipeSession` mapper roundtrip to include `deckId`
- Update `SwipeEvent` mapper roundtrip: `entityId` → `cardId` + `deckId`
- Update `SwipeEvent` invalid action rejection test (unchanged logic, new field names)

#### `__tests__/schema-check.test.ts` (update)

- Update `swipe_sessions` required columns: add `deck_id`
- Update `swipe_events` required columns: replace `entity_id` with `card_id`, add `deck_id`
- Update FK assertions: `swipe_events.card_id` → `deck_cards(id)`, `swipe_events.deck_id` → `decks(id)`, `swipe_sessions.deck_id` → `decks(id)`
- Update required indexes: add `idx_swipe_sessions_deck_id`, `idx_swipe_events_deck_id`, `idx_swipe_events_card_id`
- Update smoke CRUD: insert deck + deck_card as parents before inserting session + event

#### `__tests__/db-migrations.test.ts` (update)

- Version expectations: 5 → 6

### 7.10 Update documentation

- `docs/db/SCHEMA.md`: update `swipe_sessions` and `swipe_events` tables with new columns, FKs, and indexes. Update version to 6.
- `docs/domain/DOMAIN_TYPES.md`: update `SwipeSession` and `SwipeEvent` field tables.
- `docs/deck/DECK_ACTION_CONTRACT.md`: note that the callback contract is preserved but the persistence target is now deck-scoped. Update the "What Persistence Needs" section.

### 7.11 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

## 8. Deliverables

1. Migration 006 creates deck-scoped `swipe_sessions` and `swipe_events` tables
2. `SwipeSession` and `SwipeEvent` domain types include `deckId`, event uses `cardId` instead of `entityId`
3. `lib/db/swipeRepository.ts` provides deck-scoped CRUD
4. `DeckCard.tsx` renamed to `SwipeCard.tsx` with decoupled props
5. `app/deck/[deckId]/play.tsx` renders a working swipe session
6. `hooks/useDeckSwipeSession.ts` manages session lifecycle and persistence
7. Deck detail CTA navigates to the play route
8. Every swipe action persists a `swipe_events` row with correct `deck_id` and `card_id`
9. Cold-start card ordering uses `sort_order` ascending
10. Session completion state renders when all cards are exhausted
11. All tests pass with updated schema and type assertions
12. Documentation updated

## 9. Acceptance criteria

1. **Schema v6**: `swipe_sessions` has `deck_id` column with FK to `decks(id)`.
2. **Schema v6**: `swipe_events` has `deck_id` and `card_id` columns, no `entity_id`.
3. **Persistence works**: swiping a card in the play screen creates a `swipe_events` row. Verified by querying the DB after a swipe.
4. **Deck scoping works**: `getSwipeEventsByDeckId(db, deckId)` returns only events for that deck.
5. **Session lifecycle**: a session is created on mount, ended on unmount.
6. **Card queue respects seen cards**: cards already swiped in prior sessions do not appear again.
7. **Cold-start order**: first card shown is the one with `sort_order = 0`.
8. **Completion state**: after all cards are swiped, the screen shows a completion message.
9. **Navigation works**: "Start Swiping" on deck detail pushes the play screen, back button returns.
10. **SwipeCard renders**: the renamed component renders title, subtitle, tags, and tile correctly.
11. **Gesture and button parity**: both gestures and buttons produce persisted events.
12. **No `DeckCard` UI component references**: `rg "from.*DeckCard" components/ app/ hooks/ __tests__/` returns 0 hits (all migrated to `SwipeCard`).
13. **Tests pass**: `npm test` exits 0.
14. **Typecheck passes**: `npm run typecheck` exits 0.
15. **Lint passes**: `npm run lint` exits 0.
16. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence                    | Verification command                                    |
| --------------------------- | ------------------------------------------------------- |
| Migration 006 exists        | `rg "006_" lib/db/migrations.ts`                        |
| Schema version 6            | `npm test -- db-migrations` passes                      |
| `deck_id` in swipe_sessions | `npm test -- schema-check` passes with updated columns  |
| `card_id` in swipe_events   | `npm test -- schema-check` passes                       |
| `entity_id` removed         | `rg "entity_id" types/domain/swipes.ts` returns 0 hits  |
| SwipeCard exists            | `ls components/deck/SwipeCard.tsx`                      |
| DeckCard UI gone            | `rg "DeckCard" components/deck/index.ts` returns 0 hits |
| Play route exists           | `ls app/deck/\[deckId\]/play.tsx`                       |
| Swipe repository exists     | `ls lib/db/swipeRepository.ts`                          |
| Session hook exists         | `ls hooks/useDeckSwipeSession.ts`                       |
| Tests pass                  | `npm test` exit code 0                                  |
| Typecheck passes            | `npm run typecheck` exit code 0                         |
| Lint passes                 | `npm run lint` exit code 0                              |
| Format passes               | `npm run format -- --check` exit code 0                 |

## 11. Validation commands

```bash
# Full validation suite
npm run typecheck
npm run lint
npm run format -- --check
npm test

# Targeted tests
npm test -- swipe-repository
npm test -- deck-swipe-session
npm test -- schema-check
npm test -- db-migrations
npm test -- domain-models

# Verify old naming removed
rg "entity_id" types/domain/swipes.ts
rg "DeckCard" components/deck/index.ts
rg "from.*DeckCard" components/ app/ hooks/ __tests__/

# Verify new files exist
ls app/deck/*/play.tsx
ls lib/db/swipeRepository.ts
ls hooks/useDeckSwipeSession.ts
ls components/deck/SwipeCard.tsx

# Verbose test output
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 15 (Build deck profile summary v1)

1. **Persistence is live.** Swipe events are now stored with `deck_id` and `card_id`. Iteration 15 can query `getSwipeEventsByDeckId(db, deckId)` to aggregate scores per tag, compute sentiment distribution, and build deck profiles.

2. **Schema is at version 6.** Iteration 15 may need new tables for deck-scoped scoring (replacing or supplementing the old `taste_tag_scores`, `taste_type_scores`, `entity_affinity` tables). The next migration is version 7.

3. **Old scoring tables still exist.** `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, and `profile_snapshots` are still in the schema from migration 002 but are not used by any fork code. Iteration 15 should either repurpose them with `deck_id` columns or create new deck-scoped tables. Creating new tables is cleaner.

4. **Card tags are the profile building blocks.** Each card has `tags` (parsed from `tags_json`). The deck profile should aggregate swipe weights by tag to produce theme scores. The `ACTION_WEIGHTS` map (`hard_no: -2, no: -1, skip: 0, yes: 1, strong_yes: 2`) is the weighting function.

5. **`getSwipeEventCountByDeckId`** returns the total events for a deck — useful for determining profile stage (Stage 1 vs 2 vs 3 per CLAUDE.md Section 8.3). The deck's `minCardsForProfile` and `minCardsForCompare` thresholds from the `decks` table define the stage boundaries.

6. **Card coverage** can be computed by comparing `getSwipedCardIdsByDeckId(db, deckId).size` against `deck.cardCount`. This is one factor in confidence scoring (CLAUDE.md Section 8.4).

7. **The SwipeCard component** (`components/deck/SwipeCard.tsx`) is decoupled from domain types. The `tileType` prop controls the icon. Iteration 15's profile screen can render card references using the same component or a dedicated summary view.

8. **Session data** is available per deck via `getSessionsByDeckId`. This enables history features later, but is not needed for Iteration 15's profile computation (which operates on events, not sessions).
