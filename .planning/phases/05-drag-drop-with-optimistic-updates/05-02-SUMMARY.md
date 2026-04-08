---
phase: 05-drag-drop-with-optimistic-updates
plan: 02
subsystem: dnd-ui
tags: [dnd-kit, drag-drop, ui-components, board, lane, issue-card]
dependency_graph:
  requires: [05-01]
  provides: [dnd-board-ui, warning-badge, drag-overlay-card, toaster-provider]
  affects: [Board, Lane, IssueCard]
tech_stack:
  added: ["@dnd-kit/core@6.3.1", "@dnd-kit/sortable@10.0.0"]
  patterns: [useDroppable, useSortable, DndContext-with-DragOverlay, CSS-only-tooltip]
key_files:
  created:
    - src/components/WarningBadge/WarningBadge.tsx
    - src/components/WarningBadge/WarningBadge.module.css
    - src/components/WarningBadge/WarningBadge.test.tsx
    - src/components/DragOverlayCard/DragOverlayCard.tsx
    - src/components/DragOverlayCard/DragOverlayCard.module.css
    - src/components/DragOverlayCard/DragOverlayCard.test.tsx
  modified:
    - src/components/Board/Board.tsx
    - src/components/Board/Board.test.tsx
    - src/components/Lane/Lane.tsx
    - src/components/Lane/Lane.module.css
    - src/components/Lane/Lane.test.tsx
    - src/components/IssueCard/IssueCard.tsx
    - src/components/IssueCard/IssueCard.module.css
    - src/components/IssueCard/IssueCard.test.tsx
    - tests/setup.ts
    - package.json
    - package-lock.json
decisions:
  - "@dnd-kit global mocks in tests/setup.ts for consistent test isolation"
  - "CSS-only tooltip for WarningBadge (no external tooltip library)"
  - "DragOverlayCard as separate presentational component (Pitfall 3 avoidance)"
  - "PointerSensor with 5px distance constraint for click/drag coexistence"
metrics:
  duration: 6m19s
  completed: "2026-04-08T07:12:44Z"
  tasks: 2
  files: 17
---

# Phase 05 Plan 02: DnD UIコンポーネント統合 Summary

@dnd-kit/core + sortableをBoard/Lane/IssueCardに統合し、レーン間ドラッグ&ドロップ、DragOverlay表示、マルチマイルストーン警告バッジ、sonner Toasterを配置。PointerSensorの5px距離閾値でクリックとドラッグを共存させた。

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | WarningBadge + DragOverlayCard新規コンポーネント | f51117c | WarningBadge (Unicode warning + CSS-only tooltip + aria-label), DragOverlayCard (scale 1.05 + shadow-drag + cursor:grabbing), 12 tests |
| 2 | Board/Lane/IssueCard DnD統合 + @dnd-kit install + Toaster | 908a33b | @dnd-kit/core@6.3.1 + sortable@10.0.0 install, Board DndContext/DragOverlay/Toaster, Lane useDroppable/SortableContext/laneDropTarget, IssueCard useSortable/WarningBadge/cardDragging/cardDragDisabled, global dnd-kit mocks |

## Architecture Notes

### New Components

- **WarningBadge** -- Unicode `\u26A0` icon with CSS-only `::after` tooltip via `data-tooltip` attribute. Displays other milestone names for multi-milestone cards. `aria-label` for accessibility.
- **DragOverlayCard** -- Presentational card clone (same 3-line layout as IssueCard) without DnD hooks. `scale(1.05)` + `--shadow-drag` + `cursor: grabbing` for solid drag visual.

### Modified Components

- **Board.tsx** -- DndContext wraps all lanes. PointerSensor with `distance: 5` activation constraint. `handleDragStart` sets `activeIssue` for DragOverlay. `handleDragEnd` calls `moveIssue(issueId, fromLaneId, toLaneId)`. `findLaneContaining` + `resolveOverLaneId` helpers resolve item/lane IDs. Toaster at `position="bottom-right"`, `duration={5000}`, `closeButton`.
- **Lane.tsx** -- `useDroppable({ id: laneId })` for drop target. `SortableContext` with `verticalListSortingStrategy` wraps card list. `isOver` drives `laneDropTarget` CSS class for background highlight.
- **IssueCard.tsx** -- `useSortable({ id: issue.id, disabled: isMultiMilestone })` for draggable items. Multi-milestone detection via prefix-matching milestones count. WarningBadge rendered conditionally. `cardDragging` (opacity: 0) hides original during drag. `cardDragDisabled` (cursor: not-allowed) for multi-milestone cards.

### Data Flow

```
User drags card between lanes
  |-> Board.handleDragStart -> setActiveIssue (DragOverlay shows card clone)
  |-> Lane.useDroppable.isOver -> laneDropTarget highlight
  |-> Board.handleDragEnd
       |-> findLaneContaining(data, active.id) -> fromLaneId
       |-> resolveOverLaneId(data, over.id) -> toLaneId
       |-> boardStore.moveIssue(issueId, fromLaneId, toLaneId)
            |-> applyMoveIssue (instant UI update)
            |-> updateIssueMilestone (async API, rollback on failure)
```

## Test Coverage

- **WarningBadge:** 5 tests (rendering, tooltip, aria-label, formatting)
- **DragOverlayCard:** 7 tests (rendering, no onClick)
- **IssueCard:** 19 tests (existing 12 + 7 new DnD tests)
- **Lane:** 9 tests (existing 7 + 1 new useDroppable test + prop updates)
- **Board:** 7 tests (existing 4 + 3 new laneId/DndContext tests)
- **Full suite:** 167 tests across 21 files, all green

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all DnD interactions are wired to the Plan 01 data layer (moveIssue, tauriBridge, Rust backend).

## Threat Flags

None -- no new network endpoints, auth paths, or trust boundary changes.

## Self-Check: PASSED

- All 15 key files verified present
- Commit f51117c verified in git log
- Commit 908a33b verified in git log
- 167 frontend tests passing across 21 files
