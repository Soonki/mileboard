---
phase: 08-reorder
plan: 01
subsystem: state
tags: [zustand, dnd-kit, plugin-store, reorder, tdd]

# Dependency graph
requires: []
provides:
  - "ReorderMap type for lane-to-issueIds mapping"
  - "applyCustomOrder pure function for custom sort with keyId fallback"
  - "reorderStorage service for plugin-store persistence"
  - "useReorderStore Zustand store with reorder, setLaneOrder, removeLaneOrder, updateOnCrossLaneMove"
affects: [08-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ReorderMap Record<string, number[]> for per-lane ordering", "fire-and-forget save pattern with .catch(() => {})"]

key-files:
  created:
    - src/types/reorder.ts
    - src/utils/reorderUtils.ts
    - src/utils/reorderUtils.test.ts
    - src/services/reorderStorage.ts
    - src/services/reorderStorage.test.ts
    - src/stores/reorderStore.ts
    - src/stores/reorderStore.test.ts
  modified: []

key-decisions:
  - "arrayMove import from @dnd-kit/sortable for index-based reorder within lane"
  - "reorder() takes issueId (activeId/overId) not array indices to avoid Pitfall 2 (filter-time index mismatch)"
  - "saveReorderConfig is fire-and-forget (.catch(() => {})) matching sortStore pattern"

patterns-established:
  - "ReorderMap: Record<string, number[]> mapping laneId to ordered issueId array"
  - "applyCustomOrder: savedIds order first, new issues appended in keyId ascending"
  - "Store tests mock @dnd-kit/sortable with real arrayMove implementation"

requirements-completed: [REORD-01, REORD-02]

# Metrics
duration: 3min
completed: 2026-04-11
---

# Phase 08 Plan 01: Reorder Infrastructure Summary

**ReorderMap型、applyCustomOrder純粋関数、plugin-store永続化サービス、useReorderStore Zustandストアを TDD で構築**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T15:56:46Z
- **Completed:** 2026-04-10T16:00:00Z
- **Tasks:** 2
- **Files created:** 7

## Accomplishments
- ReorderMap型定義とapplyCustomOrder純粋関数をTDDで実装（8テスト: カスタム順序適用、keyIdフォールバック D-02、新規課題末尾追加 D-04、削除済み除外、immutability）
- reorderStorage永続化サービスをsortStorageパターンに準拠して実装（T-08-01バリデーション付き）
- useReorderStore Zustandストアを実装（reorder, setLaneOrder, removeLaneOrder, updateOnCrossLaneMove D-07/D-08, loadFromStorage）
- 全329テスト（既存+新規27件）がリグレッションなしでパス

## Task Commits

Each task was committed atomically:

1. **Task 1: ReorderMap型定義 + applyCustomOrder純粋関数** - `ca1480e` (test)
2. **Task 2: reorderStorage永続化サービス + useReorderStore Zustandストア** - `a228c9f` (feat)

## Files Created/Modified
- `src/types/reorder.ts` - ReorderMap型定義 (Record<string, number[]>)
- `src/utils/reorderUtils.ts` - applyCustomOrder純粋関数 (カスタム順序適用 + keyIdフォールバック)
- `src/utils/reorderUtils.test.ts` - applyCustomOrderの8テストケース
- `src/services/reorderStorage.ts` - plugin-store永続化 (load/save with T-08-01 validation)
- `src/services/reorderStorage.test.ts` - reorderStorageの6テストケース
- `src/stores/reorderStore.ts` - Zustand store (reorder, setLaneOrder, removeLaneOrder, updateOnCrossLaneMove, loadFromStorage)
- `src/stores/reorderStore.test.ts` - reorderStoreの13テストケース

## Decisions Made
- reorder()の引数をインデックスではなくissueId (activeId/overId)にしてPitfall 2（フィルタ時のインデックスずれ）を回避
- saveReorderConfigはfire-and-forget (.catch(() => {})) でsortStoreと同パターン
- reorderStore.test.tsで@dnd-kit/sortableのarrayMoveを実装付きモックとして提供

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] saveReorderConfigモックの戻り値修正**
- **Found during:** Task 2 (reorderStore TDD GREEN phase)
- **Issue:** vi.mock内のsaveReorderConfigがundefinedを返し、.catch()チェーンが TypeError で失敗
- **Fix:** mockResolvedValue(undefined)を追加してPromiseを返すように修正
- **Files modified:** src/stores/reorderStore.test.ts
- **Verification:** 全19テストパス
- **Committed in:** a228c9f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test mock)
**Impact on plan:** テストモック修正のみ。実装コードへの影響なし。

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (Board.tsx / IssueCard.tsx UI統合) に必要な全インフラストラクチャが完成
- useReorderStore が reorder, setLaneOrder, removeLaneOrder, updateOnCrossLaneMove, loadFromStorage を提供
- applyCustomOrder が Board.tsx のレーン内課題ソートに利用可能

## Self-Check: PASSED

- All 8 files verified present on disk
- Commit ca1480e verified in git log
- Commit a228c9f verified in git log
- Full test suite: 329/329 passed (0 failures)

---
*Phase: 08-reorder*
*Plan: 01*
*Completed: 2026-04-11*
