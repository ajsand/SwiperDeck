# CLAUDE.md - DateDeck (Deck-Based First-Date Companion)

> Purpose of this document
> This is the single source of truth for the DateDeck fork.
> It defines product direction, constraints, architecture, algorithm rules, privacy boundaries, and the ordered backlog for the fork.
>
> The original TasteDeck app was completed through Iteration 8.
> DateDeck starts from that inherited technical baseline and continues with a new fork backlog beginning at Iteration 09.

---

## 0) What This Fork Is

DateDeck is a local-first, deck-based first-date companion.

Users build separate profiles per deck by swiping on cards in specific dating-relevant categories, then intentionally compare a single deck with another person in person to generate a structured, useful conversation report.

### Core value proposition

This is not a generic dating app and not a swipe-to-match product.

It is designed to:

- help two people get to meaningful conversation faster
- reduce low-value small talk on first dates
- provide deck-specific insight into alignment, contrast, uncertainty, and talking points
- remain privacy-conscious and local-first by default

### What stays from the original TasteDeck architecture

The following concepts remain useful and reusable:

- swipe/action-driven cards
- deterministic tile rendering
- SQLite-backed on-device persistence
- typed domain models
- local-first storage
- compare/report orchestration patterns
- showdown mode as a secondary experience
- iterative build discipline

### What changes in this fork

The fork changes the product meaning and scope:

- the unit of meaning is the deck, not one giant universal taste profile
- the app is organized around dating-relevant categories
- compare/contrast is deck-specific, intentional, and in-person
- AI is used for deck-scoped summaries, not matchmaking or diagnosis
- prebuilt decks receive richer internal sequencing support than custom decks in the current roadmap

---

## 1) Product Principles (Non-Negotiable)

1. Deck-first, not person-first
   Users are not reduced to one universal score or vibe summary. Each deck is one lens.

2. Local-first by default
   Swipe history, deck profiles, and custom decks live on device unless the user explicitly starts a compare/report flow.

3. Conversation utility over engagement hacking
   The algorithm exists to learn meaningful deck-specific signal, not to maximize addiction or raw session length.

4. Consent-gated comparison
   No passive browsing of strangers, no hidden comparison, no secret profile lookups.

5. AI as summarizer, not oracle
   AI may summarize grounded signal, uncertainty, contrasts, and conversation prompts. It must not behave like a diagnostician, fortune teller, or compatibility judge.

6. Universal action system
   All decks use the same core action semantics so profile logic, compare logic, and custom deck support remain coherent.

7. Explainable over opaque
   Sequencing, readiness, confidence, and report claims should be inspectable and testable locally.

8. No-creep boundary
   The product must avoid features that feel invasive, manipulative, voyeuristic, or socially unsafe.

9. Custom decks are allowed, but bounded
   Users may create and import custom decks, but custom content must not become a backdoor for harassment, surveillance, or pseudo-psychological profiling.

10. Deck reports are scoped
    Meaningful outputs should be tied to one deck at a time. Whole-person judgments are out of scope.

11. Do not become Tinder
    This product is not for browsing strangers, ranking people, or building a public social graph.

---

## 2) Baseline Inherited State From The Original App

This fork does not begin from an empty repo.

Assume the original TasteDeck app already completed work through Iteration 8, including:

- Expo Router app shell
- strict TypeScript, linting, and formatting
- SQLite initialization and migration framework
- starter data-loading pipeline patterns
- deterministic tile rendering primitives
- deck card UI and controls foundation

### Important baseline rule

The inherited branch is a technical starting point, not a product constraint.

This fork is allowed to:

- rename product concepts
- refactor schema and domain layers
- replace broad profile logic with deck-specific logic
- replace old ranking assumptions
- split or reorganize inherited modules

But it should reuse working infrastructure where practical:

- app shell
- database client and migration runner
- strict typing setup
- deterministic tile primitives
- testing patterns
- swipe UI primitives

---

## 3) Product Definition

### What this app is

DateDeck is a local-first app that lets users build deck-specific self-profiles by swiping on cards in categories that matter in dating, then compare those profiles with another person in person to generate a conversation-friendly insight report.

### What this app is not

This app is not:

- a swipe-to-match app
- a stranger-browsing app
- a public social network
- an anonymous rating tool
- a surveillance or compatibility scoring engine
- a public profile marketplace

### Best positioning

DateDeck should be framed as:

- a first-date companion
- an in-person compatibility icebreaker
- a deck-based conversation catalyst
- a self-discovery plus compare/contrast app for dating contexts

---

## 4) Core User Flows

### 4.1 Onboarding

When the user first opens the app:

- explain the deck concept simply
- explain that profiles are built per deck
- explain that data stays local unless the user explicitly shares deck-scoped data for comparison/report generation
- offer these starting paths:
  - explore recommended decks
  - continue a prior deck
  - create or import a custom deck

### 4.2 Choosing a deck

Users select one deck at a time.

Deck browser groups decks by purpose, such as:

- light and fun
- compatibility-relevant
- lifestyle
- values
- deeper or sensitive

Each deck should show:

- title
- short description
- what it explores
- approximate card count
- rough threshold for a useful profile
- whether it is compare-eligible
- whether it is showdown-eligible

Navigation rule:

- deck browsing and normal deck drill-down stay inside the persistent bottom-tab shell
- opening a deck detail, deck profile, compare, or other normal deck sub-screen must not drop the user out of that shell
- the only intentional break from the tab shell is active live swiping

### 4.3 Swiping through a deck

- user sees one card at a time
- all cards use the same action model
- sequencing starts broad, then adapts
- some cards may resurface later as purposeful retest or calibration cards
- the swipe experience should feel quick, legible, and stable

Swipe-session continuity rule:

- a swipe session is an interaction window, not the durable owner of future card order
- each swipe persists immediately
- leaving a deck mid-session must not lose progress
- returning later should ask the algorithm for the next useful card from current durable deck state, not resume a frozen long-lived queue

### 4.4 Generating a deck profile

After a minimum threshold, show a deck profile containing:

- early signal summary
- confidence level
- main affinities
- main aversions or low-affinity zones
- unresolved or low-confidence areas
- progress toward better confidence and compare readiness

### 4.5 Comparing with another user in person

Compare flow must require:

- both users select the same deck
- both users have enough deck data
- both explicitly approve comparison
- the app shows what leaves the device
- AI summary/report is generated only for that one deck

### 4.6 Showdown mode

- one deck per showdown
- one host chooses card count and timer
- the same card appears for all participants simultaneously
- all participants answer before timeout
- the final output is a lighter multiplayer compare summary

### 4.7 Handling insufficient data

If comparison is requested without enough signal:

- block the full compare report
- explain why
- suggest more swipes or a quick-fill path
- optionally provide a clearly labeled low-confidence preview only if the deck policy allows it

### 4.8 Error and privacy flows

Before compare/report:

- show exactly what is being shared
- show which deck it applies to
- allow cancel before submission
- remind users the report is an interpretation, not a factual judgment

---

## 5) Deck System Design

### 5.1 Core deck model

A deck is a bounded category-specific profile system:

- one category
- one card set
- one profile space
- one comparison grammar
- one report context

### 5.2 Recommended launch categories

#### Tier 1 launch decks

Highest-priority launch decks:

- Movies and TV
- Music
- Food and Drinks
- Travel
- Lifestyle and Routines
- Social Habits
- Humor
- Relationship Preferences
- Values
- Communication Style

#### Tier 2 later additions

- Video Games
- Books
- Ambition and Career
- Family Orientation
- Health and Fitness
- Future Goals

#### Tier 3 sensitive or gated decks

Useful later, but more carefully framed:

- Politics
- Religion or spirituality
- Sexual boundaries or intimacy expectations
- Children or marriage timeline
- Money philosophy

### 5.3 Prebuilt vs custom decks

#### Prebuilt decks

- editorially designed
- balanced for breadth and sequencing quality
- safe descriptions and better QA
- canonical card-tag taxonomy and tag-level sequencing support
- stronger confidence, compare, and report quality

#### Custom decks

- user-authored or imported
- local-only by default
- same action system
- same storage model where practical
- may use simpler sequencing and lower-confidence compare/report rules until dedicated custom-deck support lands

Important scope boundary:

- the richer tag-aware sequencing system is in scope for prebuilt decks only right now
- it is not yet guaranteed for custom decks, imported decks, or public/community decks

### 5.4 Card composition rules

Each card must have:

- stable id
- deck id
- card kind: `entity` or `statement`
- title or statement text
- short description
- universal action support
- safe fallback rendering

For prebuilt decks specifically, cards may also carry richer internal metadata:

- display tags for lightweight UI chips
- canonical tag assignments for subcategory/theme reasoning
- stable relationships to deck-specific facets and tags

Those richer tags are for sequencing, coverage, confidence-building, resurfacing, and later compare/report quality.

### 5.5 Good deck authoring guidance

A strong deck includes:

- foundational cards
- representative cards
- differentiator cards
- nuance cards
- retest-worthy cards

A weak deck:

- goes too niche too early
- is repetitive
- is manipulative
- contains gotcha content
- is overloaded with highly sensitive material
- lacks representative breadth

---

## 6) Card Model

### 6.1 Card kinds

Cards may be:

- entity cards: nouns, named things, works, places, products, media, and so on
- statement cards: preference statements, habit statements, values framing, or identity-adjacent prompts

### 6.2 Card fields

Each card should conceptually contain:

- `id`
- `deck_id`
- `kind`
- `title`
- `description_short`
- `tags[]` for display chips
- `popularity_score`
- `tile_key`
- optional admin or authoring metadata

For prebuilt decks, the internal authoring model may additionally include:

- canonical tag links
- tag roles such as primary and secondary
- stable theme/facet membership

### 6.3 Prebuilt tag taxonomy guidance

Prebuilt deck tags represent subcategories, themes, or latent dimensions within a single deck.

Examples:

- Movies and TV: `thriller`, `prestige`, `comfort_watch`, `mainstream`, `arthouse`
- Travel: `backpacking`, `luxury`, `nature`, `city_break`, `road_trip`
- Food and Drinks: `spicy`, `vegetarian`, `desserts`, `fine_dining`, `comfort_food`

Tag taxonomy rules:

- tags must be canonical and deck-specific
- they should describe within-deck structure, not vague reactions
- they should be stable enough for coverage and retest logic
- they should remain explainable to humans

Important boundary:

- this internal tag taxonomy is currently for prebuilt decks only

### 6.4 Description guidance

Descriptions should:

- stay short
- clarify ambiguity
- avoid loaded framing
- help the user understand what they are reacting to

### 6.5 Text-first presentation

Cards should remain lightweight and scalable:

- mostly text-based
- deterministic tile visuals by default
- no dependency on licensed images

---

## 7) Action Model

### 7.1 Canonical action system

DateDeck standardizes on a universal five-state action system:

- `hard_no`
- `no`
- `skip`
- `yes`
- `strong_yes`

### 7.2 Why this action system

It is:

- consistent across decks
- easy to learn
- easy to model locally
- easy to compare across users
- appropriate for both entity cards and statement cards

### 7.3 Action semantics

For entity cards:

- "How positively do I relate to this?"

For statement cards:

- "How much do I agree with or identify with this?"

### 7.4 Important action rule

Do not create deck-specific action vocabularies in MVP.

The UI labels may adapt for clarity, but the underlying canonical values remain universal.

---

## 8) Deck Profile Model

### 8.1 Profile scope

A user has one profile per deck.

There is no giant universal profile in MVP.

### 8.2 Each deck profile should include

- sentiment distribution
- theme and tag clusters
- confidence score
- coverage score
- ambiguity or unresolved areas
- stability markers from retest cards
- deck-specific summary surfaces

### 8.3 Within-deck structure matters

Deeper profile quality should be informed by:

- tag-level sub-area signals
- tag coverage across the deck
- ambiguity and mixed-signal areas
- stability gained from reaffirmation or retest
- structured theme clusters, not only raw card counts

### 8.4 Profile stages

#### Stage 1 - Lightweight profile

- enough cards for an early read
- clearly low-confidence
- useful for self-reflection, not strong comparison

#### Stage 2 - Meaningful profile

- enough breadth for compare/report use
- enough structure for tag-level summary and confidence reasoning

#### Stage 3 - High-confidence profile

- repeated engagement
- retest confirmation
- higher stability and interpretability

### 8.5 Confidence rules

Confidence must depend on:

- card count
- card coverage
- tag coverage
- breadth across deck sub-areas
- consistency
- retest agreement
- unresolved ambiguity

Not just raw swipe totals.

### 8.6 What the app may infer

Reasonable:

- enthusiasm areas
- aversion areas
- high-confidence overlaps and contrasts
- low-confidence or ambiguous zones
- whether more swiping or retest is needed

Not reasonable:

- clinical personality diagnosis
- hidden ideology inference from unrelated decks
- long-term relationship predictions from sparse data

---

## 9) Compare / Contrast Report Design

### 9.1 Report goal

The compare report is:

- an icebreaker
- a structured conversation map
- a mutual insight summary
- a "what to talk about next" guide

### 9.2 Report requirements

The report must:

- be grounded in actual deck-specific action data
- state confidence clearly
- separate strong signal from weak signal
- use theme/tag structure when available
- surface interesting contrasts without overstating incompatibility
- provide useful talking points

### 9.3 Recommended report structure

1. Deck summary
   - deck name
   - confidence for each user
   - confidence for the comparison
   - what the app had enough breadth to analyze

2. Strongest alignments
   - strongest shared positive and negative reactions
   - grouped by theme or tag where possible

3. Interesting contrasts
   - meaningful differences framed as conversation material, not verdicts

4. Potential friction points
   - only when confidence is high enough
   - phrased carefully

5. Conversation starters
   - the most important section
   - grounded in actual structured deck signal

6. Low-confidence or unresolved areas
   - places where the app should explicitly admit uncertainty

### 9.4 Report tone

The tone must be:

- warm
- grounded
- non-clinical
- non-judgmental
- uncertainty-aware
- useful, not gimmicky

### 9.5 What to avoid

Avoid:

- headline compatibility scores
- red-flag labeling from sparse data
- protected-trait inference
- manipulative advice
- "should you keep dating?" framing
- deterministic identity claims

---

## 10) Showdown Mode Design

### 10.1 Role of showdown mode

Showdown is a secondary, playful comparison mode.

It is not the core product.

### 10.2 Best-fit contexts

- double dates
- friend groups
- social icebreaker settings
- playful group-first-date scenarios

### 10.3 Basic rules

- one deck per showdown
- host sets card count and timer
- the same card is shown to all participants
- all users answer before timeout
- a lighter summary is generated at the end

### 10.4 Output style

Showdown output should be lighter than one-to-one compare:

- strongest group alignments
- major split topics
- surprise consensus
- conversation spark cards
- optional light pairwise notes

### 10.5 Risk controls

Do not allow showdown for all decks.

Some decks should be non-showdown-eligible, especially:

- intimacy-related decks
- highly sensitive worldview decks
- trauma-adjacent material
- decks where public answer timing creates pressure or humiliation risk

---

## 11) Local-First, Privacy, and Consent Rules

### 11.1 Local-first default

The default architecture is:

- no mandatory account system
- no server-side profile storage by default
- user owns swipe and deck data locally
- custom decks stay local unless explicitly exported

### 11.2 External AI usage rules

External AI is allowed only when:

- the user explicitly starts compare/report
- both participants consent
- the deck is eligible
- the app has enough data to justify the report

### 11.3 Minimal export rule

Only export the minimum necessary deck-scoped data:

- deck id and version
- normalized action summaries
- tag/theme summaries where justified
- confidence metadata
- limited raw card detail only when needed for grounding

### 11.4 Consent rule

Consent must be:

- explicit
- per comparison
- per deck
- cancelable before submission

### 11.5 Anti-creepy boundaries

The app must not support:

- public profile lookup
- hidden comparison
- anonymous reviews of other people
- passive social graphing
- blanket compatibility scoring
- public sharing of another person's compare report without consent

### 11.6 Sensitive deck safeguards

Sensitive decks may require:

- warnings
- opt-in gating
- stronger compare thresholds
- no showdown support
- more constrained AI report language

---

## 12) AI Usage (Bounded and Controlled)

### 12.1 What AI is allowed to do

AI may:

- summarize deck-specific alignment and contrast
- produce conversation prompts
- explain uncertainty
- identify shared themes and meaningful differences
- generate showdown summaries for eligible decks

### 12.2 What AI must not do

AI must not:

- diagnose users
- infer protected or deeply sensitive hidden traits
- make romantic outcome predictions
- give clinical or manipulative advice
- invent certainty where data is weak
- turn sparse signals into heavy judgments

### 12.3 Architectural rule

Compute deck profile state locally first.

AI is a second-stage summarizer only.

### 12.4 Output grounding rule

Any AI-generated report must be grounded in:

- deck-specific action data
- local confidence metadata
- explicit uncertainty markers

No horoscope-like or free-floating output.

---

## 13) System Architecture Direction

### 13.1 Reuse from the original app

Reuse where practical:

- app shell and navigation foundation
- local SQLite infrastructure
- migration framework
- strict typing and linting setup
- deterministic tile system
- swipe UI primitives
- testing setup

### 13.2 New conceptual entities

This fork introduces or elevates:

- `decks`
- `deck_cards`
- `swipe_sessions`
- `swipe_events`
- `deck_tag_facets`
- `deck_tag_taxonomy`
- `deck_card_tag_links`
- `deck_tag_state`
- `deck_profile_snapshots`
- `deck_compare_sessions`
- `deck_compare_reports`
- `showdown_sessions`
- `showdown_reports`

### 13.3 Key architectural shift

Move from:

- broad catalog and broad profile modeling

To:

- deck-first content
- deck-scoped profile computation
- tag-aware sequencing for prebuilt decks
- deck-scoped compare/report payloads

### 13.4 Sequencing architecture direction

The fork is evolving toward:

- card-level state
- deck-level state
- tag-level state for prebuilt decks
- tag-aware next-card scoring
- coverage and diversity safeguards
- retest and reaffirmation logic
- explainability and regression tooling for next-card decisions

### 13.5 Navigation and live-session architecture direction

Normal navigation should use a persistent bottom-tab shell with tab-owned stacks:

- `Decks` stack
- `Profile` stack
- `History` stack
- `Settings` stack

Normal sub-screens remain inside those stacks:

- deck detail
- deck profile
- compare readiness, consent, and report screens
- history drill-down
- settings drill-down

Live deck swiping should be the only focused full-screen breakout route that hides the bottom nav.

This avoids the current failure mode where ordinary deck drill-down drops the user out of the main app shell and makes navigation feel inconsistent.

### 13.6 Swipe-session ownership rule

`swipe_sessions` remain useful, but they are not the durable source of sequencing truth.

Session rows should represent:

- entry and exit envelope
- session-local analytics
- ephemeral UI context

They should not become:

- a persisted long-lived queue contract
- the owner of future next-card decisions across later sessions

Durable sequencing state belongs to deck history, card recency, tag state, coverage state, and retest eligibility.

### 13.7 Scope boundary for advanced sequencing

The richer tag-enhanced sequencing stack is currently for:

- prebuilt decks only

It is not yet in scope for:

- custom decks
- imported decks
- public/community decks
- cloud personalization systems
- opaque ML-heavy recommendation architecture

### 13.8 Schema philosophy

Schema should be refactored to make decks first-class and keep the system explainable.

Do not force-fit the dating fork into an awkward broad-catalog schema if it compromises clarity.

---

## 14) Algorithm Requirements

### 14.1 Goals

The deck algorithm must:

- start broad and representative
- learn from card-level and tag-level signals
- avoid collapsing into one narrow pocket of a deck too early
- preserve breadth across deck sub-areas
- introduce novelty thoughtfully
- resurface purposeful retest cards later
- remain local-first, explainable, and testable

### 14.2 Desired balance

The sequencing system should balance:

- relevance
- breadth
- coverage
- novelty
- reaffirmation and retest
- interpretability
- confidence-building

### 14.3 Early-stage sequencing rule

Cold start inside a deck should favor:

- common and representative cards
- balanced facet and tag coverage
- strong profile foundation before deeper personalization

Do not let the first few positive or negative swipes collapse the rest of the session into one theme too quickly.

### 14.4 Tag-aware sequencing rule

For prebuilt decks, sequencing may use:

- card-level reactions
- canonical tag assignments
- tag exposure and recency
- tag coverage gaps
- ambiguity and low-confidence areas
- importance of reaffirmation

This should improve within-deck learning without becoming a black box.

### 14.5 Anti-overfit rule

The deck should not simply mirror recent swipes.

It should maintain representative breadth long enough to learn a profile worth trusting.

### 14.6 Retest rule

Resurfacing should:

- be purposeful, not repetitive
- focus on important, ambiguous, or low-stability areas
- use cooldowns and caps
- improve profile stability and compare quality

### 14.7 Cross-session continuity rule

Session boundaries must not behave like algorithm boundaries.

When a user returns to the same deck later, next-card selection should recompute from durable local state, including:

- prior swipe history in that deck
- card and tag recency
- coverage debt
- ambiguity and low-confidence areas
- retest due state

Do not treat "new session" as permission to repeat the same recent cards or reset breadth/depth mode.

### 14.8 Explainability rule

The app should be able to explain why a card appeared next in local/debug terms such as:

- undercovered area
- related tag with positive signal
- ambiguity probe
- representative broad-start pick
- retest for confidence

### 14.9 What the algorithm must not become

Do not introduce:

- server-heavy personalization
- embeddings-first recommendation systems
- opaque black-box scoring the team cannot debug locally
- engagement-maximizing loops divorced from conversation utility

---

## 15) UX and Accessibility Requirements

### 15.1 Swipe UI expectations

- one obvious focal card at a time
- stable action affordances
- quick animations without confusion
- clear progress and recovery states
- a visible, explicit exit path from live swiping at any time

### 15.2 Navigation expectations

- the bottom navigation bar remains visible across all normal app flows and sub-screens
- only active live deck swiping hides the bottom navigation bar
- exiting live swiping returns the user to a sensible deck-related screen with the tab shell restored
- the app should feel like one coherent system, not a tab shell plus disconnected drill-down routes

### 15.3 Deck profile expectations

- confidence must be legible
- unresolved areas must read as uncertainty, not failure
- compare CTAs should only appear when justified

### 15.4 Stop and resume expectations

- users can stop swiping after any number of cards
- progress is saved after every swipe
- resuming later should feel continuous without implying a frozen queue resume
- "nothing due right now" is different from permanent deck completion

### 15.5 Compare/report expectations

- clear consent copy
- clear export preview
- obvious deck scope
- no dark patterns around sharing

### 15.6 Accessibility requirements

- actions remain reachable without gestures alone
- state changes should be announced accessibly
- high-contrast and readable layouts
- timing-based flows need accessible fallback behavior

---

## 16) Content Safety and Sensitive Deck Policy

### 16.1 Sensitive deck policy

Sensitive decks are allowed only with stronger product boundaries:

- clearer warnings
- stronger compare thresholds
- more constrained AI output
- limited or no showdown support

### 16.2 Sensitive tag policy

Once prebuilt tag taxonomy exists, some tags may require extra report caution.

The system should support:

- suppression of low-confidence sensitive claims
- extra caution language for sensitive contrasts
- withholding certain conversation prompts when the deck policy requires it

### 16.3 Custom content safety

Custom decks are local-only by default and must not be treated as equally trustworthy as editorial prebuilt decks unless later iterations explicitly add the required safety and quality checks.

---

## 17) Documentation and Iteration Discipline

### 17.1 Single-model workflow

GPT-5.4 Extra High is the only model used for:

- documentation updates
- planning
- implementation
- refactors
- tests
- integration work

### 17.2 Iteration discipline

Execute backlog work in order unless a later iteration is explicitly being refactored to align with newly inserted work.

Each iteration should clearly state:

- what inherited TasteDeck work is being reused
- what is being refactored
- what is being replaced

### 17.3 Scope discipline

Do not silently broaden advanced prebuilt-deck capabilities to custom or public decks.

If a later backlog item changes scope, state it explicitly.

---

## 18) Phased Build Strategy For The Fork

### Phase 1 - Fork foundation and deck model

Iterations 09-13 establish:

- DateDeck branding and product shell
- first-class decks and deck cards
- universal action model
- deck browser and detail flows
- MVP prebuilt decks

### Phase 2 - Deck-scoped runtime and prebuilt sequencing substrate

Iterations 14-14G establish:

- deck-scoped swipe and session logic
- canonical prebuilt deck tag taxonomy
- tag-level deck state
- broad-start representative sequencing
- tag-aware next-card scoring
- coverage and diversity guardrails
- retest and ambiguity-targeting resurfacing
- local evaluation, explainability, and regression tooling

This phase is the foundation for trustworthy profile quality inside prebuilt decks.

### Phase 3 - Profile, compare, and safety core

Iterations 15-19 establish:

- richer deck profile summaries
- compare readiness and consent
- privacy-minimized compare payloads
- one-to-one AI compare reports
- sensitive deck and report safeguards

This phase depends on the structured sequencing foundation from Phase 2.

### Phase 4 - Secondary modes and custom deck support

Iterations 20-22 establish:

- showdown mode adapted to the dating fork
- navigation consistency and cross-session deck swiping refinement
- local custom deck creation and import
- bounded compare support for custom decks

Prebuilt and custom decks should not be treated as equally structured unless the supporting metadata exists.

### Phase 5 - Refinement and release hardening

Iterations 23-25 establish:

- confidence and retest refinement
- report quality refinement
- release hardening for the evolved fork

---

## 19) Fork Iteration Backlog

The original TasteDeck app was completed through Iteration 8.

The DateDeck fork backlog begins at Iteration 09:

9.  Reframe product shell for deck-first dating fork
10. Introduce first-class decks and deck_cards
11. Standardize universal dating-fork action model
12. Build deck selection and deck detail flows
13. Ship MVP prebuilt decks
14. Refactor swipe and session logic to deck scope
    14A. Add prebuilt deck tag taxonomy and card-tag metadata
    14B. Add tag-level deck state and typed models
    14C. Implement broad-start representative sequencing for prebuilt decks
    14D. Implement tag-aware next-card scoring
    14E. Add coverage, diversity, and anti-collapse guardrails
    14F. Add retest, reaffirmation, and ambiguity-targeting resurfacing
    14G. Create sequencing evaluation, explainability, and regression harness
15. Build deck profile summary v1
16. Build compare eligibility and consent flow
17. Build compare payload minimization layer
18. Implement one-to-one AI compare report v1
19. Add sensitive deck gating and report safeguards
20. Adapt showdown mode to dating fork
    20B. Refine navigation consistency and cross-session deck swiping
21. Add local custom deck creation and import
22. Enable compare support for custom decks
23. Profile confidence and retest logic refinement
24. Deck report quality refinement
25. Release hardening for the dating fork

Downstream dependency note:

- Iteration 15 and later are no longer simple swipe-count consumers
- they now depend on the tag-aware sequencing, coverage, confidence, and explainability groundwork from 14A-14G

---

## 20) Risks and Failure Modes

1. The app can become gimmicky
   If profiles or reports sound generic, trust drops quickly.

2. Sensitive decks can distort product tone
   Launching highly charged decks too early can make the app feel confrontational rather than connective.

3. Custom decks can become unsafe
   Local-only by default helps, but custom content still needs quality and safety boundaries.

4. Sequencing can collapse too narrowly
   If the algorithm overfits too early, profile quality, compare quality, and trust all degrade.

5. Retest can feel repetitive
   If resurfacing lacks clear purpose or cooldowns, users will experience it as spam.

6. Compare reports can overclaim
   If low-confidence or unresolved areas are framed too strongly, the app becomes invasive.

7. Explainability can be neglected
   If the team cannot answer "why this card next?" locally, future tuning will become unsafe and brittle.

8. Fork drift risk
   Because the old codebase already exists, every iteration must keep stating what is inherited, refactored, or replaced.

---

## 21) Final Product Framing

The clearest framing for this fork is:

A local-first, deck-based first-date companion that helps two people compare how they think, feel, and relate within specific categories so they can get to meaningful conversation faster.

This framing is preferred over:

- "dating app"
- "compatibility engine"
- "matchmaking platform"
- "social taste graph"

because it keeps the product coherent, differentiated, and aligned with its privacy-conscious, deck-first architecture.

### End of CLAUDE.md
