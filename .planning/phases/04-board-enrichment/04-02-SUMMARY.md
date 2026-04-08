---
phase: 04-board-enrichment
plan: 02
subsystem: ui
tags: [lane-header, issue-count, member-breakdown, toggle, dnd-kit, css-animation, tdd]

# Dependency graph
requires:
  - phase: 04-board-enrichment
    plan: 01
    provides: MemberBreakdown component, computeMemberBreakdown utility
provides:
  - LaneHeader with issue count display and toggle-expandable member breakdown
  - Lane computing and passing stats to LaneHeader
affects: [05-PLAN (DnD phase will interact with Lane/LaneHeader)]

# Tech tracking
tech-stack:
  added: []
  patterns: [useState toggle with aria-expanded, CSS max-height transition for expand/collapse]

key-files:
  created:
    - src/components/LaneHeader/LaneHeader.test.tsx
  modified:
    - src/components/LaneHeader/LaneHeader.tsx
    - src/components/LaneHeader/LaneHeader.module.css
    - src/components/Lane/Lane.tsx
    - src/components/Lane/Lane.test.tsx

key-decisions:
  - "Local useState for toggle state -- no Zustand needed for ~7 lanes"
  - "Toggle button hidden when memberBreakdown is empty (no confusing UI for empty lanes)"

patterns-established:
  - "Toggle expand pattern: useState + aria-expanded + conditional rendering of child"
  - "Stats computation in parent (Lane) passed as props to presentational child (LaneHeader)"

requirements-completed: [BOARD-05, BOARD-06]

# Metrics
duration: 2min
completed: 2026-04-08
---

# Phase 4 Plan 02: Board Enrichment - LaneHeader Issue Count + Toggle + Member Breakdown Summary

**LaneHeader extended with issue count parentheses display, toggle button for member breakdown expand/collapse, and Lane wiring via computeMemberBreakdown**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-08T03:53:50Z
- **Completed:** 2026-04-08T03:55:53Z
- **Tasks:** 1 of 2 (Task 2 is human verification checkpoint -- pending)
- **Files modified:** 5

## Accomplishments
- LaneHeader displays issue count in parentheses after milestone name (e.g., "Sprint 2504 (6)")
- LaneHeader toggle button (Unicode triangles) shows/hides MemberBreakdown component
- Toggle button only visible when memberBreakdown has items (no confusing UI for empty lanes)
- Smooth CSS expand/collapse animation via max-height + opacity transition
- Full accessibility: aria-expanded, aria-label toggling between "内訳を開く" and "内訳を閉じる"
- Lane computes issueCount and memberBreakdown via computeMemberBreakdown and passes to LaneHeader
- 9 new LaneHeader tests + 3 new Lane integration tests, all passing
- Full test suite: 19 files, 119 tests, 0 failures, 0 regressions

## Task Commits

1. **Task 1: LaneHeader拡張 + Lane wiring (TDD)** - `43c668c` (feat)

## Task 2: Phase 4 ビジュアル検証
- **Status:** Pending -- requires human verification checkpoint
- **Action needed:** User must run `npm run tauri dev` and verify all Phase 4 features visually (16 checklist items)

## Files Created/Modified
- `src/components/LaneHeader/LaneHeader.tsx` - Added issueCount/memberBreakdown props, useState toggle, MemberBreakdown conditional render
- `src/components/LaneHeader/LaneHeader.module.css` - Added .titleRow, .toggleButton, .breakdownContainer, .expanded styles
- `src/components/LaneHeader/LaneHeader.test.tsx` - New: 9 test cases (count display, toggle visibility, expand/collapse, aria attributes, date range)
- `src/components/Lane/Lane.tsx` - Added computeMemberBreakdown import, issueCount/memberBreakdown computation and props passing
- `src/components/Lane/Lane.test.tsx` - Updated text matcher to regex, added 3 new tests (issue count, toggle with assignees, no toggle for empty)

## Decisions Made
- **Local useState for toggle:** No need to elevate toggle state to Zustand store -- approximately 7 lanes makes local state sufficient
- **Toggle button visibility:** Hidden when memberBreakdown is empty to avoid showing a non-functional button on empty lanes

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None -- all data flows are fully wired.

## Self-Check: PASSED

- All 5 files verified on disk
- Task commit verified in git log (43c668c)
- Full test suite: 19 files, 119 tests, 0 failures
