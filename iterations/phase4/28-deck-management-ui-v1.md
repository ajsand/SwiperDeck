# Iteration 28: Deck management UI v1

## Objective
Plan the first-pass deck management UX: create deck, add/remove cards, reorder cards, and choose active deck.

## Why this matters
Users need explicit control over candidate pools while preserving familiar default general/all-deck browsing.

## Scope (in/out)
### In scope
- UI states and flows for user-owned decks.
- Ordering interactions and persistence expectations.
- Deck picker behavior across solo and showdown entry points.

### Out of scope
- Full visual polish.
- Networking/session synchronization.

## Multi-model execution strategy
- **Codex (primary):** document component tree + state transitions.
- **Claude (review):** verify UX coherence and additive behavior.
- **Gemini:** optional only if layout complexity grows.

## Agent resources and navigation map
- `app/(tabs)/index.tsx`
- `app/(tabs)/library.tsx`
- `iterations/08-build-deck-card-ui-and-controls.md`
- `iterations/20-build-library-screen-v1.md`

## External references links
- React Native accessibility basics: https://reactnative.dev/docs/accessibility

## When stuck
- Reuse existing card surfaces and list patterns.
- Keep deck editing local-only with optimistic updates.

## Implementation checklist
- [ ] Define deck list screen states (empty/loading/populated).
- [ ] Define create/edit deck flow.
- [ ] Define add/remove/reorder card interactions.
- [ ] Define active-deck selector UX and fallback to general/all deck.
- [ ] Document accessibility labels for reorder and remove actions.

## Deliverables
- UI/flow markdown spec for deck management v1.

## Acceptance criteria
- User can understand how to create and curate a deck.
- Active deck selection never blocks default non-deck flow.

## Validation commands
- `rg -n "deck|active deck|reorder" iterations/phase4 iterations`
