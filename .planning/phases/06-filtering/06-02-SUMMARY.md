---
phase: 06-filtering
plan: 02
subsystem: filter-ui
tags: [filter, react, dropdown, checkbox, chip, css-modules, accessibility, aria]
dependency_graph:
  requires:
    - phase: 06-01
      provides: FilterState, FilterOption, filterStore, filterUtils, phase6-css-tokens
  provides:
    - FilterDropdown (reusable checkbox dropdown component)
    - FilterChip (removable filter tag component)
    - FilterBar (integrated filter container with 3 dropdowns + chips + clear)
  affects: [src/components/Board/Board.tsx, src/components/Lane/Lane.tsx]
tech_stack:
  added: []
  patterns: [click-outside-detection, keyboard-navigation-listbox, check-and-stay-dropdown, useMemo-dynamic-options]
key_files:
  created:
    - src/components/FilterDropdown/FilterDropdown.tsx
    - src/components/FilterDropdown/FilterDropdown.module.css
    - src/components/FilterDropdown/FilterDropdown.test.tsx
    - src/components/FilterChip/FilterChip.tsx
    - src/components/FilterChip/FilterChip.module.css
    - src/components/FilterChip/FilterChip.test.tsx
    - src/components/FilterBar/FilterBar.tsx
    - src/components/FilterBar/FilterBar.module.css
    - src/components/FilterBar/FilterBar.test.tsx
  modified: []
key_decisions:
  - "Auto-focus panel on open for keyboard navigation accessibility"
  - "ArrowUp from initial state goes to last option (circular navigation)"
  - "FilterBar uses individual Zustand selectors per field instead of full store destructuring"
  - "allIssues derived from both unassignedIssues and milestones.flatMap with useMemo"
patterns_established:
  - "Click-outside detection: useEffect + document.addEventListener('mousedown') + containerRef.contains"
  - "Keyboard listbox navigation: ArrowDown/Up circular, Enter/Space toggle, Escape close"
  - "Check-and-stay dropdown: onToggle fires immediately, panel stays open for additional selections (D-04)"
requirements_completed: [FILT-01, FILT-02, FILT-03, FILT-04]
metrics:
  duration: 390s
  completed: "2026-04-08T16:35:58Z"
  tasks_completed: 2
  tasks_total: 2
  test_count: 49
  files_changed: 9
---

# Phase 6 Plan 02: FilterDropdown, FilterChip, FilterBar UIコンポーネント Summary

**チェックボックスドロップダウン+チップ+一括クリアの3コンポーネントでフィルタUI構築、キーボードアクセシビリティとARIA属性完備、49テスト全パス**

## Performance

- **Duration:** 6m 30s
- **Started:** 2026-04-08T16:29:28Z
- **Completed:** 2026-04-08T16:35:58Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- FilterDropdown: チェックボックス付きリストのドロップダウン、チェック即反映(D-04)、外クリック/Escape閉じ、ArrowUp/Down循環キーボードナビゲーション
- FilterChip: ラベル+Unicodeバツ印removeボタン、Enter/Deleteキー対応、aria-label付き
- FilterBar: 3軸ドロップダウン(ステータス/担当者/カテゴリ)+フィルタチップ+すべてクリアボタン、BoardData動的選択肢抽出、sticky配置(top:56px)

## Task Commits

Each task was committed atomically:

1. **Task 1: FilterDropdown + FilterChip** - `d7bb46e` (feat)
2. **Task 2: FilterBar** - `2851e81` (feat)

_TDD: RED -> GREEN for both tasks_

## Files Created/Modified

- `src/components/FilterDropdown/FilterDropdown.tsx` - 再利用可能チェックボックスドロップダウン(ARIA listbox)
- `src/components/FilterDropdown/FilterDropdown.module.css` - ドロップダウンスタイル(z-index:20, shadow-dropdown)
- `src/components/FilterDropdown/FilterDropdown.test.tsx` - 27テスト(開閉、チェック、キーボード、ARIA)
- `src/components/FilterChip/FilterChip.tsx` - フィルタチップ(label + remove)
- `src/components/FilterChip/FilterChip.module.css` - チップスタイル(chip-bg/text/remove色)
- `src/components/FilterChip/FilterChip.test.tsx` - 8テスト(描画、クリック、キーボード)
- `src/components/FilterBar/FilterBar.tsx` - 3ドロップダウン+チップ+クリア統合コンテナ
- `src/components/FilterBar/FilterBar.module.css` - sticky配置(top:56px, z-index:9)
- `src/components/FilterBar/FilterBar.test.tsx` - 14テスト(描画、選択肢抽出、チップ、クリア)

## Decisions Made

1. **パネル開時の自動フォーカス**: useEffectでlistRef.current.focus()を呼び出し、キーボードイベントがパネルで確実にキャッチされるようにした
2. **ArrowUp初期状態からの循環**: focusedIndex <= 0の場合はoptions.length - 1に移動(modulo演算では-1からの正しい循環にならないため)
3. **Zustand個別セレクタ**: FilterBarでuseFilterStore((s) => s.field)パターンを使用し、不要な再レンダリングを防止
4. **allIssues計算**: unassignedIssuesとmilestones.flatMapを結合し、useMemoでキャッシュ

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ArrowUp循環ナビゲーションの修正**
- **Found during:** Task 1 (FilterDropdown実装)
- **Issue:** `(prev - 1 + options.length) % options.length`ではfocusedIndex=-1からのArrowUpで最後のインデックスに到達しない
- **Fix:** `prev <= 0 ? options.length - 1 : prev - 1`に変更
- **Files modified:** src/components/FilterDropdown/FilterDropdown.tsx
- **Verification:** テストパス
- **Committed in:** d7bb46e

**2. [Rule 1 - Bug] パネルへの自動フォーカス追加**
- **Found during:** Task 1 (FilterDropdown実装)
- **Issue:** パネル開時にフォーカスが移動しないためキーボードイベント(Escape, ArrowDown等)がキャッチされない
- **Fix:** `useEffect(() => { if (isOpen && listRef.current) listRef.current.focus(); }, [isOpen])`を追加
- **Files modified:** src/components/FilterDropdown/FilterDropdown.tsx
- **Verification:** Escape/ArrowDown/ArrowUp/Enter/Spaceテスト全パス
- **Committed in:** d7bb46e

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for keyboard accessibility to work correctly. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FilterDropdown/FilterChip/FilterBarコンポーネントが完成し、Plan 03でBoard.tsxへの統合準備完了
- Board.tsxでFilterBarをBoardHeader下にレンダリングし、フィルタ済みissuesをLaneに渡す接続が次のステップ
- Lane.tsxへのhiddenCount prop追加とフィルタ空レーン表示も Plan 03 の範囲

## Self-Check: PASSED

- All 9 created files verified present on disk
- Both task commits (d7bb46e, 2851e81) verified in git log
- 49 tests pass across 3 test files

---
*Phase: 06-filtering*
*Completed: 2026-04-08*
