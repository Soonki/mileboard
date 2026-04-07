# Phase 2: Backlog Data Pipeline - Context

**Gathered:** 2026-04-07
**Status:** Ready for research/planning

<domain>
## Phase Boundary

Rust backend reliably fetches milestones and issues from Backlog with rate-limit awareness and exposes them to the frontend via typed IPC commands. This is infrastructure enabling Phases 3-5. No direct v1 requirements — delivers the data pipeline that board display and DnD depend on.

</domain>

<decisions>
## Implementation Decisions

### Data fetching pattern
- **D-01:** One-shot bulk fetch — all milestones + all issues fetched before the board renders. Single loading state (skeleton) while fetching. No progressive/streaming display.
- **D-02:** The IPC command returns a complete board data structure: milestones with their issues, plus unassigned issues. Frontend receives everything in one typed response.

### Error handling
- **D-03:** Board-level error granularity — if ANY fetch operation fails (milestone list, individual milestone's issues, unassigned issues), the entire board shows an error state with a retry button. No partial data display.
- **D-04:** Error messages are Japanese strings matching the UI-SPEC copywriting pattern established in Phase 1.

### Unassigned lane scope
- **D-05:** "Unassigned" = issues with NO milestone AND status is NOT closed/completed (未完了のみ).
- **D-06:** Category-based filtering at fetch time — the API query should support filtering unassigned issues by Backlog category. This enables future UI filtering without re-fetching.

### Architecture: Rust IPC commands
- **D-07:** Board data fetching is implemented as Rust IPC commands using reqwest (NOT frontend plugin-http). Rate limiting, pagination, and JSON parsing all happen in Rust.
- **D-08:** Phase 1's testConnection/fetchProjects remain as-is in TypeScript (plugin-http). They are settings-time operations, not board-time. No migration needed.
- **D-09:** Frontend calls Rust commands via tauriBridge.ts proxy (invoke pattern). The bridge provides typed wrappers so React components never call tauri::invoke directly.

### Rate limiting
- **Claude's Discretion:** Rate limiting algorithm (header-based throttle, backoff strategy, delay between requests). Must respect X-RateLimit-Remaining header and avoid 429 errors.

### Pagination
- **Claude's Discretion:** Pagination strategy for issue fetching. Backlog API returns paginated results — Rust client must fetch all pages. Sequential fetching is required (rate limit constraint).

### IPC command structure
- **Claude's Discretion:** Exact IPC command names and parameter/return types. Must be typed end-to-end (Rust struct → serde → TypeScript interface).

### Milestone date range calculation
- **Claude's Discretion:** How "last month to 6 months ahead" is computed. Must match the constraint in PROJECT.md (approximately 7 lanes).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — BOARD-01 (milestone lanes), BOARD-02 (unassigned lane), UX-01 (loading state) define what this pipeline must deliver data for
- `.planning/PROJECT.md` — Constraints section (rate limiting, lane range, milestoneId[] gotcha)

### Phase 1 outputs (dependencies)
- `src/stores/settingsStore.ts` — useSettingsStore provides hostUrl, apiKey, projectKey, milestonePrefix
- `src/types/settings.ts` — ConnectionSettings type definition
- `src/types/backlog.ts` — BacklogUser, BacklogProject, BacklogError types (may need extension for milestone/issue types)
- `src/services/backlogApi.ts` — testConnection/fetchProjects pattern (stays in TS, not migrated)
- `CLAUDE.md` §Architecture — IPC boundary diagram, tauriBridge pattern

### Backlog API reference
- Backlog REST API v2: `/api/v2/projects/:projectIdOrKey/milestones` — milestone list
- Backlog REST API v2: `/api/v2/issues` — issue search with milestoneId[], statusId[] filters
- Pagination: `count` (max 100), `offset` parameters
- Rate limiting: `X-RateLimit-Remaining` response header

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/types/backlog.ts` — BacklogUser, BacklogProject, BacklogError types. Will need new types: BacklogMilestone, BacklogIssue, BacklogStatus, BacklogPriority, BacklogCategory
- `src-tauri/Cargo.toml` — Already has tauri, serde, serde_json. Needs reqwest addition
- `src-tauri/src/lib.rs` — Plugin registration established. Needs invoke_handler for new commands
- `tests/setup.ts` — Tauri plugin mock pattern established

### Established Patterns
- Discriminated union error handling: `{ success: true, data } | { success: false, error: string }`
- Japanese error messages matching UI-SPEC copywriting contract
- Zustand stores with immutable updates (settingsStore pattern)
- CSS Modules with global.css design tokens

### Integration Points
- Settings → Rust commands: hostUrl, apiKey, projectKey, milestonePrefix flow from settingsStore to IPC invocations
- Rust → Frontend: Typed IPC responses (serde Serialize → TypeScript interfaces)
- tauriBridge.ts: New proxy functions for board data commands (to be created)
- boardStore (Phase 3): Will consume the data returned by this pipeline

</code_context>

<specifics>
## Specific Ideas

- Category filtering on unassigned issues: pass category IDs as an optional parameter to the fetch command so filtering happens server-side (Backlog API supports categoryId[] query parameter)
- milestonePrefix filtering: Rust side filters milestones by prefix match on name field before returning to frontend — fewer bytes over IPC
- The "board data" structure should be pre-organized: milestones sorted chronologically with their issues nested, plus a separate unassigned array — frontend doesn't need to join/group
- Phase 1's backlogApi.ts (testConnection, fetchProjects) stays in TypeScript. Only board-time data fetching moves to Rust. This avoids unnecessary Phase 1 refactoring.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-backlog-data-pipeline*
*Context gathered: 2026-04-07*
