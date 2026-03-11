# Iteration 15: Build deck profile summary v1

## 1. Objective

Build a **deck-specific profile summary** surface and local computation path. After this iteration, a user can view a profile for a specific deck that shows: early signal summary, confidence level, top affinities, aversions, and unresolved areas. The profile is computed entirely from deck-scoped swipe events and card tags — no universal taste view, no AI calls. This establishes the local computation path required for later compare readiness (Iterations 16–18).

Concretely:

1. **Schema migration 007**: create deck-scoped scoring tables (`deck_tag_scores`, `deck_card_affinity`, `deck_profile_snapshots`) that mirror the old TasteDeck scoring shape but add `deck_id` as a required dimension.
2. **Domain types**: add deck-scoped profile types (`DeckTagScore`, `DeckCardAffinity`, `DeckProfileSnapshot`, `DeckProfileSummary`) and stage/confidence enums.
3. **Computation service**: implement incremental score updates from `swipe_events` into deck-scoped tables, plus a `computeDeckProfileSummary(deckId)` function that returns the v1 summary.
4. **Profile screen**: build a deck profile view at `app/deck/[deckId]/profile.tsx` that displays confidence, affinities, aversions, and unresolved areas for that deck.
5. **Profile tab integration**: update the Profile tab to list decks with profile status and link to each deck's profile view.

## 2. Why this matters

Without a deck-specific profile surface:

- **Compare flows** (Iterations 16–18) cannot determine what to compare — they need per-deck affinities, aversions, and confidence.
- **User value** is unclear — swiping without feedback feels pointless. The profile is the primary output of deck swiping.
- **Consent and eligibility** (Iteration 16) require knowing whether a deck has "enough" signal — confidence and stage drive that decision.

CLAUDE.md Section 4.4 and 8.2–8.4 define the deck profile model. This iteration implements the v1 surface and computation path. Full confidence modeling (retest, stability) and "over time" views are deferred to later iterations.

## 3. Scope

### In scope

- **Migration 007**: create `deck_tag_scores`, `deck_card_affinity`, `deck_profile_snapshots` with `deck_id` as required FK
- **Domain types**: `DeckTagScore`, `DeckCardAffinity`, `DeckProfileSnapshot`, `DeckProfileSummary`, `DeckProfileStage`, `DeckProfileConfidence`
- **Score computation**: incremental update on swipe (or batch recompute) into `deck_tag_scores` and `deck_card_affinity`; snapshot creation into `deck_profile_snapshots`
- **Profile summary computation**: `computeDeckProfileSummary(db, deckId)` returning affinities, aversions, unresolved areas, confidence, stage
- **Profile screen**: `app/deck/[deckId]/profile.tsx` — deck-specific profile view
- **Profile tab**: list decks with profile status (swipe count, stage, confidence) and link to deck profile
- **Wire from play screen**: after swiping, optionally navigate to deck profile or show "View profile" CTA
- **Tests**: migration, domain mappers, computation service, profile summary logic
- **Doc updates**: SCHEMA.md, DOMAIN_TYPES.md

### Out of scope

- **Compare flow** — Iteration 16
- **Compare payload / AI report** — Iterations 17–18
- **Retest logic, stability markers, polarization** — Iteration 23
- **Profile over-time view** (sparklines from snapshots) — future
- **Universal taste profile** — not in scope for this fork
- **AI summarization** — local computation only; AI is for compare reports later

### Relationship to old TasteDeck code

| Category | What happens |
|----------|--------------|
| **Reused (pattern)** | Score shape (`score`, `pos`, `neg`, `last_updated`), `TagScoreSummary`/`TypeScoreSummary`-like structures, `ACTION_WEIGHTS` for weighting, `parseStringArrayJson` for tags |
| **Reused (code)** | `ACTION_WEIGHTS` from `types/domain/actions.ts`, `actionToDbStrength`, card `tags` from `deck_cards`, `getSwipeEventsByDeckId`, `getSwipedCardIdsByDeckId`, `getSwipeEventCountByDeckId`, `getDeckCardsByDeckId`, `getDeckById` |
| **Replaced (schema)** | Old `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, `profile_snapshots` are **unscoped** (no `deck_id`). They reference `catalog_entities`. This iteration creates **new** deck-scoped tables. The old tables remain in the schema but are **not used** by fork code. |
| **Replaced (domain)** | New `DeckTagScore`, `DeckCardAffinity`, `DeckProfileSnapshot`, `DeckProfileSummary` types. Old `TasteTagScore`, `TasteTypeScore`, `EntityAffinity`, `ProfileSnapshot` are not used for deck profiles. |
| **New** | `deck_tag_scores`, `deck_card_affinity`, `deck_profile_snapshots` tables; `deckProfileService.ts`; `useDeckProfileSummary` hook; deck profile screen; profile tab deck list |

### Lightweight vs higher-confidence profile

| Stage | Condition | What to show |
|-------|-----------|--------------|
| **Stage 1 — Lightweight** | Swipe count < `minCardsForProfile` | Early signal summary, "Keep swiping to build your profile" CTA, low-confidence label |
| **Stage 2 — Meaningful** | Swipe count ≥ `minCardsForProfile` | Full summary: affinities, aversions, unresolved areas; "Compare ready" when ≥ `minCardsForCompare` |
| **Stage 3 — High-confidence** | Deferred to Iteration 23 | Retest confirmation, stability — not in v1 |

Confidence in v1 is derived from: swipe count, card coverage (swiped vs total), and breadth of tags touched. A simple formula suffices (e.g., `confidence = min(1, swipeCount / minCardsForCompare)` or similar). No retest or stability logic yet.

## 4. Multi-model execution strategy

| Step | Model | Task |
|------|-------|------|
| 1 | Claude Opus 4.6 | Write this iteration file with schema diff, type contracts, and computation spec (done) |
| 2 | GPT-5.4 | Implement migration 007 |
| 3 | GPT-5.4 | Add deck-scoped domain types and mappers |
| 4 | GPT-5.4 | Create deck profile service (score computation, summary computation) |
| 5 | GPT-5.4 | Wire incremental score updates into swipe flow (or batch on profile view) |
| 6 | GPT-5.4 | Build deck profile screen and profile tab deck list |
| 7 | GPT-5.4 | Write tests, run full validation |
| 8 | Claude Opus 4.6 | Review: schema correctness, profile semantics, compare-readiness alignment |

### Implementation order

1. Migration 007 first — schema must exist before any code references new tables.
2. Domain types and mappers second.
3. Deck profile service third — depends on types and swipe repository.
4. Wire score updates fourth — either in `useDeckSwipeSession` on action, or in a `useDeckProfileSummary` hook that recomputes on mount.
5. Profile screen and tab last — depends on service and hooks.

## 5. Agent resources and navigation map

### Source-of-truth references

| Document | Relevant sections |
|----------|-------------------|
| `/CLAUDE.md` Section 4.4 | Generating a deck profile: early signal, confidence, alignments, aversions, unresolved, progress |
| `/CLAUDE.md` Section 8.1–8.6 | Deck profile model: one profile per deck, stages, confidence rules, retest (deferred) |
| `/CLAUDE.md` Section 9.3 | Report structure: alignments, contrasts, unresolved — informs summary shape |
| `/CLAUDE.md` Section 13.2 | New entities: `deck_profile_state`, `deck_profile_snapshots` |
| `/iterations/14-...md` Section 12 | Handoff: swipe events deck-scoped, card tags, ACTION_WEIGHTS, old scoring tables unused |

### Schema diff: new tables (migration 007)

#### `deck_tag_scores`

```sql
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
```

#### `deck_card_affinity`

```sql
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
```

#### `deck_profile_snapshots`

```sql
CREATE TABLE IF NOT EXISTS deck_profile_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  deck_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  top_tags_json TEXT NOT NULL,
  top_aversions_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);
```

Indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_deck_tag_scores_deck_id ON deck_tag_scores(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_tag_scores_score ON deck_tag_scores(deck_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_deck_card_affinity_deck_id ON deck_card_affinity(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_card_affinity_score ON deck_card_affinity(deck_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_deck_profile_snapshots_deck_id ON deck_profile_snapshots(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_profile_snapshots_created_at ON deck_profile_snapshots(deck_id, created_at DESC);
```

### Domain type contracts

#### `DeckProfileStage`

```typescript
export type DeckProfileStage = 'lightweight' | 'meaningful' | 'high_confidence';
```

#### `DeckProfileConfidence`

```typescript
export interface DeckProfileConfidence {
  value: number;        // 0..1
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number; // fraction of deck cards swiped
}
```

#### `DeckProfileSummary`

```typescript
export interface DeckProfileSummary {
  deckId: DeckId;
  stage: DeckProfileStage;
  confidence: DeckProfileConfidence;
  affinities: TagScoreSummary[];   // top positive tags
  aversions: TagScoreSummary[];     // top negative tags
  unresolved: string[];             // tags with weak or mixed signal
  topCardsLiked: DeckCardId[];     // optional: sample of strong yes/love cards
  topCardsDisliked: DeckCardId[];  // optional: sample of strong no/hard_no cards
  generatedAt: number;
}
```

Reuse `TagScoreSummary` from `types/domain/snapshots.ts` (`{ tag: string; score: number }`).

### Computation logic

**Score update (on swipe or batch):**

1. For each swipe event: get `card_id`, `strength`, `deck_id`.
2. Look up card's `tags` from `deck_cards`.
3. For each tag: upsert `deck_tag_scores` — add `strength` to `pos` if > 0, else to `neg`; `score = pos - neg`.
4. Upsert `deck_card_affinity` for the card with the same logic.

**Summary computation:**

1. Query `deck_tag_scores` for deck, ordered by `score DESC`.
2. Affinities: tags with `score > threshold` (e.g., 1.0), top N (e.g., 10).
3. Aversions: tags with `score < -threshold`, top N.
4. Unresolved: tags with `|score| < threshold` or low swipe count for that tag.
5. Stage: compare `getSwipeEventCountByDeckId` to `deck.minCardsForProfile` and `deck.minCardsForCompare`.
6. Confidence: simple formula from swipe count and coverage.

### New files to CREATE

| File | Purpose |
|------|---------|
| `lib/db/deckProfileRepository.ts` | CRUD for deck_tag_scores, deck_card_affinity, deck_profile_snapshots |
| `lib/profile/deckProfileService.ts` | Score computation, summary computation |
| `hooks/useDeckProfileSummary.ts` | Hook that returns `DeckProfileSummary` for a deck |
| `app/deck/[deckId]/profile.tsx` | Deck profile screen |
| `__tests__/deck-profile-service.test.ts` | Service and summary logic tests |

### Files to MODIFY

| File | What changes |
|------|--------------|
| `lib/db/migrations.ts` | Add migration 007 |
| `types/domain/` | Add deck profile types (new file or extend existing) |
| `app/(tabs)/profile.tsx` | Replace placeholder with deck list + links to deck profile |
| `hooks/useDeckSwipeSession.ts` or play screen | Trigger score update on swipe (or call from profile hook) |
| `__tests__/schema-check.test.ts` | Add new tables, columns, indexes |
| `__tests__/db-migrations.test.ts` | Version 7 |
| `docs/db/SCHEMA.md` | Document new tables |
| `docs/domain/DOMAIN_TYPES.md` | Document new types |

### Files to PRESERVE (do not modify)

| File | Why |
|------|-----|
| `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, `profile_snapshots` | Old tables remain in schema; no code writes to them. Do not drop in this iteration. |
| `types/domain/scores.ts` | Old score types preserved; new deck types are separate. |
| `types/domain/snapshots.ts` | `TagScoreSummary` reused; `ProfileSnapshot` is old — we add `DeckProfileSnapshot` as new type. |
| `lib/db/swipeRepository.ts` | Read-only usage; no changes. |

## 6. When stuck

| Problem | Resolution |
|---------|------------|
| When to run score updates? | Two options: (a) on each swipe in `useDeckSwipeSession` — incremental, real-time; (b) on profile view mount — batch recompute from events. Option (a) is better for responsiveness; option (b) is simpler. Prefer (a) if performance is acceptable. |
| Old tables vs new tables | Do not modify old tables. Create new deck-scoped tables. Old tables stay for potential migration of legacy data; they are unused by fork code. |
| Unresolved definition | Tags with `\|score\| < 1.0` or tags that appear on fewer than 2 cards. Alternatively: tags in the middle of the score distribution. Keep it simple for v1. |
| Profile tab: which decks to show? | All decks the user has swiped in (has at least one swipe event for that deck). Optionally also decks with 0 swipes but with a "Start swiping" CTA. |
| No swipe events yet | Profile screen shows "No profile yet — swipe some cards to build your profile" with link to play. |
| Card kind vs type | Deck cards have `kind` (entity/statement), not `type`. For deck profiles, tags are the primary dimension. `taste_type_scores` equivalent is not needed for v1 — we use tags only. |
| Snapshot creation trigger | Create a snapshot when: (a) user views profile and last snapshot is > 24h old, or (b) every N swipes (e.g., 10). Defer complex snapshot scheduling to Iteration 18/23. For v1, snapshot on profile view if missing or stale. |

## 7. Implementation checklist

### 7.1 Add migration 007

**File:** `lib/db/migrations.ts`

Append migration version 7, name `'007_deck_profile_tables'`.

Create `deck_tag_scores`, `deck_card_affinity`, `deck_profile_snapshots` with columns and indexes as specified in Section 5.

### 7.2 Add deck profile domain types

**New file:** `types/domain/deckProfile.ts`

Define:

- `DeckTagScore`, `DeckTagScoreRow` + mappers
- `DeckCardAffinity`, `DeckCardAffinityRow` + mappers
- `DeckProfileSnapshot`, `DeckProfileSnapshotRow` + mappers (reuse `TagScoreSummary` for top_tags, add `top_aversions` as same shape)
- `DeckProfileSummary` (computed, not stored)
- `DeckProfileStage`, `DeckProfileConfidence`

Export from `types/domain/index.ts`.

### 7.3 Create deck profile repository

**New file:** `lib/db/deckProfileRepository.ts`

Functions:

| Function | Purpose |
|----------|---------|
| `upsertDeckTagScore` | Insert or update a tag score for a deck |
| `getDeckTagScoresByDeckId` | All tag scores for a deck, ordered by score DESC |
| `upsertDeckCardAffinity` | Insert or update card affinity for a deck |
| `getDeckCardAffinitiesByDeckId` | All card affinities for a deck |
| `insertDeckProfileSnapshot` | Insert a snapshot |
| `getLatestDeckProfileSnapshot` | Latest snapshot for a deck |

### 7.4 Create deck profile service

**New file:** `lib/profile/deckProfileService.ts`

Functions:

| Function | Purpose |
|----------|---------|
| `updateScoresFromSwipeEvent(db, event)` | Given a swipe event, update deck_tag_scores and deck_card_affinity |
| `recomputeDeckScoresFromEvents(db, deckId)` | Batch recompute all scores from swipe_events for a deck |
| `computeDeckProfileSummary(db, deckId)` | Return `DeckProfileSummary` from current scores and deck metadata |
| `maybeCreateDeckProfileSnapshot(db, deckId)` | Create snapshot if missing or stale |

### 7.5 Wire score updates

**Option A (preferred):** In `useDeckSwipeSession`, after `insertSwipeEvent`, call `updateScoresFromSwipeEvent(db, event)`.

**Option B:** In `useDeckProfileSummary`, on mount, call `recomputeDeckScoresFromEvents` if events exist and scores are stale or empty.

### 7.6 Create useDeckProfileSummary hook

**New file:** `hooks/useDeckProfileSummary.ts`

```typescript
function useDeckProfileSummary(deckId: DeckId | null): {
  summary: DeckProfileSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

Uses `computeDeckProfileSummary` and deck metadata from `getDeckById`.

### 7.7 Build deck profile screen

**New file:** `app/deck/[deckId]/profile.tsx`

Structure:

- Header: deck title, confidence badge, stage label
- Affinities section: top tags with positive scores (chips or list)
- Aversions section: top tags with negative scores
- Unresolved section: tags with weak signal (collapsible or secondary)
- Optional: sample of liked/disliked cards (compact list)
- CTA: "Swipe more" if lightweight, "Compare" if meaningful and compare-eligible
- Empty state: "No profile yet" + link to play

### 7.8 Update Profile tab

**File:** `app/(tabs)/profile.tsx`

- Query decks that have at least one swipe event (or all decks with 0 as "Not started")
- For each deck: show title, swipe count, stage, link to `app/deck/[deckId]/profile`
- Empty state: "No deck profiles yet. Choose a deck and start swiping."

### 7.9 Wire from play screen

**File:** `app/deck/[deckId]/play.tsx`

On session complete (all cards swiped), show "View your profile" button that navigates to `app/deck/[deckId]/profile`.

### 7.10 Write tests

- Migration 007 creates tables and indexes
- Domain mappers roundtrip
- `updateScoresFromSwipeEvent` produces correct tag/card scores
- `computeDeckProfileSummary` returns correct stage, affinities, aversions for fixture data
- Edge cases: no events, single event, mixed positive/negative

### 7.11 Update documentation

- `docs/db/SCHEMA.md`: new tables, columns, indexes
- `docs/domain/DOMAIN_TYPES.md`: new types

### 7.12 Run full validation

```bash
npm run typecheck
npm run lint
npm run format -- --check
npm test
```

## 8. Deliverables

1. Migration 007 creates `deck_tag_scores`, `deck_card_affinity`, `deck_profile_snapshots`
2. Domain types for deck profile (scores, affinity, snapshot, summary, stage, confidence)
3. `deckProfileRepository.ts` with CRUD for new tables
4. `deckProfileService.ts` with score update and summary computation
5. Score updates wired to swipe flow (incremental or batch)
6. `useDeckProfileSummary` hook
7. `app/deck/[deckId]/profile.tsx` deck profile screen
8. Profile tab shows deck list with profile status and links
9. Play screen completion CTA links to deck profile
10. Tests pass; docs updated

## 9. Acceptance criteria

1. **Schema v7**: New tables exist with correct columns and FKs.
2. **Score computation**: Swiping a card updates `deck_tag_scores` and `deck_card_affinity` for that deck.
3. **Summary computation**: `computeDeckProfileSummary` returns correct stage based on `minCardsForProfile` and `minCardsForCompare`.
4. **Affinities**: Top positive tags appear in summary.
5. **Aversions**: Top negative tags appear in summary.
6. **Unresolved**: Tags with weak signal appear (or section is empty when all tags have strong signal).
7. **Confidence**: Summary includes confidence value and label.
8. **Profile screen**: Renders for a deck with swipe history; shows empty state for deck with no swipes.
9. **Profile tab**: Lists decks with profile status; links to deck profile.
10. **Play completion**: "View profile" navigates to deck profile.
11. **Tests pass**: `npm test` exits 0.
12. **Typecheck, lint, format**: All pass.

## 10. Definition of done evidence

| Evidence | Verification command |
|----------|---------------------|
| Migration 007 exists | `rg "007_" lib/db/migrations.ts` |
| Schema version 7 | `npm test -- db-migrations` passes |
| New tables in schema check | `npm test -- schema-check` passes |
| Deck profile service exists | `ls lib/profile/deckProfileService.ts` |
| Deck profile repository exists | `ls lib/db/deckProfileRepository.ts` |
| Deck profile screen exists | `ls app/deck/\[deckId\]/profile.tsx` |
| Profile hook exists | `ls hooks/useDeckProfileSummary.ts` |
| Tests pass | `npm test` exit code 0 |
| Typecheck passes | `npm run typecheck` exit code 0 |
| Lint passes | `npm run lint` exit code 0 |

## 11. Validation commands

```bash
# Full validation suite
npm run typecheck
npm run lint
npm run format -- --check
npm test

# Targeted tests
npm test -- deck-profile
npm test -- schema-check
npm test -- db-migrations

# Verify new files
ls lib/profile/deckProfileService.ts
ls lib/db/deckProfileRepository.ts
ls app/deck/*/profile.tsx
ls hooks/useDeckProfileSummary.ts
```

## 12. Notes for next iteration

### For Iteration 16 (Build compare eligibility and consent flow)

1. **Deck profile summary is available.** `computeDeckProfileSummary` returns stage, confidence, affinities, aversions. Iteration 16 can use `stage === 'meaningful'` and `swipeCount >= minCardsForCompare` to gate compare eligibility.

2. **Deck-scoped payload shape.** The summary structure (affinities, aversions, unresolved) is the local computation output. Iteration 17 will define the minimal compare payload from this summary — no raw swipe history needed for the payload.

3. **Snapshot table ready.** `deck_profile_snapshots` stores historical summaries. Iteration 18 (AI report) or later "over time" views can query snapshots. For v1 compare, the live `computeDeckProfileSummary` output is sufficient.

4. **Old tables still present.** `taste_tag_scores`, `taste_type_scores`, `entity_affinity`, `profile_snapshots` remain. They are not used. Consider deprecation or removal in Iteration 25 (release hardening).

5. **Confidence formula is simple.** Iteration 23 will refine confidence with retest logic and stability. For now, compare eligibility uses swipe count and `minCardsForCompare` only.

6. **Profile tab navigation.** The Profile tab links to `app/deck/[deckId]/profile`. Compare flow will eventually start from deck profile or a dedicated compare entry point — Iteration 16 defines that flow.
