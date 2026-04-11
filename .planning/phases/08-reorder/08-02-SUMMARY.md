---
phase: 08-reorder
plan: 02
subsystem: ui
tags: [react, dnd-kit, zustand, reorder, board, issuecard]

# Dependency graph
requires: [08-01]
provides:
  - "Board.tsx intra-lane reorder via handleDragEnd same-lane branch"
  - "Board.tsx filteredAndSortedView with applyCustomOrder pipeline"
  - "IssueCard.tsx sort-mode drag disable"
  - "App.tsx reorderStore startup restoration"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["sortField === 'none' gate for custom order application", "getLaneIssues helper for initial orderMap seeding"]

key-files:
  created: []
  modified:
    - src/App.tsx
    - src/components/Board/Board.tsx
    - src/components/Board/Board.test.tsx
    - src/components/IssueCard/IssueCard.tsx
    - src/components/IssueCard/IssueCard.test.tsx

key-decisions:
  - "handleDragEnd seeds orderMap from current view on first reorder (lazy initialization)"
  - "applyCustomOrder only applied when sortField === 'none' (D-01 sort/custom order mutual exclusion)"
  - "IssueCard disabled condition: isMultiMilestone || isSortActive"

patterns-established:
  - "getLaneIssues extracts issue list from filteredAndSortedView for orderMap seeding"
  - "updateOnCrossLaneMove called alongside moveIssue for cross-lane DnD"

requirements-completed: [REORD-01, REORD-02, REORD-03]

# Metrics
duration: 4min
completed: 2026-04-11
---

# Phase 08 Plan 02: Board/IssueCard/App Integration Summary

**Board.tsx handleDragEnd + filteredAndSortedView カスタム順序パイプライン、IssueCard.tsx ソートモード排他、App.tsx 起動時復元**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-11
- **Completed:** 2026-04-11
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 5

## Accomplishments
- App.tsx に useReorderStore.loadFromStorage() の起動時復元を追加（REORD-02）
- Board.tsx handleDragEnd にレーン内並べ替えロジックを追加（fromLaneId === toLaneId 分岐、REORD-01）
- Board.tsx filteredAndSortedView に applyCustomOrder パイプラインを追加（sortField === 'none' 時のみ適用、D-01）
- Board.tsx handleDragEnd にレーン間移動時の updateOnCrossLaneMove 呼び出しを追加（D-07, D-08）
- IssueCard.tsx に isSortActive 条件を追加し、ソートモード中のレーン内ドラッグを無効化（REORD-03, D-05）
- 全333テスト（新規4件追加）がリグレッションなしでパス
- 人間による E2E 動作確認で approved

## Task Commits

1. **Task 1: App.tsx reorderStore 起動時復元** — `499e247`
2. **Task 2: Board.tsx + IssueCard.tsx 統合** — `07b4860`
3. **Task 3: E2E 手動動作確認** — approved by user

## Files Modified
- `src/App.tsx` — useReorderStore import + loadReorderFromStorage useEffect
- `src/components/Board/Board.tsx` — useReorderStore/applyCustomOrder import, filteredAndSortedView拡張, handleDragEnd同一レーン分岐, getLaneIssuesヘルパー
- `src/components/Board/Board.test.tsx` — reorderStore/reorderUtilsモック追加, applyCustomOrderテスト追加
- `src/components/IssueCard/IssueCard.tsx` — useSortStore import, isSortActive条件, disabled拡張
- `src/components/IssueCard/IssueCard.test.tsx` — sortStoreモック追加, ソート有効時disabled テスト追加

## Decisions Made
- handleDragEnd で初回並べ替え時に現在の表示順から orderMap を遅延初期化（getLaneIssues → setLaneOrder）
- applyCustomOrder は sortField === 'none' の場合のみ適用（ソートモードとカスタム順序の排他制御）
- IssueCard の disabled 条件を `isMultiMilestone || isSortActive` に拡張

## Deviations from Plan
None

## Human Verification
- **Status:** approved
- **Verified items:** REORD-01 (intra-lane reorder), REORD-02 (persistence), REORD-03 (sort exclusion), D-01 (custom order restoration), D-05 (cursor change), D-06 (cross-lane DnD in sort mode), D-07/D-08 (cross-lane order update)

---
*Phase: 08-reorder*
*Plan: 02*
*Completed: 2026-04-11*
