---
phase: 06-filtering
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/06-filtering/06-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report (フィルタリング)

**Fixed at:** 2026-04-10
**Source review:** `.planning/phases/06-filtering/06-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (HIGH + MEDIUM): 6
- Fixed: 6
- Skipped: 0

全てのHigh / Medium severity findingsを適用し、対応するテストを実行して検証しました。LOW severityの5件はscope外（`critical_warning`設定）のため対象外です。プロジェクト全体の257テストは全てpassしています。

## Fixed Issues

### HI-01: FilterChipでonRemoveが二重呼び出しされる可能性

**Files modified:** `src/components/FilterChip/FilterChip.tsx`, `src/components/FilterChip/FilterChip.test.tsx`
**Commit:** `ff9731f`
**Applied fix:** `handleKeyDown`内で`e.target !== e.currentTarget`の早期returnを追加し、内側buttonからバブリングしたEnter/Deleteイベントを無視するようにしました。加えて、button要素にフォーカスしてEnterを押した場合に`onRemove`が1回しか呼ばれないことを検証するregressionテストを追加しました（合計9テスト、全てpass）。

### ME-01: FilterBarで `Set.has(o.id as number)` の型アサーションは型安全ではない

**Files modified:** `src/components/FilterBar/FilterBar.tsx`
**Commit:** `cff3ac8`
**Applied fix:** statusOptions / categoryOptionsの`.filter()`に型ガード（`(o): o is FilterOption & { id: number } => o.id !== null && xxxIds.has(o.id)`）を使用し、`as number`アサーションを削除しました。`FilterOption`型をimportして再利用しています。FilterBar tests 14件全てpass。

### ME-02: FilterDropdownで空オプション時のArrowDownがNaNを発生させる

**Files modified:** `src/components/FilterDropdown/FilterDropdown.tsx`
**Commit:** `4541127`
**Applied fix:** `handlePanelKeyDown`のEscape処理直後に`if (options.length === 0) return;`を追加し、空options時のArrow/Enter/Spaceキーナビゲーションを無効化しました。これにより`(prev + 1) % 0 = NaN`や`-1`になる`focusedIndex`の不正状態を防止しています。FilterDropdown tests 27件全てpass。

### ME-03: FilterDropdownでEscape閉鎖後にtriggerへフォーカスが戻らない

**Files modified:** `src/components/FilterDropdown/FilterDropdown.tsx`
**Commit:** `ede9559`
**Applied fix:** `triggerRef: useRef<HTMLButtonElement>(null)`を追加、trigger button要素に`ref={triggerRef}`を設定、Escapeハンドラ内で`close()`後に`triggerRef.current?.focus()`を呼び出してフォーカス復元を行うようにしました。クリック外による閉鎖では意図的なフォーカス移動のためフォーカス復元は行いません（レビュー推奨通り）。WAI-ARIA Listbox Patternに準拠。FilterDropdown tests 27件全てpass。

### ME-04: FilterBarで `hasActiveFilters` selectorが関数参照を購読している

**Files modified:** `src/components/FilterBar/FilterBar.tsx`
**Commit:** `979d8fa`
**Applied fix:** `useFilterStore((s) => s.hasActiveFilters)` selectorを削除し、コンポーネント内で明示的に`const activeFilters = statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0;`として計算するように変更しました。`filterStore`の`hasActiveFilters()`メソッドは後方互換性のため残し、テストの修正も不要でした（filterStoreに直接呼ぶ既存テストは影響なし、FilterBar testsもSet値を設定してrerenderを駆動する設計のためそのままpass）。FilterBar tests 14件全てpass。

### ME-05: Board.test.tsxでfilterStoreのモックが不完全

**Files modified:** `src/components/Board/Board.test.tsx`
**Commit:** `914c1a6`
**Applied fix:** `mockFilterState`を可変にし、Lane mockを`issues`と`hiddenCount`を`data-*`属性で露出するよう拡張。D-09 compliance用の新しい`describe('filter integration (D-09 compliance)')`ブロックを追加し、3件のテスト：
- フィルタ非アクティブ時：`hiddenCount=0`, `issueCount=1`
- マッチしないstatusフィルタ：`hiddenCount=1`, `issueCount=0`
- マッチするstatusフィルタ：`hiddenCount=0`, `issueCount=1`

これによりフィルタ適用中のBoardビヘイビア（Laneに正しいフィルタ済みissuesとhiddenCountが渡されること）が保証されます。Board tests 10件全てpass（既存7 + 新規3）。

---

## Verification Summary

- **Modified files:** 5 (FilterChip.tsx, FilterChip.test.tsx, FilterBar.tsx, FilterDropdown.tsx, Board.test.tsx)
- **Total test count:** 257件全てpass（26 test files）
- **Pre-existing TypeScript errors:** 4件（`settingsStorage.ts` x2, `FilterBar.tsx` toggleStatus/toggleCategory prop signature x2）— 本修正とは無関係であることを`git stash`による検証で確認済み
- **Tier 2 syntax check:** `tsc --noEmit`を実行し、本修正は新しい型エラーを導入していないことを確認

## Skipped Issues

なし。scope内の全6件が修正済み。

---

_Fixed: 2026-04-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
