# Phase 4: Board Enrichment - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

The board provides at-a-glance workload visibility through status colors, lane statistics, and direct linking to Backlog issues. This phase enriches the read-only board built in Phase 3 — no drag-and-drop (Phase 5), no filters (v2), no bulk operations (v2).

</domain>

<decisions>
## Implementation Decisions

### Status color coding
- **D-01:** Use `BacklogStatus.color` directly from the Backlog API as the color source. No custom palette mapping. This ensures consistency with Backlog's own UI and automatically supports custom statuses.
- **D-02:** Apply color to StatusBadge background only. Card body remains white background. Badge text color should auto-contrast (white or dark) based on background luminance.

### Member breakdown display
- **D-03:** Toggle-expandable display in lane header. Default state is collapsed (shows issue count only). Click to expand and reveal member-by-member breakdown. Click again to collapse.
- **D-04:** Member breakdown sorted by issue count descending. Unassigned issues shown last with "未割当" label.

### Card click behavior
- **D-05:** Hover highlight + click ripple animation + pointer cursor for visual feedback.
- **D-06:** Use `tauri-plugin-opener` to open `https://{host}/view/{issueKey}` in the user's default browser. Host URL comes from `settingsStore.hostUrl`.
- **D-07:** Phase 4 implements onClick only. Phase 5 will add DnD and adjust click vs drag detection logic at that time. No preemptive DnD-compatible event handling needed now.

### Issue count display
- **D-08:** Issue count displayed next to milestone name in parentheses (e.g., "Sprint 2504 (6)"). Toggle button (▼/▲) positioned at the right end of the header row.

### Claude's Discretion
- Exact ripple animation timing and style
- Badge text color contrast algorithm details (WCAG-compliant luminance check)
- Toggle animation (smooth expand/collapse transition)
- Member breakdown text formatting details (truncation for long names)
- Component decomposition for new header elements (MemberBreakdown subcomponent, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — BOARD-04 (status color coding), BOARD-05 (lane issue count), BOARD-06 (member breakdown), UX-03 (card click opens browser)
- `.planning/PROJECT.md` — Constraints (tech stack, tauri-plugin-opener), Context (usage scenarios)

### Phase dependencies
- `src/components/StatusBadge/StatusBadge.tsx` — Currently uniform gray badge. Needs color prop from `BacklogStatus.color`
- `src/components/StatusBadge/StatusBadge.module.css` — Badge styling to update with dynamic background color
- `src/components/IssueCard/IssueCard.tsx` — Needs onClick handler for browser navigation
- `src/components/IssueCard/IssueCard.module.css` — Needs hover/click/ripple styles
- `src/components/LaneHeader/LaneHeader.tsx` — Needs issue count + toggle + member breakdown
- `src/components/LaneHeader/LaneHeader.module.css` — Needs expanded layout styles
- `src/types/backlog.ts` — `BacklogStatus.color` field (already exists), `BacklogIssue.assignee` for member aggregation
- `src/stores/settingsStore.ts` — `hostUrl` for constructing Backlog issue URL
- `src/global.css` — Design tokens for new styles

### Phase 3 context (board patterns)
- `.planning/phases/03-core-kanban-board/03-CONTEXT.md` — D-04 (compact 3-line card), D-06 (gray badge deferred to Phase 4), D-03 (lane header format)

### Phase 1 context (settings patterns)
- `.planning/phases/01-foundation-connection-settings/01-CONTEXT.md` — D-03 (gear icon in board header)

### Technology
- `CLAUDE.md` §Tech Stack — tauri-plugin-opener for URL opening
- `CLAUDE.md` §Architecture — IPC boundary, tauriBridge pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` component — receives `name` prop, needs `color` prop added
- `IssueCard` component — compact 3-line layout, needs onClick + hover/ripple
- `LaneHeader` component — shows name + date range, needs issue count + toggle + breakdown
- `BacklogStatus.color` field — Backlog API already provides hex color per status
- `BacklogIssue.assignee` — provides data for member-by-member aggregation
- `global.css` design tokens — `--color-*`, `--space-*`, `--transition-*` ready to use
- CSS Modules convention established in Phases 1-3

### Established Patterns
- Zustand stores with immutable updates
- Component directory structure: `src/components/ComponentName/ComponentName.tsx` + `.module.css`
- Tauri mock setup in `tests/setup.ts`
- Discriminated union error handling (tauriBridge)

### Integration Points
- `StatusBadge` receives `issue.status.color` from parent `IssueCard`
- `LaneHeader` receives issue array (or pre-computed stats) from parent `Lane`
- `IssueCard` onClick → `tauri-plugin-opener` → external browser
- `settingsStore.hostUrl` → URL construction for card click

</code_context>

<specifics>
## Specific Ideas

- Badge color from API ensures custom Backlog statuses (project-specific) work without code changes
- Toggle member breakdown supports the sprint planning use case: see who has too many/few issues at a glance
- Ripple animation on card click provides haptic-like feedback confirming the click action
- Issue count next to name keeps the header compact while conveying lane load

</specifics>

<deferred>
## Deferred Ideas

- **カードのグルーピングと一括移動** — PWR-02 (v2要件として定義済み)。複数カード選択して一括マイルストーン移動
- **フィルタリング** — FILT-01 (v2要件として定義済み)。担当者フィルタ等
- **Sanitize host URL input** — Phase 1設定フォームのTodo。Phase 4スコープ外

### Reviewed Todos (not folded)
- Sanitize host URL input (`2026-04-08-sanitize-host-url-input.md`) — Phase 1の設定フォームに関する修正。Phase 4スコープ外のため未採用

</deferred>

---

*Phase: 04-board-enrichment*
*Context gathered: 2026-04-08*
