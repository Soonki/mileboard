# Phase 3: Core Kanban Board - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see their Backlog milestones as chronological lanes with issue cards, plus an unassigned lane, with loading feedback during data fetch. This phase builds the read-only board view — no drag-and-drop (Phase 5), no status color coding or lane stats (Phase 4), no card click navigation (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Lane layout
- **D-01:** Horizontal scrolling column layout (Trello-style). Each milestone is a vertical column, columns scroll horizontally.
- **D-02:** Fixed column width for all lanes (e.g., ~280px). Consistent regardless of issue count. Predictable drop targets for future DnD.
- **D-03:** Lane header displays milestone name + date range (startDate ~ releaseDueDate). Example: "Sprint 2504 (4/1~4/30)".

### Issue card style
- **D-04:** Compact 3-line card layout:
  - Line 1: issueKey + status badge (right-aligned)
  - Line 2: summary (truncated with ellipsis)
  - Line 3: assignee name + priority icon (right-aligned)
- **D-05:** Priority indicator: arrow icons only (e.g., ▲▲▲ high, ▲▲ medium, ▲ low) with color differentiation (red/orange/green).
- **D-06:** Status badge: text badge showing Backlog status name (e.g., "未対応", "処理中", "処理済み", "完了"). Uniform gray background in Phase 3 — color coding deferred to Phase 4 (BOARD-04).

### Unassigned lane
- **D-07:** Unassigned lane positioned at the left end (first lane), before chronological milestone lanes.
- **D-08:** Normal scroll positioning (not sticky). Scrolls with other lanes in the horizontal scroll area.

### Board header
- **D-09:** Header contains: left-aligned "mileboard" title, right-aligned reload button (↻) + settings button (⚙, already implemented in Phase 1).
- **D-10:** Reload button triggers manual data re-fetch via fetchBoardData().

### Loading state
- **D-11:** Skeleton loading — gray placeholders mimicking lane and card shapes with pulse animation. Displayed while fetchBoardData() is in progress.
- **D-12:** One-shot loading: entire board shows skeleton until all data arrives (per Phase 2 D-01). No progressive/partial rendering.

### Error state
- **D-13:** Inline error in board area — centered error message (Japanese) + retry button. Header remains visible so user can access ⚙ settings to fix connection issues.
- **D-14:** Board-level error granularity — if ANY fetch fails, entire board shows error (per Phase 2 D-03).

### Claude's Discretion
- Exact card dimensions and internal spacing
- Skeleton animation timing and number of placeholder cards/lanes
- Scroll behavior details (smooth scroll, scroll snap)
- Empty lane visual treatment (when a milestone has zero issues)
- boardStore structure (Zustand store for board state)
- Component decomposition (Board, Lane, Card, Skeleton, ErrorState)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — BOARD-01 (milestone lanes), BOARD-02 (unassigned lane), BOARD-03 (card fields), UX-01 (loading state)
- `.planning/PROJECT.md` — Constraints (tech stack, lane range, milestoneId[] gotcha), Context (usage scenarios)

### Phase dependencies
- `src/types/board.ts` — `BoardData`, `MilestoneWithIssues`, `FetchBoardParams` types
- `src/types/backlog.ts` — `BacklogIssue`, `BacklogMilestone`, `BacklogStatus`, `BacklogPriority`, `BacklogUser` types
- `src/services/tauriBridge.ts` — `fetchBoardData()` IPC proxy function
- `src/stores/settingsStore.ts` — `useSettingsStore` provides hostUrl, apiKey, projectKey, milestonePrefix
- `src/global.css` — Design tokens (colors, spacing, shadows, typography, radii)
- `src/App.tsx` — Board rendering point (currently `BoardPlaceholder`), ⚙ button placement
- `src/components/BoardPlaceholder/BoardPlaceholder.tsx` — Placeholder to be replaced with actual board

### Phase 1 context (UI patterns)
- `.planning/phases/01-foundation-connection-settings/01-CONTEXT.md` — D-02 (auto-transition to board), D-03 (⚙ in board header), D-06 (modal for re-edit)

### Phase 2 context (data patterns)
- `.planning/phases/02-backlog-data-pipeline/02-CONTEXT.md` — D-01 (one-shot fetch), D-02 (complete board data), D-03 (board-level error), D-04 (Japanese errors)

### Technology
- `CLAUDE.md` §Architecture — IPC boundary diagram, tauriBridge pattern
- `CLAUDE.md` §Tech Stack — Zustand 5, CSS Modules, React 18

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BoardData` type with `MilestoneWithIssues[]` and `unassignedIssues` — pre-organized data structure ready for lane rendering
- `fetchBoardData()` in tauriBridge.ts — IPC call already implemented, returns `BoardData`
- `useSettingsStore` — provides all connection params needed for fetchBoardData()
- `global.css` design tokens — `--color-*`, `--space-*`, `--shadow-card`, `--radius-card`, `--transition-*` ready to use
- CSS Modules convention established in Phase 1 components

### Established Patterns
- Zustand stores with immutable updates (`set((state) => ({ ...state, ...partial }))`)
- Discriminated union error handling (though tauriBridge throws strings, not union objects)
- Component directory structure: `src/components/ComponentName/ComponentName.tsx` + `.module.css`
- Tauri mock setup in `tests/setup.ts` for Vitest

### Integration Points
- `App.tsx` line 46: `<BoardPlaceholder />` — replace with actual Board component
- `App.tsx` lines 22-44: ⚙ button — relocate into Board header component
- `settingsStore` → `fetchBoardData()` → boardStore (new) → Board components
- `BacklogMilestone.startDate` / `releaseDueDate` for lane header date display

</code_context>

<specifics>
## Specific Ideas

- Card detail is intentionally minimal — clicking opens Backlog URL (Phase 4 UX-03) for full context
- Unassigned lane at left end supports the sprint planning workflow: review unassigned → drag to milestone lanes (Phase 5)
- Lane header date range format: "name (M/D~M/D)" — concise, locale-appropriate for Japanese users
- Reload button enables manual refresh without reopening the app, important since auto-refresh is out of scope (v2)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-kanban-board*
*Context gathered: 2026-04-08*
