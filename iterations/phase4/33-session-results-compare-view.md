# Iteration 33: Session results compare view

## Objective
Plan participant comparison outputs after a showdown session: similarities, contrasts, and top themes.

## Why this matters
Comparison is the payoff moment for in-person sessions and should be informative without exposing unnecessary personal data.

## Scope (in/out)
### In scope
- Results view sections and metrics.
- Participant-level summaries from session profiles.
- Similarity/contrast computation notes.

### Out of scope
- Chat, bios, friend discovery.
- Cross-session social graphs.

## Multi-model execution strategy
- **Codex (primary):** define data contract + view structure.
- **Claude (review):** check interpretability and privacy framing.
- **Gemini:** optional for visual hierarchy critique.

## Agent resources and navigation map
- `iterations/17-build-profile-visualizations-v1.md`
- `iterations/19-build-profile-over-time-view.md`
- Phase 4 results flow in `CLAUDE.md`

## External references links
- Basic similarity metrics overview: https://en.wikipedia.org/wiki/Cosine_similarity

## When stuck
- Start with deterministic, explainable metrics.
- Prefer ranked bullet insights over dense charts for v1.

## Implementation checklist
- [ ] Define result sections (group summary, per-user highlights, pairwise similarity).
- [ ] Define metric formulas and tie-breakers.
- [ ] Define data loading/error/empty states.
- [ ] Define privacy-safe labeling (display names local/temporary).

## Deliverables
- Results compare view functional spec.

## Acceptance criteria
- Participants can identify at least one clear similarity and one contrast.
- No non-session data appears in results.

## Validation commands
- `rg -n "similarity|contrast|session results" CLAUDE.md iterations/phase4`
