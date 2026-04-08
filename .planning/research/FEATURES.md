# Feature Landscape

**Domain:** Milestone-level kanban planning tool (Backlog API integration)
**Researched:** 2026-04-07

## Context: The Gap Mileboard Fills

Backlog's built-in board organizes issues by **status columns** (Open, In Progress, Resolved, Closed). It can filter by milestone, but it does **not** provide a milestone-as-lane view where you drag issues **between milestones**. This is the core gap: teams doing monthly sprint planning need to see milestones side-by-side and quickly reassign issues across them. No existing tool provides this specific view for Backlog users.

---

## Table Stakes

Features users expect from any kanban-style board tool. Missing = product feels broken or incomplete.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | **Connection settings (API key, host, project)** | Users cannot use the app without connecting to their Backlog instance | Low | Persist in local config file (.gitignore-safe). Validate on save with a test API call. |
| T2 | **Milestone lanes in chronological order** | Core value proposition -- the entire reason the app exists | Med | Filter by prefix, show last month through 6 months ahead (~7 lanes). Horizontal scroll for overflow. |
| T3 | **Issue cards with key info (key, title, status, assignee, priority)** | Users need to identify issues at a glance without clicking through | Low | Keep card face minimal: key, title, status badge, assignee avatar, priority indicator. Details on click. |
| T4 | **Status color coding** | Instant visual scan of lane health is table stakes for any kanban tool | Low | Map Backlog status IDs to colors. Use semantic colors (e.g., green=resolved, blue=in progress, gray=open). |
| T5 | **"Unassigned" lane (no milestone)** | Sprint planning starts with triaging unassigned issues into milestones | Low | Leftmost lane. Label clearly. This is the primary source lane during planning sessions. |
| T6 | **Drag-and-drop between lanes** | Core interaction -- the reason this is a desktop app, not a report | High | Use @dnd-kit. Update milestoneId[] via Backlog API PATCH. Must preserve non-prefix milestones in the array. |
| T7 | **Optimistic UI update + rollback on failure** | DnD must feel instant. Waiting for API round-trip destroys the planning flow. | Med | Update Zustand state immediately. On API error, revert card position and show error toast. |
| T8 | **Loading states** | Users need to know data is being fetched, not broken | Low | Skeleton loaders for initial load. Spinner overlay for lane data. |
| T9 | **Error toasts** | API failures (rate limit, network, auth) must be surfaced clearly | Low | Non-blocking toast notifications. Include actionable info (e.g., "Rate limited -- retry in 30s"). |
| T10 | **Card click opens Backlog in browser** | Users need full issue details without rebuilding Backlog's UI | Low | Construct URL from host + issueKey. Open in default browser via Tauri shell API. |
| T11 | **Lane header with issue count** | Planning requires knowing lane load at a glance | Low | Show total count prominently. |
| T12 | **Lane header with member breakdown** | Sprint planning requires seeing workload distribution per person | Med | Aggregate assigneeId counts. Show as compact list or avatar row with counts. |
| T13 | **Multi-milestone issue handling** | Edge case that causes data corruption if not handled explicitly | Med | Display in earliest-start-date lane. Show warning badge. Disable cross-lane DnD for these cards (allow intra-lane reorder). |

---

## Differentiators

Features that set mileboard apart. Not expected in a v1, but create significant value.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **Assignee filter** | During daily scrum, focus on one person's workload across milestones | Low | Toggle filter chips. Filter cards in all lanes simultaneously. Deferred to v2 per PROJECT.md but low complexity. |
| D2 | **Status filter** | Focus on open issues only during planning, or resolved issues for review | Low | Same filter chip pattern as D1. Combinable with assignee filter. |
| D3 | **Priority filter** | Surface high-priority items during triage | Low | Same pattern. |
| D4 | **Keyboard shortcuts for DnD** | Power users (devs in daily scrum) want to move cards without mouse | Med | Arrow keys to navigate cards, Enter to pick up, arrow to target lane, Enter to drop. Follow @dnd-kit accessibility patterns. |
| D5 | **Auto-refresh / polling** | Board stays current during a meeting without manual reload | Low | Poll every 60-120 seconds. Merge remote changes without disrupting in-progress DnD. |
| D6 | **Card sorting within lanes** | See highest priority or most recently updated issues first | Low | Sort by priority, status, assignee, or updated date. Persist sort preference. |
| D7 | **Search / keyword filter** | Find a specific issue by key or title across all lanes | Low | Client-side filter on already-loaded data. Highlight matching cards, dim others. |
| D8 | **Bulk milestone move** | Select multiple cards and move them to a target milestone at once | Med | Multi-select via Shift+click or Ctrl+click. Batch API calls. Essential for large-scale sprint replanning. |
| D9 | **Lane collapse/expand** | Reduce visual noise by collapsing milestones you're not actively planning | Low | Collapse to header-only showing count. Persist state. |
| D10 | **Milestone date display on lane header** | See when each milestone starts/ends without leaving the app | Low | Show start_date ~ release_due_date from Backlog milestone data. |
| D11 | **Drag-and-drop visual indicators** | Clear drop zones, insertion points, and card ghost during drag | Low | Part of good DnD UX but often overlooked. Highlight target lane, show insertion line. |
| D12 | **Connection profile switching** | Teams working on multiple Backlog projects need quick switching | Med | Save multiple connection profiles. Switch without restarting. |

---

## Anti-Features

Features to explicitly NOT build. Building these would increase complexity without proportional value, or would conflict with the tool's focused purpose.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| A1 | **Issue creation / editing** | Mileboard is a planning view, not a Backlog replacement. Building issue CRUD duplicates Backlog's core UI and creates maintenance burden. | Card click opens Backlog in browser (T10). Let Backlog handle issue management. |
| A2 | **Status column view (traditional kanban)** | Backlog already has a status-based board. Duplicating it provides zero value. Mileboard's value is the milestone-lane view. | Stay focused on milestone-as-lane paradigm. |
| A3 | **WIP limits / WIP warnings** | Per PROJECT.md decision: member-based issue counts (T12) are sufficient for spotting workload imbalance. WIP limits add UX complexity for marginal benefit in a planning tool. | Show member breakdown in lane headers instead. |
| A4 | **Gantt chart / timeline view** | Backlog already provides Gantt charts. Adding another view type balloons scope. | Link to Backlog's Gantt chart if needed. |
| A5 | **Notifications / webhooks** | Real-time push notifications require server infrastructure. A desktop polling approach is simpler and sufficient. | Use polling-based refresh (D5). |
| A6 | **Mobile support** | Per PROJECT.md: desktop-only. Tauri does not target mobile. Sprint planning is a laptop/monitor activity. | Desktop-only. No responsive breakpoints below 1024px. |
| A7 | **Offline mode with sync** | Mileboard is a live view of Backlog data. Offline editing creates merge conflict hell with a multi-user system of record. | Show clear "offline" indicator. Disable DnD when disconnected. Retry on reconnect. |
| A8 | **Comments / activity feed** | Duplicates Backlog's collaboration features. High complexity, low value in a planning view. | Card click opens Backlog (T10) for full context. |
| A9 | **Custom fields display** | Backlog supports extensive custom fields. Rendering them all adds complexity. | Show only the 5 core fields (key, title, status, assignee, priority). Custom field display is a v3+ consideration if ever. |
| A10 | **Multi-project unified view** | Aggregating across projects introduces cross-project milestone conflicts and API complexity. | One project at a time. Use connection profiles (D12) to switch. |
| A11 | **Analytics / burndown / velocity** | Planning tools and analytics tools serve different moments. Backlog already provides burndown charts per milestone. | Link to Backlog's analytics. |
| A12 | **Issue reordering within lane (persisted)** | Backlog API has no concept of issue ordering within a milestone. Persisting local sort order creates confusion when data refreshes. | Allow client-side sorting (D6) but don't persist custom manual order. |

---

## Feature Dependencies

```
T1 (Connection settings) --> T2 (Milestone lanes) --> T3 (Issue cards)
                                                  --> T5 (Unassigned lane)
T3 (Issue cards) --> T4 (Status colors)
                 --> T10 (Card click -> browser)
                 --> T13 (Multi-milestone handling)
T2 + T3 --> T6 (Drag-and-drop)
T6 --> T7 (Optimistic UI + rollback)
T6 --> T8 (Loading states)
T7 --> T9 (Error toasts)
T2 + T3 --> T11 (Lane header counts)
T11 --> T12 (Member breakdown)

# Differentiators build on table stakes
T3 --> D1 (Assignee filter)
T3 --> D2 (Status filter)
T3 --> D3 (Priority filter)
T6 --> D4 (Keyboard DnD)
T2 + T3 --> D5 (Auto-refresh)
T3 --> D6 (Card sorting)
T3 --> D7 (Search filter)
T6 + D1 --> D8 (Bulk move) -- needs multi-select on top of DnD
T2 --> D9 (Lane collapse)
T2 --> D10 (Milestone dates)
T6 --> D11 (DnD visual indicators) -- technically part of T6 polish
T1 --> D12 (Connection profiles)
```

---

## MVP Recommendation

**Prioritize (Phase 1 -- Core Planning Loop):**

1. **T1** -- Connection settings (gate to everything)
2. **T2** -- Milestone lanes in chronological order
3. **T3** -- Issue cards with core fields
4. **T4** -- Status color coding
5. **T5** -- Unassigned lane
6. **T6** -- Drag-and-drop between lanes
7. **T7** -- Optimistic UI + rollback
8. **T8** -- Loading states
9. **T9** -- Error toasts
10. **T10** -- Card click opens browser
11. **T11** -- Lane header issue count
12. **T12** -- Member breakdown in headers
13. **T13** -- Multi-milestone issue handling

This matches the PROJECT.md Active requirements exactly. All 13 table stakes features form a complete, usable planning tool.

**Phase 2 -- Usability Polish (Defer):**

- D1, D2, D3 (Filters) -- Low complexity, high daily-use value. First differentiators to add.
- D5 (Auto-refresh) -- Keeps board current during meetings.
- D6 (Card sorting) -- Quick win for information density.
- D9 (Lane collapse) -- Reduces noise for focused planning.
- D10 (Milestone dates) -- Low effort, helpful context.
- D11 (DnD visual indicators) -- Polish for core interaction.

**Phase 3 -- Power Features (Defer further):**

- D4 (Keyboard DnD) -- Accessibility and power-user feature.
- D7 (Search) -- Useful at scale but not critical for ~7 lanes.
- D8 (Bulk move) -- High value for large replanning sessions.
- D12 (Connection profiles) -- Multi-project teams only.

**Explicitly defer forever:**

- A1-A12 (All anti-features) -- These represent scope creep. The tool's strength is its focus.

---

## Backlog API Constraints Affecting Features

| Constraint | Impact on Features | Mitigation |
|------------|-------------------|------------|
| milestoneId[] replaces entire array on PATCH | DnD (T6) must read current milestones, preserve non-prefix ones, and send full array | Read issue first, merge milestone arrays, then PATCH |
| Rate limit: 150 update ops/window | Bulk move (D8) and rapid DnD could hit limits | Queue API calls, debounce rapid moves, show rate limit warning |
| Rate limit: 600 read ops/window | Initial load of ~7 lanes with many issues | Sequential fetching per lane with progress indicator |
| Pagination: max 100 issues per request | Lanes with >100 issues need multiple fetches | Paginate automatically, aggregate client-side |
| No issue ordering API | Cannot persist manual card order within lanes | Client-side sorting only (D6), reset on refresh |

---

## Sources

- [Backlog Get Issue List API](https://developer.nulab.com/docs/backlog/api/2/get-issue-list/) -- HIGH confidence (official docs)
- [Backlog Update Issue API](https://developer.nulab.com/docs/backlog/api/2/update-issue/) -- HIGH confidence (official docs)
- [Backlog Rate Limit API](https://developer.nulab.com/docs/backlog/api/2/get-rate-limit/) -- HIGH confidence (official docs)
- [Backlog API Rate Limiting Notice](https://nulab.com/release-notes/backlog/important-notice-backlog-will-start-limiting-api-requests/) -- HIGH confidence (official)
- [Vital Kanban Board Features 2026](https://businessmap.io/blog/best-kanban-board-features) -- MEDIUM confidence (industry analysis)
- [Best Kanban Board Software 2026](https://businessmap.io/kanban-resources/kanban-software) -- MEDIUM confidence (industry roundup)
- [Kanban Board UX Patterns](https://www.interaction-design.org/literature/topics/kanban-boards) -- MEDIUM confidence (design reference)
- [Kanban Card Design Best Practices](https://www.atlassian.com/agile/kanban/cards) -- MEDIUM confidence (Atlassian docs)
- [DnD Accessibility Patterns](https://blazor.syncfusion.com/documentation/kanban/accessibility) -- MEDIUM confidence (component library docs)
- [Drag-and-Drop UI Best Practices](https://www.eleken.co/blog-posts/drag-and-drop-ui) -- MEDIUM confidence (UX analysis)
- [Kanban Performance / Lazy Loading](https://docs.inogic.com/kanban-board/features/lazy-loading-smooth-scrolling-for-high-volume-kanban-lanes) -- MEDIUM confidence (product docs)
- [Backlog Board Feature Overview](https://support.nulab.com/hc/en-us/articles/8732487653145-Backlog-101-Project-board) -- HIGH confidence (official support)
- [Milestone-Kanban Hybrid Approach](https://agilealliance.org/milestone-kanban-a-hybrid-project-scheduling-technique/) -- MEDIUM confidence (Agile Alliance)
- [Kanri - Offline Kanban with Tauri](https://github.com/kanriapp/kanri) -- MEDIUM confidence (open source reference)
