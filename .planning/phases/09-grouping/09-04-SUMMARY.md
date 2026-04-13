---
plan: 09-04
phase: 09-grouping
status: complete
completed: 2026-04-13
total_tasks: 3
total_commits: 8
human_verification: approved (実機 QA 完了)
---

# Plan 04 SUMMARY: GroupPopover 最終統合 + UX refinement

## 概要

Phase 9 の最終統合プラン。Plan 01-03 で構築した基盤 (groupStore / groupUtils / GroupCard / bulkMoveGroup) を UI 層で連結し、GroupPopover による展開 UI、bulk move の wire up、popover member drag-out を実装した。実機 QA を通じて発覚した複数の UX 問題に対する fix も Plan 04 のスコープに含めた。

## Tasks 実行記録

### Task 1: GroupPopover コンポーネント実装 (TDD RED → GREEN)

- `9035e51` — test(09-04): add failing tests for GroupPopover component (RED)
- `54c3e2d` — feat(09-04): implement GroupPopover component (GREEN)

**実装内容**:
- React Portal で `document.body` にマウント (z-index 競合回避)
- 配置アルゴリズム: 右側 default → 右端オーバーで左 flip → 下端オーバーで上 clamp
- 外クリック / Escape / × ボタンで閉じる
- メンバーカードクリックで Backlog URL を開く (D-09)
- 「グループを解除する」ボタンで dissolveGroup
- 18 件のテストで全分岐をカバー

### Task 2: Board 統合 (TDD RED → GREEN)

- `3b8d30f` — test(09-04): add failing tests for Plan 04 board integration (RED)
- `a470ed7` — feat(09-04): Board GroupPopover integration + bulk move + Q3 prune (GREEN)

**実装内容**:
- `expandedGroupId` + `anchorRect` state、GroupPopover conditional render
- `handleGroupExpand` (rect 受け取り) / `handlePopoverClose` / `handleDissolveGroup` ハンドラ
- `findGroupSlotInView` ヘルパー (filteredAndSortedView から GroupSlot を発見)
- **buildHandleDragEnd に 2 新分岐**:
  - **group→lane bulk move**: `active.id` が `group:${string}` → `bulkMoveGroup(groupId, fromLane, toLane)` 発火、self-drop は早期 return
  - **popover member drag-out**: `active.id` が group メンバーで lane に drop → `removeMember` + `moveIssue` + `updateOnCrossLaneMove`
- **fetchBoard Q3 integration**: `pruneStaleMembers` で削除済み issue を掃除、`groupStore.setGroups` で一括反映
- GroupCard.onExpand シグネチャを `(groupId, rect: DOMRect) => void` に拡張、`groupRootRef` で `getBoundingClientRect()` を取得

### Task 3: 実機 QA (human-verify) — 承認済み

ユーザーが Windows 実機で `npm run tauri dev` を起動し、15 項目の手動 QA を実施。
複数の UX 問題が発覚し、それらの fix を Task 3 内で追加実装した (下記 UX Refinement)。
全項目を再確認の上、ユーザーから "approve" の signal を受領。

## UX Refinement (Plan 04 拡張)

実機 QA で発覚した問題に対する追加 fix。すべて Plan 04 の commit として記録。

### Fix 1: グループ化が発火しなかった問題

- `2806e17` — fix(09-04): prioritise card/group drop targets in collision detection

**原因**: `kanbanCollisionDetection` が pointerWithin の結果をそのまま返していたため、card-on-card drop で `[milestone-1, card-target-100]` のように lane が先頭に並び、@dnd-kit が lane を選んでしまった。

**修正**: `prioritiseCardOrGroupCollisions` 純粋関数を導入、card-target / group-target を lane-level より優先。+6 回帰テスト。

### Fix 2: ポップオーバーメンバーの両所属問題

- `c808443` — fix(09-04): prevent double-assignment when dropping popover member on card/group

**原因**: `buildHandleDragEnd` の Branch 1 / Branch 2 で source が既存グループのメンバーかチェックしていなかったため、Popover からドラッグして別カード/別グループに drop すると元グループから除去されず両所属になった。

**修正**:
- Branch 1: source が既存グループメンバーなら `createGroup` 前に `removeMember`、source/target 同一グループは intra-group reorder 未サポートとして no-op
- Branch 2: source が既存グループメンバーなら `addMember` 前に `removeMember`、self-group drop は no-op
- +4 回帰テスト

### Fix 3: ポインタゾーン判定 (中央=group / 上下=sort)

- `f8fe26f` — feat(09-04): distinguish sort vs grouping by pointer zone on cards

**初期アプローチ**: card 全体が card-target だと sort と group が衝突するため、ポインタ y 座標で「中央 50% = group / 上下 25% = sort」を判定する pure 関数 `filterCardTargetsByPointerZone` を導入。+8 テスト。

**結果**: ピクセル単位でターゲットを狙う必要があり、ユーザビリティに難。後続の mode toggle 実装で廃止。

### Fix 4: 背景カードのシフトを停止

- `ad06f41` — fix(09-04): stop background cards from shifting during drag

**原因**: `verticalListSortingStrategy` がドラッグ中にカーソル下のカードを退避させる視覚効果を発火、グループ化ターゲットを正確に指定できない。

**修正**: カスタム `noShiftSortingStrategy = () => null` に置き換え。ただし sort モードでは drop preview UX が必要なため、後続の mode toggle 実装で動的切替に変更。

### Fix 5: 操作モードの導入 (sort / group)

- `893fb2d` — feat(09-04): introduce sort/group operation modes with toggle UI

**原因**: pointer zone 判定 (Fix 3) や no-shift (Fix 4) では sort vs group の根本的な衝突が解消できなかった。ユーザーの提案により、明示的な操作モードを導入することに決定。

**実装**:
- **新規 Store**: `src/stores/uiModeStore.ts` (Zustand, 永続化なし、default=`'sort'`)
- **新規 UI**: `src/components/ModeToggle/ModeToggle.tsx` (BoardHeader 内のセグメント型トグル、role=radiogroup)
- **キーボードショートカット**: Ctrl+Shift+M (Cmd+Shift+M on Mac)
- **collision detection ファクトリ化**: `buildKanbanCollisionDetection(mode)`
  - sort モード: `filterOutCardOrGroupCollisions` で card/group target を完全除外
  - group モード: `prioritiseCardOrGroupCollisions` で優先 (pointer-zone filter 廃止)
- **sortingStrategy 動的切替**: Lane に `uiMode` prop 追加
  - sort モード: `verticalListSortingStrategy` (背景カードシフト復活、drop preview)
  - group モード: `noShiftSortingStrategy` (背景カード固定、ターゲット指定容易)
- **buildHandleDragEnd の mode 対応**: group モード時 intra-lane reorder 分岐をスキップ
- **両モードで動作**: cross-lane move、group bulk move、popover member drag-out
- +21 テスト (uiModeStore 7、ModeToggle 8、Board 14)

### モード別の挙動表

| 操作 | sort モード | group モード |
|------|------------|-------------|
| カード→カード drop | レーン内並び替え | グループ作成 |
| カード→GroupCard drop | lane fall through | メンバー追加 |
| カード→別レーン drop | クロスレーン移動 | クロスレーン移動 |
| GroupCard→別レーン drop | bulk move | bulk move |
| Popover メンバー→レーン drop | drag-out | drag-out |
| Popover メンバー→別カード drop | drag-out → 元グループ remove → 新規グループ | 同左 |
| 背景カードシフト | あり | なし |

## ファイル変更サマリー

### 新規作成
- `src/components/GroupPopover/GroupPopover.tsx`
- `src/components/GroupPopover/GroupPopover.module.css`
- `src/components/GroupPopover/GroupPopover.test.tsx`
- `src/stores/uiModeStore.ts`
- `src/stores/uiModeStore.test.ts`
- `src/components/ModeToggle/ModeToggle.tsx`
- `src/components/ModeToggle/ModeToggle.module.css`
- `src/components/ModeToggle/ModeToggle.test.tsx`

### 変更
- `src/components/Board/Board.tsx` — handleDragEnd 拡張、Popover 統合、collision detection ファクトリ化、mode-based 切替、Ctrl+Shift+M ショートカット
- `src/components/Board/Board.test.tsx` — 多数の追加テスト
- `src/components/Lane/Lane.tsx` — uiMode prop 追加、sortingStrategy 動的切替
- `src/components/BoardHeader/BoardHeader.tsx` — ModeToggle 配置
- `src/components/GroupCard/GroupCard.tsx` — onExpand シグネチャ拡張 (DOMRect)
- `src/stores/boardStore.ts` — fetchBoard で pruneStaleMembers + setGroups
- `src/stores/boardStore.test.ts` — fetchBoard prune integration テスト
- `src/stores/groupStore.ts` — setGroups internal API 追加
- `src/stores/groupStore.test.ts` — setGroups テスト

## テスト集計

- 全テスト: **544/544 pass** (40 → 42 ファイル)
- Plan 04 直接の追加: 約 67 件
  - GroupPopover: 18 件
  - Board: 14 件 (Plan 04 統合 + mode 対応 + collision 各種)
  - groupStore.setGroups: 2 件
  - boardStore.fetchBoard prune: 3 件
  - uiModeStore: 7 件
  - ModeToggle: 8 件
  - filterOutCardOrGroupCollisions: 5 件
  - buildKanbanCollisionDetection: 4 件
  - card-target/group-target double-assignment fix: 4 件
  - prioritiseCardOrGroupCollisions: 6 件
- tsc: clean (0 errors)

## 要件カバレッジ

- **GRP-01**: 既存グループへのメンバー追加 ✓ (Plan 02 + 04 統合)
- **GRP-02**: 付箋スタック表現 ✓ (GroupCard module.css の影レイヤー)
- **GRP-03**: グループ展開 Popover ✓ (Plan 04 GroupPopover)
- **GRP-04**: グループ一括移動 ✓ (Plan 03 ロジック + Plan 04 wire up)
- **GRP-05**: 複数グループ共存 ✓
- **GRP-06**: グループ解除 (auto-dissolve / dissolve button / drag-out) ✓
- **GRP-07**: 部分失敗ロールバック ✓ (Plan 03)

## Decisions 遵守

- D-01 / D-02 (drag-over hierarchy): mode toggle で完全に分離
- D-05a (dissolve button): GroupPopover で実装
- D-05b (drag-out): popover member drag-out branch で実装
- D-06 (付箋スタック): GroupCard CSS で実装
- D-08 (popover): GroupPopover で実装
- D-09 (member click → URL): GroupPopover 内 IssueCard で実装
- D-11 (永続化): groupStore + groupStorage で実装
- D-13 (ソートモード中グループ維持): groupUtils.applyGroupExpansion で対応
- D-14 (フィルタ時 N/M バッジ): GroupCard で実装
- D-16 (multi-milestone guard): rejectMultiMilestoneMember で全 branch でガード
- D-17 (3並列): bulkMoveUtils.runWithConcurrency
- D-18 (toast.error): Plan 03 から継続
- D-19 (per-failure rollback): Plan 03 から継続
- D-20 (楽観的 UI): Plan 03 から継続

## 既知のスタブ / 制限

- Plan 04 は Phase 9 の最終統合のため、スタブなし
- `intra-group reorder` (グループ内のメンバー並び替え) は Phase 9 未サポート
- 同一グループの別メンバー card-target に drop すると no-op

## デプロイメモ

- Tauri Windows 実機での QA を実施、複数の UX fix を経て承認
- Mac/Linux 環境での実機検証は未実施 (キーボードショートカットの Cmd vs Ctrl 動作含む)
