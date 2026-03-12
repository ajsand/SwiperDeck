# Iteration 20B: Refine navigation consistency and cross-session deck swiping

## 1. ITERATION SUMMARY

This iteration fixes two tightly linked problems:

- normal navigation feels broken because the bottom tab bar disappears on deck-related sub-screens
- deck swiping still risks being treated like a session-local flow instead of a persistent, evolving deck system

Why it matters:

- DateDeck should feel like one coherent app, not a tab shell plus disconnected full-screen branches
- deck profiles are meant to evolve over time, so swipe-session boundaries must not behave like algorithm boundaries
- users need confidence that leaving a deck and coming back later will preserve progress without freezing them into a stale queue

This iteration should make the app behave like this:

- normal browsing, profile, history, compare, and settings flows stay inside the persistent bottom-nav shell
- live deck swiping is the only intentional full-screen break from that shell
- swipe actions save immediately
- re-entering a deck later asks the algorithm for the best next card based on current durable state, not "whatever was next in the last session queue"

## 2. NAVIGATION DESIGN

### Screens that keep the bottom nav

The bottom navigation bar should remain visible for all normal app surfaces, including sub-screens:

- Decks root
- deck detail
- deck profile
- deck compare readiness
- compare consent
- compare report
- Profile root and profile drill-down screens
- History root and history drill-down screens
- Settings root and settings drill-down screens
- card detail screens reached from normal browsing flows

History naming note:

- the current `library` tab is the History section and should be treated that way in navigation language

### Screens that hide the bottom nav

For this iteration, the bottom nav should hide only for the active live deck swipe session:

- `deck/[deckId]/play` or its replacement live-session route

Do not hide the bottom nav for ordinary deck drill-down, compare, or profile screens.

### Conceptual navigation structure

Use a persistent tab shell with nested stacks per tab.

Recommended model:

- `Decks` tab owns a stack
- `Profile` tab owns a stack
- `History` tab owns a stack
- `Settings` tab owns a stack
- live deck swiping sits outside the tab shell as a focused full-screen route presented above the current tab context

The current route topology is directionally wrong for this goal because deck-related screens live outside the tab group. That is why the tab bar disappears today. The fix is not "force-show tabs everywhere"; the fix is to move normal sub-screens into tab-owned stacks and reserve the full-screen breakout only for live swiping.

### How active swipe sessions fit the navigation model

Live swiping should be treated as a temporary, focused mode:

- launched from a normal tab-owned screen, usually deck detail
- presented full-screen above the existing navigation context
- dismissed back to the exact underlying screen when possible

Default behavior:

- user opens Decks
- user opens a deck detail screen
- user taps `Start swiping` or `Continue swiping`
- app enters full-screen swipe mode with no bottom nav
- user exits
- app reveals the prior deck detail screen again, with bottom nav restored

Fallback behavior:

- if the swipe route was opened without a valid underlying screen context, exit should land on deck detail for that deck

## 3. SWIPE SESSION MODEL

### What a swipe session is

A swipe session is a bounded interaction window, not the source of truth for sequencing.

It represents:

- the period during which the user is actively swiping in one deck
- entry and exit metadata for that session
- the set of swipe events created during that window

It does not represent:

- permanent progress through a fixed queue
- a frozen algorithm state that must be resumed exactly as-is later

### What is persisted immediately

Persist immediately, not on session end:

- session start row
- each swipe event
- deck/profile/tag/card state updates derived from that swipe
- card recency markers and retest metadata that affect future sequencing

If a card is rendered to the user and the user exits before swiping it, the system should still persist lightweight presentation recency for that card if the app considers it meaningfully shown. Otherwise the same card can reappear instantly on resume, which feels broken.

### State ownership boundaries

Session-specific state:

- `session_id`
- started / ended timestamps
- entry point
- exit reason
- ephemeral UI state such as current gesture state, animation state, temporary button locks, and any in-memory short buffer of upcoming candidates

Deck-profile-specific state:

- swipe history
- tag-level signal
- card-level affinity
- coverage status
- ambiguity / uncertainty
- retest stability markers
- durable per-card and per-tag recency

Algorithm-specific durable state:

- eligibility windows
- retest due / cooldown concepts
- recency suppression inputs
- coverage debt inputs
- any persistent state needed to choose the next card fairly across sessions

Algorithm-specific ephemeral state:

- at most a short in-memory buffer for smooth session playback
- explanation metadata for the current card

### What resets across sessions

Reset on session end:

- ephemeral queue/buffer
- active-card UI state
- gesture state
- local button locks
- temporary screen-specific explanation state

Do not reset on session end:

- swipe events
- tag/card scores
- coverage
- uncertainty
- recency
- retest eligibility
- "what the algorithm has already learned about this deck"

## 4. ALGORITHM ACROSS SESSIONS

### Next-card selection when the user returns later

When the user re-enters a deck, the first card should be selected fresh from durable deck state.

The sequence service should recompute from:

- all prior swipe events in that deck
- current tag-level state
- current card-level state
- current coverage status
- retest candidates
- per-card recency / cooldown
- per-tag recency / cooldown

It should not do this:

- restore a persisted session queue from the previous visit
- assume the next card is "the next unseen card after the last session"
- ignore cards shown or swiped recently just because a new session started

### Recency suppression

Recency suppression should be durable across sessions.

Recommended rules:

- recently swiped cards get strong short-term suppression
- recently presented-but-not-swiped cards get moderate suppression
- suppression decays over time
- suppression is a guardrail, not a permanent ban

The session boundary must not clear recency suppression.

### Reaffirmation / retest

Reaffirmation should be purposeful, not accidental repetition.

A card can become eligible for resurfacing when:

- enough cooldown time has passed
- the prior signal was ambiguous or conflicted
- the card anchors an important tag/theme cluster
- the surrounding tag profile shifted enough that re-checking is useful
- the deck has enough breadth already that a confidence-building revisit is warranted

Retest should not happen:

- every time the user starts a new session
- back-to-back with the same recent card
- so often that the deck feels stuck

### New cards vs re-check cards

Selection mode should come from durable deck state, not session count:

- if coverage is still shallow, prioritize new cards
- if coverage is broad but uncertain, mix in targeted retest cards
- if the profile is mature, allow occasional reaffirmation to detect change over time

Practical rule:

- session start should usually favor a new high-value card unless there is a clearly overdue, high-value retest candidate

### Avoiding repeat loops on restart

To prevent "same first card every time I come back":

- do not persist a long session queue across app exits
- do persist card presentation/swipe recency
- recompute eligibility at session start
- suppress the just-shown card unless it is still the best eligible candidate after cooldown logic

### How session boundaries should and should not affect sequencing

Session boundaries should affect:

- analytics/session envelope
- entry/exit metadata
- temporary UI context

Session boundaries should not affect:

- deck maturity stage
- breadth vs depth mode
- retest due logic
- recency suppression
- card eligibility rules

## 5. UX / STATE TRANSITIONS

### Entering a deck

Expected behavior:

- user opens a deck from Decks
- deck detail shows current status such as profile maturity, last activity, and whether more cards are due
- bottom nav remains visible

### Starting swiping

Expected behavior:

- CTA should read like `Start swiping` or `Continue exploring`
- avoid implying an exact queue resume like "continue where you left off"
- entering swipe mode opens a focused full-screen surface with a visible exit control

### Stopping swiping

Expected behavior:

- user can stop after any card
- exit should be explicit and always available
- swipes are already saved, so stopping should not feel risky

Recommended product copy:

- make it clear that progress is saved after every swipe
- do not imply the user must finish a session for progress to count

### Resuming later

Expected behavior:

- user returns to the same deck later
- app should communicate that the deck remembers prior history
- first card after re-entry is chosen from current deck state, not a stale queue

Recommended wording:

- "Your swipes are saved. DateDeck will pick the next useful card for this deck."

### Exiting back to the broader app

Expected behavior:

- exiting swipe mode dismisses back to the underlying deck-related screen
- bottom nav is visible again immediately
- user can switch tabs without feeling like they fell out of the app shell

### Empty / loading / error states

Loading:

- deck detail and swipe mode should show deck-scoped loading states, not generic app confusion

Empty:

- if a deck truly has no cards, show a deck-content empty state

No eligible cards right now:

- do not treat this as permanent deck completion
- show a temporary stopping-point message such as "Nothing new is due right now"
- offer actions like `Back to deck` and `View profile`

Error:

- failures in swipe mode should allow retry or clean exit back to deck detail

Important correction:

- the current idea of "You have seen all cards in this deck" is too absolute for an evolving-profile system
- after retest/reaffirmation is part of the product, the correct concept is "no cards are currently due" rather than "the deck is permanently complete"

## 6. ARCHITECTURAL IMPLICATIONS

### What can be reused

- existing tab shell
- deck-first route model
- deck detail / deck profile / compare flows
- `swipe_sessions` and `swipe_events`
- current tag-aware sequencing stack from 14A-14G
- existing deck profile and retest concepts

### What needs to be refactored

- route ownership for deck-related screens
  - normal deck screens should move under the `Decks` tab stack instead of living as top-level routes outside tabs
- swipe flow ownership
  - live swipe mode should become an explicit full-screen breakout route
- sequence ownership
  - the sequence service should own next-card selection from durable state
  - the swipe-session hook should not become the durable owner of long-lived queue state
- completion semantics
  - replace permanent-complete language with "nothing due now" semantics

### Concepts that should be introduced or clarified

- `Tab-owned stacks` for normal sub-navigation
- `Live session route` for focused swiping
- `entry_context` and `exit_reason` on sessions
- durable `card recency` separate from session-local queue state
- optional `card presentation` tracking if unswiped exposures need cooldown handling

### Reuse / refactor / replace

| Category   | What happens                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Reused     | Existing deck-first shell, swipe event storage, tag-aware sequencing, retest logic, deck profile state |
| Refactored | Route structure, swipe-session responsibilities, completion semantics, deck detail to play transition  |
| Replaced   | Any assumption that a swipe session owns the "real queue" for future sessions                          |

### Better structure than the current one

If the current implementation is kept as-is, the app will keep fighting itself:

- normal drill-down screens will keep dropping the tab bar
- swipe sessions will be too tightly coupled to screen mount/unmount cycles

The better structure is:

- persistent tab shell for normal app navigation
- one explicit live-mode breakout for deck swiping
- one durable sequencing model that survives session boundaries

## 7. ACCEPTANCE CRITERIA

1. The bottom navigation bar remains visible on Decks, Profile, History, Settings, and their normal sub-screens.
2. Opening a deck detail screen from Decks does not hide the bottom navigation bar.
3. Opening deck profile, compare readiness, compare consent, or compare report from deck-related flows does not hide the bottom navigation bar.
4. Active deck swiping is the only route in this iteration that intentionally hides the bottom navigation bar.
5. Exiting a live swipe session returns the user to the underlying deck-related screen when possible, with the bottom navigation bar visible again.
6. Swipe actions are persisted immediately and are not lost when the user exits mid-session.
7. Starting a new swipe session in the same deck later does not resume a persisted long-lived queue.
8. The first card in a later session is selected from current durable deck state, including coverage, recency, and retest logic.
9. Recently swiped cards are not repeatedly shown at the start of each new session unless their cooldown/retest rules explicitly allow it.
10. The system can re-surface older cards later for reaffirmation/retest without making them feel spammy.
11. Session boundaries do not reset deck maturity, profile state, or sequencing state.
12. "Nothing due right now" is treated differently from "this deck is empty" and from fatal error states.

## 8. OPEN RISKS / EDGE CASES

- Unswept visible card on exit: if presentation recency is not persisted, the same card may reappear immediately on resume.
- Android back behavior: full-screen swipe mode must dismiss to the correct underlying screen instead of popping the user out of the app shell.
- Duplicate routes during migration: if deck screens temporarily exist both inside and outside tabs, navigation state will become inconsistent.
- Permanent-complete assumptions in existing copy/tests: older language may conflict with retest-driven deck behavior.
- Over-suppression: if recency rules are too aggressive, users may hit "nothing due right now" too early.
- Under-suppression: if recency rules are too weak, resumed sessions will feel repetitive.
- Session-start retest bias: if retest is allowed to dominate immediately on re-entry, the app will feel stuck in reaffirmation instead of exploration.
- Cross-surface entry paths: if a swipe session is launched from something other than deck detail, exit fallback rules must still be predictable.
- Mobile/web parity during development: the final product is mobile-first, but the full-screen swipe breakout and tab persistence should remain testable on web without changing the core navigation model.
