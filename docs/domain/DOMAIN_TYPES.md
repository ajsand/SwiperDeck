# Domain Types Reference

> Canonical typed vocabulary for the DateDeck fork.
> Source of truth: `types/domain/` modules.
> Domain types mirror the evolving SQLite schema in `lib/db/migrations.ts`.

## Where Types Live

```text
types/domain/
  actions.ts     - SwipeAction unions, weights, labels, guards, assertNever
  compare.ts     - DeckCompareReadiness, consent draft types, compare export preview vocabulary
  comparePayload.ts - ComparePayloadV1, minimization policy, evidence-card, and preview types
  customDecks.ts - CustomDeckInput, CreateCustomDeckDraft, local custom deck source shapes
  deckCardState.ts - DeckCardStateRow/State, presentation/swipe recency mappers
  ids.ts         - Branded ID types (EntityId, SessionId, SwipeEventId, SnapshotId, DeckId, DeckCardId, DeckTagFacetId, DeckTagId)
  catalog.ts     - CatalogEntityRow, CatalogEntity, entity type union, mappers
  deckProfile.ts - DeckTagScore, DeckCardAffinity, DeckProfileSnapshot, DeckProfileSummary, stage, confidence
  deckTagState.ts - DeckTagStateRow/State, DeckTagCoverageSummary, coverage summarizer, mappers
  deckTags.ts    - DeckTagFacetRow/Facet, DeckTagRow/Tag, DeckCardTagLinkRow/Link, role guards, mappers
  decks.ts       - DeckRow, Deck, DeckCardRow, DeckCard, constants, guards, mappers
  swipes.ts      - SwipeSessionRow/SwipeSession, SwipeEventRow/SwipeEvent, mappers
  scores.ts      - TasteTagScoreRow/Score, TasteTypeScoreRow/Score, EntityAffinityRow/Affinity, mappers
  snapshots.ts   - ProfileSnapshotRow/Snapshot, summary types, mappers
  parsers.ts     - safeJsonParse, parseStringArrayJson, parseRecordJson, isRecord
  index.ts       - Barrel re-exports (import from '@/types/domain')
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

| Layer    | Naming | Casing            | Used By                        |
| -------- | ------ | ----------------- | ------------------------------ |
| `Row`    | `XRow` | snake_case fields | DB boundary code, repositories |
| `Domain` | `X`    | camelCase fields  | App logic, UI, tests           |

Row types match SQLite column names exactly. Domain types are the app's working vocabulary.

## JSON Columns

| Row Field        | Domain Field | Parsed Type          | Parser                        |
| ---------------- | ------------ | -------------------- | ----------------------------- |
| `tags_json`      | `tags`       | `string[]`           | `parseStringArrayJson`        |
| `filters_json`   | `filters`    | `SessionFilters`     | `parseRecordJson` + normalize |
| `top_tags_json`  | `topTags`    | `TagScoreSummary[]`  | custom typed parser           |
| `top_types_json` | `topTypes`   | `TypeScoreSummary[]` | custom typed parser           |
| `summary_json`   | `summary`    | `ProfileSummary`     | custom typed parser           |

All JSON parsers are safe: invalid JSON falls back instead of throwing.

## Decks and Deck Cards

Iteration 10 introduced first-class deck-scoped types.

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

### Core types

| Type          | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `Deck`        | App-facing deck metadata with booleans and camelCase fields |
| `DeckRow`     | SQLite row for `decks`                                      |
| `DeckCard`    | App-facing deck card with parsed `tags`                     |
| `DeckCardRow` | SQLite row for `deck_cards`                                 |

`DeckCard.tags` remains the UI-facing display-chip projection. For shipped prebuilt decks, canonical sequencing/profile metadata now comes from the normalized taxonomy layer below.

## Prebuilt Deck Taxonomy Types

Iteration 14A adds normalized prebuilt-only taxonomy metadata.

### Branded IDs

```typescript
type DeckTagFacetId = string & { readonly __brand: 'DeckTagFacetId' };
type DeckTagId = string & { readonly __brand: 'DeckTagId' };
```

Helpers:

- `asDeckTagFacetId(...)`
- `asDeckTagId(...)`

### Canonical taxonomy types

| Type                                     | Purpose                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| `DeckTagFacetRow` / `DeckTagFacet`       | Deck-scoped facet groups such as `tone`, `trip_style`, or `channel` |
| `DeckTagRow` / `DeckTag`                 | Canonical tag definitions such as `drama`, `budget`, or `direct`    |
| `DeckCardTagLinkRow` / `DeckCardTagLink` | Normalized card-to-tag assignments with semantic roles              |

### Tag roles

```typescript
const DECK_TAG_ROLES = ['primary', 'secondary', 'supporting'] as const;
type DeckTagRole = 'primary' | 'secondary' | 'supporting';
```

These roles preserve authorial intent without hard-coding sequencing rules into the card rows themselves.

## Prebuilt Content Shapes

The bundled prebuilt content pipeline now has two source files:

```text
lib/content/
  validateDeck.ts         - PrebuiltDeckFile, PrebuiltDeckEntry, PrebuiltCardEntry, card/tag assignment validation
  validateDeckTaxonomy.ts - taxonomy file validation plus normalized lookup maps
  contentVersion.ts       - PREBUILT_DECK_VERSION and content-meta helpers
  loadPrebuiltDecks.ts    - startup loader orchestration
```

### Validation contract

- `validateDeck(entry, timestamp)` normalizes one deck entry and returns either a typed `Deck` plus its raw card list or validation errors.
- `validateDeckTaxonomyFile(file, timestamp)` validates bundled facet/tag definitions and returns normalized `DeckTagFacet` / `DeckTag` objects plus lookup maps for loading.
- `validateCard(entry, deck, taxonomy, index, timestamp)` returns both a typed `DeckCard` and normalized `DeckCardTagLink[]`.

Validation rules now include:

- trimmed strings and normalized lowercase categories/display tags
- popularity clamped to `[0, 1]`
- display tags capped at 15
- canonical tag assignments capped at `1..3`
- exactly one `primary` assignment per prebuilt card
- every display tag must be backed by a canonical assignment

### Content versioning

`PREBUILT_DECK_VERSION` is the bundled content version constant used by the startup loader and the `__deck_content_meta` table. It is now `2` because Iteration 14A adds taxonomy metadata and card-level canonical assignments.

## Compare Types

Iterations 16 and 17 add deck-scoped compare readiness plus a minimized export contract.

### `compare.ts`

Core compare-flow types:

- `DeckCompareReadiness`
- `DeckCompareReasonDetail`
- `DeckCompareConsentDraft`
- `DeckCompareExportPreviewItem`

These types drive readiness gating, consent copy, and deck-scoped disclosure before any later external compare/report step.

### `comparePayload.ts`

Payload-minimization types:

- `ComparePayloadV1`
- `ComparePayloadPolicy`
- `ComparePayloadEvidenceSummary`
- `ComparePayloadEvidenceCard`
- `ComparePayloadPreview`

Important boundary:

- compare payloads are deck-scoped
- compare payloads are prebuilt-deck only for now
- the payload prefers tag/theme summaries over raw card detail
- evidence cards are optional, bounded, and included only for grounding when policy says they are needed

## Custom Deck Input Types

Iteration 21 adds the local custom-deck authoring/import vocabulary in `customDecks.ts`.

### Core types

- `CustomDeckCardInput`
- `CustomDeckInput`
- `CreateCustomDeckDraft`

Important boundary:

- these types describe local authoring/import input, not the richer prebuilt taxonomy system
- custom decks still persist into the existing `Deck` / `DeckCard` storage model
- custom decks do not silently inherit prebuilt compare/report guarantees

## Swipe Sessions and Events

Iteration 14 moved swipe persistence to deck scope.

### `SwipeSession`

`SwipeSessionRow` fields:

- `id`
- `deck_id`
- `started_at`
- `ended_at`
- `filters_json`

App-facing `SwipeSession` fields:

- `id: SessionId`
- `deckId: DeckId`
- `startedAt: number`
- `endedAt: number | null`
- `filters: SessionFilters`

### `SwipeEvent`

`SwipeEventRow` fields:

- `id`
- `session_id`
- `deck_id`
- `card_id`
- `action`
- `strength`
- `created_at`

App-facing `SwipeEvent` fields:

- `id: SwipeEventId`
- `sessionId: SessionId`
- `deckId: DeckId`
- `cardId: DeckCardId`
- `action: SwipeAction`
- `strength: number`
- `createdAt: number`

## Deck Profile Types

Deck-scoped profile computation lives in `deckProfile.ts`.

### `DeckProfileStage`

```typescript
type DeckProfileStage = 'lightweight' | 'meaningful' | 'high_confidence';
```

### `DeckProfileConfidence`

```typescript
interface DeckProfileConfidence {
  value: number;
  label: 'low' | 'medium' | 'high';
  swipeCount: number;
  cardCoverage: number;
  components: {
    swipeSignal: number;
    cardCoverage: number;
    tagCoverage: number;
    facetCoverage: number;
    stability: number;
    ambiguityPenalty: number;
  };
}
```

### `DeckProfileCoverageSummary`

```typescript
interface DeckProfileCoverageSummary {
  deckId: DeckId;
  cardsSeen: number;
  totalCards: number;
  cardCoverage: number;
  tags: DeckTagCoverageSummary;
  facets: {
    totalFacetCount: number;
    seenFacetCount: number;
    unseenFacetCount: number;
    coverageRatio: number;
  };
}
```

### `DeckProfileSummary`

```typescript
interface DeckProfileSummary {
  deckId: DeckId;
  stage: DeckProfileStage;
  confidence: DeckProfileConfidence;
  coverage: DeckProfileCoverageSummary;
  stability: {
    stabilityScore: number;
    stableTagCount: number;
    emergingTagCount: number;
    mixedSignalTagCount: number;
    retestedTagCount: number;
    retestPendingCount: number;
  };
  affinities: DeckProfileThemeScore[];
  aversions: DeckProfileThemeScore[];
  unresolved: DeckProfileUnresolvedArea[];
  nextSteps: DeckProfileActionHint[];
  readiness: {
    compareReady: boolean;
    blockers: DeckProfileReadinessBlocker[];
  };
  topCardsLiked: DeckCardId[];
  topCardsDisliked: DeckCardId[];
  generatedAt: number;
}
```

### Row/domain types

- `DeckTagScoreRow` / `DeckTagScore` - deck-scoped tag scores keyed by canonical `tagId`
- `DeckCardAffinityRow` / `DeckCardAffinity` - deck-scoped card affinity
- `DeckProfileSnapshotRow` / `DeckProfileSnapshot` - deck-scoped snapshots with `topTags`, `topAversions`, and `summary`

`DeckProfileSummary` now reflects the deeper within-deck structure added in Iterations 14A-15:

- canonical tag IDs remain the DB source of truth
- the summary projects human-readable tag and facet labels for UI
- confidence combines swipe count, card coverage, tag coverage, facet coverage, stability, and ambiguity
- unresolved areas expose explicit reasons such as `low_coverage`, `mixed_signal`, or `pending_retest`
- compare readiness is now a structured summary field, not a UI-only heuristic

`deck_profile_snapshots.summary_json` stores a compact projection of this richer summary so later compare/report flows can reuse local profile state without recomputing every screen from scratch.

## Compare Types

Iteration 16 adds the compare-readiness and consent vocabulary in `compare.ts`.

### `DeckCompareReadiness`

This is the deck-scoped local evaluator output that distinguishes:

- `not_started`
- `early_profile`
- `needs_more_breadth`
- `needs_more_stability`
- `compare_ready`
- `compare_ready_with_caution`
- `unavailable`

It also exposes structured reason details such as:

- `not_enough_tag_coverage`
- `not_enough_facet_coverage`
- `high_ambiguity`
- `retest_needed`
- `custom_deck_not_supported`

### `DeckCompareConsentDraft`

This is the local disclosure model shown before any later compare export/report step.

It includes:

- export preview categories
- what stays local
- optional caution copy for sensitive or gated decks
- required confirmations before approval

## Deck Tag State Types

Iteration 14B adds the canonical runtime state model for prebuilt deck tags.

### `DeckTagState`

Tracks one canonical tag inside one deck:

- `exposureCount`
- `distinctCardsSeen`
- `positiveWeight`
- `negativeWeight`
- `skipCount`
- `netWeight`
- `uncertaintyScore`
- `firstSeenAt`
- `lastSeenAt`
- `lastPositiveAt`
- `lastNegativeAt`
- `lastRetestedAt`
- `updatedAt`

### `DeckTagCoverageSummary`

Aggregates deck-scoped tag coverage:

- `totalTagCount`
- `seenTagCount`
- `unseenTagCount`
- `resolvedTagCount`
- `uncertainTagCount`
- `coverageRatio`

Use `summarizeDeckTagCoverage(deckId, tagStates)` to derive this from canonical `DeckTagState[]`.

## Deck Card State Types

Iteration 20B adds durable per-card recency for cross-session sequencing continuity.

### `DeckCardState`

Tracks one card inside one deck:

- `presentationCount`
- `swipeCount`
- `lastPresentedAt`
- `lastSwipedAt`
- `updatedAt`

This state is intentionally separate from `SwipeSession`:

- sessions remain bounded interaction envelopes
- `DeckCardState` persists the card-recency facts that should survive session boundaries
- sequencing can suppress a just-presented card even when the user exits without swiping it

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
2. Add branded IDs in `ids.ts` if needed.
3. Create the `Row` and domain interfaces.
4. Add mapper functions and guards/normalizers.
5. Add repository helpers in `lib/db/`.
6. Export the module from `types/domain/index.ts`.
7. Update `docs/db/SCHEMA.md` and this document.
8. Run `npm run typecheck`, `npm run lint`, and `npm test`.
