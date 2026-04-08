# Phase 5: Drag & Drop with Optimistic Updates - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can reassign issues between milestones by dragging cards across lanes, with instant visual feedback and safe rollback on failure. This phase adds the core drag-and-drop interaction to the enriched board from Phase 4. Includes: cross-lane DnD, Rust PATCH command with milestone array preservation, optimistic UI with rollback, multi-milestone warning badges, error toasts, and unassigned lane DnD (both directions).

</domain>

<decisions>
## Implementation Decisions

### Drag visual feedback
- **D-01:** Dragged card is fully opaque with slight scale-up (scale: 1.05) and large drop shadow. Linear/Jira-style solid drag overlay.
- **D-02:** Original position is hidden during drag (card removed from flow, no placeholder shown).
- **D-03:** Drop target lane gets a subtle background color highlight when hovered during drag. Simple color change only, no border modification.

### Click vs drag discrimination
- **D-04:** Phase 4's onClick handler on IssueCard must coexist with dnd-kit drag. dnd-kit handles this via activationConstraint (distance or delay threshold). Click events fire only if the pointer didn't move beyond the threshold.

### Multi-milestone warning badge
- **D-05:** Cards belonging to multiple milestones display a small ⚠ icon between the issueKey and StatusBadge on line 1 of the card.
- **D-06:** Hovering the ⚠ icon shows a tooltip listing the other milestone names (e.g., "他のマイルストーン: Sprint-2505, Release-v2.1").
- **D-07:** Multi-milestone cards appear in the earliest-start-date lane only (per DND-03 requirement).
- **D-08:** Cross-lane drag is disabled for multi-milestone cards. Attempting to drag shows a not-allowed cursor. Card does not lift or move.

### Error toast behavior
- **D-09:** Error toasts displayed at bottom-right of the screen using sonner.
- **D-10:** Display-only toasts (no retry action button). Auto-dismiss after 5 seconds.
- **D-11:** Multiple errors stack vertically. Japanese error messages from Rust backend.
- **D-12:** Rollback completes before/simultaneously with toast display — user sees the card snap back AND the error message.

### Unassigned lane DnD
- **D-13:** Drag from unassigned lane to milestone lane is ALLOWED. This assigns the prefix milestone to the issue. Primary sprint planning workflow.
- **D-14:** Drag from milestone lane to unassigned lane is ALLOWED. This removes the prefix-matching milestone from the issue. Enables "remove from sprint" workflow.
- **D-15:** If removing the prefix milestone leaves the issue with zero milestones, the issue moves to the unassigned lane as expected.

### Optimistic update pattern
- **D-16:** Follows the documented architecture pattern: snapshot current state → immediate UI update → async API call → rollback on failure + error toast.
- **D-17:** boardStore gets a `moveIssue` action that handles snapshot, optimistic update, API call, and rollback internally.

### Rust backend: update_issue_milestone command
- **D-18:** New Rust IPC command `update_issue_milestone` in backlog module. Fetches current issue milestone list, removes old prefix-matching milestone, adds new milestone (or none for unassigned), preserves all non-prefix milestones, sends PATCH.
- **D-19:** tauriBridge.ts gets a new `updateIssueMilestone` function as the frontend proxy.

### Claude's Discretion
- dnd-kit DragOverlay implementation details and activation constraint thresholds
- Exact highlight color for drop target lanes
- Tooltip implementation approach (CSS-only vs library)
- Scale and shadow CSS values for drag overlay
- boardStore internal snapshot/rollback implementation
- Rust PATCH request construction details
- Component decomposition for DnD wrapper layers (DndContext placement)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project requirements
- `.planning/REQUIREMENTS.md` — DND-01 (cross-lane drag), DND-02 (optimistic update + rollback), DND-03 (multi-milestone handling), UX-02 (error toast)
- `.planning/PROJECT.md` — Constraints (milestoneId[] gotcha, rate limiting), Tech stack (@dnd-kit, sonner)

### Architecture
- `.planning/codebase/ARCHITECTURE.md` §Data Flow §4 — Drag-and-Drop with Optimistic Update flow diagram
- `.planning/codebase/ARCHITECTURE.md` §5 — Milestone Array Preservation (critical data integrity)
- `.planning/codebase/ARCHITECTURE.md` §State Management — Optimistic update pattern, DnD data strategy (pass IDs only)
- `CLAUDE.md` §Architecture — IPC boundary, tauriBridge pattern
- `CLAUDE.md` §Backlog API — milestoneId[] gotcha (PATCH replaces entire array)

### Phase dependencies (existing code to modify)
- `src/stores/boardStore.ts` — Needs `moveIssue` action with snapshot/rollback
- `src/services/tauriBridge.ts` — Needs `updateIssueMilestone` function
- `src/types/board.ts` — `BoardData`, `MilestoneWithIssues` types
- `src/types/backlog.ts` — `BacklogIssue.milestone: BacklogMilestone[]` (multi-milestone aware)
- `src/components/Board/Board.tsx` — Needs DndContext wrapping
- `src/components/Lane/Lane.tsx` — Needs droppable zone + sortable items
- `src/components/IssueCard/IssueCard.tsx` — Needs draggable wrapper, click vs drag coexistence, ⚠ badge for multi-MS
- `src-tauri/src/backlog/commands.rs` — Needs `update_issue_milestone` command
- `src-tauri/src/backlog/client.rs` — Needs PATCH issue method
- `src-tauri/src/backlog/mod.rs` — Export new command
- `src-tauri/src/lib.rs` — Register new command in invoke_handler

### Prior phase context
- `.planning/phases/03-core-kanban-board/03-CONTEXT.md` — D-01 (horizontal columns), D-02 (fixed width ~280px), D-07 (unassigned at left)
- `.planning/phases/04-board-enrichment/04-CONTEXT.md` — D-05 (hover/ripple on card), D-07 (Phase 5 adjusts click vs drag)

### Technology
- `CLAUDE.md` §Tech Stack — @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0, sonner 2.x

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IssueCard` component — compact 3-line layout with onClick, hover/ripple. Needs DnD wrapper and ⚠ badge
- `Lane` component — renders LaneHeader + card list. Needs droppable container
- `Board` component — renders unassigned + milestone lanes. Needs DndContext provider
- `boardStore` — has fetchBoard/reset. Needs moveIssue action
- `tauriBridge.ts` — has fetchBoardData. Needs updateIssueMilestone
- `BacklogIssue.milestone` — already `BacklogMilestone[]`, multi-milestone data available
- `global.css` design tokens — `--shadow-card`, `--transition-*`, colors available
- `sonner` in package.json — toast library ready to use but not yet imported

### Established Patterns
- Zustand stores with immutable updates (`set((state) => ({ ...state }))`)
- Component directory: `src/components/ComponentName/ComponentName.tsx` + `.module.css`
- IPC via tauriBridge proxy — components never call invoke() directly
- Rust commands in `src-tauri/src/backlog/commands.rs` with Japanese error strings
- CSS Modules for component styling

### Integration Points
- Board.tsx: Wrap with DndContext, add DragOverlay
- Lane.tsx: Add useDroppable for drop targets, wrap cards with SortableContext
- IssueCard.tsx: Add useSortable for draggable items, integrate click vs drag
- boardStore: moveIssue action → tauriBridge.updateIssueMilestone → Rust command
- App.tsx or Board.tsx: Add sonner `<Toaster />` provider
- lib.rs: Register `update_issue_milestone` in invoke_handler

</code_context>

<specifics>
## Specific Ideas

- Unassigned lane at left (Phase 3 D-07) was designed specifically to support the sprint planning DnD workflow: scan unassigned → drag to milestone
- The milestone array preservation logic is the most critical correctness requirement — non-prefix milestones MUST be untouched
- Click vs drag coexistence: dnd-kit's activationConstraint (distance threshold) is the standard approach
- Drag overlay should feel "solid" and lifted (Linear/Jira-style), not ghostly/transparent

</specifics>

<deferred>
## Deferred Ideas

- **ドロップ位置のインサーションポイント表示** — UXP-03 (v2要件として定義済み)。カード間の挿入位置をビジュアル表示
- **レーン内の並び替え** — PWR-01 (v2要件)。Backlog APIに課題順序概念がないためv1では不可
- **複数カード選択・一括移動** — PWR-02 (v2要件)

### Reviewed Todos (not folded)
- Sanitize host URL input (`2026-04-08-sanitize-host-url-input.md`) — Phase 1設定フォームの修正。Phase 5スコープ外のため未採用

</deferred>

---

*Phase: 05-drag-drop-with-optimistic-updates*
*Context gathered: 2026-04-08*
