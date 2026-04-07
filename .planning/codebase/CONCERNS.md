# Codebase Concerns: mileboard

**Generated:** 2026-04-07
**Status:** Pre-implementation — no source code exists yet. All concerns are derived from planning artifacts.
**Source documents:** `.planning/research/PITFALLS.md`, `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/SUMMARY.md`, `.planning/STATE.md`, `.planning/phases/01-*/`

---

## 1. Technical Debt

### 1.1 Manual IPC Type Bindings (Architecture Risk)

The planned `src/api/tauriBridge.ts` uses hand-written TypeScript `invoke()` wrappers. Per `.planning/research/ARCHITECTURE.md` (Pattern 4), the architecture doc itself notes:

> "Consider `tauri-specta` for auto-generated bindings later, but manual typing is fine for the ~6 commands in MVP."

This means the TypeScript interfaces at the IPC boundary will drift from Rust structs as the project evolves. Any rename or signature change in a Rust command must also be manually updated in `tauriBridge.ts`. There is no compile-time enforcement of this contract.

**Location:** Planned `src/api/tauriBridge.ts`
**Risk:** Medium — manageable at MVP scale but becomes a maintenance burden as Phase 2–5 add more commands.

### 1.2 `@dnd-kit/core` v6.x Will Need Migration

The stack decision in `.planning/research/STACK.md` explicitly flags that `@dnd-kit/core 6.x` is the legacy stable API and `@dnd-kit/react` (the rewrite) should be adopted when it reaches 1.0. The current plan builds all DnD component APIs against `@dnd-kit/core 6.x`, meaning a future migration will require reworking `KanbanBoard`, `MilestoneLane`, `IssueCard`, and `DragOverlay` components.

**Location:** Planned `src/components/KanbanBoard/`, `src/components/MilestoneLane/`, `src/components/IssueCard/`, `src/components/DragOverlay/`
**Risk:** Low-Medium — no action needed now, but component APIs should not tightly couple to `@dnd-kit/core 6.x` internals.

### 1.3 No Rust-Side Caching or Incremental Refresh

The architecture plans a single `load_board_data` Rust command that fetches milestones and then all issues sequentially. There is no planned caching layer on the Rust side. Every board refresh triggers the full API call sequence (potentially 8–15 HTTP requests). The architecture doc in `.planning/research/ARCHITECTURE.md` acknowledges this in the scalability table but defers caching to a future concern.

**Location:** Planned `src-tauri/src/backlog_client.rs`, `src-tauri/src/commands/`
**Risk:** Medium — adequate for MVP (7 lanes, ~50 issues) but degrades fast with growth.

### 1.4 Hardcoded Date Range Logic

The board displays milestones from "last month through 6 months ahead" (~7 lanes). This date range logic will be implemented as a hardcoded calculation. There is no plan for user configuration of this range. If a team's planning horizon is longer or shorter, the range cannot be adjusted without a code change.

**Location:** Planned `src-tauri/src/commands/milestones.rs`
**Risk:** Low for MVP, but will likely surface as a feature request quickly.

### 1.5 No Offline Indicator or Reconnection Logic

The architecture explicitly defers offline mode (`src/planning/research/FEATURES.md` Anti-feature A7). However, there is also no planned mechanism to detect disconnection mid-session and re-enable DnD after reconnect. The current design silently fails API calls and rolls back optimistic updates, but a sustained network outage would produce a cascade of failed toasts with no clear recovery path.

**Location:** Planned error handling in `src/components/KanbanBoard/KanbanBoard.tsx`

---

## 2. Known Bugs or Issues

### 2.1 onDragOver Infinite Re-render Loop (Pre-existing Known Issue)

Documented in `.planning/research/PITFALLS.md` (Pitfall 2) as a **CRITICAL** known issue in `@dnd-kit/core`:

> "When implementing cross-container drag, calling `setState` inside `onDragOver` creates a feedback loop. The state update triggers a re-render, which changes the DOM layout, which fires another `onDragOver` with a different collision target, which triggers another `setState`."

This is confirmed by dnd-kit GitHub issues #1421 and #1678. It **will** manifest if the standard multi-container pattern is implemented naively in `KanbanBoard.tsx`.

**Location:** Planned `src/components/KanbanBoard/KanbanBoard.tsx`
**Severity:** Critical — crashes app with "Maximum update depth exceeded"

### 2.2 Optimistic Update Flicker on Drop

Documented in `.planning/research/PITFALLS.md` (Pitfall 3) as **CRITICAL**:

> "After a drag-and-drop completes, the card briefly snaps back to its original lane for a fraction of a second before settling into the new lane."

Caused by the gap between dnd-kit clearing its internal drag overlay and the Zustand store applying the optimistic update.

**Location:** Planned `src/components/KanbanBoard/KanbanBoard.tsx`, `src/stores/boardStore.ts`
**Severity:** High — visually undermines the optimistic UI goal

### 2.3 Empty Lane Drop Dead Zone

Documented in `.planning/research/PITFALLS.md` (Pitfall 8) as **HIGH** confidence:

> "When all issues are dragged out of a milestone lane, the lane becomes empty. If the sortable container has no children, dnd-kit has no droppable targets within that container."

Applies especially to the Unassigned lane, which users will empty out during planning sessions.

**Location:** Planned `src/components/MilestoneLane/MilestoneLane.tsx`, `src/components/UnassignedLane/`
**Severity:** High — empty lanes become permanently unusable during a session

### 2.4 Concurrent Optimistic Rollback Destroys Other In-Flight Edits

Documented in `.planning/research/PITFALLS.md` (Pitfall 6) as **MODERATE**:

> "If multiple mutations are in flight, later mutations' optimistic state is discarded when an earlier mutation rolls back using a full-store snapshot."

**Location:** Planned `src/stores/boardStore.ts` (rollback logic)
**Severity:** Medium — creates confusing "card disappeared" UX, but only under rapid concurrent drag

### 2.5 milestoneId[] Full-Array Replacement — Silent Data Loss

Documented in `.planning/research/PITFALLS.md` (Pitfall 1) as the **single most dangerous pitfall** in the project:

> "The Backlog API v2 PATCH `/api/v2/issues/:issueIdOrKey` treats `milestoneId[]` as a **full replacement** of the milestone array. If an issue has milestones `[A, B, C]` and the app sends only `[B, D]`, milestones `A` and `C` are silently deleted."

This would cause **data loss in production** with no error response from Backlog (returns 200 OK).

**Location:** Planned `src-tauri/src/commands/issue_update.rs`
**Severity:** Critical — silent data corruption; must be addressed with read-before-write and a `preserveExternalMilestones` utility with exhaustive unit tests

---

## 3. Security Concerns

### 3.1 API Key Stored in Plaintext JSON

Per `.planning/phases/01-foundation-connection-settings/01-CONTEXT.md` (Decision D-12):

> "All settings (host, API key, project key, milestone prefix) stored via tauri-plugin-store in plaintext JSON. No encryption or OS keychain — personal desktop app scope makes this acceptable."

This is an explicit accepted risk, but it means the Backlog API key is readable by any process on the user's machine that can access the OS app data directory.

**Location:** Planned `src/services/settingsStorage.ts`, persisted as `settings.json` via `tauri-plugin-store`
**Severity:** Medium (accepted) — unacceptable for security-conscious teams; `tauri-plugin-keyring` is the recommended mitigation but its Tauri 2 compatibility was unconfirmed at research time (`.planning/STATE.md` lists this as an open blocker).

### 3.2 API Key Appears in HTTP Request URLs

Per `.planning/phases/01-foundation-connection-settings/01-01-PLAN.md` (Task 2, `buildApiUrl`):

```
https://${host}/api/v2${path}?apiKey=${apiKey}
```

The API key is passed as a query parameter (`?apiKey=`), not as a header. This means it may appear in proxy logs, HTTP server access logs, and browser history if the request is ever accidentally sent from the webview layer. The plan explicitly requires never logging URLs that contain the `apiKey` parameter.

**Location:** Planned `src/services/backlogApi.ts` (`buildApiUrl` function)
**Severity:** Low-Medium (Backlog API only supports query-param auth for API keys; this is the standard pattern, but logging discipline must be enforced)

### 3.3 tauri-plugin-keyring Compatibility Unconfirmed

The STATE.md lists this as an open blocker:

> "API key secure storage: tauri-plugin-keyring compatibility with Tauri 2 is unconfirmed. Fallback is encrypted plugin-store. Decision needed in Phase 1."

The Phase 1 context document (D-12) resolved this by accepting plaintext storage. If the app is ever used in a shared-workstation or enterprise environment, this decision must be revisited.

**Location:** `.planning/STATE.md` (Blockers/Concerns section)

### 3.4 HTTP Capabilities Allowlist Enforcement

The Tauri capabilities file (`src-tauri/capabilities/default.json`) restricts HTTP to three domain patterns:
- `https://*.backlog.com/api/v2/**`
- `https://*.backlog.jp/api/v2/**`
- `https://*.backlogtool.com/api/v2/**`

If a user's Backlog instance is on a custom domain, they will be silently blocked. There is no plan for dynamic allowlist configuration.

**Location:** Planned `src-tauri/capabilities/default.json`
**Severity:** Low (most Backlog instances use standard domains) but a usability blocker for edge cases

---

## 4. Performance Risks

### 4.1 Rate Limit Exhaustion During Initial Board Load

Documented in `.planning/research/PITFALLS.md` (Pitfall 4) as **CRITICAL**:

> "Loading 7 milestone lanes with their issues requires ~10–15 API calls in rapid succession. The Backlog API limits search operations to 150 requests/window and reads to 600. Free-plan limits are stricter (exact numbers not published)."

**Location:** Planned `src-tauri/src/commands/issues.rs`, `src-tauri/src/rate_limiter.rs`
**Risk:** High on free Backlog plans — initial load may hit 429 errors

### 4.2 Full Board Reload on Every Refresh

There is no incremental update mechanism. Any board refresh re-fetches all milestones and all issues across all lanes. With 7 lanes and pagination, this can be 8–15+ sequential HTTP calls per refresh.

**Location:** Planned `src-tauri/src/commands/`
**Risk:** Medium — becomes painful with auto-refresh (deferred to v2) or large teams

### 4.3 Zustand Store Re-renders on Any State Change

If the Zustand `boardStore` is structured as a flat issue array rather than by lane (`{ lanes: { [milestoneId]: Issue[] } }`), every card move or update triggers a re-render of all lane components. `.planning/research/PITFALLS.md` (Pitfall 11) flags this as a **HIGH** confidence issue requiring `useShallow` selectors and per-lane store slices.

**Location:** Planned `src/stores/boardStore.ts`
**Risk:** Medium for MVP data volumes; critical at 500+ issues

### 4.4 IPC Serialization Overhead on Windows

Per `.planning/research/PITFALLS.md` (Pitfall 7):

> "On Windows specifically, benchmarks show ~200ms for 10MB payloads through WebView2. If issue lists are large, initial data transfer through IPC adds latency."

**Location:** Planned `src/api/tauriBridge.ts`, `src-tauri/src/commands/`
**Risk:** Low at MVP scale but worth monitoring; mitigated by batching API calls in Rust rather than issuing 7 separate `invoke()` calls from the frontend

### 4.5 No List Virtualization for Large Lanes

The architecture doc notes in `.planning/research/ARCHITECTURE.md` (Scalability table):

> "At 7 lanes / 500 issues: Virtualize card lists if needed (react-window)."

There is no plan to implement virtualization. For typical team sizes (20–50 issues/milestone) this is fine, but a milestone with 200+ issues will render all cards in the DOM simultaneously.

**Location:** Planned `src/components/MilestoneLane/MilestoneLane.tsx`

---

## 5. Fragile Areas

### 5.1 Multi-Milestone Issue DnD Restriction

Documented in `.planning/research/PITFALLS.md` (Pitfall 5) as **MEDIUM** confidence:

> "dnd-kit doesn't natively support 'conditionally draggable based on data.' If the draggable is rendered but the drop is rejected, the user sees a confusing animation of the card returning."

The requirement is: multi-milestone issues can reorder within their lane but cannot move to a different lane. Implementing this requires either custom `accept` logic on droppable containers or using dnd-kit's `disabled` flag with non-obvious workarounds. The research explicitly flags this as needing validation against dnd-kit's actual API.

**Location:** Planned `src/components/IssueCard/IssueCard.tsx`, `src/components/MilestoneLane/MilestoneLane.tsx`
**Risk:** High — the exact implementation pattern is uncertain and must be prototyped

### 5.2 Stale Closures in DnD Event Handlers

Documented in `.planning/research/PITFALLS.md` (Pitfall 12):

> "`onDragEnd` and `onDragOver` callbacks close over stale Zustand state if defined inline. The handler reads old issue positions and applies incorrect state updates."

Requires consistent use of `store.getState()` inside DnD callbacks instead of selector-derived values.

**Location:** Planned `src/components/KanbanBoard/KanbanBoard.tsx`
**Risk:** Medium — causes silent incorrect state, difficult to reproduce in tests

### 5.3 Collision Detection Algorithm Mismatch

Documented in `.planning/research/PITFALLS.md` (Pitfall 10):

> "The default `rectIntersection` collision detection works poorly for horizontal kanban boards. The dragged card may target the wrong lane or skip positions."

Requires a two-phase custom collision detection: `pointerWithin` to identify the target lane, then `closestCenter` within that lane's items.

**Location:** Planned `src/components/KanbanBoard/KanbanBoard.tsx` (DndContext `collisionDetection` prop)
**Risk:** High — wrong default causes broken DnD UX; known solution exists but must be implemented correctly

### 5.4 Backlog API Pagination Silently Truncating Results

Documented in `.planning/research/PITFALLS.md` (Pitfall 13):

> "`GET /api/v2/issues` returns max 100 issues per request. If a milestone has >100 issues, the app silently shows an incomplete list."

The plan includes pagination logic (`offset` + `count` loop until `< 100` results), but if not implemented correctly, the bug is invisible to users.

**Location:** Planned `src-tauri/src/commands/issues.rs`
**Risk:** Medium — silent data truncation with no user indication

### 5.5 Project Scaffold Does Not Exist Yet

The entire source tree (`src/`, `src-tauri/`) has not been scaffolded. The plans in Phase 1 reference file paths (`C:/Users/soonki-chang/repository/mileboard/...`) that do not yet exist. Plan execution depends on the Tauri scaffold being created first via `npm create tauri-app@latest`.

**Location:** Root of repository
**Risk:** Blocker — no code can be written until the scaffold is in place

---

## 6. Missing Functionality

The following features are **in scope for v1** but have not yet been planned (only Phase 1 plans exist):

| Feature | Requirement | Phase | Plans Status |
|---------|-------------|-------|--------------|
| Rust API client (`backlog_client.rs`) | BOARD-01, BOARD-02 | Phase 2 | "TBD" in ROADMAP.md |
| Rate limiter (`rate_limiter.rs`) | BOARD-01 | Phase 2 | "TBD" |
| Milestone fetch command | BOARD-01 | Phase 2 | "TBD" |
| Issue fetch with pagination | BOARD-02, BOARD-03 | Phase 2 | "TBD" |
| Unassigned issue fetch | BOARD-02 | Phase 2 | "TBD" |
| KanbanBoard component | BOARD-01–03, UX-01 | Phase 3 | "TBD" |
| MilestoneLane + UnassignedLane | BOARD-01, BOARD-02 | Phase 3 | "TBD" |
| IssueCard component | BOARD-03 | Phase 3 | "TBD" |
| LaneHeader with member breakdown | BOARD-05, BOARD-06 | Phase 4 | "TBD" |
| StatusBadge with color coding | BOARD-04 | Phase 4 | "TBD" |
| Card-to-browser link (opener) | UX-03 | Phase 4 | "TBD" |
| DnD cross-lane move | DND-01 | Phase 5 | "TBD" |
| Optimistic update + rollback | DND-02 | Phase 5 | "TBD" |
| Multi-milestone handling | DND-03 | Phase 5 | "TBD" |
| Error toast on API failure | UX-02 | Phase 5 | "TBD" |

Source: `.planning/ROADMAP.md` (Phases 2–5 all show "Plans: TBD")

Additionally, the following v2 requirements have no roadmap entry at all:
- `FILT-01` (Assignee filter)
- `UXP-01` (Lane collapse/expand)
- `UXP-02` (Milestone date display)
- `UXP-03` (Visual drop zone indicators)
- `PWR-01` (Card sorting within lanes)
- `PWR-02` (Bulk multi-select move)

---

## 7. TODOs and FIXMEs Found in Planning Documents

No source code exists, so no in-code TODOs/FIXMEs are present. However, the following explicit open items were found in planning artifacts:

### From `.planning/STATE.md` (Blockers/Concerns section):

```
- API key secure storage: tauri-plugin-keyring compatibility with Tauri 2 is unconfirmed.
  Fallback is encrypted plugin-store. Decision needed in Phase 1.

- Backlog free-plan rate limits: Exact thresholds not published. Must query at runtime.
  May impact Phase 2 loading strategy.
```

### From `.planning/research/SUMMARY.md` (Gaps to Address section):

```
- API key secure storage: tauri-plugin-keyring compatibility with Tauri 2 is unconfirmed.
- Backlog free-plan rate limits: not published for free plan — must query /api/v2/rateLimit at runtime.
- dnd-kit onDragOver debounce vs. defer-to-onDragEnd trade-off: research does not definitively
  recommend one. A spike in early Phase 4 should test both.
- Vite 8 plugin compatibility: low risk, but @vitejs/plugin-react-swc on Vite 8 (Rolldown)
  needs validation; Vite 7.3 is the documented fallback.
- @dnd-kit/react migration path: no action needed now, but note that @dnd-kit/core 6.x is
  the legacy API.
```

### From `.planning/ROADMAP.md`:

- Phase 2 plans: `02-01: TBD`, `02-02: TBD`, `02-03: TBD`
- Phase 3 plans: `03-01: TBD`, `03-02: TBD`, `03-03: TBD`
- Phase 4 plans: `04-01: TBD`, `04-02: TBD`
- Phase 5 plans: `05-01: TBD`, `05-02: TBD`, `05-03: TBD`

### From `.planning/phases/01-*/01-VALIDATION.md`:

The validation strategy has `nyquist_compliant: false` — the Nyquist compliance check has not been completed. All 6 per-task verification entries show `⬜ pending` status. All Wave 0 requirements are unchecked.

### From `.planning/phases/01-*/01-01-PLAN.md` (verify commands):

All automated verification commands reference `C:/Users/soonki-chang/repository/mileboard/` (old path), but the actual working directory is `C:/Users/sungi/Documents/repo/mileboard/`. These paths will fail when plans are executed.

---

## 8. Dependencies That May Need Updating

All dependencies are planned (no `package.json` or `Cargo.toml` exists yet), but the following require attention:

### Frontend (npm)

| Package | Planned Version | Concern |
|---------|----------------|---------|
| `vite` | `8.0.x` | Major architecture change (Rolldown replaces esbuild+Rollup). If any plugin breaks, Vite 7.3 is the fallback. Flagged as MEDIUM confidence in `.planning/research/STACK.md`. |
| `@dnd-kit/core` | `6.3.1` | Stable but legacy API. `@dnd-kit/react` (the rewrite) is in 0.x and should be adopted when it reaches 1.0. Plan to migrate per `.planning/research/STACK.md`. |
| `@dnd-kit/sortable` | `10.0.0` | Paired with `@dnd-kit/core` 6.x. Must be migrated together when upgrading to `@dnd-kit/react`. |
| `sonner` | `2.x` | MEDIUM confidence in `.planning/research/STACK.md` — newer library with less community history than `react-toastify`. |
| `react` | `18.3.x` | React 19 exists and is stable. Planned constraint is intentional (server components irrelevant for desktop), but deprecation warnings in 18.3 will accumulate. |

### Rust (Cargo)

| Crate | Planned Version | Concern |
|-------|----------------|---------|
| `tauri-plugin-http` | `2` | Per `.planning/research/ARCHITECTURE.md`, HTTP calls go through Rust `reqwest` directly (not this plugin from JS). The plugin may still be needed for Tauri capabilities permission scaffolding. Worth confirming whether the plugin is actually needed or only `reqwest` is. |
| `tauri-plugin-store` | `2` | Stores API key in plaintext JSON. If `tauri-plugin-keyring` (unconfirmed Tauri 2 compatibility) becomes viable, `tauri-plugin-store` should be replaced or supplemented for credential storage. |

### Unresolved Dependency Research

Per `.planning/research/STACK.md` (Sources — Tertiary/needs validation):
- `tauri-plugin-keyring` for OS-native credential storage — Tauri 2 compatibility unconfirmed
- `@dnd-kit/react 0.3.x` — pre-stable; migration timeline unknown

---

## Summary of Critical Items

| # | Area | Item | Severity |
|---|------|------|----------|
| 1 | Bug | milestoneId[] full replacement causes silent data loss on PATCH | Critical |
| 2 | Bug | onDragOver infinite re-render loop (dnd-kit multi-container) | Critical |
| 3 | Security | API key stored in plaintext JSON on disk | Medium (accepted) |
| 4 | Fragile | Multi-milestone DnD restriction implementation unvalidated | High |
| 5 | Fragile | Custom collision detection required for horizontal kanban | High |
| 6 | Bug | Empty lane drop dead zone makes lane permanently unusable | High |
| 7 | Bug | Optimistic update flicker on card drop | High |
| 8 | Performance | Rate limit exhaustion during initial board load | High (free plan) |
| 9 | Missing | Phases 2–5 plans not yet written (0 of 11 plans exist) | Blocker |
| 10 | TODO | Plan file paths reference wrong user home directory | Blocker |
| 11 | Debt | Manual IPC type bindings — no compile-time contract enforcement | Medium |
| 12 | TODO | nyquist_compliant: false in Phase 1 validation strategy | Low |
