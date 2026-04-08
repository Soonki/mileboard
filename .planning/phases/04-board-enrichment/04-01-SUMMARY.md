---
phase: 04-board-enrichment
plan: 01
subsystem: ui
tags: [wcag, luminance, color-contrast, css-modules, tauri-plugin-opener, zustand, react]

# Dependency graph
requires:
  - phase: 03-core-kanban-board
    provides: StatusBadge, IssueCard, LaneHeader components
provides:
  - getContrastTextColor utility (WCAG 2.0 luminance-based contrast)
  - computeMemberBreakdown utility (member-by-member issue count aggregation)
  - MemberBreakdown component (sorted member breakdown list)
  - StatusBadge with dynamic color from Backlog API
  - IssueCard with click-to-open and ripple animation
affects: [04-02-PLAN (LaneHeader/Lane integration needs MemberBreakdown + computeMemberBreakdown)]

# Tech tracking
tech-stack:
  added: []
  patterns: [WCAG luminance contrast calculation, inline style override with CSS fallback, tauri-plugin-opener direct import]

key-files:
  created:
    - src/utils/colorContrast.ts
    - src/utils/colorContrast.test.ts
    - src/utils/memberBreakdown.ts
    - src/utils/memberBreakdown.test.ts
    - src/components/MemberBreakdown/MemberBreakdown.tsx
    - src/components/MemberBreakdown/MemberBreakdown.module.css
    - src/components/MemberBreakdown/MemberBreakdown.test.tsx
  modified:
    - tests/setup.ts
    - src/components/StatusBadge/StatusBadge.tsx
    - src/components/StatusBadge/StatusBadge.test.tsx
    - src/components/IssueCard/IssueCard.tsx
    - src/components/IssueCard/IssueCard.module.css
    - src/components/IssueCard/IssueCard.test.tsx

key-decisions:
  - "WCAG luminance threshold 0.179 used for contrast calculation -- #ed8077 and #4caf93 get black text (luminance > 0.179)"
  - "openUrl failure silently caught -- ripple animation provides visual click confirmation"
  - "hostUrl normalized by stripping https?:// prefix before URL construction (T-04-01 mitigation)"

patterns-established:
  - "Inline style override: dynamic API colors applied via React inline style, CSS Modules as fallback"
  - "Plugin mock pattern: @tauri-apps/plugin-opener mocked in tests/setup.ts alongside existing plugin mocks"
  - "Store mock pattern: vi.mock with selector function for Zustand store testing"

requirements-completed: [BOARD-04, UX-03]

# Metrics
duration: 5min
completed: 2026-04-08
---

# Phase 4 Plan 01: Board Enrichment - Utilities and Leaf Components Summary

**WCAG luminance contrast utility, StatusBadge dynamic color from Backlog API, MemberBreakdown component, IssueCard click-to-open with ripple animation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-08T03:46:31Z
- **Completed:** 2026-04-08T03:51:14Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments
- WCAG 2.0 luminance-based contrast calculation utility (getContrastTextColor) with 6 verified test cases
- Member-by-member issue count aggregation utility (computeMemberBreakdown) with descending sort and "未割当" last
- StatusBadge enhanced with optional color prop -- inline style with auto-contrast text, fallback to gray CSS
- MemberBreakdown new component with role="list", ellipsis truncation, accessible labels
- IssueCard click-to-open via tauri-plugin-opener with hostUrl protocol normalization
- IssueCard ripple animation (CSS :active::after) and hover highlight
- All 107 tests passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Utility functions + test infrastructure** - `dd36e88` (feat)
2. **Task 2: StatusBadge color support + MemberBreakdown component** - `86bf9a9` (feat)
3. **Task 3: IssueCard click-to-open + ripple + color passthrough** - `29830ab` (feat)

## Files Created/Modified
- `src/utils/colorContrast.ts` - WCAG 2.0 luminance calculation, getContrastTextColor export
- `src/utils/colorContrast.test.ts` - 6 test cases for contrast color selection
- `src/utils/memberBreakdown.ts` - computeMemberBreakdown + MemberCount interface
- `src/utils/memberBreakdown.test.ts` - 5 test cases including sort order and unassigned handling
- `tests/setup.ts` - Added @tauri-apps/plugin-opener mock (openUrl)
- `src/components/StatusBadge/StatusBadge.tsx` - Added color prop, inline style with getContrastTextColor
- `src/components/StatusBadge/StatusBadge.test.tsx` - 4 new tests (background color, contrast text, fallback, border)
- `src/components/MemberBreakdown/MemberBreakdown.tsx` - New component with sorted member list
- `src/components/MemberBreakdown/MemberBreakdown.module.css` - Compact list with ellipsis truncation
- `src/components/MemberBreakdown/MemberBreakdown.test.tsx` - 4 tests (rendering, accessibility, empty, CSS class)
- `src/components/IssueCard/IssueCard.tsx` - Added openUrl, useSettingsStore, onClick, role/aria, color passthrough
- `src/components/IssueCard/IssueCard.module.css` - cursor:pointer, hover, ripple @keyframes animation
- `src/components/IssueCard/IssueCard.test.tsx` - 6 new tests (click URL, normalization, error handling, accessibility, color)

## Decisions Made
- **WCAG luminance values corrected:** Plan specified #ed8077 and #4caf93 as white-text backgrounds, but WCAG 2.0 calculation yields luminance > 0.179 for both (0.348 and 0.343 respectively), requiring black text. Test expectations adjusted to match correct WCAG output.
- **openUrl error handling:** Silent catch with no toast -- ripple animation serves as click confirmation per D-05.
- **hostUrl normalization:** Protocol prefix stripped via regex `replace(/^https?:\/\//, '')` before URL construction, mitigating T-04-01 URL injection threat.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected WCAG luminance test expectations for #ed8077 and #4caf93**
- **Found during:** Task 1 (colorContrast utility)
- **Issue:** Plan behavior section specified getContrastTextColor("#ed8077") returns "#ffffff" and getContrastTextColor("#4caf93") returns "#ffffff", but actual WCAG 2.0 luminance calculation yields 0.348 and 0.343 respectively -- both above the 0.179 threshold, correctly requiring black text (#000000)
- **Fix:** Updated test expectations to match correct WCAG output: both return "#000000" (black text on these moderately-light backgrounds)
- **Files modified:** src/utils/colorContrast.test.ts
- **Verification:** All 6 colorContrast tests pass with correct WCAG-compliant output
- **Committed in:** dd36e88 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in plan specification)
**Impact on plan:** Test expectations corrected to match WCAG 2.0 standard. Implementation is correct. No scope creep.

## Issues Encountered
- Vitest 4.1.x does not support `-x` flag (used in plan's verify commands). Ran without flag -- all tests pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All leaf components and utilities ready for Plan 02 (LaneHeader/Lane integration)
- MemberBreakdown component ready for toggle-expandable display in LaneHeader
- computeMemberBreakdown utility ready for Lane-level aggregation
- StatusBadge color prop ready to receive BacklogStatus.color from any parent
- No blockers for Plan 02

## Self-Check: PASSED

- All 8 created files verified on disk
- All 3 task commits verified in git log (dd36e88, 86bf9a9, 29830ab)
- Full test suite: 18 files, 107 tests, 0 failures

---
*Phase: 04-board-enrichment*
*Completed: 2026-04-08*
