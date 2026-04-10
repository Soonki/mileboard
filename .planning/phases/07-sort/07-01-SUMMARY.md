---
phase: 07-sort
plan: 01
subsystem: sort-infrastructure
tags: [sort, types, zustand, persistence, pure-function, tdd]
dependency_graph:
  requires: []
  provides:
    - SortField/SortDirection/SortConfig types
    - applySortToIssues pure function
    - sortStorage persistence (loadSortConfig/saveSortConfig)
    - useSortStore Zustand store
  affects:
    - src/types/sort.ts
    - src/utils/sortUtils.ts
    - src/services/sortStorage.ts
    - src/stores/sortStore.ts
tech_stack:
  added: []
  patterns:
    - partition-null-sort (null values always at end)
    - fire-and-forget-persistence (saveSortConfig without await)
    - plugin-store-validation (T-07-01 mitigation)
key_files:
  created:
    - src/types/sort.ts
    - src/utils/sortUtils.ts
    - src/utils/sortUtils.test.ts
    - src/services/sortStorage.ts
    - src/services/sortStorage.test.ts
    - src/stores/sortStore.ts
    - src/stores/sortStore.test.ts
  modified: []
decisions:
  - "sortStorage uses existing settings.json with separate 'sort' key (not a new file)"
  - "applySortToIssues uses partition approach for null handling (split into withValue/withNull, sort separately, concatenate)"
  - "saveSortConfig is fire-and-forget in store actions (no await) for instant UI response"
metrics:
  duration: 3min
  completed: 2026-04-10
  tasks: 2
  files: 7
  tests_added: 25
---

# Phase 07 Plan 01: Sort Infrastructure Summary

Sort types, pure sort function with null-end placement and localeCompare('ja'), plugin-store persistence with T-07-01 validation, and Zustand sortStore with instant save.

## What Was Built

### Task 1: SortField/SortDirection/SortConfig types + applySortToIssues pure function

**Types (src/types/sort.ts):**
- `SortField = 'none' | 'assignee' | 'dueDate'` -- 3 sort modes
- `SortDirection = 'asc' | 'desc'`
- `SortConfig { field, direction }` -- persistence shape

**Pure function (src/utils/sortUtils.ts):**
- `applySortToIssues(issues: ReadonlyArray<BacklogIssue>, field, direction)` -- immutable sort
- `field='none'`: keyId ascending (default order)
- `field='assignee'`: `localeCompare('ja')` on `assignee.name`, null always at end
- `field='dueDate'`: ISO 8601 string comparison on `dueDate`, null always at end
- Null secondary sort: keyId ascending for stable ordering among null-value cards
- Input array never mutated (ReadonlyArray + spread copy)

**Tests: 12 cases** covering all field/direction combos, null placement, null secondary sort, immutability, empty array.

### Task 2: sortStorage persistence + useSortStore Zustand store

**Storage (src/services/sortStorage.ts):**
- `loadSortConfig()`: reads `settings.json` key `'sort'`, validates field/direction values
- `saveSortConfig()`: writes to `settings.json` key `'sort'`, calls `store.save()`
- T-07-01 mitigation: invalid field or direction values return null (fallback to defaults)

**Store (src/stores/sortStore.ts):**
- `useSortStore` with `field: 'none'`, `direction: 'asc'` defaults
- `setField(field)`: updates state + fire-and-forget `saveSortConfig`
- `toggleDirection()`: flips asc/desc + fire-and-forget `saveSortConfig`
- `loadFromStorage()`: async restore from plugin-store, no-op on null

**Tests: 13 cases** covering storage load/save/validation, store initial state, setField, toggleDirection, loadFromStorage with valid/null/invalid data.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 24f479e | feat(07-01): add SortField/SortConfig types and applySortToIssues pure function |
| 2 | a709b58 | feat(07-01): add sortStorage persistence and useSortStore Zustand store |

## Verification Results

- `npx vitest run src/utils/sortUtils.test.ts` -- 12/12 passed
- `npx vitest run src/services/sortStorage.test.ts src/stores/sortStore.test.ts` -- 13/13 passed
- `npx vitest run` (full suite) -- 282/282 passed (29 files), no regressions

## Deviations from Plan

None -- plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Component | Mitigation |
|-----------|-----------|------------|
| T-07-01 | sortStorage.ts loadSortConfig | Validates config.field against ['none','assignee','dueDate'] and config.direction against ['asc','desc']. Returns null on invalid data, causing sortStore to keep defaults. |

## Self-Check: PASSED

- All 7 source/test files: FOUND
- SUMMARY.md: FOUND
- Commit 24f479e (Task 1): FOUND
- Commit a709b58 (Task 2): FOUND
- Full test suite: 282/282 passed, 0 failures
