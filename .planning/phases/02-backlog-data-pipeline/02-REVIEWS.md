---
phase: 2
reviewers: [codex, opencode]
reviewed_at: 2026-04-07T22:30:00+09:00
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md]
---

# Cross-AI Plan Review -- Phase 2

## Codex Review

Model: gpt-5.4 (OpenAI Codex CLI v0.118.0)

### Plan 02-01: Rust Backlog API Client Core

#### Summary
This is the most important plan in the phase, and it is broadly aligned with the project goals: it covers typed API integration, pagination, filtering, sequential rate-limit-aware fetching, and a board-level orchestration path that matches the user decisions. The main risks are around a few underspecified Backlog API details, possible overreach in some modeling/testing choices, and whether the fetch strategy for unassigned issues and per-milestone issues remains correct under real API semantics and larger datasets.

#### Strengths
- Covers the core backend responsibilities needed for Phase 2: milestones, milestone issues, unassigned issues, pagination, and rate limiting.
- Correctly keeps fetching in Rust via `reqwest`, matching the architecture and D-07.
- Sequential orchestration is consistent with D-01, D-02, and the rate-limit requirement.
- Explicitly preserves multi-milestone data via array modeling, which is important for the PATCH constraint and Phase 5.
- Includes a dedicated `fetch_board` orchestration path, which matches the "complete board data over IPC" decision.
- Calls out API-key leakage risk and explicitly avoids logging it.
- Avoids unnecessary `Mutex` around `reqwest::Client`, which matches the research findings.

#### Concerns
- **HIGH**: `fetch_unassigned_issues` assumes "non-closed status IDs" are fetchable as request filters in a straightforward way, but the exact request encoding for repeated status filters is not described. If this is wrong, unassigned fetching may silently under-fetch or fail.
- **HIGH**: The plan does not state how milestone issue fetching distinguishes "issues assigned to this milestone" when an issue has multiple milestones. If Backlog returns issues matching any milestone in the array, lane assignment logic must be explicit and deterministic.
- **MEDIUM**: `is_milestone_in_range()` only checks `start_date OR release_due_date`. Milestones with both dates absent, or milestones spanning the window but with neither endpoint inside it, may be incorrectly excluded.
- **MEDIUM**: "sort by `start_date`" is underspecified for milestones missing `start_date`. You need a fallback sort key or ordering will be unstable.
- **MEDIUM**: "Serde strict typing rejects unexpected shapes" is optimistic; strict typing is useful, but full rejection can make the client brittle against minor API variations unless optional fields are modeled carefully.
- **MEDIUM**: TDD scope may be too ambitious if it implies network-heavy unit coverage. Pure logic tests are good; HTTP behavior likely needs either minimal mocking or deferred integration verification.
- **LOW**: Adding `MilestoneWithIssues` and `BoardData` in the API module is convenient, but it mixes transport/domain aggregation with raw API DTOs. That is acceptable here, but it is a layering compromise.
- **LOW**: Rate-limit throttling only at `remaining <= 5` may be sufficient, but if headers are absent or malformed the fallback behavior is unspecified.

#### Suggestions
- Define exact query encoding for repeated filters like `statusId[]`, `categoryId[]`, and milestone filters before implementation.
- Specify lane-assignment rules for multi-milestone issues. For example: milestone lane membership is based on the matched milestone ID, and the full milestone array is still preserved in the payload.
- Tighten milestone range logic: include behavior for missing dates, decide whether overlap semantics should be used instead of endpoint-in-window semantics.
- Define stable milestone sorting with a fallback, such as `startDate`, then `releaseDueDate`, then `id`.
- Treat API response fields that may be absent as optional in Rust, especially dates and nested user/category fields.
- Add explicit fallback behavior when rate-limit headers are missing: continue without sleeping, or use conservative backoff only on `429`.
- Keep tests focused on pure logic and serialization; avoid overcommitting to broad HTTP TDD unless a lightweight mock layer is introduced.

#### Risk Assessment: **MEDIUM**

---

### Plan 02-02: Tauri IPC Command Wiring

#### Summary
This plan is appropriately narrow and mostly correct: it wires the backend into Tauri with a single board-fetch command and keeps the IPC surface simple. The main issue is dependency ordering and state design. As written, the "managed `BacklogClient` state" approach may not fit the plan's own API shape, since host and API key are passed per call rather than stored in the client.

#### Strengths
- Keeps the IPC boundary minimal with one command returning the complete board payload, matching D-02.
- Error transport as Japanese strings is aligned with D-04 and avoids leaking backend internals to the frontend.
- Preserves existing plugins and avoids unnecessary migration of Phase 1 behavior.
- Integration checks mention the important TS/Rust naming conversion and serde contract verification.

#### Concerns
- **HIGH**: Dependency declaration is inconsistent. It says this depends on 02-01 and 02-03, but most of the wiring can depend only on 02-01; only type-contract verification depends conceptually on 02-03.
- **HIGH**: Managing `BacklogClient` as global Tauri state is questionable if the command takes `host` and `api_key` every time. Either the client is stateless and constructed per request, or it stores configuration; the current plan mixes both models.
- **MEDIUM**: `Result<BoardData, String>` is pragmatic, but it removes structured error classification at the IPC boundary.
- **MEDIUM**: The command signature uses `String` for all connection fields but does not say whether empty values are rejected early or allowed to flow into HTTP failures.
- **LOW**: "Tauri auto-converts" naming should still be verified in tests or by explicit serialization expectations.

#### Suggestions
- Simplify ownership: either remove managed `BacklogClient` state and instantiate a request-scoped client inside the command, or manage only an HTTP client/state object while passing request config separately into methods.
- Reword dependencies: 02-02 should depend on 02-01 for implementation, needing 02-03 only for end-to-end contract validation.
- Add explicit input validation expectations for empty `host`, `api_key`, and `project_key`.
- Consider preserving internal structured errors in Rust and only converting to `String` at the command boundary.

#### Risk Assessment: **MEDIUM**

---

### Plan 02-03: TypeScript Type Definitions and tauriBridge IPC Proxy

#### Summary
This is a focused, low-complexity plan that fits the architecture well. It keeps the frontend-side contract typed and introduces a thin IPC proxy with tests, which is the right amount of abstraction for this phase.

#### Strengths
- Scope is disciplined: types plus one IPC proxy function.
- Preserves existing Phase 1 TypeScript behavior instead of over-migrating.
- Correctly models `milestone` as an array, which protects future multi-milestone update logic.
- Explicit `categoryIds ?? null` handling addresses a real Tauri `Option<T>` interop detail.
- Unit tests cover the important bridge behavior: command name, params, null handling, success, and error propagation.

#### Concerns
- **MEDIUM**: Creating `BoardData` in TS separately from Rust can drift unless one side is clearly treated as canonical.
- **MEDIUM**: The plan says "all field names camelCase matching Rust serde output," but that can blur the boundary between raw Backlog shapes and app-facing shapes.
- **LOW**: The test plan validates `invoke` usage but not the semantic shape of returned payloads beyond generic typing.
- **LOW**: File placement may be slightly muddled if `board.ts` and `backlog.ts` split raw API and aggregated board types without a clear convention.

#### Suggestions
- Define a clear boundary: `backlog.ts` for API-shaped entities, `board.ts` for aggregated app-facing board structures.
- Add one fixture-based test that exercises a realistic `BoardData` payload shape.
- Be explicit about any optional fields in issue subobjects if the Rust side may serialize `null`.

#### Risk Assessment: **LOW**

---

### Codex Cross-Plan Assessment

**Overall Risk: MEDIUM.** The plans are directionally correct and should achieve the stated goals if implemented carefully. The principal risks are correctness issues from underspecified Backlog API behavior and design inconsistency around client/state ownership.

---

## OpenCode Review

Model: GitHub Copilot (via OpenCode CLI)

### Plan 02-01: Rust Backlog API Client Core

#### Summary
The core API client plan is the most critical and complex piece. It covers type definitions, HTTP client construction, rate limiting, pagination, and board data orchestration. The design choices -- re-exporting reqwest from tauri-plugin-http, no Mutex wrapping, count-first pagination -- are all well-justified by research. The sequential fetch strategy is appropriate for the request volume (~9 requests per board load).

#### Strengths
- **reqwest re-export from tauri-plugin-http** avoids duplicate HTTP crate dependencies and version conflicts
- **Count-first pagination** is the correct strategy -- avoids unbounded fetching and enables progress reporting later
- **Sequential requests** are pragmatic given the ~9 request volume; no premature concurrency optimization
- **`is_milestone_in_range()` logic** correctly handles milestones where only one of start_date or release_due_date may be set
- **Threat model T-02-01** (API key never in logs) is called out explicitly with a concrete mitigation
- **`serde rename_all = "camelCase"`** avoids manual field renaming and reduces serialization bugs
- **Error propagation on any failure (D-03)** simplifies error handling significantly

#### Concerns
- **HIGH**: BacklogError Serialize impl detail -- the plan says "converts to Display string" but this is unusual. If meant to be a manual `impl Serialize` that delegates to `Display`, say so explicitly. Since IPC uses `.map_err(|e| e.to_string())`, the Serialize impl may never be used. Clarify whether Serialize is needed at all.
- **MEDIUM**: `fetch_unassigned_issues` requires two API calls minimum (statuses + issues). The dependency flow should be more explicit.
- **MEDIUM**: Date range edge case -- milestones with neither `start_date` nor `release_due_date`. Should be an explicit decision.
- **LOW**: `throttle_if_needed` sleep could block for up to 60 seconds, freezing the UI since this is a one-shot fetch (D-01). Consider a maximum sleep duration cap.
- **LOW**: `chrono` dependency may be heavier than needed if only computing date ranges.

#### Suggestions
- Clarify BacklogError serialization strategy: drop Serialize derive and rely solely on Display + `.to_string()` at the IPC boundary.
- Add explicit decision for milestones with no dates: recommend including them (prefix match is sufficient).
- Document expected format of `X-RateLimit-Reset` and add a maximum sleep duration cap (e.g., 10 seconds).
- Consider making `fetch_board` log total request count and elapsed time at debug level for troubleshooting.

#### Risk Assessment: **LOW-MEDIUM**

---

### Plan 02-02: Tauri IPC Command Wiring

#### Summary
A thin wiring layer connecting the Rust client to the frontend. Appropriately minimal. The main decisions -- managed state for BacklogClient, single fetch_board_data command, error string mapping -- are correct for the architecture.

#### Strengths
- Single command (fetch_board_data) aligns with D-02 and keeps the IPC surface minimal
- Managed State without Mutex is correct per research
- `.map_err(|e| e.to_string())` is the standard Tauri pattern
- Integration verification task explicitly checks snake_case/camelCase conversion
- Preserving existing plugins is called out

#### Concerns
- **MEDIUM**: Wave 2 depends on 02-03, but the dependency seems unnecessary. The Rust command doesn't actually depend on TypeScript types. Consider implementing commands.rs in Wave 1 (depends only on 02-01), verify integration in Wave 2.
- **MEDIUM**: Parameters are all passed individually. For Phase 5, you'll need another command with similar parameters. Consider a `ConnectionConfig` struct.
- **LOW**: BacklogClient::new() requires no configuration arguments -- confirm this is zero-config.

#### Suggestions
- Reconsider the wave dependency: implement commands.rs in parallel with 02-03.
- Confirm BacklogClient::new() is a zero-config constructor.
- Add note about future command additions (Phase 5 update_issue_milestone).

#### Risk Assessment: **LOW**

---

### Plan 02-03: TypeScript Type Definitions and tauriBridge IPC Proxy

#### Summary
Clean plan for the frontend side of the IPC boundary. The type definitions mirror the Rust structs, and the tauriBridge proxy maintains the project's established pattern. Concrete test plan with 5 specific test cases.

#### Strengths
- Extending existing `backlog.ts` preserves the type location convention
- Separate `board.ts` for composite types is good separation
- `categoryIds ?? null` for Tauri Option handling prevents a subtle bug
- "No try/catch" is the correct design for a bridge layer
- Test cases are specific and numbered

#### Concerns
- **MEDIUM**: BacklogIssue.milestone typed as BacklogMilestone[] is correct but plan should note this means full objects (not just IDs) in the response payload.
- **LOW**: No explicit type for the invoke parameters (FetchBoardParams interface).
- **LOW**: Tests should explicitly test `categoryIds: undefined -> null` conversion path.

#### Suggestions
- Add a `FetchBoardParams` interface to board.ts.
- Ensure test explicitly covers `undefined -> null` and `[1,2,3] -> [1,2,3]` paths.
- Add brief comment explaining why milestone is an array.

#### Risk Assessment: **LOW**

---

### OpenCode Cross-Plan Assessment

**Overall Phase Risk: LOW-MEDIUM.** The plans are well-researched, appropriately scoped, and implementation-ready. The two items worth resolving before coding are: (1) BacklogError: drop Serialize, use Display + .to_string() only, and (2) Undated milestones: decide include or exclude.

**Missing items noted:** No request timeout configuration, no cancellation mechanism for long fetches, no response size limits.

---

## Consensus Summary

### Agreed Strengths
- **Sequential fetching appropriate for rate limits** -- Both reviewers agree the ~9 request volume does not warrant concurrent fetching
- **Multi-milestone array modeling** -- Critical for Phase 5 PATCH preservation, both reviewers confirm this is correct
- **Single IPC command (fetch_board_data)** -- Aligned with D-02, keeps IPC surface minimal
- **reqwest re-export** -- Avoids dependency duplication, both reviewers endorse
- **Scope discipline** -- No scope creep into frontend rendering or Phase 1 migration
- **API key security (T-02-01)** -- Explicitly mitigated, both reviewers approve

### Agreed Concerns
1. **Undated milestones behavior undefined (MEDIUM)** -- Both reviewers flag that milestones with neither start_date nor release_due_date have unspecified inclusion behavior. Needs explicit decision before implementation.
2. **02-02 wave dependency on 02-03 is unnecessary (MEDIUM)** -- Both agree commands.rs implementation depends only on 02-01. The 02-03 dependency is only for integration verification and should not block implementation.
3. **BacklogClient state semantics (MEDIUM-HIGH)** -- Codex flags as HIGH, OpenCode as MEDIUM. The BacklogClient wraps only reqwest::Client (stateless) but is registered as Managed State while receiving connection config per-call. Both suggest clarifying the ownership model.
4. **Milestone sort fallback for missing dates (MEDIUM)** -- Codex specifically calls this out; OpenCode notes date range edge cases. Sorting by start_date alone is unstable when dates are null.
5. **BacklogError serialization strategy (MEDIUM)** -- OpenCode flags the Serialize impl confusion; Codex notes the Display-to-String boundary. Consensus: use Display + .to_string() at command boundary, drop Serialize if unused.

### Divergent Views
- **API query encoding specificity**: Codex rates unspecified filter encoding as HIGH risk; OpenCode treats it as implementation detail (not flagged). Codex may be more cautious about Backlog API semantics.
- **BacklogClient managed state**: Codex rates this as HIGH (mixed ownership model); OpenCode sees it as reasonable (reqwest::Client connection pooling justifies Managed State even if config is per-call). The current design is actually a common Tauri pattern -- the client reuses the connection pool.
- **Overall risk**: Codex rates MEDIUM; OpenCode rates LOW-MEDIUM. The difference is small and reflects Codex's emphasis on API correctness vs OpenCode's emphasis on implementation readiness.
- **Request timeout**: OpenCode flags missing timeout configuration; Codex does not mention it.
