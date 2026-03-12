# DateDeck Fork Iterations

The original TasteDeck app was completed through Iteration 8.
DateDeck starts from that inherited technical baseline, so the fork backlog begins at Iteration 09.

Use GPT-5.4 Extra High for documentation, planning, implementation, refactors, tests, and integration work.
Execute iterations in order unless a later file explicitly says it is refactoring already-landed downstream work to align with newly inserted backlog items.

Each iteration should clearly state whether it is:

- reusing inherited TasteDeck work
- refactoring inherited TasteDeck work
- replacing inherited TasteDeck work

Repo note:

- Iterations 09-13 are already implemented in this repo
- Iteration 14A is documented here and its corresponding code work was already started separately
- Iteration 20B refines the app shell so normal deck drill-down keeps the bottom nav visible while live swiping remains a focused full-screen flow
- the files in this folder are the active backlog for the DateDeck fork

## Fork Backlog

- [09. Reframe product shell for deck-first dating fork](./09-reframe-product-shell-for-deck-first-dating-fork.md)
- [10. Introduce first-class decks and deck_cards](./10-introduce-first-class-decks-and-deck-cards.md)
- [11. Standardize universal dating-fork action model](./11-standardize-universal-dating-fork-action-model.md)
- [12. Build deck selection and deck detail flows](./12-build-deck-selection-and-deck-detail-flows.md)
- [13. Ship MVP prebuilt decks](./13-ship-mvp-prebuilt-decks.md)
- [14. Refactor swipe and session logic to deck scope](./14-refactor-swipe-and-session-logic-to-deck-scope.md)
- [14A. Add prebuilt deck tag taxonomy and card-tag metadata](./14a-add-prebuilt-deck-tag-taxonomy-and-card-tag-metadata.md)
- [14B. Add tag-level deck state and typed models](./14b-add-tag-level-deck-state-and-typed-models.md)
- [14C. Implement broad-start representative sequencing for prebuilt decks](./14c-implement-broad-start-representative-sequencing-for-prebuilt-decks.md)
- [14D. Implement tag-aware next-card scoring](./14d-implement-tag-aware-next-card-scoring.md)
- [14E. Add coverage, diversity, and anti-collapse guardrails](./14e-add-coverage-diversity-and-anti-collapse-guardrails.md)
- [14F. Add retest, reaffirmation, and ambiguity-targeting resurfacing](./14f-add-retest-reaffirmation-and-ambiguity-targeting-resurfacing.md)
- [14G. Create sequencing evaluation, explainability, and regression harness](./14g-create-sequencing-evaluation-explainability-and-regression-harness.md)
- [15. Build deck profile summary v1](./15-build-deck-profile-summary-v1.md)
- [16. Build compare eligibility and consent flow](./16-build-compare-eligibility-and-consent-flow.md)
- [17. Build compare payload minimization layer](./17-build-compare-payload-minimization-layer.md)
- [18. Implement one-to-one AI compare report v1](./18-implement-one-to-one-ai-compare-report-v1.md)
- [19. Add sensitive deck gating and report safeguards](./19-add-sensitive-deck-gating-and-report-safeguards.md)
- [20. Adapt showdown mode to dating fork](./20-adapt-showdown-mode-to-dating-fork.md)
- [20B. Refine navigation consistency and cross-session deck swiping](./20b-refine-navigation-consistency-and-cross-session-deck-swiping.md)
- [21. Add local custom deck creation and import](./21-add-local-custom-deck-creation-and-import.md)
- [22. Enable compare support for custom decks](./22-enable-compare-support-for-custom-decks.md)
- [23. Profile confidence and retest logic refinement](./23-profile-confidence-and-retest-logic-refinement.md)
- [24. Deck report quality refinement](./24-deck-report-quality-refinement.md)
- [25. Release hardening for the dating fork](./25-release-hardening-for-the-dating-fork.md)
