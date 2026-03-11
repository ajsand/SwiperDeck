# Iteration 11: Standardize universal dating-fork action model

## 1. Objective

Replace the inherited TasteDeck action vocabulary with the fork's canonical 5-state action system defined in CLAUDE.md Section 7.1. This means three concrete changes applied atomically across the domain layer, UI, gesture system, persistence, and tests:

1. **Rename** `love` → `strong_yes` everywhere.
2. **Remove** `respect` and `curious` from the canonical action set (they were never wired in UI and are deferred per CLAUDE.md Section 7.5).
3. **Add SQLite migration 004** to rebuild `swipe_events` with the updated CHECK constraint and normalize any existing data.

After this iteration, the action model is:

| Value | Weight | Gesture mapping | Label |
|-------|--------|-----------------|-------|
| `hard_no` | -2 | Strong left swipe | Hard No |
| `no` | -1 | Normal left swipe | No |
| `skip` | 0 | Button only | Skip |
| `yes` | +1 | Normal right swipe | Yes |
| `strong_yes` | +2 | Strong right swipe | Strong Yes |

No other values exist. The callback contract shapes (`DeckActionHandler`, `DeckActionPayload`, `DeckActionMeta`, `dispatchDeckAction` lock semantics) are preserved. Only the literal string values emitted through those interfaces change.

## 2. Why this matters

The action model is the spine of the entire product. Every downstream system depends on a stable, universal set of action values:

- **Deck profiles** (Iteration 15) aggregate scores by action weight — the weight map must be final.
- **Compare reports** (Iterations 16–18) match users by action patterns — both users must use the same canonical set.
- **Custom decks** (Iteration 21) promise universal action support — the values must be settled before deck content is authored.
- **DB persistence** (Iteration 14) stores action strings in `swipe_events.action` — the CHECK constraint must reflect the fork's vocabulary.

Delaying this rename creates growing technical debt: every future iteration would need to mentally translate `love` → `strong_yes` and wonder whether `respect`/`curious` are available. Doing it now, before any deck content or profile logic exists, makes the rename cheap and safe.

CLAUDE.md Section 20 explicitly calls out "Action semantics drift" as the #1 design risk. This iteration eliminates that risk for the fork.

## 3. Scope

### In scope

- **`types/domain/actions.ts`**: Replace `ACTIONS`, `CORE_ACTIONS`, `SwipeAction`, `CoreSwipeAction`, `ACTION_LABELS`, `CORE_ACTION_LABELS`, `ACTION_WEIGHTS`, and all guards/parsers
- **`components/deck/DeckActionButton.tsx`**: Update `ACTION_VISUAL_CONFIG` and `ACTION_HINTS` (rename `love` key to `strong_yes`, update icon and hint text)
- **`hooks/useDeckGestures.ts`**: Change two `'love'` string literals to `'strong_yes'` in `resolveDeckSwipeAction`
- **`lib/db/migrations.ts`**: Add migration version 004 that rebuilds `swipe_events` with the new CHECK constraint and normalizes existing data
- **All affected test files**: Update every assertion referencing `love`, `respect`, or `curious`
- **Documentation**: Update `docs/deck/DECK_ACTION_CONTRACT.md`, `docs/domain/DOMAIN_TYPES.md`, `docs/db/SCHEMA.md`

### Out of scope

- Changing callback contract shapes (`DeckActionHandler`, `DeckActionPayload`, `DeckActionMeta`) — shapes are preserved, only emitted values change
- Changing dispatch lock semantics (`dispatchDeckAction`) — logic is preserved
- Changing gesture thresholds (`useDeckGestures.constants.ts`) — physics are preserved
- Adding any new actions — the fork defers `curious`, `used_to_like`, `respect_not_me` to post-MVP (CLAUDE.md Section 7.5)
- Any UI layout, navigation, or screen changes
- Any deck/card schema changes (already done in Iteration 10)
- Rewriting accessibility hint copy beyond what's needed for the rename

### Relationship to old TasteDeck code

| Category | What happens |
|----------|--------------|
| **Replaced** | `ACTIONS` array contents (7 values → 5), `CORE_ACTIONS` contents (love → strong_yes), `ACTION_LABELS` (love/respect/curious entries removed, strong_yes added), `ACTION_WEIGHTS` (same), `ACTION_VISUAL_CONFIG.love` → `.strong_yes`, gesture string literals `'love'` → `'strong_yes'` |
| **Preserved structurally** | `DeckActionHandler` type signature, `DeckActionPayload` interface shape, `DeckActionMeta` interface, `dispatchDeckAction` lock logic, `createDeckActionPayload` factory, `DeckActionBar` rendering loop, gesture physics constants, `GestureSwipeAction` derivation pattern (`Exclude<CoreSwipeAction, 'skip'>`) |
| **Migrated** | `swipe_events.action` CHECK constraint (migration 004), any existing rows with `action = 'love'` normalized to `'strong_yes'`, any rows with `action = 'respect'`/`'curious'` normalized to `'skip'` |

## 4. Multi-model execution strategy

| Step | Model | Task |
|------|-------|------|
| 1 | Claude Opus 4.6 | Write this iteration file with exact before/after for every affected value (done) |
| 2 | GPT-5.4 | Update `types/domain/actions.ts` first — this triggers compile errors everywhere else |
| 3 | GPT-5.4 | Fix every compile error (TypeScript `satisfies` exhaustiveness catches them all) |
| 4 | GPT-5.4 | Update gesture string literals in `useDeckGestures.ts` |
| 5 | GPT-5.4 | Add migration 004 to `lib/db/migrations.ts` |
| 6 | GPT-5.4 | Update all test assertions |
| 7 | GPT-5.4 | Update documentation |
| 8 | GPT-5.4 | Run full validation suite |
| 9 | Claude Opus 4.6 | Review for completeness — no `love`/`respect`/`curious` remnants anywhere |

### Recommended implementation order

The safest sequence leverages TypeScript's compile-time safety:

1. Change `ACTIONS` and `CORE_ACTIONS` arrays in `actions.ts` **first**.
2. Run `npm run typecheck`. TypeScript will report every `Record<SwipeAction, ...>` and `Record<CoreSwipeAction, ...>` that needs updating — `ACTION_LABELS`, `ACTION_WEIGHTS`, `CORE_ACTION_LABELS`, `ACTION_VISUAL_CONFIG`, `ACTION_HINTS`. Fix each one.
3. The `GestureSwipeAction` type auto-derives from `CoreSwipeAction` via `Exclude<CoreSwipeAction, 'skip'>`, so it updates automatically. But the string literals `'love'` in `resolveDeckSwipeAction` will fail type checking — fix those.
4. After typecheck passes, run tests. Every test asserting on `'love'` will fail — fix each assertion.
5. Add migration 004 and update migration tests.
6. Final validation pass.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document | Relevant sections |
|----------|-------------------|
| `/CLAUDE.md` Section 7 | Canonical action system: `hard_no`, `no`, `skip`, `yes`, `strong_yes`. Semantics for entity vs statement cards. UI label adaptation rule. Deferred signals list. |
| `/CLAUDE.md` Section 1.6 | Product principle: "Universal action system — all decks use the same core action semantics" |
| `/CLAUDE.md` Section 20.1 | Design risk: "Action semantics drift" — this iteration eliminates it |
| `/iterations/10-...md` Section 12 | Handoff notes: schema at version 3, migration 004 is next, CARD_KINDS pattern for dynamic CHECK |

### Current repo implementation anchors — full before/after map

#### `types/domain/actions.ts` — THE source of truth for action values

| Constant | Before (TasteDeck) | After (DateDeck) |
|----------|---------------------|-------------------|
| `ACTIONS` | `['hard_no','no','skip','yes','love','respect','curious']` | `['hard_no','no','skip','yes','strong_yes']` |
| `SwipeAction` | 7-member union | 5-member union |
| `CORE_ACTIONS` | `['hard_no','no','skip','yes','love']` | `['hard_no','no','skip','yes','strong_yes']` |
| `CoreSwipeAction` | 5-member union (includes `love`) | 5-member union (includes `strong_yes`) |
| `ACTION_LABELS.love` | `'Love'` | *(removed)* |
| `ACTION_LABELS.respect` | `'Respect'` | *(removed)* |
| `ACTION_LABELS.curious` | `'Curious'` | *(removed)* |
| `ACTION_LABELS.strong_yes` | *(did not exist)* | `'Strong Yes'` |
| `ACTION_WEIGHTS.love` | `2` | *(removed)* |
| `ACTION_WEIGHTS.respect` | `0.5` | *(removed)* |
| `ACTION_WEIGHTS.curious` | `0.25` | *(removed)* |
| `ACTION_WEIGHTS.strong_yes` | *(did not exist)* | `2` |

The `satisfies Record<SwipeAction, ...>` constraint on `ACTION_LABELS` and `ACTION_WEIGHTS` means TypeScript will error immediately after changing `ACTIONS` — this is the compile-time safety net.

#### `components/deck/DeckActionButton.tsx` — UI visual config

| Key in `ACTION_VISUAL_CONFIG` | Before | After |
|-------------------------------|--------|-------|
| `love` | `{ iconName: 'heart-outline', iconColor: '#EC4899', ... }` | *(removed)* |
| `strong_yes` | *(did not exist)* | `{ iconName: 'star-outline', iconColor: '#EC4899', borderColor: '#EC4899', backgroundColor: 'rgba(255,255,255,0.08)', size: 52, iconSize: 26 }` |

| Key in `ACTION_HINTS` | Before | After |
|------------------------|--------|-------|
| `love` | `'Strongly like this and move to next'` | *(removed)* |
| `strong_yes` | *(did not exist)* | `'Strongly positive — move to next'` |

Icon choice: `star-outline` (Ionicons) replaces `heart-outline` to match the more neutral `strong_yes` semantics. The pink color (`#EC4899`) is preserved for visual continuity. The icon could alternatively remain `heart-outline` if preferred — both are valid. The implementation model should use `star-outline` unless it renders poorly, in which case `heart-outline` is acceptable.

#### `hooks/useDeckGestures.ts` — gesture action resolution

Two string literal changes in `resolveDeckSwipeAction`:

```
Line ~66: action: direction > 0 ? 'love' : 'hard_no'
                                   ^^^^^
                                   change to 'strong_yes'

Line ~73: (no change — this returns 'yes' / 'no')
```

The `GestureSwipeAction` type (`Exclude<CoreSwipeAction, 'skip'>`) auto-updates to `'hard_no' | 'no' | 'yes' | 'strong_yes'` because it's derived from `CoreSwipeAction`.

#### `lib/db/migrations.ts` — migration 004

Add migration version 4, name `'004_standardize_action_model'`. The migration rebuilds `swipe_events` to update the CHECK constraint and normalizes existing data.

The `ACTION_SQL_VALUES` constant at the top of the file is already computed from the `ACTIONS` array. After updating `ACTIONS`, this constant will produce `'hard_no','no','skip','yes','strong_yes'` automatically. However, this only affects fresh installs (where migration 002 creates the table). For existing installs, migration 004 handles the rebuild.

#### Files that auto-update via the type system (no manual changes needed)

| File | Why it auto-updates |
|------|---------------------|
| `components/deck/deckActionPayload.ts` | Imports `CoreSwipeAction` type — the type changes, but the code doesn't reference any literal action strings |
| `components/deck/dispatchDeckAction.ts` | Same — imports type, no literals |
| `components/deck/DeckActionBar.tsx` | Iterates `CORE_ACTIONS` — the array changes, but the iteration logic doesn't |
| `types/domain/swipes.ts` | `normalizeSwipeAction` validates against the updated `ACTIONS` set automatically |
| `types/domain/snapshots.ts` | `parseSwipeAction` validates against the updated set automatically |

#### Files to PRESERVE (do not modify)

| File | Why |
|------|-----|
| `hooks/useDeckGestures.constants.ts` | Gesture physics thresholds — not related to action values |
| `types/domain/catalog.ts` | Entity types — unrelated |
| `types/domain/scores.ts` | Score structures — unrelated (scoring logic is Iteration 15) |
| `types/domain/ids.ts` | Branded IDs — unrelated |
| `types/domain/parsers.ts` | JSON parsers — unrelated |
| `types/domain/decks.ts` | Deck/DeckCard types from Iteration 10 — unrelated |
| `lib/db/deckRepository.ts` | Deck CRUD from Iteration 10 — unrelated |
| `lib/db/deckCardRepository.ts` | DeckCard CRUD from Iteration 10 — unrelated |
| `lib/db/catalogRepository.ts` | Old catalog repo — unrelated |
| `lib/db/client.ts` | DB client — unrelated |
| All `app/` screen files | No screen changes in this iteration |

### External troubleshooting and learning resources

#### Official docs
- [SQLite ALTER TABLE limitations](https://www.sqlite.org/lang_altertable.html) — explains why CHECK constraints require table rebuild
- [SQLite foreign key support](https://www.sqlite.org/foreignkeys.html) — FK behavior during table rebuild
- [TypeScript `satisfies` operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) — how exhaustiveness checking catches missed renames

#### Step-by-step guides
- [SQLite table rebuild pattern](https://www.sqlite.org/lang_altertable.html#otheralter) — the recommended 12-step ALTER TABLE process
- [Expo SQLite exec/run/transaction API](https://docs.expo.dev/versions/latest/sdk/sqlite/)

#### YouTube
- Search "SQLite table rebuild migration" for visual walkthrough of the CREATE-copy-DROP-RENAME pattern
- Search "TypeScript satisfies exhaustive" for how `satisfies Record<UnionType, ...>` catches missing keys

#### GitHub repos
- This repo's `lib/db/migrations.ts` — migration 002 is the canonical pattern for multi-statement schema creation
- This repo's `types/domain/actions.ts` — the file being refactored; read current state before changing

#### Stack Overflow / discussion boards
- [SQLite change CHECK constraint](https://stackoverflow.com/questions/tagged/sqlite+alter-table+check-constraints) — confirms table rebuild is required
- [expo-sqlite tag](https://stackoverflow.com/questions/tagged/expo-sqlite)

## 6. When stuck

| Problem | Resolution |
|---------|------------|
| TypeScript errors after changing ACTIONS | This is expected and desirable. Every `satisfies Record<SwipeAction, ...>` will error because the record keys no longer match the union. Fix each one by adding `strong_yes` and removing `love`/`respect`/`curious`. |
| `GestureSwipeAction` type error | The type is `Exclude<CoreSwipeAction, 'skip'>`. If `CoreSwipeAction` now includes `strong_yes` but the gesture code still returns `'love'`, TypeScript will catch it. Change the two `'love'` literals in `resolveDeckSwipeAction`. |
| Migration 004 fails in transaction | SQLite supports DDL (CREATE TABLE, DROP TABLE, ALTER TABLE) inside transactions. If you get an error, check that you're using `execAsync` for multi-statement SQL, not `runAsync` (which is single-statement). |
| FK constraint error during table rebuild | The INSERT INTO ... SELECT copies valid FK references from the existing table. If FKs fail, it means the source data has orphan references (unlikely). Check `PRAGMA foreign_key_check` before and after. |
| Test expecting `'love'` still passes (stale cache) | Run `npm test -- --clearCache` to ensure Jest picks up the new constant values. |
| `ACTION_VISUAL_CONFIG` type error | This is `Record<CoreSwipeAction, DeckActionVisualConfig>`. After changing `CoreSwipeAction`, you must rename the `love` key to `strong_yes`. |
| Icon `star-outline` doesn't render | Verify the icon name exists in Ionicons. Check at [icons.expo.fyi](https://icons.expo.fyi/?search=star-outline). If it doesn't exist in the bundled version, use `star` or fall back to `heart-outline`. |
| Unsure if migration 004 is needed on fresh install | Yes, it's still needed for correctness. On a fresh install, migration 002 already creates `swipe_events` with the *new* ACTIONS-derived CHECK (since ACTIONS was updated). Migration 004 runs after that and is effectively a no-op (rebuilds the same table). This is safe. |
| `respect`/`curious` appear in schema-check test | The schema-check test smoke CRUD uses `eventAction = 'yes'` which is valid in both old and new. But if any test data uses `'love'`, `'respect'`, or `'curious'`, update it. |

## 7. Implementation checklist

### 7.1 Update the action constants (trigger compile cascade)

**File:** `types/domain/actions.ts`

Replace the entire file's constant definitions. Keep all function signatures identical — only the constant values change.

**ACTIONS:**
```typescript
// Before
export const ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'love', 'respect', 'curious'] as const;

// After
export const ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'strong_yes'] as const;
```

**CORE_ACTIONS:**
```typescript
// Before
export const CORE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'love'] as const;

// After
export const CORE_ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'strong_yes'] as const;
```

**ACTION_LABELS:**
```typescript
// After
export const ACTION_LABELS = {
  hard_no: 'Hard No',
  no: 'No',
  skip: 'Skip',
  yes: 'Yes',
  strong_yes: 'Strong Yes',
} as const satisfies Record<SwipeAction, string>;
```

**CORE_ACTION_LABELS:**
```typescript
// After
export const CORE_ACTION_LABELS = {
  hard_no: ACTION_LABELS.hard_no,
  no: ACTION_LABELS.no,
  skip: ACTION_LABELS.skip,
  yes: ACTION_LABELS.yes,
  strong_yes: ACTION_LABELS.strong_yes,
} as const satisfies Record<CoreSwipeAction, string>;
```

**ACTION_WEIGHTS:**
```typescript
// After
export const ACTION_WEIGHTS = {
  hard_no: -2,
  no: -1,
  skip: 0,
  yes: 1,
  strong_yes: 2,
} as const satisfies Record<SwipeAction, number>;
```

All function bodies (`isSwipeAction`, `isCoreSwipeAction`, `parseSwipeAction`, `normalizeSwipeAction`, `actionToDbStrength`, `assertNever`) remain unchanged — they operate on the sets/records which auto-update.

Run `npm run typecheck` after this step. It will report errors in `DeckActionButton.tsx` and nowhere else (other files import types, not literal values).

### 7.2 Update DeckActionButton visual config and hints

**File:** `components/deck/DeckActionButton.tsx`

In `ACTION_VISUAL_CONFIG`, rename the `love` key to `strong_yes` and update the icon:

```typescript
// Before
love: {
  iconName: 'heart-outline',
  iconColor: '#EC4899',
  borderColor: '#EC4899',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  size: 52,
  iconSize: 26,
},

// After
strong_yes: {
  iconName: 'star-outline',
  iconColor: '#EC4899',
  borderColor: '#EC4899',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  size: 52,
  iconSize: 26,
},
```

In `ACTION_HINTS`, rename the key and update the text:

```typescript
// Before
love: 'Strongly like this and move to next',

// After
strong_yes: 'Strongly positive — move to next',
```

No other changes in this file. The `DeckActionButtonProps` interface uses `CoreSwipeAction` which auto-updates. The `CORE_ACTION_LABELS[action]` accessor for `accessibilityLabel` auto-resolves because the labels map was updated in 7.1. The `testID` pattern `deck-action-${action}` will now produce `deck-action-strong_yes` (tests must match).

### 7.3 Update gesture resolution string literals

**File:** `hooks/useDeckGestures.ts`

In `resolveDeckSwipeAction`, change the strong-swipe return:

```typescript
// Before (around line 66)
action: direction > 0 ? 'love' : 'hard_no',

// After
action: direction > 0 ? 'strong_yes' : 'hard_no',
```

This is the only code change in this file. The `GestureSwipeAction` type (`Exclude<CoreSwipeAction, 'skip'>`) auto-updates. The gesture physics, animation, and snap-back logic are all unchanged.

### 7.4 Add migration 004

**File:** `lib/db/migrations.ts`

Append a new migration to the `migrations` array:

```typescript
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
          WHEN action = 'love' THEN 'strong_yes'
          WHEN action IN ('respect', 'curious') THEN 'skip'
          ELSE action
        END,
        CASE
          WHEN action IN ('respect', 'curious') THEN 0
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
```

Note: `ACTION_SQL_VALUES` is already computed at module top from `ACTIONS.map(a => \`'${a}'\`).join(',')`. After step 7.1, this produces `'hard_no','no','skip','yes','strong_yes'` — the correct new CHECK.

The normalization logic: `love` → `strong_yes` (direct rename), `respect`/`curious` → `skip` with strength reset to 0 (safe neutral fallback since these were never wired in UI and should have zero rows in practice).

### 7.5 Update test files

Every test file that asserts on action string values needs updating. The changes are mechanical — rename `'love'` to `'strong_yes'` and remove `'respect'`/`'curious'` assertions.

#### `__tests__/actions.test.ts`

| Assertion | Before | After |
|-----------|--------|-------|
| `ACTIONS` array | `['hard_no','no','skip','yes','love','respect','curious']` | `['hard_no','no','skip','yes','strong_yes']` |
| `CORE_ACTIONS` array | `['hard_no','no','skip','yes','love']` | `['hard_no','no','skip','yes','strong_yes']` |
| `isCoreSwipeAction('love')` | `true` | Remove this assertion |
| `isCoreSwipeAction('respect')` | `false` | Remove this assertion |
| `ACTION_LABELS.love` | `'Love'` | Replace with `ACTION_LABELS.strong_yes` → `'Strong Yes'` |
| `ACTION_WEIGHTS.respect` | `0.5` | Remove |
| `ACTION_WEIGHTS.curious` | `0.25` | Remove |
| `actionToDbStrength('respect')` | `1` | Remove |
| `actionToDbStrength('curious')` | `0` | Remove |

Add new assertions:
- `isCoreSwipeAction('strong_yes')` → `true`
- `isCoreSwipeAction('love')` → `false` (it's no longer a valid action)
- `ACTION_LABELS.strong_yes` → `'Strong Yes'`
- `ACTION_WEIGHTS.strong_yes` → `2`
- `actionToDbStrength('strong_yes')` → `2`

#### `__tests__/use-deck-gestures.test.ts`

| Test description | Value change |
|-----------------|-------------|
| "maps strong right swipe to love" | Description: "...to strong_yes". Expected action: `'strong_yes'` |
| Strong right swipe assertion | `action: 'love'` → `action: 'strong_yes'` |

All other tests (`'yes'`, `'no'`, `'hard_no'`, cancel) remain unchanged.

#### `__tests__/deck-action-dispatch-parity.test.ts`

| Test | Value change |
|------|-------------|
| Strong gesture resolved action | `resolved?.action` expected `'love'` → `'strong_yes'` |
| Payload assertion | `action: 'love'` → `action: 'strong_yes'` |

Tests for `'yes'`/`'no'` and "skip never from gesture" remain unchanged.

#### `__tests__/deck-action-bar.test.tsx`

| Constant | Before | After |
|----------|--------|-------|
| `EXPECTED_ACTIONS` | `['hard_no','no','skip','yes','love']` | `['hard_no','no','skip','yes','strong_yes']` |
| `onAction.mock.calls` | Last entry `['love', { source: 'button' }]` | `['strong_yes', { source: 'button' }]` |

#### `__tests__/db-migrations.test.ts`

Update expected schema version:

| Assertion | Before (after Iteration 10) | After |
|-----------|----------------------------|-------|
| `firstStartup.userVersion` | `3` | `4` |
| `firstStartup.targetVersion` | `3` | `4` |
| `secondStartup.userVersion` | `3` | `4` |
| `secondStartup.targetVersion` | `3` | `4` |
| `firstRun.toVersion` | `3` | `4` |
| `firstRun.appliedMigrations` | `3` | `4` |
| `secondRun.fromVersion` | `3` | `4` |
| `secondRun.toVersion` | `3` | `4` |
| `db.userVersion` (final) | `3` | `4` |
| `status.userVersion` | `3` | `4` |
| `status.targetVersion` | `3` | `4` |

#### `__tests__/schema-check.test.ts`

The smoke CRUD test uses `eventAction: SwipeAction = 'yes'` which is valid in both old and new. No change needed unless any test data explicitly uses `'love'`.

#### `__tests__/dispatch-deck-action.test.ts`

This test uses `'yes'` and `'hard_no'` as test actions — both are unchanged. No modifications needed.

#### `__tests__/domain-models.test.ts`

The swipe event test creates an invalid action `'hard_yes'` to verify rejection. This still works. The catalog entity tests don't reference actions. No changes needed unless `'love'` appears as test data — search and replace if so.

### 7.6 Update documentation

#### `docs/deck/DECK_ACTION_CONTRACT.md`

- Update the action values table: replace `love` row with `strong_yes`
- Update `GestureSwipeAction` definition: `'hard_no' | 'no' | 'yes' | 'strong_yes'`
- Update any prose references to `love`
- Note that `respect` and `curious` have been removed from the fork's action model entirely (not just deferred from UI)
- Update the fork context block at the top to note that Iteration 11 is now complete

#### `docs/domain/DOMAIN_TYPES.md`

- Update the `ACTIONS` array documentation
- Update the `CORE_ACTIONS` array documentation
- Update the `ACTION_WEIGHTS` table
- Remove `respect` and `curious` from all examples
- Update the "How to Add a New Swipe Action" section (unchanged procedure, just with current values)

#### `docs/db/SCHEMA.md`

- Update the `swipe_events.action` CHECK constraint documentation: `CHECK IN: hard_no, no, skip, yes, strong_yes`
- Update schema version to 4
- Add migration 004 reference

### 7.7 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

All four must exit 0.

## 8. Deliverables

1. `types/domain/actions.ts` uses `['hard_no','no','skip','yes','strong_yes']` as both `ACTIONS` and `CORE_ACTIONS`
2. `ACTION_LABELS` and `ACTION_WEIGHTS` contain exactly 5 entries matching the new set
3. `DeckActionButton.tsx` renders `strong_yes` with appropriate icon, color, and accessibility hint
4. `useDeckGestures.ts` maps strong right swipe to `'strong_yes'` (not `'love'`)
5. Migration 004 rebuilds `swipe_events` with the new CHECK constraint
6. Migration 004 normalizes `love` → `strong_yes` and `respect`/`curious` → `skip` in existing data
7. All test files pass with updated assertions
8. All three doc files are updated
9. Zero references to `'love'` as an action value in any `.ts`/`.tsx` file
10. Zero references to `'respect'` or `'curious'` as action values in any `.ts`/`.tsx` file
11. All validation commands pass

## 9. Acceptance criteria

1. **Canonical set**: `ACTIONS` equals `['hard_no','no','skip','yes','strong_yes']`. `CORE_ACTIONS` equals the same.
2. **No remnants**: `rg "'love'" types/ components/ hooks/ lib/ __tests__/` returns zero action-context matches. (The word "love" may appear in non-action contexts like comments — those are fine. The literal `'love'` as an action value must be gone.)
3. **No `respect`/`curious`**: `rg "'respect'|'curious'" types/ components/ hooks/ lib/ __tests__/` returns zero action-context matches.
4. **Weights correct**: `ACTION_WEIGHTS.strong_yes === 2`, `ACTION_WEIGHTS.hard_no === -2`, exactly 5 entries.
5. **UI renders**: `DeckActionButton` with `action="strong_yes"` renders with `testID="deck-action-strong_yes"`.
6. **Gestures work**: `resolveDeckSwipeAction` with strong right swipe returns `{ action: 'strong_yes', ... }`.
7. **Migration exists**: Schema version is 4. `swipe_events.action` CHECK accepts only the 5 canonical values.
8. **Data normalized**: Any existing `swipe_events` row with `action = 'love'` is migrated to `action = 'strong_yes'`.
9. **Callback contract preserved**: `DeckActionHandler`, `DeckActionPayload`, `DeckActionMeta`, `DispatchDeckActionArgs`, `createDeckActionPayload` signatures are unchanged from pre-iteration state (only the type parameter values they carry changed).
10. **Tests pass**: `npm test` exits 0.
11. **Typecheck passes**: `npm run typecheck` exits 0.
12. **Lint passes**: `npm run lint` exits 0.
13. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence | Verification command |
|----------|---------------------|
| ACTIONS is the 5-value set | `rg "ACTIONS = \[" types/domain/actions.ts` — shows `strong_yes`, no `love`/`respect`/`curious` |
| No `'love'` as action value | `rg "'love'" types/ components/ hooks/ lib/ __tests__/` returns 0 action-context hits |
| No `'respect'` as action value | `rg "'respect'" types/ components/ hooks/ lib/ __tests__/` returns 0 hits |
| No `'curious'` as action value | `rg "'curious'" types/ components/ hooks/ lib/ __tests__/` returns 0 hits |
| Gesture maps strong right to strong_yes | `rg "strong_yes.*hard_no\|hard_no.*strong_yes" hooks/useDeckGestures.ts` — confirms ternary |
| Migration 004 exists | `rg "004_standardize" lib/db/migrations.ts` |
| Schema version 4 | `npm test -- db-migrations` passes with version 4 assertions |
| Callback types unchanged | `git diff components/deck/deckActionPayload.ts` — only possible change is type import auto-update |
| Dispatch logic unchanged | `git diff components/deck/dispatchDeckAction.ts` — no changes expected |
| Gesture constants unchanged | `git diff hooks/useDeckGestures.constants.ts` — empty |
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
npm test -- actions
npm test -- use-deck-gestures
npm test -- deck-action-dispatch-parity
npm test -- deck-action-bar
npm test -- db-migrations
npm test -- schema-check

# Remnant searches (all should return 0 action-context hits)
rg "'love'" types/ components/ hooks/ lib/ __tests__/
rg "'respect'" types/ components/ hooks/ lib/ __tests__/
rg "'curious'" types/ components/ hooks/ lib/ __tests__/

# Confirm strong_yes is present
rg "strong_yes" types/domain/actions.ts
rg "strong_yes" hooks/useDeckGestures.ts
rg "strong_yes" components/deck/DeckActionButton.tsx

# Contract preservation check
git diff --stat components/deck/deckActionPayload.ts components/deck/dispatchDeckAction.ts hooks/useDeckGestures.constants.ts

# Verbose test output (for debugging)
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 12 (Build deck selection and deck detail flows)

1. **Action model is final for MVP.** The canonical set is `hard_no`, `no`, `skip`, `yes`, `strong_yes` with weights -2, -1, 0, +1, +2. All downstream UI, profile logic, and compare logic can rely on this.

2. **Schema version is 4.** Migrations 001–004 are complete. The next migration is version 5 (if needed by Iteration 12, though deck selection UI is unlikely to need schema changes since `decks` and `deck_cards` tables already exist from Iteration 10).

3. **`GestureSwipeAction`** is now `'hard_no' | 'no' | 'yes' | 'strong_yes'` — skip remains button-only. This is stable and should not change.

4. **DeckActionButton** uses `star-outline` icon for `strong_yes` with pink accent color. The icon and label ("Strong Yes") are suitable for both entity cards and statement cards per CLAUDE.md Section 7.3.

5. **No future action extensions planned for MVP.** CLAUDE.md Section 7.5 lists `curious`, `used_to_like`, `respect_not_me` as post-MVP. These are not in `ACTIONS` and adding them later would require a new migration and UI work. The `ACTIONS`/`CORE_ACTIONS` distinction is preserved to support this future expansion.

6. **The DeckCard UI component** (`components/deck/DeckCard.tsx`) currently takes a `CatalogEntity` prop. Iteration 12 will need to wire deck selection UI that eventually passes deck_cards to the swipe UI. The action model is independent of which card type is rendered — the actions are universal.

7. **The `SAMPLE_DECK_ENTITIES` array** in `app/(tabs)/index.tsx` still contains old TasteDeck placeholder data. The action model change does not affect these samples — they're entity definitions, not action records. They will be replaced in Iteration 13 with real deck content.

8. **Existing `swipe_events` data** (if any from development testing) has been normalized by migration 004. No `love`/`respect`/`curious` values remain in the database.
