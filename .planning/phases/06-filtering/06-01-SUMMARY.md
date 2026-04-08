---
phase: 06-filtering
plan: 01
subsystem: filter-foundation
tags: [filter, zustand, pure-functions, css-tokens, types]
dependency_graph:
  requires: []
  provides: [FilterState, FilterOption, applyFilters, extractStatusOptions, extractAssigneeOptions, extractCategoryOptions, useFilterStore, phase6-css-tokens]
  affects: [src/types/filter.ts, src/utils/filterUtils.ts, src/stores/filterStore.ts, src/global.css]
tech_stack:
  added: []
  patterns: [zustand-set-immutability, pure-filter-functions, and-or-filter-logic]
key_files:
  created:
    - src/types/filter.ts
    - src/utils/filterUtils.ts
    - src/utils/filterUtils.test.ts
    - src/stores/filterStore.ts
    - src/stores/filterStore.test.ts
  modified:
    - src/global.css
decisions:
  - "FilterState uses Set<number> / Set<number|null> for O(1) lookup and Zustand reactivity"
  - "All toggle/remove/clear operations create new Set instances to trigger Zustand re-renders (Pitfall 1)"
  - "extractAssigneeOptions places unassigned at end with sortOrder MAX_SAFE_INTEGER"
  - "extractCategoryOptions treats null displayOrder as 0 with name-based tiebreaker"
metrics:
  duration: 194s
  completed: "2026-04-08T16:24:43Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 34
  files_changed: 6
---

# Phase 6 Plan 01: FilterState型 + フィルタ関数 + filterStore + CSSトークン Summary

FilterState/FilterOption型定義、3軸AND/OR条件フィルタ(applyFilters)と動的選択肢抽出(extract*Options)の純粋関数、Zustand filterStoreの全toggle/remove/clearAll操作、Phase 6用CSSカスタムプロパティの基盤構築。

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | FilterState型定義 + applyFilters/extractOptions純粋関数 | b0427cd | src/types/filter.ts, src/utils/filterUtils.ts, src/utils/filterUtils.test.ts |
| 2 | filterStore (Zustand) + Phase 6 CSSカスタムプロパティ | 5854be1 | src/stores/filterStore.ts, src/stores/filterStore.test.ts, src/global.css |

## Key Artifacts

### src/types/filter.ts
- `FilterState`: statusIds(Set<number>), assigneeIds(Set<number|null>), categoryIds(Set<number>)
- `FilterOption`: id(number|null), label(string), sortOrder(number)

### src/utils/filterUtils.ts
- `applyFilters(issues, filters)`: 空Setの軸スキップ、status/assignee/categoryのAND結合、軸内OR結合
- `extractStatusOptions(issues)`: displayOrder昇順でユニークステータス抽出
- `extractAssigneeOptions(issues)`: name昇順、末尾に「未割り当て」(null)
- `extractCategoryOptions(issues)`: displayOrder昇順(null=0)、同順ならname昇順

### src/stores/filterStore.ts
- `useFilterStore`: toggleStatus/toggleAssignee/toggleCategory, removeFilter(axis,id), clearAll, hasActiveFilters
- 全操作で `new Set(prev)` による不変性保持(Pitfall 1回避)

### src/global.css
- Phase 6ブロック: --color-chip-bg, --color-chip-text, --color-chip-remove, --color-chip-remove-hover, --color-checkbox-checked, --color-dropdown-hover, --shadow-dropdown

## Test Coverage

- filterUtils: 16テスト(applyFilters 8, extractStatusOptions 2, extractAssigneeOptions 3, extractCategoryOptions 3)
- filterStore: 18テスト(toggleStatus 3, toggleAssignee 3, toggleCategory 2, removeFilter 4, clearAll 1, hasActiveFilters 4, initial state 1)
- 合計: 34テスト全パス

## Decisions Made

1. **Set<number|null>でassigneeIds管理**: null値を直接Setに入れることで「未割り当て」フィルタをシンプルに表現
2. **new Set()による不変性保証**: Zustand v5のObject.is比較でSet変更を確実に検知(Pitfall 1)
3. **extractAssigneeOptionsのソート**: nameのlocaleCompare('ja')で日本語名を正しくソート、未割り当ては常に末尾
4. **extractCategoryOptionsのdisplayOrder null処理**: null を 0 として扱い、同一displayOrderならlabelで二次ソート

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
