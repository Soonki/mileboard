# Project Research Summary

**Project:** mileboard (Backlog Milestone Kanban Viewer)
**Domain:** Desktop kanban board with external API integration (Tauri + React)
**Researched:** 2026-04-07
**Confidence:** HIGH

## Executive Summary

Mileboard is a focused desktop application that fills a specific gap in the Backlog project management ecosystem: the ability to view milestones as kanban lanes and drag issues between them. This is a well-scoped tool with a clear value proposition -- Backlog's native board only shows status columns, not milestone-to-milestone planning views. The recommended approach is a Tauri 2 desktop app with a Rust backend that proxies all Backlog API calls (eliminating CORS and centralizing rate limiting) and a React 18 + Zustand 5 frontend for the kanban UI with dnd-kit handling drag-and-drop interactions.

The architecture is straightforward: Rust owns all HTTP communication, credential storage, and rate-limit enforcement; React owns the UI, optimistic state, and DnD interactions. The two layers communicate through Tauri's IPC command system with typed TypeScript wrappers. This is a proven Tauri pattern with high-quality official documentation. The stack choices are conservative and well-matched -- no bleeding-edge dependencies, no unnecessary complexity.

The primary risks center on two areas: **data integrity during milestone updates** and **dnd-kit integration stability**. The Backlog API replaces the entire `milestoneId[]` array on PATCH, meaning a careless update silently destroys milestone assignments outside the app's visible scope. This is the single most dangerous pitfall. On the DnD side, cross-container drag with dnd-kit has well-documented re-render loop issues and optimistic update flicker that require specific implementation patterns to avoid. Both risks have known solutions documented in the research, but they must be implemented correctly from the start -- not retrofitted.

## Key Findings

### Recommended Stack

The stack is a standard Tauri 2 desktop app with React rendering in a system webview. All choices are stable, well-documented, and have existing community usage patterns for kanban-style applications.

**Core technologies:**
- **Tauri 2.10.x**: Desktop shell + Rust backend -- eliminates CORS by proxying API calls through Rust, isolates API credentials from the webview
- **React 18.3.x**: UI rendering -- stable, battle-tested, server components (React 19) are irrelevant for desktop
- **Zustand 5.0.x**: Client state -- lightweight, selector-based re-rendering, ideal for frequent DnD updates
- **@dnd-kit/core 6.3.x + @dnd-kit/sortable 10.0.x**: Drag-and-drop -- proven kanban patterns, accessible by default, stable API (avoid 0.x @dnd-kit/react rewrite)
- **Vite 8.0.x**: Build tool -- Rolldown-based (10-30x faster builds), native TS path aliases and CSS Modules
- **CSS Modules**: Scoped styling -- zero runtime cost, built into Vite, team familiarity
- **Tauri plugins**: plugin-http (unused from JS, API calls go through Rust reqwest), plugin-store (settings persistence), plugin-opener (open Backlog issues in browser)
- **Vitest 4.1.x + Testing Library**: Testing -- Vite-native, shares config

**Critical version note:** Use @dnd-kit/core 6.3.1 (stable), not @dnd-kit/react 0.3.x (pre-stable). Migration to the new API when it reaches 1.0.

### Expected Features

The feature landscape cleanly separates into 13 table-stakes features (the complete planning loop) and 12 differentiators (usability polish and power features). Anti-features are well-defined to prevent scope creep.

**Must have (table stakes -- all required for MVP):**
- T1: Connection settings (API key, host, project key, milestone prefix)
- T2: Milestone lanes in chronological order (prefix-filtered, ~7 lanes)
- T3: Issue cards with key info (key, title, status, assignee, priority)
- T4: Status color coding
- T5: "Unassigned" lane (no milestone) as the primary triage source
- T6: Drag-and-drop between lanes (core interaction)
- T7: Optimistic UI update + rollback on failure
- T8: Loading states (skeleton loaders)
- T9: Error toasts (rate limit, network, auth failures)
- T10: Card click opens Backlog issue in default browser
- T11: Lane header with issue count
- T12: Lane header with member breakdown (workload visibility)
- T13: Multi-milestone issue handling (display in earliest lane, warning badge, disable cross-lane DnD)

**Should have (Phase 2 -- usability polish):**
- D1-D3: Assignee, status, and priority filters
- D5: Auto-refresh / polling (board stays current during meetings)
- D6: Card sorting within lanes
- D9: Lane collapse/expand
- D10: Milestone date display on lane headers
- D11: DnD visual indicators (drop zones, insertion points)

**Defer (Phase 3+):**
- D4: Keyboard shortcuts for DnD
- D7: Search / keyword filter
- D8: Bulk milestone move (multi-select)
- D12: Connection profile switching

**Explicitly never build:** Issue CRUD, status column view, WIP limits, Gantt charts, notifications/webhooks, mobile support, offline mode, comments, custom fields, multi-project unified view, analytics.

### Architecture Approach

Tauri's Core-Shell architecture: Rust backend handles all Backlog API communication, credential storage, and rate limiting; React frontend renders the kanban UI in a system webview. Communication is exclusively through Tauri IPC commands. The frontend never makes HTTP requests directly -- all API calls are proxied through typed Rust commands.

**Major components:**

1. **Rust: backlog_client** -- reqwest wrapper for Backlog API v2 with auth, base URL, and rate-limit-aware request execution
2. **Rust: commands/** -- Tauri command modules (settings, milestones, issues, issue_update) that bridge IPC to the API client
3. **Rust: rate_limiter** -- Tracks X-RateLimit headers, queues/delays requests approaching limits
4. **React: boardStore (Zustand)** -- Lane-structured state (`{ lanes: { [milestoneId]: Issue[] } }`), optimistic update with per-issue rollback
5. **React: tauriBridge** -- Typed `invoke()` wrappers providing TypeScript safety at the IPC boundary
6. **React: KanbanBoard + MilestoneLane + IssueCard** -- DndContext orchestration, droppable lanes, draggable cards

**Key architectural decisions:**
- HTTP calls go through Rust reqwest, NOT through Tauri's HTTP plugin from JavaScript
- Tauri capabilities only need `core:default` and `store:default` (no HTTP plugin permission needed)
- Rate limiting is centralized in Rust, not scattered across frontend calls
- Store state is structured by lane (not flat array) to enable granular re-renders

### Critical Pitfalls

1. **milestoneId[] full-array replacement (CRITICAL)** -- Backlog PATCH replaces the entire milestone array. Must read current milestones before writing, preserve non-prefix milestones, and send the complete merged array. Unit test the merge utility exhaustively. Never cache milestone arrays for writes.

2. **onDragOver infinite re-render loops (CRITICAL)** -- Cross-container drag in dnd-kit causes state oscillation near lane boundaries. Prevent with debounced onDragOver, custom collision detection filtering self-container collisions, and guards against no-op state updates. Consider deferring visual container transfer to onDragEnd only.

3. **Optimistic update flicker on drop (CRITICAL)** -- Card snaps back briefly because dnd-kit's internal state and Zustand disagree during the drop-to-update window. Fix with synchronous Zustand state update in onDragEnd before the API call, or use a temporary local state buffer.

4. **Rate limit exhaustion during initial load (CRITICAL)** -- 7+ sequential API calls on startup can hit Backlog rate limits, especially on free plans. Implement sequential fetching with rate-limit header monitoring, query `/api/v2/rateLimit` at startup, show per-lane progressive loading.

5. **Concurrent optimistic rollback destroys other edits (MODERATE)** -- Full-store snapshot rollback overwrites other in-flight mutations. Use per-issue rollback patches instead of full-store snapshots.

## Implications for Roadmap

Based on dependency analysis, architecture boundaries, and pitfall severity, the project should be built in 5 phases.

### Phase 1: Foundation and Settings
**Rationale:** Everything depends on connection settings. No API calls, no data, no board without a valid Backlog connection. This phase establishes the Tauri project scaffold and the settings persistence layer.
**Delivers:** Working Tauri app with settings form that validates API connectivity.
**Addresses:** T1 (Connection settings)
**Avoids:** Pitfall 9 (API key plain text) -- decide on credential storage strategy here

**Scope:**
- Tauri project scaffold (React + TS + Vite 8)
- Rust models (Milestone, Issue, Settings structs with serde)
- Store plugin setup for settings persistence
- get_settings / save_settings Tauri commands
- SettingsView form with validation (test API call on save)
- settingsStore (Zustand)
- TypeScript types

### Phase 2: API Integration Layer (Read-Only)
**Rationale:** The Backlog API client with rate limiting must be rock-solid before building any UI that depends on it. This phase is read-only -- no mutations, no risk of data corruption. It validates the entire data pipeline.
**Delivers:** Rust backend that fetches milestones and issues from Backlog with proper pagination and rate limiting. Typed TypeScript bridge.
**Addresses:** Foundation for T2, T3, T5
**Avoids:** Pitfall 4 (rate limit exhaustion), Pitfall 13 (pagination truncation), Pitfall 7 (IPC overhead -- batch calls in Rust)

**Scope:**
- backlog_client.rs (reqwest wrapper with auth)
- rate_limiter.rs (header parsing, wait-duration calculation)
- Milestone commands (fetch, filter by prefix + date range)
- Issue commands (fetch per milestone with pagination, fetch unassigned)
- tauriBridge.ts (typed invoke wrappers)
- Sequential fetching orchestration from Rust

### Phase 3: Kanban Display (Read-Only UI)
**Rationale:** Build the complete visual board without any mutations. This is safe to demo, validate layout decisions, and stress-test with real Backlog data. Separating display from DnD isolates UI concerns from interaction complexity.
**Delivers:** Full kanban board showing milestone lanes with issue cards, status colors, lane headers with counts and member breakdowns. No drag-and-drop yet.
**Addresses:** T2 (Milestone lanes), T3 (Issue cards), T4 (Status colors), T5 (Unassigned lane), T8 (Loading states), T10 (Card click to browser), T11 (Lane header counts), T12 (Member breakdown)
**Avoids:** Pitfall 11 (store structure) -- must structure Zustand state by lane from the start

**Scope:**
- boardStore (Zustand, lane-structured: `{ lanes: { [milestoneId]: Issue[] } }`)
- KanbanBoard component (horizontal lane layout, loading states)
- MilestoneLane / UnassignedLane components (droppable containers, headers)
- IssueCard component (status badge, assignee, priority)
- LaneHeader component (count + member breakdown)
- StatusBadge with color mapping
- Card click opens browser (plugin-opener)
- Skeleton loaders for progressive loading

### Phase 4: Drag-and-Drop + Mutations
**Rationale:** This is the riskiest phase -- it involves data mutations (PATCH with milestone array preservation), DnD interaction complexity, and optimistic state management. It builds on a proven read-only foundation. All four critical pitfalls converge here.
**Delivers:** Complete drag-and-drop between milestone lanes with optimistic updates, rollback on failure, multi-milestone handling, and error toasts.
**Addresses:** T6 (DnD), T7 (Optimistic UI + rollback), T9 (Error toasts), T13 (Multi-milestone handling)
**Avoids:** Pitfall 1 (milestone array replacement), Pitfall 2 (re-render loops), Pitfall 3 (drop flicker), Pitfall 5 (multi-milestone ambiguity), Pitfall 6 (concurrent rollback), Pitfall 8 (empty lane dead zone), Pitfall 10 (collision detection), Pitfall 12 (stale closures)

**Scope:**
- DnD event handlers (onDragStart, onDragOver, onDragEnd)
- Custom collision detection (pointerWithin for lane, closestCenter within lane)
- DragOverlay (ghost card during drag)
- Debounced onDragOver with no-op guards
- update_issue_milestone Rust command (read-before-write, preserve external milestones)
- preserveExternalMilestones utility with exhaustive unit tests
- Optimistic update with per-issue rollback (not full-store snapshot)
- Synchronous Zustand state update in onDragEnd
- Multi-milestone issue detection, warning badge, cross-lane DnD disable
- Empty lane droppable (useDroppable on container)
- Error toast integration (sonner)
- getState() in DnD callbacks to avoid stale closures

### Phase 5: Polish and Edge Cases
**Rationale:** Final pass for production readiness. Addresses visual polish, edge cases, and remaining quality items.
**Delivers:** Production-ready v1 with polished UX and robust error handling.
**Addresses:** Remaining polish from T4, T8; edge cases (empty lanes, zero milestones, API errors)

**Scope:**
- Loading skeleton refinement
- Status color coding CSS variables
- Empty state handling (no milestones, no issues)
- Error boundary for unexpected failures
- Window title / app metadata
- Build and packaging configuration

### Phase Ordering Rationale

- **Settings before API**: Cannot test anything without a valid Backlog connection
- **API before UI**: Need real data to validate layout; mock data hides integration issues
- **Read-only UI before DnD**: Isolates display bugs from interaction bugs; provides a stable demo checkpoint
- **DnD last among core features**: Has the highest pitfall density (8 of 13 pitfalls are DnD-related); building on a proven read-only board reduces debugging surface
- **Polish after DnD**: Only polish what works; avoid premature optimization of loading states and colors before the core interaction is stable

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (API Integration):** Backlog API pagination behavior needs validation (max items per page, X-Total-Count header presence). Rate limit thresholds on free vs. paid plans are not fully documented -- must query `/api/v2/rateLimit` at runtime.
- **Phase 4 (DnD + Mutations):** dnd-kit multi-container patterns are complex and have multiple known issues. The exact implementation of custom collision detection and debounced onDragOver should be prototyped early with a spike. Multi-milestone conditional drag acceptance needs validation against dnd-kit's API.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Tauri scaffold + React setup. Official templates exist.
- **Phase 3 (Read-Only UI):** Standard React component composition. No novel patterns.
- **Phase 5 (Polish):** CSS and error handling. Standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are stable releases with official documentation. Tauri 2, React 18, Zustand 5, dnd-kit core 6 are all well-established. |
| Features | HIGH | Feature list directly maps to PROJECT.md requirements. Backlog API constraints verified against official docs. Clear table-stakes vs. differentiator separation. |
| Architecture | HIGH | Tauri Core-Shell is the canonical pattern. All architectural decisions (Rust-side HTTP, IPC commands, lane-structured Zustand store) are well-documented with official examples. |
| Pitfalls | HIGH | Critical pitfalls (milestone array replacement, DnD re-render loops, rate limiting) are confirmed by official API docs and dnd-kit GitHub issues with multiple reporters and solutions. |

**Overall confidence:** HIGH

### Gaps to Address

- **API key secure storage:** `tauri-plugin-keyring` compatibility with Tauri 2 is unconfirmed. Fallback is encrypted storage via plugin-store, but the encryption approach needs design. Decision needed in Phase 1.
- **Backlog free-plan rate limits:** Exact rate limit thresholds for free-plan users are not published. Must query `/api/v2/rateLimit` at runtime and adapt. Could impact initial load experience for free-plan users.
- **dnd-kit onDragOver debounce vs. defer-to-onDragEnd trade-off:** Research identifies both approaches but does not definitively recommend one. A spike in early Phase 4 should test both with real data volumes.
- **Vite 8 plugin compatibility:** Vite 8 (Rolldown) is a major architecture change. If any plugin breaks, Vite 7.3 is the documented fallback. Low risk for this project's minimal plugin set (only @vitejs/plugin-react-swc).
- **@dnd-kit/react migration path:** Current recommendation is @dnd-kit/core 6.x (stable). When @dnd-kit/react reaches 1.0, migration should be evaluated. No action needed now, but the lane/card component API should not tightly couple to core 6.x internals.

## Sources

### Primary (HIGH confidence)
- [Tauri 2.0 Architecture & Plugin Docs](https://v2.tauri.app/) -- core architecture, IPC, capabilities, plugins
- [Backlog API v2 Official Documentation](https://developer.nulab.com/docs/backlog/) -- endpoints, rate limits, authentication, milestoneId[] behavior
- [dnd-kit Official Documentation](https://docs.dndkit.com/) -- collision detection, sortable, multiple containers
- [Zustand v5 Documentation](https://zustand.docs.pmnd.rs/) -- migration notes, selectors, useShallow

### Secondary (MEDIUM confidence)
- [dnd-kit GitHub Issues/Discussions](https://github.com/clauderic/dnd-kit/) -- re-render loops (#1421, #1678), optimistic update flicker (#1522)
- [Vite 8.0 Announcement](https://vite.dev/blog/announcing-vite8) -- Rolldown architecture, compatibility
- [TkDodo: Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) -- rollback patterns
- [Tauri IPC Performance Discussions](https://github.com/tauri-apps/tauri/discussions/5690) -- serialization overhead benchmarks

### Tertiary (needs validation)
- [tauri-plugin-keyring](https://github.com/AliMD/tauri-plugin-keyring) -- Tauri 2 compatibility unconfirmed
- [Backlog free-plan rate limits](https://developer.nulab.com/docs/backlog/rate-limit/) -- exact thresholds for free plan not published
- [@dnd-kit/react 0.3.x](https://www.npmjs.com/package/@dnd-kit/react) -- pre-stable, migration timeline unknown

---
*Research completed: 2026-04-07*
*Ready for roadmap: yes*
