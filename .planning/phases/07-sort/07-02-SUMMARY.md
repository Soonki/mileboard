---
phase: 07-sort
plan: 02
subsystem: sort-ui-integration
tags: [sort, dropdown, filterbar, board-pipeline, app-init, tdd]
dependency_graph:
  requires:
    - SortField/SortDirection/SortConfig types (07-01)
    - applySortToIssues pure function (07-01)
    - useSortStore Zustand store (07-01)
    - sortStorage persistence (07-01)
  provides:
    - SortDropdown single-select listbox component
    - FilterBar sort UI integration (separator + dropdown + direction toggle)
    - Board.tsx filter-then-sort pipeline
    - App.tsx sortStore startup restore
  affects:
    - src/components/SortDropdown/SortDropdown.tsx
    - src/components/SortDropdown/SortDropdown.module.css
    - src/components/SortDropdown/SortDropdown.test.tsx
    - src/components/FilterBar/FilterBar.tsx
    - src/components/FilterBar/FilterBar.module.css
    - src/components/FilterBar/FilterBar.test.tsx
    - src/components/Board/Board.tsx
    - src/components/Board/Board.test.tsx
    - src/App.tsx
tech_stack:
  added: []
  patterns:
    - single-select-listbox (role="listbox" without aria-multiselectable)
    - filter-then-sort-pipeline (useMemo chains applyFilters then applySortToIssues)
    - keyboard-navigable-dropdown (ArrowDown/Up, Enter, Escape)
key_files:
  created:
    - src/components/SortDropdown/SortDropdown.tsx
    - src/components/SortDropdown/SortDropdown.module.css
    - src/components/SortDropdown/SortDropdown.test.tsx
  modified:
    - src/components/FilterBar/FilterBar.tsx
    - src/components/FilterBar/FilterBar.module.css
    - src/components/FilterBar/FilterBar.test.tsx
    - src/components/Board/Board.tsx
    - src/components/Board/Board.test.tsx
    - src/App.tsx
decisions:
  - "SortDropdown is a standalone component (not extending FilterDropdown) to avoid coupling single-select vs multi-select behavior"
  - "filteredView renamed to filteredAndSortedView for clarity in Board.tsx"
  - "Sort applied after filter in useMemo pipeline (filter narrows, then sort orders)"
metrics:
  duration: 5min
  completed: 2026-04-11
  tasks: 2
  files: 9
  tests_added: 20
---

# Phase 07 Plan 02: Sort UI Integration Summary

SortDropdown single-select listbox with 3 options, FilterBar separator/toggle integration, Board.tsx filter-then-sort useMemo pipeline, and App.tsx sortStore startup restore.

## What Was Built

### Task 1: SortDropdown component + FilterBar sort UI integration

**SortDropdown (src/components/SortDropdown/SortDropdown.tsx):**
- Single-select listbox with 3 options: none/assignee/dueDate
- SORT_OPTIONS constant array with Japanese labels
- Trigger button with aria-haspopup="listbox", aria-expanded, aria-label="ソート基準"
- Panel with role="listbox" (no aria-multiselectable -- Pitfall 6)
- Each option with role="option", aria-selected, click-to-select-and-close
- Keyboard navigation: ArrowDown/Up, Enter/Space to select, Escape to close
- Click-outside handler with document.addEventListener('mousedown')
- Active/inactive styling based on field !== 'none'

**SortDropdown CSS (src/components/SortDropdown/SortDropdown.module.css):**
- Matches FilterDropdown styling with min-width: 110px trigger
- Panel with absolute positioning, z-index: 20, shadow-dropdown
- optionSelected and optionFocused classes for highlight

**FilterBar integration (src/components/FilterBar/FilterBar.tsx):**
- Added separator (role="separator") between filter dropdowns and sort controls
- SortDropdown + direction toggle button in .sortControls container
- Direction toggle: U+2191 (asc) / U+2193 (desc) with appropriate aria-labels
- Updated toolbar aria-label to "フィルタとソート"

**FilterBar CSS (src/components/FilterBar/FilterBar.module.css):**
- .separator: 1px vertical line, 20px height
- .sortControls: flex container with gap
- .directionToggle: 32x32px button with border and hover states
- .directionActive / .directionInactive for visual feedback

**Tests: 19 new tests** (13 SortDropdown + 6 FilterBar sort integration)

### Task 2: Board.tsx sort pipeline + App.tsx sortStore init

**Board.tsx (src/components/Board/Board.tsx):**
- Added useSortStore selectors for field and direction
- Renamed filteredView to filteredAndSortedView
- Extended useMemo: applyFilters then applySortToIssues for both unassigned and milestone lanes
- Added sortField, sortDirection to useMemo dependency array
- DnD handlers (handleDragStart/Over/End) continue to reference `data` only (D-09/D-10 compliance)

**App.tsx (src/App.tsx):**
- Added useSortStore import and loadSortFromStorage selector
- Independent useEffect for sortStore.loadFromStorage on startup

**Board.test.tsx:**
- Added sortStore mock (field='none', direction='asc')
- Added sortUtils mock (applySortToIssues passthrough)
- Added sort integration test verifying applySortToIssues is called

**Tests: 1 new test** (Board sort integration)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | f3f87b4 | feat(07-02): add SortDropdown component and integrate sort UI into FilterBar |
| 2 | 1d77614 | feat(07-02): add sort pipeline to Board.tsx useMemo and sortStore init to App.tsx |

## Verification Results

- `npx vitest run src/components/SortDropdown/SortDropdown.test.tsx` -- 13/13 passed
- `npx vitest run src/components/FilterBar/FilterBar.test.tsx` -- 20/20 passed
- `npx vitest run src/components/Board/Board.test.tsx` -- 11/11 passed
- `npx vitest run` (full suite) -- 302/302 passed (30 files), no regressions

## Deviations from Plan

None -- plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Component | Mitigation |
|-----------|-----------|------------|
| T-07-03 | SortDropdown user input | SORT_OPTIONS array contains only fixed SortField values ('none'/'assignee'/'dueDate'). No free-text input. TypeScript SortField type enforces string literal constraint. |
| T-07-04 | Board.tsx useMemo | Sort is client-side only. boardStore.data remains unchanged. DnD handlers reference unfiltered data exclusively. No API calls for sort. |

## Pending: Task 3 (checkpoint:human-verify)

Task 3 requires manual E2E verification with `npm run tauri dev`. The 13-step verification checklist includes:
1. Visual layout of separator + SortDropdown + direction toggle
2. Dropdown opens with 3 options
3. Assignee sort ordering across all lanes
4. Direction toggle (asc/desc) behavior
5. Due date sort ordering
6. "ソートなし" returns to default order
7. Sort + filter combined behavior
8. DnD during sort
9. App restart persistence
10. Keyboard accessibility (Tab/Enter/Escape)

## Self-Check: PASSED

- All 9 source/test files: FOUND
- SUMMARY.md: FOUND
- Commit f3f87b4 (Task 1): FOUND
- Commit 1d77614 (Task 2): FOUND
- Full test suite: 302/302 passed, 0 failures
