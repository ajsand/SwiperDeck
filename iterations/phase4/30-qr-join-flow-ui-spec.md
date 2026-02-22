# Iteration 30: QR join flow UI spec + placeholder screen

## Objective

Design and document an implementation-ready QR-based join flow for in-person Showdown sessions, including host, participant, fallback, and failure states.

This iteration should provide enough UX and state detail that coding agents can build screens in Iteration 31 without guessing behavior.

## Why this matters

Join friction is the most critical activation bottleneck for local multiplayer. If users cannot reliably join in under ~15–30 seconds, session drop-off will spike and Showdown mode will feel fragile.

A strong spec here aligns product copy, navigation, and error handling before camera/scanner implementation details are introduced.

## Scope

### In scope

- Host “show QR” screen and state variants.
- Participant entry flow options:
  - scan QR
  - manual code entry fallback
- Waiting room placeholders for host and participant.
- Invalid/expired/full-session error states and recovery paths.
- Navigation/state diagrams (textual acceptable).
- Accessibility and usability requirements for join UX.

### Out of scope

- Camera/QR scanning implementation internals.
- Realtime transport protocol details (Iteration 29).
- Full showdown gameplay screen implementation (Iteration 31).

---

## Multi-model execution strategy

> **Before starting this iteration, review:**
>
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../../docs/MULTI_MODEL_WORKFLOW.md)
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../../docs/models/CLAUDE_OPUS_4_6_GUIDE.md)
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../../docs/models/GPT_5_3_CODEX_GUIDE.md)
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../../docs/models/GEMINI_3_1_GUIDE.md)

### Recommended model routing

| Sub-task | Model | Why |
| --- | --- | --- |
| Draft UI flow/state matrix + edge cases | **Codex** | Strong at deterministic state modeling and implementation handoff |
| Refine microcopy, trust language, and error tone | **Claude** | Strong user empathy and product language quality |
| Stress-test navigation and accessibility edge cases | **Gemini** (optional) | Useful for broad scenario checking |

---

## Repository context for the coding agent

Inspect these before drafting the spec:

- `CLAUDE.md` (Phase 4 goals + product constraints)
- `iterations/phase4/29-showdown-protocol-and-transport-spec.md`
- `iterations/phase4/31-showdown-screen-v1-doc.md`
- `iterations/phase4/32-session-scoring-and-profile-generation.md`
- `iterations/phase4/33-session-results-compare-view.md`
- `iterations/phase4/34-slider-mode-implementation-plan.md`
- `iterations/phase4/35-phase4-hardening-checklist.md`

Likely UI implementation surfaces:

- Expo Router screens under `app/` (especially tab/modal entry points)
- Shared UI primitives/components in `components/`
- State/orchestration modules in `src/` related to session host/join flows

If paths differ, locate with:
- `rg -n "showdown|join|qr|waiting room|session code" app src components iterations`

---

## UX requirements and constraints (target behavior)

### 1) Host flow

- Host can create/show join context in one clear screen.
- Screen displays:
  - QR code container (placeholder allowed in this iteration)
  - short join code
  - clear instruction text (“Scan or enter code”)
- Host sees participant count and waiting-room state.
- Host can start session only when minimum join conditions are satisfied (as defined by protocol/spec assumptions).

### 2) Participant flow

- Participant chooses scan path first, with obvious manual code fallback.
- Manual entry accepts short code with validation feedback.
- Successful join transitions to participant waiting room state.
- Participant sees host/session identity cues to reduce wrong-room joins.

### 3) Error + recovery states

At minimum include and specify:

- invalid code
- expired session
- full session
- network/transient failure
- host ended session before start

Each error must include:

- plain-language explanation
- primary recovery CTA (retry, re-enter code, scan again)
- secondary safe escape path (back/home)

### 4) Accessibility + usability baseline

- Sufficient contrast and large-tap CTA areas.
- Input labels + helper text for manual entry.
- Error states announced clearly (screen-reader friendly copy).
- Avoid color-only status communication.
- Join code should be easy to read/copy verbally (grouping/spacing strategy documented).

### 5) Trust + privacy expectations

- Emphasize local/in-person context and no-account simplicity (as appropriate to product constraints).
- Avoid exposing unnecessary participant identifiers pre-join.
- Include language for “session may expire” and expected behavior.

---

## Implementation checklist

### A) Flow design and navigation

- [ ] Define host entry path to “show QR” screen.
- [ ] Define participant entry path to “scan or enter code”.
- [ ] Define successful join transitions to waiting room for both roles.
- [ ] Define cancellation/back behavior from every major state.

### B) State matrix

- [ ] Create host state table (loading, ready, participants joining, start-ready, ended/error).
- [ ] Create participant state table (scan, manual entry, joining, joined-waiting, error).
- [ ] Document state-triggering events and expected UI response.

### C) Error handling

- [ ] Define copy and CTA behavior for invalid/expired/full code states.
- [ ] Define retry timing and disabled/loading CTA behavior.
- [ ] Define offline/transient failure treatment.

### D) Placeholder UI contract for Iteration 31

- [ ] Provide component-level notes (header, QR block, code block, CTA group, help text).
- [ ] Define placeholders for unimplemented scanner/camera integration.
- [ ] Define loading/skeleton vs inline-spinner choices.

### E) Handoff quality

- [ ] Include textual sequence diagrams for host and participant journeys.
- [ ] Include event-to-screen mapping references to Iteration 29.
- [ ] Include explicit non-goals to prevent overbuild.

---

## Deliverables

1. QR join flow spec markdown with host/participant state diagrams.
2. UI copy deck for key states (normal + errors).
3. Placeholder-screen implementation contract for Iteration 31.
4. QA-ready acceptance checklist for join-path behavior.

---

## Acceptance criteria

1. A coding agent can build host/participant join UI without guessing transitions.
2. Manual code fallback is first-class and fully specified.
3. Error states are actionable, non-technical, and recoverable.
4. Waiting-room placeholders clearly communicate session status.
5. Spec aligns with provider-agnostic protocol assumptions from Iteration 29.

---

## Validation commands

- `rg -n "showdown|join|qr|session code|waiting room" CLAUDE.md iterations/phase4 app src`
- `rg -n "camera|barcode|qr" app src package.json`
- `rg -n "error|retry|expired|invalid|full" iterations/phase4`

Use equivalent paths if layout differs.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: camera/scanner integration is not ready yet

- Keep scanner area as a clearly labeled placeholder.
- Make manual code entry fully functional in UX spec.
- Defer scanner specifics while preserving same success/error outcomes.

### Problem: join code format is unclear

- Define one canonical format in this spec (length, allowed chars, grouping).
- Reuse format across host display, manual input, and validation errors.
- Include an example code string in copy docs.

### Problem: too many ambiguous edge states

- Collapse similar errors into user-understandable buckets.
- Keep internal diagnostic details out of primary user copy.
- Provide one primary CTA per error state.

### Problem: participant joins wrong session accidentally

- Add confirmation cues (host name/session title) after successful resolution.
- Include “Leave and rejoin” action in waiting room state.
- Ensure host-side room identity is visible.

### Problem: accessibility concerns during rapid implementation

- Prioritize semantic labels and deterministic focus order.
- Ensure all crucial instructions are text-based, not image-only.
- Validate copy clarity with short, imperative CTA labels.

---

## Curated resources for coding agents (when blocked)

Use this order: official docs/specs → implementation examples → community troubleshooting.

### Official documentation (highest priority)

1. Expo Camera (QR/barcode scanning capabilities and caveats)
   - https://docs.expo.dev/versions/latest/sdk/camera/
2. Expo Barcode Scanner migration notes / alternatives
   - https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/
3. Expo Router (navigation patterns for modal/stack flows)
   - https://docs.expo.dev/router/introduction/
4. React Navigation auth/flow patterns (stateful route switching concepts)
   - https://reactnavigation.org/docs/auth-flow/
5. React Native accessibility guide
   - https://reactnative.dev/docs/accessibility
6. WAI-ARIA authoring practices (general interaction/accessibility patterns)
   - https://www.w3.org/WAI/ARIA/apg/

### Step-by-step guides / practical references

1. Expo tutorial docs (app structure, routing, and device behavior)
   - https://docs.expo.dev/tutorial/introduction/
2. UX Collective / NNGroup resources on error message clarity and recovery UX
   - https://www.nngroup.com/articles/error-message-guidelines/
3. Material Design guidance for text fields, error states, and feedback
   - https://m3.material.io/components/text-fields/guidelines
4. Apple Human Interface Guidelines (camera/input and feedback conventions)
   - https://developer.apple.com/design/human-interface-guidelines/

### GitHub repositories to study

1. Expo examples (camera, router, and screen composition references)
   - https://github.com/expo/examples
2. React Navigation examples repo
   - https://github.com/react-navigation/react-navigation/tree/main/example
3. ZXing (QR code ecosystem references for code conventions)
   - https://github.com/zxing/zxing

### YouTube tutorials / talks

1. Expo channel tutorials (navigation and camera usage)
   - https://www.youtube.com/@ExpoDev
2. William Candillon (React Native UI/animation implementation patterns)
   - https://www.youtube.com/@wcandillon
3. NNgroup talks/videos on form usability and error prevention
   - https://www.youtube.com/@NNgroup

### Books / long-form references

1. *Don’t Make Me Think, Revisited* — Steve Krug
   - Fast usability heuristics for low-friction join flows.
2. *The Design of Everyday Things* — Don Norman
   - Error prevention, signifiers, and recovery concepts.
3. *Refactoring UI* — Adam Wathan & Steve Schoger
   - Practical visual hierarchy/copy layout guidance for state-heavy screens.

### Community troubleshooting resources

1. Stack Overflow tags: `expo`, `react-native`, `expo-router`, `qr-code`
   - https://stackoverflow.com/questions/tagged/expo
2. Expo Discussions (official community problem-solving)
   - https://github.com/expo/expo/discussions
3. Reactiflux Discord (React/React Native implementation troubleshooting)
   - https://www.reactiflux.com/
4. Reddit discussions (`r/reactnative`, `r/expo`)
   - https://www.reddit.com/r/reactnative/

---

## Definition of done (iteration 30)

- QR join UX spec is detailed enough for immediate placeholder implementation in Iteration 31.
- Host and participant flows include deterministic transitions and actionable error recovery.
- Manual code fallback is documented as a robust primary backup path.
- Resource section gives coding agents practical references for unblock workflows.
