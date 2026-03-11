# Iteration 13: Ship MVP prebuilt decks

## 1. Objective

Author, bundle, validate, and load the 10 Tier 1 prebuilt decks defined in CLAUDE.md Section 5.2 into the `decks` and `deck_cards` tables. This is the iteration that makes the app usable — after it ships, the deck browser (Iteration 12) displays real decks, the deck detail screen shows real metadata, and users can navigate into a deck full of cards.

The iteration covers:
- defining the JSON content format for prebuilt decks and their cards
- authoring 40–60 cards per deck (400–600 cards total) following CLAUDE.md card composition and authoring rules
- building a content validation and normalization pipeline
- building a startup loader that inserts content into SQLite via the existing repositories
- adding a content-version tracking table to prevent redundant reimport
- writing tests for the pipeline, validation, and content integrity

No swipe session logic, no profile logic, no compare logic. Just content in the database.

## 2. Why this matters

Without content, DateDeck is an empty shell. The deck browser shows "No decks yet." The deck detail screen has nothing to display. No swipe sessions can start. Every downstream iteration (14–25) assumes decks contain cards.

This iteration also establishes the **content authoring conventions** that prebuilt decks and (later) custom decks must follow. The validation pipeline built here will be reused for custom deck import in Iteration 21.

## 3. Scope

### In scope

- **Content JSON file**: `assets/data/prebuilt-decks.json` — single bundled JSON file containing all 10 Tier 1 decks with nested cards
- **Content authoring**: 40–60 cards per deck, mixing entity and statement card kinds per deck spec, following CLAUDE.md Sections 5.4–5.5 and 6.1–6.4
- **Validation module**: `lib/content/validateDeck.ts` — validates and normalizes deck + card entries before DB insertion
- **Loader module**: `lib/content/loadPrebuiltDecks.ts` — reads JSON, validates, inserts via repositories, updates content version
- **SQLite migration 005**: create `__deck_content_meta` single-row table for content version tracking
- **Startup integration**: call the loader from `initializeDatabase()` (or immediately after) on first launch and when content version changes
- **Tests**: content validation tests, loader pipeline tests, content integrity tests (no duplicate IDs, no orphan cards, tag constraints met)
- **Denormalized card_count update**: after loading cards for each deck, compute and update `decks.card_count`

### Out of scope

- **Tier 2 and Tier 3 deck content** — deferred to future iterations
- **Custom deck creation/import** — Iteration 21 (but the validator designed here will be reusable)
- **Swipe session wiring** — Iteration 14
- **Deck profile logic** — Iteration 15
- **Sensitive deck gating UI** — Iteration 19 (no Tier 3 decks ship in this iteration)
- **Card images or licensed media** — text-only per CLAUDE.md 6.4
- **Content authored by a separate Claude pass** — GPT-5.4 authors all content in this iteration; Claude reviews for quality afterward

### Relationship to old TasteDeck code

| Category | What happens |
|----------|--------------|
| **Reused (pattern only)** | The old `docs/catalog/STARTER_CATALOG_CONTRACT.md` established a JSON-module-import + validation + batched-SQLite-insert pattern. This iteration follows the same architecture but targets the `decks`/`deck_cards` tables instead of `catalog_entities`. |
| **Reused (code)** | Parser utilities (`parseStringArrayJson`, `safeJsonParse` from `types/domain/parsers.ts`), repository functions (`upsertDeck`, `upsertDeckCard`, `getDeckCardsByDeckId`, `countDeckCardsByDeckId`), branded ID helpers (`asDeckId`, `asDeckCardId`), migration framework |
| **Not modified** | Existing schema (migrations 001–004), existing domain types, existing UI components, existing screens, existing hooks |
| **New** | Content JSON file, validation module, loader module, migration 005, content integrity tests |

## 4. Multi-model execution strategy

| Step | Model | Task |
|------|-------|------|
| 1 | Claude Opus 4.6 | Write this iteration file with format spec, per-deck content requirements, authoring rules (done) |
| 2 | GPT-5.4 | Build validation module, loader module, migration 005, startup integration |
| 3 | GPT-5.4 | Author all card content for 10 decks following the spec below |
| 4 | GPT-5.4 | Write tests |
| 5 | GPT-5.4 | Run full validation suite |
| 6 | Claude Opus 4.6 | Review content quality: check for tone, balance, card composition, and CLAUDE.md alignment |

### Content authoring note

GPT-5.4 is responsible for both the pipeline code AND the card content. The cards should feel like they were editorially designed — not generic filler. Claude Opus reviews the final content for:
- tone appropriateness for a dating context
- balance between easy/popular and niche/differentiating cards
- absence of manipulative, loaded, or "gotcha" framing
- compliance with CLAUDE.md Section 5.5 quality guidance

## 5. Agent resources and navigation map

### Source-of-truth references

| Document | Relevant sections |
|----------|-------------------|
| `/CLAUDE.md` Section 5.2 | Tier 1 launch categories: Movies & TV, Music, Food & Drinks, Travel, Lifestyle & Routines, Social Habits, Humor, Relationship Preferences, Values, Communication Style |
| `/CLAUDE.md` Section 5.4 | Card composition rules: stable id, deck id, kind, title, description, tags, action support, fallback rendering |
| `/CLAUDE.md` Section 5.5 | Good deck authoring: foundational/representative/differentiator/nuance/retest card roles |
| `/CLAUDE.md` Section 6.1–6.4 | Card kinds (entity/statement), card fields, description guidance, text-only first |
| `/CLAUDE.md` Section 14.1 | Algorithm goals: start with common/representative, then adapt |
| `/docs/catalog/STARTER_CATALOG_CONTRACT.md` | Import pipeline pattern, normalization rules, versioning strategy — architecture reference |
| `/iterations/12-...md` Section 12 | Handoff: deck browser is empty, schema v4, repos available |

### Content format specification

The content ships as a single JSON file:

```
assets/data/prebuilt-decks.json
```

**Top-level structure:**

```json
{
  "version": 1,
  "decks": [
    {
      "id": "deck_movies_tv",
      "title": "Movies & TV",
      "description": "From blockbusters to indie gems — what you watch says a lot about what you value in a story.",
      "category": "movies_tv",
      "tier": "tier_1",
      "sensitivity": "standard",
      "compare_eligible": true,
      "showdown_eligible": true,
      "min_cards_for_profile": 15,
      "min_cards_for_compare": 30,
      "cover_tile_key": "movies_tv:cover",
      "cards": [
        {
          "id": "movies_tv_001",
          "kind": "entity",
          "title": "The Shawshank Redemption",
          "subtitle": "Frank Darabont, 1994",
          "description_short": "Hope and friendship inside prison walls.",
          "tags": ["drama", "classic", "hope"],
          "popularity": 0.95,
          "sort_order": 0
        },
        {
          "id": "movies_tv_002",
          "kind": "statement",
          "title": "I'd rather rewatch a favorite than try something new",
          "subtitle": "",
          "description_short": "Some people find comfort in repetition; others always chase novelty.",
          "tags": ["personality", "habits", "comfort"],
          "popularity": 0.7,
          "sort_order": 5
        }
      ]
    }
  ]
}
```

**Deck entry fields (source shape, pre-normalization):**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | Yes | — | Stable, unique. Prefix with `deck_`. |
| `title` | string | Yes | — | Human-readable deck name. |
| `description` | string | Yes | — | 1–2 sentence explanation of what the deck explores. |
| `category` | string | Yes | — | Must match a `DECK_CATEGORIES` value. |
| `tier` | string | No | `"tier_1"` | |
| `sensitivity` | string | No | `"standard"` | |
| `compare_eligible` | boolean | No | `true` | |
| `showdown_eligible` | boolean | No | `true` | |
| `min_cards_for_profile` | number | No | `15` | |
| `min_cards_for_compare` | number | No | `30` | |
| `cover_tile_key` | string\|null | No | `null` | For DeterministicTile cover art. Recommended: `"{category}:cover"` |
| `cards` | array | Yes | — | Nested card entries for this deck. |

**Card entry fields (source shape):**

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | string | Yes | — | Unique within the deck. Prefix with deck category. |
| `kind` | string | Yes | — | `"entity"` or `"statement"` |
| `title` | string | Yes | — | The card text the user reacts to. |
| `subtitle` | string | No | `""` | Creator/year for entities; empty for statements. |
| `description_short` | string | No | `""` | Clarifying 1-liner. |
| `tags` | string[] | No | `[]` | 3–8 tags per card, from the deck's tag vocabulary. |
| `popularity` | number | No | `0.5` | 0.0–1.0. Higher = shown earlier in cold start. |
| `sort_order` | number | No | auto-assigned | 0-based. Lower = shown earlier. |

### Per-deck content specifications

Each of the 10 Tier 1 decks needs 40–60 cards. Below are the content design briefs.

#### Deck 1: Movies & TV (`movies_tv`)

- **Kind mix**: ~70% entity, ~30% statement
- **Entity examples**: well-known movies, TV shows, directors, genres
- **Statement examples**: "I prefer rewatching favorites over new things", "I judge people by their favorite movie"
- **Tags vocabulary**: `drama`, `comedy`, `action`, `scifi`, `horror`, `romance`, `animation`, `classic`, `indie`, `documentary`, `binge`, `cinema`
- **Card count target**: 50

#### Deck 2: Music (`music`)

- **Kind mix**: ~60% entity, ~40% statement
- **Entity examples**: artists, albums, genres, iconic songs
- **Statement examples**: "I sing in the car", "Music is background noise for me"
- **Tags vocabulary**: `pop`, `rock`, `hiphop`, `electronic`, `classical`, `jazz`, `indie`, `country`, `rnb`, `live-music`, `karaoke`, `discovery`
- **Card count target**: 50

#### Deck 3: Food & Drinks (`food_drinks`)

- **Kind mix**: ~50% entity, ~50% statement
- **Entity examples**: cuisines (Thai, Italian), dishes (sushi, tacos), drinks (craft beer, espresso)
- **Statement examples**: "I'd rather cook at home than eat out", "I'm open to trying anything once"
- **Tags vocabulary**: `cooking`, `dining-out`, `spicy`, `comfort-food`, `health`, `drinks`, `coffee`, `sweets`, `vegetarian`, `adventure-eating`
- **Card count target**: 50

#### Deck 4: Travel (`travel`)

- **Kind mix**: ~40% entity, ~60% statement
- **Entity examples**: destinations, travel styles (backpacking, road trips, luxury resorts)
- **Statement examples**: "I plan every detail before a trip", "I'd rather explore locally than fly far"
- **Tags vocabulary**: `adventure`, `relaxation`, `culture`, `nature`, `city`, `beach`, `mountains`, `budget`, `luxury`, `solo`, `planning`, `spontaneous`
- **Card count target**: 45

#### Deck 5: Lifestyle & Routines (`lifestyle`)

- **Kind mix**: ~15% entity, ~85% statement
- **Entity examples**: morning routines, fitness types, hobbies
- **Statement examples**: "I'm an early bird", "I exercise at least 3 times a week", "I need alone time to recharge"
- **Tags vocabulary**: `morning`, `evening`, `fitness`, `productivity`, `relaxation`, `organization`, `spontaneity`, `energy`, `balance`, `habits`
- **Card count target**: 45

#### Deck 6: Social Habits (`social_habits`)

- **Kind mix**: ~10% entity, ~90% statement
- **Entity examples**: party types, social settings
- **Statement examples**: "I prefer small gatherings over big parties", "I'm the one who plans group hangouts"
- **Tags vocabulary**: `introvert`, `extrovert`, `hosting`, `going-out`, `small-group`, `large-group`, `networking`, `deep-talks`, `lighthearted`, `boundaries`
- **Card count target**: 40

#### Deck 7: Humor (`humor`)

- **Kind mix**: ~50% entity, ~50% statement
- **Entity examples**: comedy shows, comedians, meme culture references
- **Statement examples**: "I appreciate dark humor", "I use humor to defuse tension"
- **Tags vocabulary**: `dark`, `sarcasm`, `slapstick`, `witty`, `absurd`, `dry`, `observational`, `physical`, `self-deprecating`, `punny`
- **Card count target**: 45

#### Deck 8: Relationship Preferences (`relationship_preferences`)

- **Kind mix**: ~5% entity, ~95% statement
- **Statement examples**: "Quality time is my top priority", "I need honest feedback even when it's hard", "Physical touch matters a lot to me"
- **Tags vocabulary**: `quality-time`, `communication`, `independence`, `affection`, `honesty`, `support`, `conflict`, `growth`, `trust`, `boundaries`
- **Card count target**: 45

#### Deck 9: Values (`values`)

- **Kind mix**: ~0% entity, ~100% statement
- **Statement examples**: "Loyalty matters more than ambition", "I believe people can change", "Fairness is more important than mercy"
- **Tags vocabulary**: `honesty`, `loyalty`, `ambition`, `family`, `freedom`, `creativity`, `justice`, `growth`, `stability`, `compassion`, `tradition`, `progress`
- **Card count target**: 45

#### Deck 10: Communication Style (`communication_style`)

- **Kind mix**: ~5% entity, ~95% statement
- **Statement examples**: "I prefer texting over calling", "I need time to process before discussing", "I say what I mean directly"
- **Tags vocabulary**: `direct`, `indirect`, `texting`, `calling`, `face-to-face`, `listening`, `assertive`, `passive`, `empathy`, `debate`, `processing`, `vulnerability`
- **Card count target**: 40

### Card authoring rules (from CLAUDE.md, expanded)

1. **Stable IDs**: Use the pattern `{category}_{NNN}` — e.g., `movies_tv_001`, `values_032`. IDs must be unique across all decks.
2. **Card kinds**: Use `entity` for named things (movies, foods, places). Use `statement` for first-person opinions, preferences, or habits.
3. **Titles**: For entities, use the proper name. For statements, write in first person ("I prefer..." or "I believe...") or as a short declarative.
4. **Descriptions**: Short, clarifying, non-judgmental. Help the user understand what they're reacting to. Avoid loaded framing.
5. **Tags**: 3–8 tags per card, drawn from the deck's tag vocabulary. Lowercase, hyphenated-if-needed.
6. **Popularity**: 0.8–1.0 for well-known/foundational cards, 0.4–0.7 for mid-range, 0.1–0.3 for niche/polarizing.
7. **Sort order**: 0–14 for foundational/popular, 15–34 for mid-range, 35+ for niche/retest.
8. **Tile key**: Auto-derived as `{category}:{id}` by the loader if not specified in the JSON.
9. **Balance**: Each deck should have foundational cards (everyone recognizes), representative cards (cover the category breadth), differentiator cards (reveal meaningful preferences), nuance cards (add depth), and retest candidates (good for resurfacing later).
10. **No gotchas**: Cards should not be designed to trick, manipulate, or embarrass the user.
11. **No highly sensitive content in Tier 1**: Keep Tier 1 decks safe for casual first-date contexts. Sensitive topics belong in Tier 3 gated decks (Iteration 19).

### Suggested file organization

```
assets/
  data/
    prebuilt-decks.json              ← NEW: bundled content file

lib/
  content/
    validateDeck.ts                  ← NEW: deck + card validation/normalization
    loadPrebuiltDecks.ts             ← NEW: startup loader pipeline
    contentVersion.ts                ← NEW: version check helpers
    index.ts                         ← NEW: barrel exports

lib/db/
  migrations.ts                      ← EXTEND: add migration 005

__tests__/
  validate-deck.test.ts              ← NEW: validation logic tests
  load-prebuilt-decks.test.ts        ← NEW: loader pipeline tests
  prebuilt-deck-integrity.test.ts    ← NEW: content quality/integrity checks
```

### External troubleshooting and learning resources

#### Official docs
- [Expo — Importing JSON assets](https://docs.expo.dev/guides/customizing-metro/#adding-more-file-extensions-to-assetexts) — bundled JSON import
- [Expo SQLite batched operations](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [TypeScript resolveJsonModule](https://www.typescriptlang.org/tsconfig/#resolveJsonModule) — JSON import support

#### Step-by-step guides
- This repo's `docs/catalog/STARTER_CATALOG_CONTRACT.md` — the original import pipeline design (architecture reference, not code to reuse)

#### GitHub repos
- This repo's `lib/db/catalogRepository.ts` — the upsert pattern to follow
- This repo's `lib/db/deckRepository.ts` and `lib/db/deckCardRepository.ts` — the repositories that the loader calls

## 6. When stuck

| Problem | Resolution |
|---------|------------|
| JSON import fails | Ensure `tsconfig.json` has `"resolveJsonModule": true` (already set in the inherited config). The file must be valid JSON. Use `npx json5 assets/data/prebuilt-decks.json` or a JSON linter to check. |
| DB insert fails with CHECK constraint | The `deck_cards` table has `CHECK(kind IN ('entity','statement'))` and `CHECK(popularity BETWEEN 0 AND 1)`. Verify the validator normalizes these before insert. |
| FK constraint: deck_card references nonexistent deck | The loader must insert all deck rows FIRST, then insert cards. The `deck_cards.deck_id` FK references `decks(id)` with ON DELETE CASCADE. |
| Content loads on every app start | The version check in `__deck_content_meta` prevents this. If the table row exists and `version >= PREBUILT_DECK_VERSION`, skip loading. |
| Card count mismatch | After loading all cards for a deck, run `SELECT COUNT(*) FROM deck_cards WHERE deck_id = ?` and `UPDATE decks SET card_count = ? WHERE id = ?`. The validator should also verify the JSON cards array length matches the deck's stated card count (if provided). |
| Deck browser still shows empty after loading | The `useDecks()` hook from Iteration 12 queries on mount. If the loader runs in the same startup sequence before the UI mounts, the data will be there. If timing is an issue, the hook's `refresh()` can be called. |
| Performance: loading 500+ cards is slow | Batch inserts in transactions of 50–100 rows. The existing `withExclusiveTransactionAsync` pattern from the migration framework works. For prebuilt content, a single transaction for all cards in one deck is also acceptable (max ~60 rows per transaction). |
| Duplicate card IDs across decks | Card IDs must be globally unique (the `deck_cards` table has a single-column PK on `id`). Use the `{category}_{NNN}` pattern to ensure uniqueness. The integrity test should verify no duplicates. |
| Tags exceed 15 per card | The validator should enforce max 15 tags, truncating excess silently (same rule as the old catalog contract). |

## 7. Implementation checklist

### 7.1 Add migration 005: content meta table

**File:** `lib/db/migrations.ts`

Append migration version 5:

```sql
CREATE TABLE IF NOT EXISTS __deck_content_meta (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  version INTEGER NOT NULL,
  imported_at INTEGER NOT NULL,
  deck_count INTEGER NOT NULL,
  card_count INTEGER NOT NULL
);
```

This single-row table tracks the loaded content version. The `CHECK (id = 1)` ensures only one row can exist (same pattern as `__healthcheck`).

### 7.2 Build the content validation module

**New file:** `lib/content/validateDeck.ts`

This module exports pure functions that validate and normalize deck and card entries from the JSON source. It does NOT touch the database.

**Deck validation function:**

```typescript
interface PrebuiltDeckEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  tier?: string;
  sensitivity?: string;
  compare_eligible?: boolean;
  showdown_eligible?: boolean;
  min_cards_for_profile?: number;
  min_cards_for_compare?: number;
  cover_tile_key?: string | null;
  cards: PrebuiltCardEntry[];
}
```

Normalization rules (adapted from the old catalog contract):
- `id`: trim, must be non-empty string. Reject if missing.
- `title`: trim, must be non-empty. Reject if missing.
- `description`: trim, must be non-empty. Reject if missing.
- `category`: trim, lowercase. Must be non-empty. Reject if missing.
- `tier`: default `'tier_1'`. Validate against `DECK_TIERS`.
- `sensitivity`: default `'standard'`. Validate against `DECK_SENSITIVITIES`.
- `compare_eligible`: default `true`.
- `showdown_eligible`: default `true`.
- `min_cards_for_profile`: default `15`. Must be positive integer.
- `min_cards_for_compare`: default `30`. Must be positive integer, >= min_cards_for_profile.
- `cover_tile_key`: default `null`. If present, trim.
- `cards`: must be a non-empty array. Reject deck if missing or empty.

**Card validation function:**

```typescript
interface PrebuiltCardEntry {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  description_short?: string;
  tags?: string[];
  popularity?: number;
  sort_order?: number;
}
```

Normalization rules:
- `id`: trim, must be non-empty. Reject card if missing.
- `kind`: must be `'entity'` or `'statement'`. Reject card if invalid.
- `title`: trim, must be non-empty. Reject card if missing. Max 200 chars (truncate).
- `subtitle`: trim, default `""`. Max 200 chars.
- `description_short`: trim, default `""`. Max 500 chars.
- `tags`: normalize each tag (trim, lowercase, collapse whitespace). Deduplicate. Filter empty. Max 15 tags (truncate excess).
- `popularity`: clamp to [0, 1]. Default `0.5` if missing/invalid.
- `sort_order`: default to the card's index in the array if not provided. Must be non-negative integer.

**Return types:**
- `validateDeck(entry: unknown): { valid: true; deck: NormalizedDeck } | { valid: false; errors: string[] }`
- `validateCard(entry: unknown, deckId: string): { valid: true; card: NormalizedCard } | { valid: false; errors: string[] }`

Where `NormalizedDeck` and `NormalizedCard` map directly to `Deck` and `DeckCard` domain types respectively (or to their row types for direct insertion).

### 7.3 Build the content loader module

**New file:** `lib/content/loadPrebuiltDecks.ts`

This module handles the full load pipeline:

1. Check `__deck_content_meta.version` against `PREBUILT_DECK_VERSION` constant
2. If version is current, return early (no-op)
3. Import the JSON file: `import prebuiltDecksData from '@/assets/data/prebuilt-decks.json'`
4. Validate the `version` field in the JSON matches `PREBUILT_DECK_VERSION`
5. For each deck entry:
   a. Validate and normalize the deck metadata
   b. Upsert the deck via `upsertDeck(db, deck)`
   c. Validate and normalize each card
   d. Upsert each card via `upsertDeckCard(db, card)`
   e. Count inserted cards and update `decks.card_count`
6. Upsert the `__deck_content_meta` row with the new version, timestamp, and counts
7. Log summary: number of decks loaded, total cards loaded, any skipped entries

**Key design decisions:**
- Use `INSERT OR REPLACE` (already the behavior of `upsertDeck`/`upsertDeckCard`) so re-running the loader is safe and idempotent.
- Process all decks within a single transaction for atomicity. If any deck fails validation fatally, roll back the whole load and log the error.
- Skip individual malformed cards with a warning (don't abort the entire deck for one bad card).
- The `PREBUILT_DECK_VERSION` constant starts at `1`. Bump it when content changes in future app releases.

**Content version module:**

**New file:** `lib/content/contentVersion.ts`

```typescript
export const PREBUILT_DECK_VERSION = 1;

export async function getLoadedContentVersion(db): Promise<number | null> { ... }
export async function setLoadedContentVersion(db, version, deckCount, cardCount): Promise<void> { ... }
```

### 7.4 Build the startup integration

**File:** `lib/db/index.ts`

Modify `initializeDatabase()` to call the prebuilt deck loader after migrations complete:

```typescript
export async function initializeDatabase(dbArg?: SQLiteDatabase): Promise<DatabaseHealth> {
  const db = dbArg ?? (await getDb());
  logDbInfo('App initialization started');
  try {
    await runMigrations(db);
    await loadPrebuiltDecksIfNeeded(db);  // NEW
    const status = await healthCheck(db);
    logDbInfo(`App initialization ready. Schema version: ${status.userVersion}/${status.targetVersion}`);
    return status;
  } catch (error) {
    logDbError('App initialization failed', error);
    throw error;
  }
}
```

The loader is non-throwing by design — if content loading fails, the app still starts (with an empty deck browser). Log the error and continue.

### 7.5 Author the prebuilt deck content

**New file:** `assets/data/prebuilt-decks.json`

Author all 10 decks with their cards following the per-deck specifications in Section 5 above. This is the bulk content authoring task.

**Content quality requirements:**
- Every deck has 40–60 cards
- Cards mix entity and statement kinds per the deck spec
- Tags are drawn from the deck's tag vocabulary (10–15 unique tags per deck)
- Popularity scores follow the distribution: 0.8–1.0 (top ~20% foundational), 0.4–0.7 (middle ~50%), 0.1–0.3 (bottom ~30% niche)
- Sort order places foundational cards first (0–14), mid-range next (15–34), niche/retest last (35+)
- No duplicate IDs across any deck
- Descriptions are short, clarifying, non-judgmental
- Statement cards are written in first person or as clear preference declarations
- No manipulative, loaded, or "gotcha" framing
- Content is appropriate for a casual first-date context

**Tile key derivation:**
For each card, if `tile_key` is not provided in the JSON, the loader derives it as `{deck.category}:{card.id}`. For deck cover, use `{category}:cover`.

### 7.6 Write tests

#### `__tests__/validate-deck.test.ts`

Test the validation/normalization module:
- Accepts a well-formed deck entry
- Rejects deck with missing id/title/description/category
- Rejects deck with empty cards array
- Normalizes category to lowercase
- Defaults tier, sensitivity, thresholds correctly
- Accepts a well-formed card entry
- Rejects card with missing id/kind/title
- Rejects card with invalid kind
- Clamps popularity to [0, 1]
- Truncates tags beyond 15
- Normalizes tags (lowercase, trim, deduplicate)
- Truncates title beyond 200 chars

#### `__tests__/load-prebuilt-decks.test.ts`

Test the loader pipeline with a mock database:
- Loads decks and cards from a small test fixture
- Skips loading when content version is current
- Updates `__deck_content_meta` after successful load
- Handles empty deck array gracefully
- Skips individual malformed cards without aborting

#### `__tests__/prebuilt-deck-integrity.test.ts`

Test the actual `prebuilt-decks.json` content file for structural integrity:
- JSON parses successfully
- Contains exactly 10 decks
- Every deck has a unique ID
- Every card has a unique ID (globally, across all decks)
- Every card's `kind` is `'entity'` or `'statement'`
- Every card has 1–15 tags
- Every card's `popularity` is between 0 and 1
- Every deck has at least 30 cards (minimum for compare eligibility)
- No deck has more than 100 cards (sanity upper bound)
- Total card count is between 400 and 600
- All 10 DECK_CATEGORIES Tier 1 values are represented

### 7.7 Update documentation

**File:** `docs/db/SCHEMA.md`

- Add `__deck_content_meta` table documentation
- Update schema version to 5

**File:** `docs/domain/DOMAIN_TYPES.md`

- Add content validation types documentation
- Note the `PREBUILT_DECK_VERSION` constant

### 7.8 Update migration tests

**File:** `__tests__/db-migrations.test.ts`

Update version expectations: 4 → 5.

**File:** `__tests__/schema-check.test.ts`

Add `__deck_content_meta` to `REQUIRED_TABLES` with its columns.

### 7.9 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

## 8. Deliverables

1. `assets/data/prebuilt-decks.json` containing 10 Tier 1 decks with 400–600 total cards
2. `lib/content/validateDeck.ts` with deck and card validation/normalization
3. `lib/content/loadPrebuiltDecks.ts` with the startup loader pipeline
4. `lib/content/contentVersion.ts` with version check helpers
5. `lib/content/index.ts` barrel exports
6. Migration 005 creates `__deck_content_meta` table
7. `initializeDatabase()` calls the loader after migrations
8. `decks.card_count` is accurately computed and stored for each deck
9. Tests pass for validation, loader, and content integrity
10. Schema and domain docs updated
11. Migration tests updated for version 5
12. All validation commands pass

## 9. Acceptance criteria

1. **10 decks loaded**: `SELECT COUNT(*) FROM decks WHERE is_custom = 0` returns `10`.
2. **400–600 cards loaded**: `SELECT COUNT(*) FROM deck_cards` returns a count in the 400–600 range.
3. **Every deck has cards**: `SELECT d.id, d.card_count FROM decks d WHERE d.card_count = 0` returns 0 rows.
4. **card_count accurate**: For every deck, `SELECT COUNT(*) FROM deck_cards WHERE deck_id = ?` matches `decks.card_count`.
5. **No duplicate IDs**: `SELECT id, COUNT(*) FROM deck_cards GROUP BY id HAVING COUNT(*) > 1` returns 0 rows.
6. **All categories covered**: `SELECT DISTINCT category FROM decks` returns exactly the 10 Tier 1 category values.
7. **Content version recorded**: `SELECT version FROM __deck_content_meta WHERE id = 1` returns `1`.
8. **Idempotent reload**: Running the loader twice does not duplicate decks or cards (INSERT OR REPLACE semantics).
9. **Browser shows decks**: Opening the app → "Decks" tab shows 10 deck cards (not "No decks yet").
10. **Deck detail works**: Tapping a deck shows its full metadata (title, description, card count, thresholds, eligibility).
11. **Validation rejects bad data**: Test with malformed entries confirms rejection.
12. **Tests pass**: `npm test` exits 0.
13. **Typecheck passes**: `npm run typecheck` exits 0.
14. **Lint passes**: `npm run lint` exits 0.
15. **Format passes**: `npm run format -- --check` exits 0.

## 10. Definition of done evidence

| Evidence | Verification command |
|----------|---------------------|
| JSON file exists | `ls assets/data/prebuilt-decks.json` |
| Content modules exist | `ls lib/content/validateDeck.ts lib/content/loadPrebuiltDecks.ts lib/content/contentVersion.ts` |
| Migration 005 exists | `rg "005_" lib/db/migrations.ts` |
| Schema version 5 | `npm test -- db-migrations` passes with version 5 |
| 10 decks loaded | Run app or test — `getAllDecks()` returns 10 entries |
| Integrity test passes | `npm test -- prebuilt-deck-integrity` |
| Validation test passes | `npm test -- validate-deck` |
| Loader test passes | `npm test -- load-prebuilt-decks` |
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

# Targeted tests
npm test -- validate-deck
npm test -- load-prebuilt-decks
npm test -- prebuilt-deck-integrity
npm test -- db-migrations
npm test -- schema-check

# JSON syntax check
npx jsonlint assets/data/prebuilt-decks.json

# Content stats (quick eyeball)
node -e "const d = require('./assets/data/prebuilt-decks.json'); console.log('Decks:', d.decks.length); console.log('Cards:', d.decks.reduce((a,b) => a + b.cards.length, 0));"

# Verbose test output
npm test -- --verbose
```

## 12. Notes for next iteration

### For Iteration 14 (Refactor swipe/session logic to deck scope)

1. **Content is loaded.** The `decks` and `deck_cards` tables contain 10 Tier 1 decks with 400–600 cards. Iteration 14 can query `getDeckCardsByDeckId(db, deckId)` to get the card pool for a specific deck.

2. **Schema is at version 5.** The `__deck_content_meta` table exists. The next migration is version 6 if Iteration 14 needs to add `deck_id` to `swipe_sessions` or modify the `swipe_events` FK.

3. **DeckCard domain type vs UI component.** The `DeckCard` domain type (`types/domain/decks.ts`) has fields: `id`, `deckId`, `kind`, `title`, `subtitle`, `descriptionShort`, `tags`, `popularity`, `tileKey`, `sortOrder`, `createdAt`, `updatedAt`. The UI component `DeckCard` (`components/deck/DeckCard.tsx`) accepts a `CatalogEntity` prop with different fields (`type`, `imageUrl`, etc.). Iteration 14 must bridge this — either by adapting the UI component to accept the domain type, renaming the UI component, or creating an adapter function.

4. **Card sort_order maps to cold-start sequence.** Cards with low `sort_order` values are foundational and popular — they should be shown first in a new swipe session. The next-card algorithm in Iteration 14 can use `sort_order` as the initial ordering before user signal drives adaptation.

5. **Tile key derivation.** Every card has a `tileKey` (either from the JSON or auto-derived as `{category}:{cardId}`). The `DeterministicTile` component uses this for visual rendering. Iteration 14 must pass `card.tileKey` to the tile when rendering deck cards in the swipe UI.

6. **The "Start Swiping" CTA on deck detail** is still placeholder behavior from Iteration 12. Iteration 14 will wire it to a real route that initializes a deck-scoped swipe session, loads the card pool from `deck_cards`, and presents the swipe UI.

7. **Content versioning.** The `PREBUILT_DECK_VERSION` constant is `1`. If future iterations need to update card content (corrections, rebalancing), bump the version and the loader will automatically reimport on next app launch. User swipe data is not affected — it's stored separately in `swipe_events`.

8. **Tag vocabularies per deck.** Each deck uses 10–15 unique tags. These tags are the basis for theme clustering in deck profiles (Iteration 15). The tag vocabulary is not stored in the schema — it's implicit in the card content. If Iteration 15 needs an explicit tag vocabulary per deck, it can derive it from `SELECT DISTINCT tag FROM (SELECT json_each.value AS tag FROM deck_cards, json_each(tags_json)) WHERE deck_id = ?`.
