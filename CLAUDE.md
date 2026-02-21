# CLAUDE.md — TasteDeck (Swipe-First Taste Profile App)

> **Purpose of this doc:**
> This is the **single source of truth** for building TasteDeck using Claude Opus 4.6.
> It defines the product, screens, data model, ranking logic, AI usage, performance constraints, quality guardrails, and an iterative delivery plan.

---

## 0) What TasteDeck Is

**TasteDeck** is a mobile app where a user rapidly swipes through an endless stream of “cards” representing **entities** (books, movies, podcasts, albums, games, teams, athletes, thinkers, places, concepts, etc.).

Each swipe is a **preference signal**. The app uses those signals to:

1. **adapt the deck** (practical ranking; not overfit), and
2. maintain a **Taste Profile** that updates continuously and explains the user’s taste with **visuals**, not just text.

### Core idea

- The swipe deck is the _input_.
- The taste profile is the _output_.
- AI is used to **summarize and label** computed taste stats — not to “magically understand a person.”

---

## 1) Product Principles (Non-Negotiable)

1. **Swipe-first**: the deck is the main experience.
2. **Local-first**: user history and taste profile live on-device by default.
3. **Bounded AI**: no huge “send all history to an LLM.” Compute stats locally; LLM (optional) only turns stats into human-readable labels/summaries.
4. **Practical ranking**: cold-start = popular + diverse; warm-start = match + popularity + exploration.
5. **Fast UX**: card render < 16ms budget where possible; swipe interactions must feel instant.
6. **No copyright landmines by default**: prefer **generated tiles** for card art. Covers/posters optional later with licensed sources.
7. **App-store ready**: stable navigation, offline usability, predictable data handling, clear privacy explanation.

---

## 2) User Flows

### 2.1 Onboarding

- Explain quickly:
  - “Swipe to teach your taste.”
  - “Skip if you don’t know it.”
  - “Taste Profile updates live.”
- User chooses:
  - Start Deck immediately (default)
  - Optional: pick initial filters (Movies/Books/Music/etc.)

### 2.2 Swipe Session

- User sees one card at a time, swipes/taps a response.
- Deck adapts as the session continues:
  - early: trending/popular + diversity sampling
  - later: preference match + exploration + long tail

### 2.3 Taste Profile

- Shows what the system believes about the user:
  - top themes, tastes, affinities
  - “not my thing” (negative space)
  - how it changes over time

### 2.4 History / Library

- User can review:
  - liked items
  - disliked items
  - “skipped/unknown”
- Optional: undo last swipe

### 2.5 Settings

- Export/delete local data
- Toggle AI summary (local-only vs cloud summary)
- Data + privacy info

---

## 3) Swipe Signals (Not Just Yes/No)

### 3.1 Required actions (5-state)

These are the core preference signals:

- **Hard No** (strong dislike)
- **No**
- **Skip / Don’t know** (neutral; not negative)
- **Yes**
- **Hard Yes / Love** (strong affinity)

### 3.2 Optional contextual actions (phase 2)

Small buttons (not required):

- **Respect**: “I recognize quality but it’s not me.”
- **Curious**: “Not me yet, but interested.”

### 3.3 Why this design

Skip must be separate from dislike to avoid corrupting the model.
This approach keeps interactions fast while adding meaning.

---

## 4) Catalog (What Cards Are)

### 4.1 Entity structure

Each swipe card represents an **Entity**:

- `id` (stable)
- `type` (book, movie, tv, podcast, album, artist, game, team, athlete, thinker, place, concept, etc.)
- `title`
- `subtitle` (creator/year/genre/team)
- `description_short` (1 line)
- `tags[]` (themes/genres/topics)
- `popularity_score` (0..1)
- `tile_key` (for deterministic tile art)
- Optional later:
  - `image_url` (only if licensed/allowed)
  - `embedding` (vector) for better matching

### 4.2 Where catalog data comes from

**Initial approach (most viable):**

- Ship a **bundled “starter catalog”** (e.g., 5k–20k entities across types).
- Update via a simple backend endpoint later.

**Expansion approach (later):**

- Use open structured sources like **Wikidata**, which requires CC0-compatible data.
- CC0 means “no rights reserved” (public domain dedication).

> Note: even if entity data is CC0, images are often licensed differently. Default to tile art.

---

## 5) Navigation & Screens (Expo Router)

### 5.1 Required tabs

Use a bottom tab layout (Expo Router Tabs).

**Tabs:**

1. **Deck**
2. **Profile**
3. **Library**
4. **Settings**

Use Stack navigation for details screens.

### 5.2 Screen specs

#### (A) Deck Screen

**Components**

- Card viewport (image/tile, title, subtitle, tags chips)
- Actions:
  - left/right swipe
  - buttons for 5-state actions (optional but recommended for accessibility)
  - “Skip”
  - Undo (optional)
- Filter button:
  - opens filter modal/sheet

**Behavior**

- Preload next N cards (e.g., 5–10)
- Keep swipe instant (record event locally first, then compute updates)

#### (B) Filter Modal

Filters determine candidate pool:

- media types toggles (Movies, TV, Books, Podcasts, Music, Games, Sports, People, Places, Ideas)
- “Diversity boost” toggle (optional)
- “Show more mainstream first” slider (optional)

#### (C) Profile Screen (Taste Profile)

Must contain **visual outputs**:

1. **Top Themes** (bubble list or bar chart)
2. **Taste Dials** (sliders/dimensions inferred)
3. **Yes vs No** (two lists)
4. **Over time** (sparklines per theme)

#### (D) Library Screen

- Segmented control: Liked / Disliked / Skipped
- Filters: type, date, tag/theme
- Search (phase 2): text search; semantic later

#### (E) Settings Screen

- Data export (JSON)
- Clear data (hard reset)
- AI Summary toggle:
  - Off: local-only labels
  - On: uses Cloud Summary (if enabled)
- About + privacy

---

## 6) Data Model (SQLite, Local-First)

Use Expo SQLite.

### 6.1 Tables (minimum viable, production-minded)

#### `catalog_entities`

- `id TEXT PK`
- `type TEXT`
- `title TEXT`
- `subtitle TEXT`
- `description_short TEXT`
- `tags_json TEXT` (JSON array)
- `popularity REAL`
- `tile_key TEXT`
- `image_url TEXT NULL`
- `updated_at INTEGER`

Indexes:

- `(type)`
- `(popularity DESC)`
- optional: `(title)`

#### `swipe_sessions`

- `id TEXT PK`
- `started_at INTEGER`
- `ended_at INTEGER NULL`
- `filters_json TEXT`

#### `swipe_events`

- `id TEXT PK`
- `session_id TEXT`
- `entity_id TEXT`
- `action TEXT` // hard_no, no, skip, yes, love, respect, curious
- `strength INTEGER` // map actions to weights
- `created_at INTEGER`

Indexes:

- `(created_at DESC)`
- `(entity_id)`
- `(session_id)`

#### `taste_tag_scores`

Materialized scores to keep profile fast:

- `tag TEXT PK`
- `score REAL`
- `pos REAL`
- `neg REAL`
- `last_updated INTEGER`

#### `taste_type_scores`

- `type TEXT PK`
- `score REAL`
- `pos REAL`
- `neg REAL`
- `last_updated INTEGER`

#### `entity_affinity`

- `entity_id TEXT PK`
- `score REAL`
- `pos REAL`
- `neg REAL`
- `last_updated INTEGER`

#### `profile_snapshots` (for “change over time”)

- `id TEXT PK`
- `created_at INTEGER`
- `top_tags_json TEXT`
- `top_types_json TEXT`
- `summary_json TEXT`

> Snapshots can be created daily or every N swipes.

---

## 7) Preference Update Logic (How Swipes Affect Taste)

### 7.1 Action weights

Map actions to numeric weights:

- love = +2
- yes = +1
- skip = 0
- no = -1
- hard_no = -2
- respect = +0.5 (optional)
- curious = +0.25 (optional)

### 7.2 Updating scores

On swipe:

1. look up entity tags
2. apply weight to:
   - `entity_affinity`
   - `taste_type_scores`
   - `taste_tag_scores`

### 7.3 Recency weighting (profile evolves)

Use exponential decay for “current taste”:

- `effective_weight = weight * exp(-age_days / half_life_days)`
- choose half-life ~ 60–120 days (tunable)

Store raw history; compute both:

- **all-time taste**
- **recent taste**

---

## 8) Deck Ranking Algorithm (Practical + Diverse)

We explicitly want **beyond-accuracy** outcomes: diversity, novelty, serendipity are recognized important objectives in recommender systems.

### 8.1 Candidate pool

- Use filters to select candidate entities not yet seen recently.
- Exclude last N shown to avoid repeats.

### 8.2 Cold start (no history)

- Serve high popularity across types + enforce diversity:
  - sample across types
  - cap repeated tags

### 8.3 Warm start

Compute a per-user preference vector using tag scores.

**Scoring function**

```text
score(i) = 0.45*pop(i) + 0.40*match(i) + 0.15*novel(i)
```

Where:

- `pop(i)` = normalized popularity
- `match(i)` = sum of user tag scores for i’s tags (normalized)
- `novel(i)` = boost for underrepresented types/tags in session + user history

### 8.4 Exploration strategy

Start with ε-greedy:

- 15% of the time, sample from novelty/diversity bucket
- 85% pick from top ranked

Optional later: Thompson sampling for exploration/exploitation tradeoff.

### 8.5 “Don’t only show what they like”

Diversity constraint:

- enforce minimum entropy across:
  - type distribution
  - tag distribution

This prevents bubble lock-in.

---

## 9) Taste Profile (What We Show)

### 9.1 Required computed outputs

- Top themes (tags clustered into themes)
- Type affinities
- Strong likes & strong dislikes
- “Taste dials” (inferred dimensions)

### 9.2 Themes (tag clustering)

Most viable:

- v1: cluster by simple heuristics:
  - tag prefix groups
  - co-occurrence graph (tags that appear together frequently)
- v2: embed tags and cluster (k-means / hierarchical)
- v3: LLM labels clusters _only after clusters exist_

### 9.3 Optional “Best–Worst” calibration rounds

If implemented later, it improves ranking fidelity because it forces tradeoffs:

- user chooses “best” and “worst” among 4 cards

Best-worst scaling (MaxDiff) is a known preference elicitation method.

This is optional and should not block the core experience.

---

## 10) AI Usage (Bounded, Reliable)

### 10.1 What AI is allowed to do

AI can:

- label clusters (“themes”) based on top tags/entities
- generate a short “Taste DNA” summary from computed stats
- suggest “try next” categories based on underexplored areas

### 10.2 What AI must NOT do

AI must NOT:

- infer sensitive traits (race, sexuality, religion, etc.)
- act as a therapist/diagnostician
- generate profile claims not supported by swipe data

### 10.3 Local vs Cloud AI

**Local default:**

- all ranking and profile stats computed locally
- theme labels can be rule-based

**Optional cloud summary (phase 2):**

- Send only an aggregated payload:
  - top tags/types + strongest likes/dislikes + changes over time
- No raw swipe history needed.

This keeps LLM usage cheap and avoids context-window blowups.

---

## 11) Card Art (Deterministic Tiles First)

Default: generated tiles (legal-safe, fast, consistent).

### 11.1 Deterministic tile requirements

Given `tile_key`:

- generate:
  - background gradient
  - icon based on type
  - title text (shortened)
- output:
  - cached image asset or rendered UI component

### 11.2 Where tiles are generated

Most viable:

- generate tiles at build time on a server/script once
- ship as assets or fetch on demand with CDN caching

Avoid per-device heavy generation for 50k+ cards.

---

## 12) Performance & Offline

### 12.1 Offline

App must function offline after catalog is present:

- swipe recording works offline
- profile works offline

### 12.2 Responsiveness

- Don’t recompute whole profile each swipe:
  - incremental update to materialized score tables
- snapshot creation is background and throttled

---

## 13) Quality Guardrails (Critical for “AI coding at scale”)

To prevent the “agent forgets the codebase” failure mode:

1. **TypeScript strict mode**
2. **ESLint + Prettier**
3. **Unit tests** for:
   - ranking logic
   - score updates
   - snapshot creation
4. **E2E smoke tests** (later) for core flows

Claude Opus should:

- always run lint/typecheck/tests after changes
- keep changes scoped to the iteration
- never duplicate existing logic—search first

---

## 14) Acceptance Criteria (Definition of Done)

### 14.1 Deck

- Swipes never lag
- Each swipe produces stored event
- Undo works (if implemented)

### 14.2 Ranking

- Cold start shows popular + diverse across types
- Warm start adapts but still explores
- No repeat loops

### 14.3 Profile

- Shows:
  - top themes
  - strong yes/no
  - type breakdown
  - changes over time
- Updates immediately after swipes

### 14.4 Library

- user can review liked/disliked/skipped
- can remove (optional) or reclassify a swipe

### 14.5 App store readiness

- stable navigation
- consistent storage
- privacy disclosure
- no broken screens on Android/iOS/web (if web supported)

---

## 15) Implementation Strategy for Claude Opus (How to Work This Repo)

### 15.1 Work method (required)

- Step 1: read this file + relevant code
- Step 2: propose a plan with file list + schema changes
- Step 3: implement with small commits
- Step 4: run:
  - typecheck
  - lint
  - tests
- Step 5: provide a short verification checklist

### 15.2 Rule: “Compute-first, AI-second”

Any feature that can be done deterministically (ranking, aggregation, clustering heuristics) must be done that way first. AI is for labels and summaries only.

---

## 16) Phased Build (So We Actually Ship)

**Phase 1 (ship quality):**

- Deck + 5-state actions
- Local ranking (tags + popularity)
- Profile (themes + yes/no + change over time basic)
- Library
- Settings (clear/export)

**Phase 2 (make it smarter):**

- Theme clustering upgrades
- Cloud summary toggle (stats-only payload)
- Better visuals/dials
- Better exploration strategy

**Phase 3 (scale catalog):**

- Catalog update pipeline
- Better licensing-aware images (optional)
- Tile generation pipeline

---

## 17) Iterative Task Backlog for Claude Opus 4.6 (Execute in Order)

> Execute one task at a time in sequence. Keep each task scoped and shippable.

1. **Bootstrap app shell**: create Expo Router project structure with tabs: Deck, Profile, Library, Settings.
2. **Add TypeScript strict + lint + format**: enforce `strict: true`, ESLint, Prettier, scripts.
3. **Create SQLite initialization layer**: implement DB open/migrate with versioned migrations.
4. **Add base schema tables**: create all tables listed in Section 6 with indexes.
5. **Add typed domain models**: create shared types for entity, swipe event, scores, snapshot.
6. **Load starter catalog**: add import pipeline from bundled JSON into `catalog_entities`.
7. **Implement deterministic tile component**: gradient + type icon + title fallback using `tile_key`.
8. **Build Deck card UI**: render card, metadata, tags, and accessibility-friendly action buttons.
9. **Implement swipe action recording**: persist session + swipe events with action-to-weight mapping.
10. **Implement undo last swipe**: remove latest swipe event and reverse materialized score updates.
11. **Incremental taste updates**: update `entity_affinity`, `taste_type_scores`, `taste_tag_scores` per swipe.
12. **Cold-start candidate selector**: popular + diversity-balanced sampler across selected types.
13. **Warm-start ranker**: score formula with pop/match/novel + normalization.
14. **Add ε-greedy exploration**: 85/15 exploit/explore selection policy.
15. **Add repetition guardrails**: avoid recently shown entities and cap repeated tags.
16. **Build filter modal**: media type toggles, diversity boost, mainstream slider.
17. **Build Profile visualizations v1**: top themes chart, type affinity bars, likes/dislikes lists.
18. **Add profile snapshots job**: periodic snapshot creation every N swipes and daily boundary.
19. **Build “over time” view**: sparkline/chart from `profile_snapshots`.
20. **Build Library screen v1**: segmented Liked/Disliked/Skipped + type/date filters.
21. **Build Settings data controls**: export JSON, clear local data, privacy/about screen.
22. **Add local AI-label fallback rules**: deterministic theme labels without cloud calls.
23. **Add optional cloud summary toggle**: send aggregate stats payload only (no raw history).
24. **Test suite for scoring/ranking/snapshots**: unit tests covering edge cases + regression fixtures.
25. **Performance pass**: preload next 5–10 cards, avoid blocking UI thread, profile expensive selectors.
26. **Release hardening**: error boundaries, offline behavior checks, empty-state UX, app-store readiness checklist.

---

### End of CLAUDE.md
