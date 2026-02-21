# Iteration 23: Add optional cloud summary toggle

## Objective
Introduce an explicit, user-controlled **opt-in** for cloud-generated profile summaries while keeping local deterministic summaries as the default and reliable fallback path.

Cloud requests must use **aggregate-only payloads** (no raw swipe event history) and must be gated behind persisted consent.

## Why this matters
This iteration operationalizes product promises around:
- **Privacy-by-default** (toggle OFF by default)
- **User agency** (clear, revocable consent)
- **Reliability** (local summary still works when cloud is off/fails)
- **Cost/safety controls** (bounded payload, bounded retries/timeouts)

It also sets up a clean seam for future cloud model providers without coupling UI to provider-specific logic.

## Scope

### In scope
- Add Settings toggle with explicit privacy copy and clear default state (`OFF`).
- Persist consent flag in app settings/state storage.
- Build cloud request payload exclusively from aggregate profile stats.
- Add network client with strict timeout + bounded retry behavior.
- Gate cloud calls on consent; fallback to local deterministic summary on deny/failure.
- Add logging/telemetry safeguards (redaction + payload size metadata).
- Add tests proving no calls when opt-out and no raw history in payload.

### Out of scope
- Sending raw swipe events, item-by-item history, or identifiers not required for aggregate summarization.
- Building advanced provider orchestration or multi-provider routing.
- Introducing non-deterministic local fallback behavior.

## Multi-model execution strategy

> **Before starting this iteration**, read these workflow documents:
> - [`docs/MULTI_MODEL_WORKFLOW.md`](../docs/MULTI_MODEL_WORKFLOW.md) — model roles, selection rubric, task protocol
> - [`docs/models/CLAUDE_OPUS_4_6_GUIDE.md`](../docs/models/CLAUDE_OPUS_4_6_GUIDE.md) — orchestrator/planner guide
> - [`docs/models/GPT_5_3_CODEX_GUIDE.md`](../docs/models/GPT_5_3_CODEX_GUIDE.md) — primary implementer guide
> - [`docs/models/GEMINI_3_1_GUIDE.md`](../docs/models/GEMINI_3_1_GUIDE.md) — spatial/layout guide

### Model routing for this iteration

| Sub-task | Model | Rationale |
|---|---|---|
| Review privacy contract and payload allowlist design | **Claude** | Privacy-critical design decision |
| Verify aggregate-only payload excludes raw swipe history | **Claude** | Spec enforcement for CLAUDE.md Section 10 |
| Implement settings toggle, consent persistence | **Codex** | UI + data implementation |
| Build cloud client wrapper with timeout/retry | **Codex** | Network client implementation |
| Implement gate + fallback orchestration | **Codex** | Integration logic |
| Add tests for opt-out enforcement and payload shape | **Codex** | Test authoring |

### Notes
- **Claude first**: Claude must review the payload schema to ensure no raw swipe events or personal identifiers leak into cloud requests. This is a privacy-critical gate.
- Gemini is not needed (settings toggle is straightforward UI).

---

## Repository context for the coding agent

Before implementing, review:
- `CLAUDE.md` for privacy, local-first baseline, and product constraints.
- Iteration outputs from `22` (local deterministic summary) and settings/profile flows from `17`, `19`, `21`.
- Existing settings persistence pattern and network abstraction utilities already used in the app.

Prefer extending existing settings and profile-summary pathways rather than creating parallel flows.

---

## Implementation checklist (detailed)

### 1) Define settings contract + persistence
- [ ] Add/confirm a typed setting such as `cloudSummaryOptIn: boolean` with default `false`.
- [ ] Persist in existing settings store (or equivalent source of truth).
- [ ] Ensure hydration path handles missing/legacy value as `false`.

### 2) Build consent-aware UI in Settings
- [ ] Add toggle control with plain-language privacy copy:
  - cloud is optional
  - only aggregate stats are sent
  - raw swipe history is never sent
- [ ] Add short explanatory subtitle and optional “Learn more” inline copy if design allows.
- [ ] Ensure toggle updates persist immediately and idempotently.

### 3) Define aggregate-only payload schema
- [ ] Create explicit schema/type for outbound cloud summary payload (e.g., `CloudSummaryPayload`).
- [ ] Include only aggregate fields (examples):
  - top liked/disliked tags or categories
  - score distributions or trend summaries
  - confidence/sample-size metadata
- [ ] Exclude raw events, timestamps per swipe, and content-level personal identifiers.
- [ ] Add serializer function that maps internal profile state -> bounded payload.

### 4) Implement cloud summary client wrapper
- [ ] Add single entrypoint function (e.g., `requestCloudSummary(payload, options)`).
- [ ] Enforce timeout via `AbortController` (or current networking stack equivalent).
- [ ] Add bounded retry (e.g., max 1-2 retries for transient errors only).
- [ ] Normalize errors into stable domain error types for calling code.

### 5) Gate and fallback orchestration
- [ ] In profile summary flow, check consent first.
- [ ] If opt-out: skip network call entirely, return local deterministic summary immediately.
- [ ] If opt-in: request cloud summary using aggregate payload.
- [ ] On timeout/network/provider errors: gracefully fallback to local deterministic summary.
- [ ] Ensure UI communicates optional enhancement without blocking core profile display.

### 6) Safety/logging controls
- [ ] Log request attempts with redacted metadata only (e.g., payload byte size, latency, status).
- [ ] Never log raw payload fields that may reveal sensitive preferences.
- [ ] Add guardrails to prevent accidental inclusion of disallowed fields in debug output.

### 7) Tests and verification
- [ ] Unit test: serializer excludes raw swipe history fields.
- [ ] Unit test: when toggle is `OFF`, cloud client is never called.
- [ ] Unit test: when toggle is `ON` and cloud fails, fallback summary is returned.
- [ ] Integration/UI test: Settings toggle persists across app restarts/state reload.
- [ ] Snapshot/contract test for payload shape stability.

---

## Suggested payload and orchestration contracts (example)

```ts
export interface CloudSummaryPayload {
  schemaVersion: 'v1';
  profile: {
    topLikes: Array<{ key: string; score: number }>;
    topDislikes: Array<{ key: string; score: number }>;
    trends: Array<{ key: string; delta: number }>;
    confidence: {
      sampleCount: number;
      signalStrength: 'low' | 'medium' | 'high';
    };
  };
}

export interface SummaryResult {
  source: 'local' | 'cloud';
  text: string;
}
```

```ts
async function getProfileSummary(input: LocalProfileState): Promise<SummaryResult> {
  const local = generateLocalProfileSummary(input);

  if (!settings.cloudSummaryOptIn) {
    return { source: 'local', text: local };
  }

  try {
    const payload = buildCloudSummaryPayload(input);
    const cloud = await requestCloudSummary(payload, { timeoutMs: 3500, retries: 1 });
    return { source: 'cloud', text: cloud.text ?? local };
  } catch {
    return { source: 'local', text: local };
  }
}
```

---

## Acceptance criteria
1. Toggle exists in Settings with explicit privacy copy and defaults to `OFF`.
2. With toggle `OFF`, zero cloud summary requests are made.
3. With toggle `ON`, payload contains only approved aggregate fields.
4. Cloud failure/timeout never blocks profile summary rendering; local fallback always appears.
5. Consent state persists and is respected after reload/restart.
6. Logs/telemetry do not include raw preference payload contents.

---

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm test -- cloud-summary-toggle`
- `npm test -- cloud-summary-payload`
- `npm test -- profile-summary-fallback`

If targeted tests do not exist yet, create focused tests in this iteration.

---

## Troubleshooting playbook (when agent gets stuck)

### Problem: cloud still called when toggle is OFF
- Confirm orchestration path checks consent before any payload build/request call.
- Add a spy/mock assertion verifying zero invocations.
- Check stale closure/state hydration bugs in hooks/selectors.

### Problem: accidental raw-history leakage in payload
- Centralize payload construction in one serializer module.
- Add allowlist-based field selection (not pass-through object spread).
- Add test asserting forbidden fields are absent.

### Problem: request hangs or degrades UX
- Ensure timeout is enforced with cancellation.
- Return local summary immediately on timeout.
- Avoid awaiting cloud response on critical render path when not necessary.

### Problem: flaky retry behavior
- Retry only transient/network failures (not 4xx validation errors).
- Cap retries and include minimal backoff.
- Keep error normalization deterministic for tests.

### Problem: user confused by privacy implications
- Tighten copy in settings: “Optional. Sends only aggregate preference stats; never raw swipe history.”
- Keep language non-technical and unambiguous.

---

## Curated resources for Claude Opus coding agent

Use this order: official docs/specs → privacy/consent patterns → implementation examples → community troubleshooting.

### Official documentation (highest priority)
1. Expo docs (Settings/state patterns, app architecture):
   - https://docs.expo.dev/
2. React Native docs (UI controls, accessibility, state):
   - https://reactnative.dev/docs/getting-started
3. TypeScript docs (strict typing for payload contracts):
   - https://www.typescriptlang.org/docs/
4. MDN Fetch API + AbortController (timeouts/cancellation):
   - https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
   - https://developer.mozilla.org/en-US/docs/Web/API/AbortController
5. OWASP API Security Top 10 (data minimization/security mindset):
   - https://owasp.org/API-Security/

### Step-by-step guides / practical references
1. Retry strategies + exponential backoff concepts:
   - https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
2. Privacy-by-design principles (consent + minimization framing):
   - https://gdpr.eu/privacy-by-design/
3. Testing async flows in Jest (mocks, timers, rejection paths):
   - https://jestjs.io/docs/asynchronous

### YouTube references (for quick implementation refreshers)
1. Search: “React Native settings screen toggle best practices”
   - https://www.youtube.com/results?search_query=react+native+settings+screen+toggle+best+practices
2. Search: “AbortController fetch timeout JavaScript”
   - https://www.youtube.com/results?search_query=AbortController+fetch+timeout+javascript
3. Search: “Jest mock fetch retry timeout tests”
   - https://www.youtube.com/results?search_query=jest+mock+fetch+retry+timeout+tests

### High-signal GitHub repositories (reference implementations)
1. TanStack Query examples (network state + retries patterns):
   - https://github.com/TanStack/query
2. Expo repository/discussions for platform-specific behavior:
   - https://github.com/expo/expo
3. axios-retry (retry policy ideas even if using fetch):
   - https://github.com/softonic/axios-retry
4. ky (small fetch wrapper with timeout/retry patterns):
   - https://github.com/sindresorhus/ky

### Community troubleshooting resources
1. Stack Overflow (React Native settings/toggle patterns):
   - https://stackoverflow.com/questions/tagged/react-native
2. Stack Overflow (Fetch/AbortController/retries):
   - https://stackoverflow.com/questions/tagged/fetch-api
   - https://stackoverflow.com/questions/tagged/abortcontroller
3. Stack Overflow (TypeScript contracts):
   - https://stackoverflow.com/questions/tagged/typescript
4. Expo Discussions:
   - https://github.com/expo/expo/discussions
5. Reactiflux / broader RN discussions:
   - https://www.reactiflux.com/

### Books / long-form references
1. *Designing Data-Intensive Applications* (Kleppmann) — robust distributed/network thinking.
2. *Building Secure & Reliable Systems* (Google SRE) — reliability + safety practices.
3. *API Security in Action* (Neil Madden) — API data exposure risk patterns.
4. *Refactoring* (Martin Fowler) — keeping orchestration clean and testable.

---

## Definition of done
- Settings toggle exists, defaults OFF, and persists.
- Cloud summary path is strictly opt-in and aggregate-only.
- Fallback to local deterministic summary is reliable and tested.
- Timeout/retry/error handling is bounded and user-safe.
- Payload/logging protections prevent raw-history leakage.

## Notes for next iteration
Iteration 24 focuses on scoring/ranking snapshot tests. Reuse fixtures from cloud payload tests where possible so profile summary behavior and ranking expectations stay coherent across changes.
