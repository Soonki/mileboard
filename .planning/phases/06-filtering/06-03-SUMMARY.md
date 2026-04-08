---
phase: 06-filtering
plan: 03
subsystem: board-filter-integration
tags: [filter, board, lane, useMemo, integration, dnd, css-layout]
dependency_graph:
  requires:
    - phase: 06-01
      provides: FilterState, applyFilters, filterStore
    - phase: 06-02
      provides: FilterBar, FilterDropdown, FilterChip
  provides:
    - FilterBar integrated in App layout
    - Board useMemo filtered view
    - Lane hiddenCount display
    - Flex-based layout for FilterBar accommodation
  affects: [src/App.tsx, src/components/Board/Board.tsx, src/components/Lane/Lane.tsx]
tech_stack:
  added: []
  patterns: [useMemo-derived-filtered-view, flex-layout-accommodation, filtered-empty-lane-state]
key_files:
  created:
    - src/App.module.css
  modified:
    - src/App.tsx
    - src/components/Board/Board.tsx
    - src/components/Board/Board.module.css
    - src/components/Board/Board.test.tsx
    - src/components/Lane/Lane.tsx
    - src/components/Lane/Lane.module.css
    - src/components/Lane/Lane.test.tsx
key_decisions:
  - "FilterBar placed between BoardHeader and Board in App.tsx with flex column layout wrapper"
  - "Board.tsx uses useMemo with filterStore selectors to compute filteredView without mutating boardStore.data (D-09)"
  - "DnD handlers remain on unfiltered data -- findLaneContaining and resolveOverLaneId use data not filteredView"
  - "Lane max-height changed from calc(100vh - 56px - 32px) to 100% for flex-based parent sizing"
  - "Board height changed from calc(100vh - 56px) to flex:1 min-height:0 to accommodate FilterBar"
requirements_completed: [FILT-04, FILT-05]
metrics:
  duration: 190s
  completed: "2026-04-08T16:44:44Z"
  tasks_completed: 1
  tasks_total: 2
  task2_status: pending_human_verification
  test_count: 222
  files_changed: 8
---

# Phase 6 Plan 03: Board統合 (FilterBar配置 + useMemoフィルタ + Lane hiddenCount) Summary

FilterBarをApp.tsxでBoardHeader直下に配置し、Board.tsxでuseMemoによるフィルタ済みビュー計算をLaneに渡す統合を完了。DnDハンドラはunfilteredデータ(boardStore.data)を継続使用しD-09を厳守。Laneにフィルタ非表示件数表示を追加。全222テストパス。

## Performance

- **Duration:** 3m 10s
- **Started:** 2026-04-08T16:41:54Z
- **Completed:** 2026-04-08T16:44:44Z
- **Tasks:** 1/2 (Task 2は人間検証待ち)
- **Files modified:** 8

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Board統合 (FilterBar配置 + useMemoフィルタ + Lane hiddenCount) | 72e4ce5 | src/App.tsx, src/App.module.css, src/components/Board/Board.tsx, src/components/Board/Board.module.css, src/components/Board/Board.test.tsx, src/components/Lane/Lane.tsx, src/components/Lane/Lane.module.css, src/components/Lane/Lane.test.tsx |

## Pending Tasks

| # | Task | Status | Details |
|---|------|--------|---------|
| 2 | フィルタリング機能の動作確認 | pending_human_verification | checkpoint:human-verify -- アプリ起動後の手動検証が必要 |

### Task 2 検証手順

1. `npm run tauri dev` でアプリを起動
2. ボードが表示されたら、FilterBarの3つのドロップダウン(ステータス/担当者/カテゴリ)が表示されていることを確認
3. ステータスドロップダウンをクリック -> チェックボックスリストが表示される -> 1つチェック -> 即座にフィルタが適用され、チップがドロップダウン右側に表示される
4. さらにもう1つチェック -> OR条件で両方のステータスのカードが表示される
5. 担当者ドロップダウンも同様に操作 -> AND条件でステータスと担当者の両方に一致するカードのみ表示
6. フィルタで全カードが非表示になったレーンに「N件がフィルタで非表示」と表示されることを確認
7. チップの x ボタンをクリック -> そのフィルタ条件のみ解除
8. 「すべてクリア」をクリック -> 全フィルタ解除、全カード表示
9. フィルタ適用中にカードをドラッグして別レーンに移動 -> 正常にDnD完了
10. ドロップダウン外をクリックして閉じることを確認
11. Tab/Enter/Escapeキーでドロップダウン操作できることを確認

## Key Artifacts

### src/App.tsx
- FilterBarをBoardHeaderの直下、Boardの直上にレンダリング
- div.appLayoutでflexbox column wrapperを追加

### src/App.module.css (new)
- `.appLayout`: height:100vh, flex column, overflow:hidden

### src/components/Board/Board.tsx
- `useFilterStore` selectors (statusIds, assigneeIds, categoryIds)
- `useMemo` -> `filteredView` 計算 (applyFilters使用)
- DnDハンドラ(handleDragStart/Over/End)は `data` (unfiltered)を継続使用
- Laneレンダリングで `filteredView.*.filteredIssues` と `hiddenCount` を渡す

### src/components/Board/Board.module.css
- `.board`: `height: calc(100vh - 56px)` -> `flex: 1; min-height: 0;`

### src/components/Lane/Lane.tsx
- LanePropsに `hiddenCount?: number` 追加
- issues.length === 0 && hiddenCount > 0 のとき「N件がフィルタで非表示」表示
- issues.length === 0 && hiddenCount === 0 のとき従来のEmptyLane表示

### src/components/Lane/Lane.module.css
- `.lane`: `max-height: calc(100vh - 56px - 32px)` -> `max-height: 100%`
- `.filteredEmpty`: font-size-sm, color-text-secondary, center aligned

## Test Coverage

- Board.test.tsx: 10テスト (既存7 + 新規3: hiddenCount=0確認, hiddenCount渡し確認, filteredViewレンダリング確認)
- Lane.test.tsx: 12テスト (既存9 + 新規3: filtered-empty表示, hiddenCount=0でEmptyLane, hiddenCount未指定でEmptyLane)
- 全テストスイート: 222テスト/24ファイル全パス

## Decisions Made

1. **Flex column layout**: App.tsxをReact Fragmentからdiv.appLayoutに変更し、BoardHeader + FilterBar + Boardをflexbox columnで配置
2. **useMemo filteredView**: filterStore selectors(statusIds, assigneeIds, categoryIds)を個別にselectし、useMemoの依存配列で正確な再計算
3. **DnDハンドラ不変**: handleDragStart/Over/Endは`data`(unfiltered)のみを参照。filteredViewは表示層のみ(D-09厳守)
4. **Lane max-height 100%**: 親コンテナがflex:1で高さを制御するため、Laneはmax-height:100%で親に追従

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data flows are wired end-to-end.

## Self-Check: PASSED

- All 8 created/modified files verified present on disk
- Task 1 commit (72e4ce5) verified in git log
- FilterBar import in App.tsx confirmed
- useFilterStore and applyFilters imports in Board.tsx confirmed
- useMemo filteredView computation in Board.tsx confirmed
- DnD handlers (handleDragStart/Over/End) use only `data` (unfiltered) - D-09 confirmed
- hiddenCount prop in Lane.tsx confirmed
- Filtered-empty text in Lane.tsx confirmed
- filteredEmpty CSS class with --font-size-sm and --color-text-secondary confirmed
- 222 tests across 24 files all passing
