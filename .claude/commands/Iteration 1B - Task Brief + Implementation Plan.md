# Iteration 1B: Task Brief + Implementation Plan (Orchestration)

## Objective
Produce a **Codex-ready Task Brief** for Iteration 1 implementation:
- Tabs (Deck/Profile/Library/Settings)
- Root Stack layout (for future details/modals)
- One dynamic detail route for deep-link acceptance
- Minimal placeholder screens and safe defaults

## Why this matters
Codex works best when given:
- a precise file list,
- crisp constraints,
- measurable acceptance criteria,
- and explicit non-goals.

This prevents repo drift and reduces wasted edits.

## Scope
### In scope
- Read CLAUDE.md + Iteration 1 requirements.
- Read the 1A routing proposal and lock decisions.
- Produce the plan + Task Brief used by Codex in 1C.
- Identify risk areas and verification steps.

### Out of scope
- Implementing code changes (Codex does that in 1C).
- Debating alternative architectures beyond what 1A already decided.

## Model execution strategy
### Preferred model
**Claude Opus 4.6 Max** (orchestrator / spec alignment)

### Required inputs
Before writing the Task Brief:
- Read `/CLAUDE.md` (Navigation & Screens, Principles).
- Read `iterations/01_bootstrap-app-shell.md` and 1A.
- Inspect current repo `app/` structure and note what already exists.
- Check package.json for `start` command(s) used for validation.

## Deliverables
1) A one-page **Task Brief** for Codex:
   - Problem statement
   - Constraints (“don’t break” list)
   - Files to create/edit (exact paths)
   - Implementation steps (ordered)
   - Acceptance criteria + manual verification steps
   - Non-goals
2) A short **risk checklist**:
   - likely router pitfalls
   - how to detect them quickly

## Task Brief (template)
Fill this template with repo-specific details:

### Problem statement
Implement the Expo Router navigation shell with Tabs + Stack as defined by Iteration 1.

### Constraints (must obey)
- Deck must be the default tab route.
- Use file-based routing conventions (no ad-hoc navigation setup).
- Keep business logic out of this iteration (no DB/ranking/catalog).
- Keep screens placeholder-simple and stable.
- Preserve existing alias/import conventions if present.

### Files to create/edit (exact)
- app/_layout.tsx
- app/(tabs)/_layout.tsx
- app/(tabs)/index.tsx
- app/(tabs)/profile.tsx
- app/(tabs)/library.tsx
- app/(tabs)/settings.tsx
- app/details/[id].tsx (or repo’s chosen detail route path)
- app/+not-found.tsx (recommended)

### Implementation steps (ordered)
1) Implement root Stack layout.
2) Implement Tabs layout with 4 screens (Deck as `index`).
3) Add placeholder tab screens (safe UI).
4) Add dynamic detail screen reading params.
5) Add a navigation link from Deck -> example detail route.
6) Validate deep-link route resolution on web.
7) Confirm no router resolution errors.

### Acceptance criteria
- All 4 tabs load and switch without crash.
- App opens into Deck tab by default.
- Dynamic route renders using a test path (e.g., /details/example-id).
- Manual deep-link test works on web.

### Manual verification steps
- Start app (web), click through tabs.
- Navigate to detail screen via in-app link.
- Open /details/example-id directly in web URL bar.

### Non-goals
- No persistence/ranking logic.
- No visual polish beyond placeholders.
- No modals yet (just structure ready for future).

## Parallel-run guidance (optional)
If the repo’s current routing is unclear, run:
- Gemini: propose routing structure
- Codex: propose routing structure
Then select the structure that matches CLAUDE.md and Expo Router conventions.

## Handoff to 1C
Codex should receive:
- the filled Task Brief above
- any repo notes discovered during inspection (existing files, conventions, scripts)