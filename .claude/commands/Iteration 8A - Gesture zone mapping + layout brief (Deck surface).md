<!-- File: iterations/08-build-deck-card-ui-and-controls/subtasks/08A-gemini-gesture-zone-mapping-layout-brief.md -->

# Model: GEMINI 3.1
# Iteration 8A: Gesture zone mapping + layout brief (Deck surface)

## Objective
Produce a concrete, implementable **gesture + layout specification** for the Deck screen that:
- clearly defines swipe/tap zones,
- avoids gesture/button conflicts,
- supports iOS/Android/Web fallbacks,
- and yields a Codex-ready brief (component hierarchy + thresholds + edge cases).

## Why this matters
If gesture zones, thresholds, and hierarchy are ambiguous, Codex will implement a brittle swipe UX that:
- misfires when tapping buttons,
- conflicts with scroll/press interactions,
- feels inconsistent across devices,
- and becomes hard to test and wire into persistence (Iteration 09).

## Scope
### In scope
- Define: card viewport layout, action bar layout, safe areas, and gesture capture zones.
- Define: swipe directions -> action mapping (aligned with Iteration 05 canonical actions).
- Define: thresholds (distance/velocity), cancellation behavior, and “no-op” conditions.
- Define: “button-only mode” fallback for accessibility and Web parity.
- Provide: handoff brief for Codex with exact UI/gesture rules.

### Out of scope
- Writing actual implementation code.
- Animations beyond “minimum viable feedback” notes.
- Persistence or ranking behavior.

## Inputs you must read first
- `CLAUDE.md` Section 3.1 (5-state actions) + Section 5.2 (Deck Screen).
- `iterations/07-implement-deterministic-tile-rendering.md` (tile is the visual layer).
- `iterations/05-add-typed-domain-models.md` (canonical SwipeAction set).

## Required outputs (deliverables)
You must output a **Codex-ready brief** that includes:
1. **Screen layout spec**
   - regions with approximate proportions (e.g., 70/30 split),
   - safe area behavior,
   - min touch target sizes for buttons.
2. **Gesture zone map**
   - which part of the card responds to pan gestures,
   - what areas are excluded so taps on buttons never become swipe gestures.
3. **Swipe mapping**
   - direction -> action mapping using canonical action names from Iteration 05.
4. **Thresholds**
   - translate thresholds into deterministic conditions:
     - distance threshold (px),
     - velocity threshold,
     - angle constraints to prefer horizontal intent.
5. **Cancel / settle rules**
   - when the card snaps back,
   - when to “commit” the swipe,
   - what happens if gesture ends in ambiguous zone.
6. **Web + accessibility fallback notes**
   - keyboard/tap pathway must be fully functional without gestures.

## Suggested deck layout (starting point — adjust as needed)
Give Codex a final decision, but use this as a baseline to reason:

- Top: “Card viewport”
  - ~75–85% of vertical space.
  - contains deterministic tile + metadata + tags.
- Bottom: “Action bar”
  - ~15–25% of vertical space.
  - fixed height with large touch targets.

## Gesture zone recommendations
Codex needs a deterministic rule that prevents pan gestures from hijacking button taps:

- Gesture capture area = card viewport only (NOT action bar).
- Within card viewport:
  - exclude top-right area if there’s a filter/settings button overlay.
  - keep a “dead zone” near edges if it reduces accidental swipes.
- Button taps should use Pressable and never be inside a Pan GestureDetector.

## Swipe mapping recommendation (must match Iteration 05 canonical actions)
Pick exactly one mapping and state it clearly for Codex:

Option A (simple + consistent):
- Swipe right  => `yes`
- Swipe left   => `no`
- Swipe up     => `skip` (optional; if enabled, ensure it doesn't conflict with system gestures)
- Strong swipe right (beyond stronger threshold) => `love`
- Strong swipe left (beyond stronger threshold)  => `hard_no`

If you recommend *not* using up-swipe in v1:
- Keep vertical movement as “cancel / snap back.”
- Use explicit Skip button for `skip`.

## Thresholds (provide exact numbers + rationale)
Provide:
- Distance threshold (e.g., 90px) OR proportional (e.g., 0.22 * screenWidth).
- Velocity threshold (e.g., > 900 px/s) to commit even if distance smaller.
- Angle constraint: “horizontal intent” rule (|dx| > 1.2*|dy|).

Also define:
- Strong swipe threshold for `love` / `hard_no` (e.g., 1.7x distance threshold).

## Feedback requirements (minimum)
Codex should implement:
- slight rotation/translation while dragging,
- snap-back animation if canceled,
- optional overlay label (“LIKE”, “NOPE”) if easy.

But keep it minimal: the brief should emphasize that **buttons remain fully usable**.

## Acceptance criteria for this brief
- Codex can implement without asking follow-ups.
- Every gesture conflict has an explicit deterministic rule.
- Web + accessibility fallback is explicitly supported.

## References (do not paste into code; keep as a list for agent use)
```txt
React Native Gesture Handler (overview): https://docs.expo.dev/versions/latest/sdk/gesture-handler/
RNGH Pan handler docs: https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/gesture-handlers/pan-gh/
Reanimated: handling gestures: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures/
React Native Pressable: https://reactnative.dev/docs/pressable
React Native Accessibility: https://reactnative.dev/docs/accessibility