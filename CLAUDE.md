# CLAUDE.md — DateDeck (Deck-Based First-Date Companion)

> **Purpose of this document**
> This is the single source of truth for building the dating-focused fork of the original TasteDeck app.
> It defines the product, constraints, architecture direction, AI boundaries, local-first rules, compare/report design, and the new iterative delivery plan.
>
> This fork starts from the **existing TasteDeck codebase state completed through Iteration 8**, then redesigns the product around dating, first dates, and in-person compare/contrast flows.

---

## 0) What This Fork Is

**DateDeck** is a local-first, deck-based first-date companion.

Users build **separate profiles per deck** by swiping on cards in specific categories, then intentionally compare a specific deck with another person **in person** to generate a structured, useful conversation report.

### Core value proposition

This is **not** a generic dating app and **not** a swipe-to-match product.

It is designed to:

- help people get to meaningful conversation faster on first dates
- reduce low-value small talk
- provide deck-specific insight into alignment, contrast, and talking points
- remain local-first and privacy-conscious

### What stays from the original TasteDeck architecture

The following concepts remain valuable and reusable:

- swipe/action-driven cards
- adaptive deck sequencing
- local-first storage
- compare/contrast mode
- showdown mode
- deterministic card art fallback
- SQLite-backed on-device persistence
- typed domain model approach
- iterative build discipline

### What changes in this fork

The new fork changes the meaning and scope of the product:

- the unit of meaning is now the **deck**, not one giant universal taste profile
- the app is organized around **dating-relevant categories**
- compare/contrast is **deck-specific**, **intentional**, and **in-person**
- AI is used to generate **deck-specific insight reports**, not matchmaking claims
- custom decks remain supported, but with stronger safety and quality boundaries

---

## 1) Product Principles (Non-Negotiable)

1. **Deck-first, not person-first**
   Users are not reduced to a single universal score or vibe summary. Each deck is one lens into the user.

2. **Local-first by default**
   Swipe history, deck profiles, and custom decks live on device unless the user explicitly initiates a compare/report flow.

3. **Conversation utility over engagement hacking**
   The algorithm exists to learn meaningful deck-specific signals, not to optimize raw session length or addictive loops.

4. **Consent-gated comparison**
   No passive browsing of strangers, no hidden profile lookups, no secret compare mode.

5. **AI as summarizer, not oracle**
   AI may summarize shared signals, uncertainty, contrasts, and conversation prompts. It must not act like a diagnostician, fortune teller, or compatibility judge.

6. **Universal action system**
   All decks use the same core action semantics so profile logic, compare logic, and custom deck support remain coherent.

7. **No-creep boundary**
   The product must avoid features that feel invasive, manipulative, voyeuristic, or socially unsafe.

8. **Custom decks are allowed, but bounded**
   Users may create and import custom decks, but custom content must not become a backdoor for harassment, surveillance, or pseudo-psychological profiling.

9. **Deck reports are scoped**
   All meaningful outputs should be tied to one deck at a time. Broad “whole person” judgments are out of scope.

10. **Do not become Tinder**
    This product is not for browsing strangers, ranking people, or public social discovery.

---

## 2) Baseline Inherited State From The Original App

This fork does **not** begin from an empty repo.

Assume the original TasteDeck app has already completed work through Iteration 8, including:

- Expo Router app shell
- strict TypeScript + lint + formatting
- SQLite initialization + migration framework
- early schema and typed model foundations
- starter data loading pipeline patterns
- deterministic tile rendering
- deck card UI and controls foundation

### Important baseline rule

The old branch is a **technical starting point**, not a product constraint.

This fork is allowed to:

- rename product concepts
- refactor the schema
- replace broad profile logic with deck-specific profile logic
- replace old action names if needed
- split or reorganize prior modules

But it should reuse working infrastructure where practical:

- app shell
- DB client and migration engine
- strict typing setup
- deterministic tile primitives
- testing patterns
- deck card rendering patterns

---

## 3) Product Definition

### What this app is

DateDeck is a local-first app that lets users build **deck-specific self-profiles** by swiping on cards in categories that matter in dating, then compare those profiles with another person **in person** to generate a conversation-friendly insight report.

### What this app is not

This app is not:

- a swipe-to-match app
- a stranger-browsing app
- a social feed
- an anonymous rating tool
- a surveillance or compatibility scoring engine
- a public profile marketplace

### Best positioning

DateDeck should be framed as:

- a **first-date companion**
- an **in-person compatibility icebreaker**
- a **deck-based conversation catalyst**
- a **self-discovery + compare/contrast app for dating contexts**

---

## 4) Core User Flows

### 4.1 Onboarding

When the user first opens the app:

- explain the deck concept simply
- explain that profiles are built per deck
- explain that data stays local unless the user explicitly shares a deck for comparison/report generation
- offer these starting paths:
  - explore recommended decks
  - continue a prior deck
  - create/import a custom deck

### 4.2 Choosing a deck

Users select one deck at a time.

Deck browser should group decks by purpose, such as:

- light / fun
- compatibility-relevant
- lifestyle
- values
- deeper / sensitive

Each deck should show:

- title
- short description
- what it explores
- approximate card count
- rough threshold for a useful profile
- whether the deck is compare-eligible
- whether the deck is showdown-eligible

### 4.3 Swiping through a deck

- user sees one card at a time
- all cards use the same action model
- algorithm starts broad, then adapts
- some cards resurface later as retest/calibration cards
- card UI should feel quick, stable, and legible

### 4.4 Generating a deck profile

After a minimum threshold, show a deck profile containing:

- early signal summary
- confidence level
- main alignments / affinities
- strong aversions or low-affinity zones
- unresolved / low-confidence areas
- progress toward better confidence

### 4.5 Comparing with another user in person

Compare flow must require:

- both users select the same deck
- both users have enough deck data
- both explicitly approve comparison
- app shows what leaves device
- AI summary/report is generated only for that deck

### 4.6 Showdown mode

- one deck per showdown
- one host chooses card count and timer
- same card appears for all participants simultaneously
- all participants answer before timeout
- final output is a lighter multiplayer compare summary

### 4.7 Handling insufficient data

If comparison is requested without enough signal:

- block the full compare report
- explain why
- suggest a “quick fill” flow or more swipes
- optionally provide a low-confidence preview only if clearly labeled as limited

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

#### Tier 1 — MVP launch decks

These are highest-priority, useful, and relatively safe:

- Movies & TV
- Music
- Food & Drinks
- Travel
- Lifestyle & Routines
- Social Habits
- Humor
- Relationship Preferences
- Values
- Communication Style

#### Tier 2 — Strong later additions

- Video Games
- Books
- Ambition & Career
- Family Orientation
- Health & Fitness
- Future Goals

#### Tier 3 — Sensitive / gated decks

These may be useful later, but should be intentionally framed and possibly gated:

- Politics
- Religion / Spirituality
- Sexual boundaries / intimacy expectations
- Children / marriage timeline
- Money philosophy

### 5.3 Prebuilt vs custom decks

#### Prebuilt decks

- editorially designed
- balanced coverage
- safe descriptions
- category-specific report templates
- better trust in AI summaries

#### Custom decks

- user-authored or imported
- same action system
- same compare flow if both users have enough data
- more limited AI claims because deck quality is less guaranteed
- local-only by default

### 5.4 Card composition rules

Each card must have:

- stable id
- deck id
- card kind: `entity` or `statement`
- title or statement text
- short description
- tags/themes for profile logic
- universal action support
- safe fallback rendering

### 5.5 Good deck authoring guidance

A strong deck includes:

- foundational cards
- representative cards
- differentiator cards
- nuance cards
- retest candidates

A weak deck:

- is too niche too early
- is repetitive
- is manipulative
- contains “gotcha” content
- is overloaded with highly sensitive content
- lacks representative breadth

---

## 6) Card Model

### 6.1 Card kinds

Cards may be:

- **entity cards**: nouns, named things, people, works, places, products, media, etc.
- **statement cards**: first-person statements, preference statements, habit statements, values-oriented phrasing, etc.

### 6.2 Card fields

Each card should conceptually contain:

- `id`
- `deck_id`
- `kind`
- `title`
- `description_short`
- `tags[]`
- `popularity_score`
- `tile_key`
- optional metadata for authoring/admin purposes

### 6.3 Description guidance

Descriptions should:

- stay short
- clarify ambiguity
- avoid loaded framing
- make the user more confident about what they are reacting to

### 6.4 Text-only first

Cards should remain lightweight and scalable:

- mostly text-based
- deterministic tile visuals by default
- no dependency on licensed images

---

## 7) Action Model

### 7.1 Canonical action system

This fork standardizes on a universal 5-state action system:

- `hard_no`
- `no`
- `skip`
- `yes`
- `strong_yes`

### 7.2 Why this action system

It is:

- consistent across decks
- easier to learn
- easier to model
- easier to compare
- better suited to both entity cards and statement cards

### 7.3 Action semantics

For entity cards:

- “How positively do I relate to this?”

For statement cards:

- “How much do I agree with or identify with this?”

### 7.4 Important action rule

Do not create deck-specific action vocabularies in MVP.

The UI labels may be adapted for clarity, but the underlying canonical values must remain universal.

### 7.5 Optional later signals

Later, not MVP:

- `curious`
- `used_to_like`
- `respect_not_me`

These are intentionally deferred because they complicate profile modeling.

---

## 8) Deck Profile Model

### 8.1 Profile scope

A user has **one profile per deck**.

There is no giant universal profile in MVP.

### 8.2 Each deck profile should include

- sentiment distribution
- theme clusters
- confidence score
- coverage score
- polarization markers
- stability markers from retest cards
- deck-specific summary surfaces

### 8.3 Profile stages

#### Stage 1 — Lightweight profile

- enough cards for an early read
- clearly low-confidence
- useful for self-reflection, not strong comparison

#### Stage 2 — Meaningful profile

- enough breadth for a compare report
- enough signal for AI summarization

#### Stage 3 — High-confidence profile

- repeated engagement
- retest confirmation
- higher stability and interpretability

### 8.4 Confidence rules

Confidence must depend on:

- card count
- category coverage
- consistency
- retest agreement
- breadth of signal

Not just raw swipe total.

### 8.5 Retest / resurfacing logic

Retest cards should:

- appear after meaningful time has passed
- focus on important or ambiguous signals
- remain limited in frequency
- feel like calibration, not repetition spam

### 8.6 What the app may infer

Reasonable:

- enthusiasm areas
- aversion areas
- confidence/stability
- high-confidence overlaps and contrasts

Not reasonable:

- clinical personality diagnosis
- hidden ideology inference from unrelated decks
- long-term partner-fit claims from sparse data

---

## 9) Compare / Contrast Report Design

### 9.1 Report goal

The compare report is:

- an icebreaker
- a structured conversation map
- a mutual insight summary
- a “what to talk about next” guide

### 9.2 Report requirements

The report must:

- be grounded in actual deck-specific action data
- state confidence clearly
- separate strong signal from weak signal
- surface interesting contrasts without overstating incompatibility
- provide useful talking points

### 9.3 Recommended report structure

#### 1. Deck summary

- deck name
- confidence for each user
- confidence for the comparison
- number of shared cards analyzed

#### 2. Strongest alignments

- strongest shared positive/negative reactions
- grouped by themes where possible

#### 3. Interesting contrasts

- meaningful differences framed as conversation material, not verdicts

#### 4. Potential friction points

- only when confidence is high
- phrased carefully
- never framed as destiny or categorical incompatibility

#### 5. Conversation starters

- the most useful section
- should help the date move toward meaningful conversation quickly

#### 6. Surprise overlaps

- unexpected areas of shared signal

#### 7. Low-confidence / unresolved areas

- places where the app should admit uncertainty

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

- headline compatibility score
- “red flag” labeling from sparse data
- protected-trait inference
- manipulative advice
- “should you keep dating?” framing
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
- same card shown to all
- all users answer before timeout
- summary generated at the end

### 10.4 Output style

Showdown output should be lighter than one-to-one compare:

- strongest group alignments
- major split topics
- surprise consensus
- conversation spark cards
- optionally light pairwise notes

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
- custom decks stored locally unless explicitly exported

### 11.2 External AI usage rules

External AI is allowed only when:

- user explicitly starts compare/report
- both participants consent
- the deck is eligible
- the app has enough data to justify the report

### 11.3 Minimal export rule

Only export the minimum necessary deck-scoped data:

- deck id/version
- normalized action summaries
- selected overlaps/differences
- confidence metadata
- limited raw detail when necessary for grounding

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
- public sharing of another person’s compare report without consent

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
- identify likely shared themes and meaningful differences
- generate showdown summaries

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

AI is second-stage summarization only.

### 12.4 Output grounding rule

Any AI-generated report must be grounded in:

- deck-specific action data
- confidence metadata
- explicit uncertainty markers

No generic horoscope-like output.

---

## 13) System Architecture Direction

### 13.1 Reuse from the original app

The fork should reuse where practical:

- app shell and navigation foundation
- local SQLite infrastructure
- migration framework
- strict typing and linting setup
- deterministic tile system
- swipe UI primitives
- testing setup
- compare/report orchestration patterns

### 13.2 New conceptual entities

This fork introduces or elevates:

- `decks`
- `deck_cards`
- `deck_profile_state`
- `deck_profile_snapshots`
- `deck_compare_sessions`
- `deck_compare_reports`
- `custom_decks`
- `custom_deck_cards`
- `showdown_sessions`
- `showdown_participants`
- `showdown_reports`

### 13.3 Key architectural shift

Move from:

- broad catalog and broad profile modeling

To:

- deck-first content
- deck-scoped profile computation
- deck-scoped compare/report payloads

### 13.4 Schema philosophy

Schema should be refactored to make decks first-class.

Do not force-fit the dating fork into an awkward broad-catalog schema if it compromises clarity.

---

## 14) Algorithm Requirements

### 14.1 Goals

The deck algorithm must:

- begin with common, representative cards
- adapt as user signal grows
- avoid becoming too narrow too quickly
- preserve breadth across the category
- introduce novelty thoughtfully
- resurface retest cards later

### 14.2 Desired balance

The next-card algorithm should balance:

- common cards
- representative cards
- personalized cards
- retest cards
- novelty cards

### 14.3 Anti-overfit rule

The deck should not simply mirror recent swipes.

It should aim to learn the user comprehensively within the category.

### 14.4 Compare eligibility threshold

Each deck should define a minimum threshold for:

- profile generation
- compare readiness
- showdown eligibility

These may differ by deck.

---

## 15) UX, Accessibility, and Performance

### 15.1 UX requirements

The app must feel:

- quick
- legible
- stable
- low-friction
- accessible without gestures

### 15.2 Control requirement

Buttons and gestures must remain parity-safe:

- same action system
- same output semantics
- same deck effect

### 15.3 State requirements

All major flows must handle:

- loading
- insufficient data
- empty decks
- recoverable compare failure
- external AI report failure

### 15.4 Accessibility

All action controls and compare flows must remain usable:

- without gestures
- with screen readers
- with clear labels and hints
- with clear consent messaging

---

## 16) Model Workflow in Cursor

This repo is developed in Cursor using multiple models, but with explicit responsibility boundaries.

### 16.1 Model roles

#### Claude Opus 4.6

Use only for:

- creative thinking
- architecture reasoning
- planning
- iteration design
- spec refinement
- review and orchestration
- risk analysis
- documentation generation

Claude should **not** be the primary coding model.

#### GPT-5.4

Use for:

- actual implementation
- refactors
- migrations
- UI coding
- tests
- bug fixing
- integration work

### 16.2 Workflow rule

For each iteration:

1. Claude reads this file and the current codebase state
2. Claude proposes or refines the iteration scope
3. GPT-5.4 implements the scoped task
4. Claude reviews output for alignment and drift

### 16.3 Guardrail

Do not let the models invent a parallel architecture that ignores this file.

This file is the controlling spec.

---

## 17) Required Work Method

For every new iteration:

1. Read this `CLAUDE.md`
2. Read the previous iteration notes and current code
3. State what old TasteDeck functionality is being reused vs replaced
4. Propose file list + schema changes + UI contract changes
5. Implement only the scoped iteration
6. Run typecheck, lint, and tests
7. Leave short handoff notes for the next iteration

### Additional fork rule

Because this is a redesign fork:

- every new iteration should explicitly say whether it is:
  - reusing old branch work,
  - refactoring old branch work,
  - or replacing old branch work entirely

---

## 18) Phased Build Strategy For The Fork

### Phase 1 — Fork MVP foundation

- deck-first information architecture
- replace broad profile framing with per-deck framing
- launch deck browser and deck selection
- adapt action language and profile logic for dating use
- prebuilt dating-relevant decks
- one-to-one compare flow for one deck at a time

### Phase 2 — Better deck intelligence

- confidence modeling
- retest logic
- unresolved-area surfacing
- richer deck profile summaries

### Phase 3 — Report maturity

- better AI summary templates
- safer language and uncertainty handling
- stronger compare insights and conversation starters

### Phase 4 — Showdown adaptation

- deck-scoped showdown
- group summary outputs
- sensitive-deck gating

### Phase 5 — Custom deck maturity

- deck creation/import/export
- deck validation
- custom deck compare support
- local transfer patterns

---

## 19) Fork Iteration Backlog (Starts After Original Iteration 8)

> Important:
> The old branch is complete through Iteration 8.
> The fork begins from that technical baseline.
> New iteration numbering starts at **Fork Iteration 09** to reflect that inherited state.

### Fork Iteration 09 — Reframe product shell for deck-first dating fork

- update product copy, onboarding language, and home/deck entry points
- replace broad “taste profile” framing with deck-first framing
- introduce deck browser IA

### Fork Iteration 10 — Introduce first-class `decks` and `deck_cards`

- refactor schema and domain models so decks become first-class
- map existing broad catalog concepts into deck-scoped concepts

### Fork Iteration 11 — Standardize universal dating-fork action model

- finalize canonical action values for this fork
- refactor UI/action payloads to universal deck semantics
- migrate old action naming if needed

### Fork Iteration 12 — Build deck selection and deck detail flows

- choose deck
- display deck purpose, confidence threshold, sensitivity, and status
- add starter-path UX from onboarding

### Fork Iteration 13 — Ship MVP prebuilt decks

- add Tier 1 launch decks
- define card authoring conventions
- build lightweight deck content pipeline

### Fork Iteration 14 — Refactor swipe/session logic to deck scope

- ensure swipe history, sessions, and profile state are deck-specific
- prepare for per-deck confidence modeling

### Fork Iteration 15 — Build deck profile summary v1

- early signal summary
- confidence level
- top affinities / aversions
- unresolved areas

### Fork Iteration 16 — Build compare eligibility and consent flow

- verify both users have enough data
- show consent UI
- define compare session lifecycle

### Fork Iteration 17 — Build compare payload minimization layer

- compute local compare summaries
- prepare minimal payload for AI report generation
- define failure and cancel behavior

### Fork Iteration 18 — Implement one-to-one AI compare report v1

- deck-specific compare report
- confidence-aware output
- structured conversation starter sections

### Fork Iteration 19 — Add sensitive deck gating and report safeguards

- deck eligibility rules
- no-showdown rules
- safer report behavior for sensitive decks

### Fork Iteration 20 — Adapt showdown mode to dating fork

- deck-scoped showdown
- timer/card cadence
- lighter multiplayer summary

### Fork Iteration 21 — Add local custom deck creation/import

- custom deck authoring
- import/export format
- local-only storage by default

### Fork Iteration 22 — Enable compare support for custom decks

- quality thresholds
- limited AI claim boundaries
- compare safeguards for untrusted deck content

### Fork Iteration 23 — Profile confidence and retest logic refinement

- resurfacing rules
- stability markers
- higher-confidence deck profile stage

### Fork Iteration 24 — Deck report quality refinement

- stronger deck-specific report templates
- better contrast grouping
- better uncertainty surfacing

### Fork Iteration 25 — Release hardening for the dating fork

- privacy disclosures
- compare/report fallback UX
- sensitive deck review
- performance tuning
- app-store readiness

---

## 20) Open Questions / Design Risks

1. **Action semantics drift**
   If decks start demanding different meanings, profile logic will fragment.
   Keep one universal model unless there is overwhelming evidence otherwise.

2. **Sensitive decks can distort product tone**
   Launching with politics/religion too early may make the app feel confrontational rather than connective.

3. **Custom decks may become unsafe**
   Local-only by default helps, but custom content still needs quality and safety rules.

4. **Compare reports can become gimmicky**
   If the report is fluffy, trust drops. If it is too blunt, it becomes invasive.

5. **Showdown can undermine intimacy**
   It should remain secondary, playful, and selectively allowed.

6. **No-account design reduces convenience**
   This is acceptable, but local export/import and compare flows must be excellent.

7. **Fork drift risk**
   Because the old codebase already exists, future iterations must clearly state what is inherited, refactored, or replaced.

---

## 21) Final Product Framing

The clearest framing for this fork is:

**A local-first, deck-based first-date companion that helps two people compare how they think, feel, and relate within specific categories—so they can get to meaningful conversation faster.**

This framing is preferred over:

- “dating app”
- “compatibility engine”
- “matchmaking platform”
- “social taste graph”

because it keeps the product coherent, differentiated, and aligned with its privacy-conscious local-first architecture.

---

### End of CLAUDE.md
