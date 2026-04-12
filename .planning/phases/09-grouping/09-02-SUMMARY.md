---
phase: 09-grouping
plan: 02
subsystem: ui
tags: [grouping, dnd-kit, group-card, sticky-stack, count-badge, board-integration, app-bootstrap]

# Dependency graph
dependency_graph:
  requires:
    - phase: 09-grouping
      provides: "Plan 00 — Group / GroupSlot / GroupId types, Phase 9 CSS tokens, sonner/useDraggable mocks"
    - phase: 09-grouping
      provides: "Plan 01 — useGroupStore (createGroup/addMember/loadFromStorage), groupUtils (applyGroupExpansion / rejectMultiMilestoneMember), reorderUtils ReorderEntry support"
  provides:
    - "GroupCard component (visual + DnD attached, click-to-expand stub)"
    - "IssueCard card-on-card drop target (useDroppable card-target-\${id})"
    - "Lane GroupSlot rendering (items prop replaces issues, mixed branch render)"
    - "Board.tsx filteredAndSortedView with applyGroupExpansion + Drag-Over Hierarchy"
    - "Board.tsx buildHandleDragEnd factory (test-friendly export)"
    - "App.tsx groupStore loadFromStorage on mount (D-11)"
    - "reorderStore.setLaneOrder widened to ReorderEntry[] (D-15)"
  affects: [09-03-bulk-move, 09-04-popover, 09-05-board-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSortable + useDroppable on the same element (setRefs wrapper — Pitfall 1)"
    - "buildHandleDragEnd factory function for test-friendly DnD branch logic"
    - "Drag-Over Hierarchy: card-target → group-target → lane (string prefix discrimination)"
    - "isGroupSlot type guard for Array<BacklogIssue | GroupSlot> narrowing"

key-files:
  created:
    - "src/components/GroupCard/GroupCard.tsx"
    - "src/components/GroupCard/GroupCard.module.css"
    - "src/components/GroupCard/GroupCard.test.tsx"
  modified:
    - "src/components/IssueCard/IssueCard.tsx"
    - "src/components/IssueCard/IssueCard.module.css"
    - "src/components/IssueCard/IssueCard.test.tsx"
    - "src/components/Lane/Lane.tsx"
    - "src/components/Lane/Lane.test.tsx"
    - "src/components/Board/Board.tsx"
    - "src/components/Board/Board.test.tsx"
    - "src/App.tsx"
    - "src/App.test.tsx"
    - "src/stores/reorderStore.ts (Rule 3 — setLaneOrder type widening for ReorderEntry support)"

key-decisions:
  - "Lane prop renamed issues→items (no backward compat). All call sites + tests updated atomically — eliminates a name that misleads about the union type"
  - "GroupCard.tsx duplicates IssueCard's representative-card structure with its own CSS classes rather than nesting <IssueCard>. Reason: GroupCard wraps useSortable+useDroppable on the OUTER element, and onClick is a button handler not a link handler. Sharing styles via CSS variables already gives us the visual parity"
  - "buildHandleDragEnd is exported as a top-level factory so tests can directly invoke the inner DragEndEvent handler. The DndContext mock in tests/setup.ts is a pass-through so events do not flow through it; without the factory, the new branches would be untestable from outside Board's component scope"
  - "rejectMultiMilestoneMember is called BEFORE useGroupStore.getState().createGroup so that no group is ever persisted with a multi-milestone member (D-16, T-09-02-02 mitigation)"
  - "replaceWithGroupSlot keeps the position of whichever id appears first in the existing orderMap, preserving user-perceived ordering after grouping"
  - "Self-drop guard (sourceId === targetId) sits before findIssueInBoardData to short-circuit on no-op drops"
  - "App.tsx adds the group loadFromStorage useEffect AFTER the existing 3 (settings/sort/reorder), in declaration order, to keep the boot sequence stable"

requirements-completed: [GRP-01, GRP-02, GRP-05]

# Metrics
duration: ~14min
completed: 2026-04-12
---

# Phase 09 Plan 02: Grouping UI Integration Summary

**One-liner:** Plan 01 で作った groupStore / applyGroupExpansion / rejectMultiMilestoneMember を UI に接続。GroupCard コンポーネント新規作成（付箋スタック2層 + 件数バッジ + DnD 装着）、IssueCard に useDroppable で card-on-card drop ring、Lane の prop を items に rename して GroupSlot 分岐 render、Board の filteredAndSortedView に applyGroupExpansion を組み込んで handleDragEnd に Drag-Over Hierarchy（card-target → group-target → lane）の 3 分岐を追加、App.tsx で groupStore.loadFromStorage を起動時に呼ぶ。buildHandleDragEnd ファクトリ export でテスト可能性を確保し、34 件の新規テスト + 既存 412 件すべて green を維持。

## Performance

- **Duration:** ~14 min
- **Started:** 2026-04-12T13:45Z
- **Completed:** 2026-04-12T13:59Z
- **Tasks:** 2 (各 TDD RED + GREEN サイクル)
- **Files created:** 3 (GroupCard.tsx + .module.css + .test.tsx)
- **Files modified:** 9 (IssueCard×3, Lane×2, Board×2, App×2 + reorderStore for type widening)
- **Tests added:** 34 (GroupCard 15 + IssueCard 5 + Lane 5 + Board 8 + App 1)
- **Full suite after:** 446/446 green（412 → 446、+34）
- **Tsc errors:** 0

## Accomplishments

- **GroupCard 視覚契約完成 (D-06, D-07, D-14):** 2 枚の影レイヤー（real DOM sibling, translate 3px/6px）+ 代表カード（IssueCard と同等の 3 行構造）+ 件数バッジ（N 形式 / V/T pill 形式の自動切り替え、`badgeText.includes('/')` で判定）が `src/components/GroupCard/GroupCard.tsx` + `GroupCard.module.css` で実装。Phase 9 CSS トークン (`--stack-bottom-clearance`, `--badge-size`, `--color-stack-layer`, `--color-card-drop-ring` 等) をすべて消費。
- **GroupCard DnD 装着完了 (D-01, D-02, D-08):** `useSortable({ id: slot.group.id })` + `useDroppable({ id: 'group-target-${slot.group.id}', disabled: sortable.isDragging })` を両方装着。`setRefs` ラッパーで両方の `setNodeRef` を呼ぶ Pitfall 1 対応。`onClick` は `sortable.isDragging` 中なら早期 return（drag click 抑制 — D-08）し、`e.stopPropagation()` 後に `onExpand(slot.group.id)` を発火。Plan 04 まで onExpand は Board の `setExpandedGroupId` stub。
- **GroupCard ARIA 完成 (UI-SPEC §ARIA & Accessibility Contract):** `role="button"`, `aria-label="グループ (N件)、クリックで展開"`, `aria-haspopup="true"`, `aria-expanded={isExpanded}`. 影レイヤー / countBadge は `aria-hidden="true"` で支援技術から隠す。
- **IssueCard card-on-card drop target (D-01, D-02):** `useDroppable({ id: 'card-target-${issue.id}', disabled: isDragging || isMultiMilestone })` を追加装着。`setRefs` で sortable + droppable の両方を結線。`isOver=true` 時 `.dropTargetCard` クラスで outline ring を表示。multi-milestone カードは `disabled: true` で drop 不可能（D-16, Q4）。既存の `onClick` Backlog URL 開く挙動は完全保持（D-10 リグレッション保護テスト追加）。
- **Lane prop 構造を items に統一 (Phase 9 D-06):** `issues: BacklogIssue[]` → `items: Array<BacklogIssue | GroupSlot>` にリネーム。後方互換は採用せず Board.tsx も同時更新。`isGroupSlot` 型ガードで分岐 render（GroupCard / IssueCard）。`issueCount` は単体カード数 + グループ可視メンバー数の集計、`memberBreakdown` は flatMap で可視メンバーから計算（D-14 と整合）。新 props `onExpand?` / `expandedGroupId?` は Plan 04 で本格利用（現在は Board から no-op stub 渡し）。
- **Board filteredAndSortedView の applyGroupExpansion 組込:** 既存のフィルタ→ソート→applyCustomOrder パイプラインの末尾に `applyGroupExpansion(ordered, mwi.issues, groupMap, laneId, orderMap[laneId] ?? [])` を追加。返り値の `items` をレーンに渡し、`hiddenGroupCount` を従来の filter 件数に加算（D-14 統合）。unassigned レーンも同パイプライン。`useGroupStore((s) => s.groups)` を購読し、グループ操作後の view 再計算をトリガー。
- **Board handleDragEnd 3 新分岐 + buildHandleDragEnd ファクトリ:** Drag-Over Hierarchy に従った分岐を実装。
  1. `card-target-${id}`: source/target を取得 → `rejectMultiMilestoneMember` ガード → `useGroupStore.getState().createGroup([source, target], targetLaneId, allIssues)` → `replaceWithGroupSlot(currentOrder, source, target, newGroupId)` で orderMap 更新
  2. `group-target-${id}`: `useGroupStore.getState().addMember(targetGroupId, sourceId, allIssues)` → orderMap から source を filter で除去（GroupSlot は既にスロットがある）
  3. lane id（`unassigned` / `milestone-*`）: 既存の cross-lane move / intra-lane reorder ロジックを維持
  
  `buildHandleDragEnd` を top-level export として切り出し、テストから直接 `DragEndEvent` を合成して呼べるようにした。理由: `tests/setup.ts` の DndContext モックは pass-through で実際の drag event を発火しないため、Board 内部 closure として handleDragEnd を持っていると新分岐がテスト不能になる。
- **App.tsx 起動時 groupStore.loadFromStorage (D-11):** 既存 3 つの `useEffect` (settings / sort / reorder) の後に 4 つ目を追加。`useGroupStore((s) => s.loadFromStorage)` で hook 取得 → `useEffect(() => { loadGroupsFromStorage(); }, [loadGroupsFromStorage])`. plugin-store からの復元が起動毎に走る。
- **reorderStore.setLaneOrder シグネチャ拡張 (Rule 3 — blocking):** 元の `(laneId: string, issueIds: number[])` を `(laneId: string, entries: ReorderEntry[])` に拡張。Phase 9 では Board.tsx が `replaceWithGroupSlot` の出力（`(number | group:${string})[]`）を渡すため number[] では型が合わない。既存 reorderStore.test.ts の number[] テストは `ReorderEntry[]` のサブセットなので破壊変更なし（15/15 green 維持）。
- **テスト網羅:** GroupCard 15 件 / IssueCard 新規 5 件 / Lane 新規 5 件 + 既存 12 件 rename / Board 新規 8 件 + 既存 13 件 / App 新規 1 件。`buildHandleDragEnd` factory test 内では `findIssueInBoardData` モックを実装ベースに差し替えて 5 つの分岐すべてを直接検証。

## Task Commits

| # | Phase | Type | Hash | Subject |
|---|-------|------|------|---------|
| 1 | Task 1 (RED) | test | `9110217` | add failing tests for GroupCard component |
| 2 | Task 1 (GREEN) | feat | `bf630a0` | implement GroupCard component |
| 3 | Task 2 stage 1a (RED) | test | `e5423ab` | add IssueCard card-on-card drop target tests |
| 4 | Task 2 stage 1b (RED) | test | `bcff070` | rename Lane prop issues→items + add GroupSlot tests |
| 5 | Task 2 stages 1a+1b (GREEN) | feat | `4943743` | IssueCard useDroppable + Lane GroupSlot rendering |
| 6 | Task 2 stage 2 (RED) | test | `c1b7394` | add Board grouping tests + widen setLaneOrder type |
| 7 | Task 2 stage 2 (GREEN) | feat | `fd0a500` | Board grouping integration + App groupStore loadFromStorage |

## Files Created / Modified

### Created
- `src/components/GroupCard/GroupCard.tsx` (102 行) — slot prop / setRefs / handleClick / 3 行構造の代表カード描画
- `src/components/GroupCard/GroupCard.module.css` (130 行) — 影レイヤー 2 枚 + countBadge / countBadgePill / dropTargetGroup
- `src/components/GroupCard/GroupCard.test.tsx` (269 行) — 15 件、視覚 + DnD + ARIA + click-vs-drag

### Modified
- `src/components/IssueCard/IssueCard.tsx` — useDroppable 追加, setRefs ラッパー, dropTargetCard クラス
- `src/components/IssueCard/IssueCard.module.css` — `.dropTargetCard` outline 追加
- `src/components/IssueCard/IssueCard.test.tsx` — useDroppable mock + 5 新規テスト
- `src/components/Lane/Lane.tsx` — issues→items rename, GroupCard 分岐, isGroupSlot 型ガード, sortableIds 混在配列
- `src/components/Lane/Lane.test.tsx` — 全テスト rename, 5 新規 GroupSlot describe
- `src/components/Board/Board.tsx` — useGroupStore 購読, applyGroupExpansion パイプライン, buildHandleDragEnd factory export, replaceWithGroupSlot helper, isGroupSlotItem 型ガード
- `src/components/Board/Board.test.tsx` — groupStore + groupUtils mock 追加, Lane mock items 化, 8 新規 Phase 9 describe
- `src/App.tsx` — useGroupStore.loadFromStorage useEffect 追加
- `src/App.test.tsx` — 1 新規テスト (groupStore loadFromStorage 呼出)
- `src/stores/reorderStore.ts` — setLaneOrder シグネチャ拡張 (number[] → ReorderEntry[])

## Decisions Made

- **Lane prop rename without backward-compat**: 同時に Board.tsx も更新するので transitional な `issues?: ...; items?: ...` を持つ余地はなし。1 commit で全コード/テストを切り替えることで意味論的に綺麗な状態を維持。
- **buildHandleDragEnd を top-level export**: tests/setup.ts の `DndContext` は children pass-through なので、`onDragEnd` prop を経由した event 配信は走らない。closure 内 handleDragEnd を直接テストする方法がなかったため、factory パターンでテスト可能性を担保。Plan の Action 7 で「Option A 推奨」と明記されていたためそれに従った。
- **`setLaneOrder` 型拡張 (Rule 3)**: Plan 02 の本文には reorderStore 変更は明示されていなかったが、`useReorderStore.getState().setLaneOrder(targetLaneId, newOrder)` の `newOrder` が `ReorderEntry[]` 型（number と group:${id} の混在）で、既存シグネチャ `number[]` では tsc が通らない。Rule 3（blocking issue auto-fix）として型を `ReorderEntry[]` に拡張。既存 reorderStore.test.ts は number[] を渡しているが `ReorderEntry[]` のサブセットなので壊れない（15/15 green）。
- **`createGroup` mock 戻り値型**: vitest の `vi.fn(() => null)` は戻り型を `null` に narrow するため、`mockReturnValue('group:created-id')` で string を返そうとすると tsc が `not assignable to null` で失敗する。`vi.fn<CreateGroupFn>(() => null)` のように関数型エイリアスで明示することで解決。
- **`replaceWithGroupSlot` の挙動**: id1/id2 の最初に出現した位置を保持して group エントリに置換。これによりユーザーが手動で並べ替えた順序を破壊しない。両 id が orderMap に無い場合（未編集レーン）は末尾に追加。
- **`handleDragStart` で string id を skip**: グループドラッグ開始時の `event.active.id` は `group:${string}` なので、`findIssueInBoardData` に渡せない。`if (typeof rawId === 'string') return` で早期 return。グループドラッグ自体は将来 Plan 04 の bulk-move 対応で本格化するが、Plan 02 時点では DragOverlay にグループ用カードを出さなくてよい（lane 移動は発生しない）。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] reorderStore.setLaneOrder type widening**
- **Found during:** Task 2 stage 2（Board.tsx GREEN 実装中、tsc 実行で error TS2345）
- **Issue:** Board.tsx の `useReorderStore.getState().setLaneOrder(targetLaneId, newOrder)` で `newOrder: ReorderEntry[]` を渡すが、既存シグネチャ `(laneId: string, issueIds: number[])` では型が合わない。Plan 本文には reorderStore 変更が記載されていない。
- **Fix:** `setLaneOrder` の引数型を `ReorderEntry[]` に拡張、param 名を `issueIds` → `entries` に rename。number[] は `ReorderEntry[]` のサブセットなので既存テストは無修正で全 green。
- **Files modified:** `src/stores/reorderStore.ts`
- **Verification:** `npx vitest run src/stores/reorderStore.test.ts` 15/15 PASS, `npx tsc --noEmit` clean
- **Committed in:** `c1b7394` (Task 2 stage 2 RED commit と同梱、reorderStore 1 ファイル混入)

**2. [Rule 3 - Type narrowing] `isGroupSlotItem` 型ガード追加**
- **Found during:** Task 2 stage 2 GREEN（tsc で `'kind' in item` が `BacklogIssue | GroupSlot` を狭められない）
- **Issue:** `'kind' in item && item.kind === 'group' ? item.group.id : item.id` をインラインで書くと、TypeScript の narrowing が unsafe（BacklogIssue 側で `id` プロパティアクセスが `Property 'id' does not exist on type 'BacklogIssue | GroupSlot'` に化ける）。
- **Fix:** `function isGroupSlotItem(item): item is GroupSlot { return 'kind' in item && item.kind === 'group'; }` を Board.tsx 内に追加し、3 箇所のインラインを置き換え。Lane.tsx は同等の `isGroupSlot` を既に定義済み（同じパターン）。
- **Files modified:** `src/components/Board/Board.tsx`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** `fd0a500` (Task 2 GREEN と同梱)

**3. [Rule 3 - Test mock fix] `findIssueInBoardData` mock を buildHandleDragEnd テスト用に差し替え**
- **Found during:** Task 2 stage 2 GREEN 後の vitest 実行（2/21 fail）
- **Issue:** Board.test.tsx の `findIssueInBoardData` グローバルモックは `() => null` 固定。`buildHandleDragEnd` describe 内の `card-target-*` / `group-target-*` テストは Board.tsx が `findIssueInBoardData(data, sourceIssueId)` を呼んで null を受け取り、早期 return してしまうため `createGroup` / `addMember` が呼ばれない。
- **Fix:** `buildHandleDragEnd` describe の `beforeEach` で `vi.mocked(findIssueInBoardData).mockImplementation(...)` を実装ベースに差し替え。data の milestones / unassignedIssues から id 一致で探す簡易版。
- **Files modified:** `src/components/Board/Board.test.tsx`
- **Verification:** `npx vitest run src/components/Board/Board.test.tsx` 21/21 PASS
- **Committed in:** `fd0a500` (Task 2 GREEN と同梱)

### Authorized scope additions

- **`src/stores/reorderStore.ts` modification:** Plan 02 の `<files>` リストには reorderStore は含まれていなかったが、setLaneOrder の widening は Plan 02 の Board 実装が依存する型契約のため必須。Plan 03（並行実行中）の bulkMove も将来同じ型を必要とする可能性が高いため、ここで先に拡張しておくことで Wave 2 merge コンフリクト面積を縮小。

---

**Total deviations:** 3 auto-fixed (1 type widening, 1 type narrowing helper, 1 test mock implementation)
**Impact on plan:** すべて plan-internal の正しさを満たすための副作用。新しいスコープの追加なし。

## Authentication Gates

None — 全タスクがローカル編集とテスト実行のみ。

## Known Stubs

- **`onExpand` is a no-op stub from Board.tsx until Plan 04** — Board.tsx の `(groupId) => setExpandedGroupId(groupId)` は state を更新するだけで、Plan 04 の `GroupPopover` 実装まで visual feedback は出ない。GroupCard はこのコールバックを `aria-expanded` の切替に使うが、Plan 02 の段階では `expandedGroupId` 状態は他の UI 要素から参照されない（孤立 state）。これは plan の `<behavior>` で明示的に指定された設計（`Plan 02 では Popover コンポーネント実装は行わない`）。

## Threat Flags

なし — Plan 02 の `<threat_model>` で記載済みの T-09-02-01〜04 はすべて mitigation 実装済み:

| Threat ID | Mitigation Status | Notes |
|-----------|-------------------|-------|
| T-09-02-01 (Tampering — Drag-Over Hierarchy bypass) | mitigated | `handleDragEnd` は string prefix で `card-target-` → `group-target-` → lane の順に判定。未知形式は noop（silent fail）。Drag-Over Hierarchy 順は plan に明示の通り |
| T-09-02-02 (Data integrity — multi-milestone group bypass) | mitigated | `rejectMultiMilestoneMember` を `createGroup` 呼出の前に必須通過。source/target 両方をチェック。`addMember` 経路にも同ガードあり。`createGroup` 戻り値が `null` なら orderMap 更新もスキップ |
| T-09-02-03 (DoS — shadow layer DOM bloat) | accepted | real DOM sibling 方式。各 GroupCard あたり追加 2 要素のみ。レーン内 group 数 ~10 で実質 20 要素、無視できる |
| T-09-02-04 (Information disclosure — aria-label) | accepted | issue summary と group 件数のみ。ユーザーの自データのみ |

新規の trust boundary や攻撃面は導入していない。

## Next Steps

- **Plan 03 (bulk-move):** GroupCard の useSortable は装着済みなので、グループ自体のドラッグでレーン間 bulk 移動を実装。`moveGroup(groupId, toLaneId)` + 各メンバーの Backlog API PATCH を順次実行する toast 進捗 UI を作る
- **Plan 04 (GroupPopover):** GroupCard の `onExpand` を Board 経由で GroupPopover 表示に差し替え。Plan 00 の Portal PoC（`GroupPopover.dnd.test.tsx`）の契約に従って実装
- **Plan 05 (board statefull integration):** `boardStore.fetchBoard` から `pruneStaleMembers` を呼ぶ統合、`expandedGroupId` の状態管理を Popover 開閉と接続

## Self-Check: PASSED

**File existence:**
- src/components/GroupCard/GroupCard.tsx — FOUND
- src/components/GroupCard/GroupCard.module.css — FOUND
- src/components/GroupCard/GroupCard.test.tsx — FOUND
- src/components/IssueCard/IssueCard.tsx — FOUND (modified)
- src/components/IssueCard/IssueCard.module.css — FOUND (modified)
- src/components/IssueCard/IssueCard.test.tsx — FOUND (modified)
- src/components/Lane/Lane.tsx — FOUND (modified)
- src/components/Lane/Lane.test.tsx — FOUND (modified)
- src/components/Board/Board.tsx — FOUND (modified)
- src/components/Board/Board.test.tsx — FOUND (modified)
- src/App.tsx — FOUND (modified)
- src/App.test.tsx — FOUND (modified)
- src/stores/reorderStore.ts — FOUND (modified)

**Commit existence (7/7) on `worktree-agent-aaf14f3f` branch:**
- 9110217 (test 09-02 RED GroupCard) — FOUND
- bf630a0 (feat 09-02 GREEN GroupCard) — FOUND
- e5423ab (test 09-02 RED IssueCard drop) — FOUND
- bcff070 (test 09-02 RED Lane items rename) — FOUND
- 4943743 (feat 09-02 GREEN IssueCard + Lane) — FOUND
- c1b7394 (test 09-02 RED Board + reorderStore widen) — FOUND
- fd0a500 (feat 09-02 GREEN Board + App) — FOUND

**Acceptance criteria (grep checks):**
- `grep useSortable src/components/GroupCard/GroupCard.tsx` — PASS
- `grep useDroppable src/components/GroupCard/GroupCard.tsx` — PASS
- `grep "group-target-" src/components/GroupCard/GroupCard.tsx` — PASS
- `grep aria-haspopup src/components/GroupCard/GroupCard.tsx` — PASS
- `grep onExpand src/components/GroupCard/GroupCard.tsx` — PASS
- `grep "translate(3px, 3px)" src/components/GroupCard/GroupCard.module.css` — PASS
- `grep "translate(6px, 6px)" src/components/GroupCard/GroupCard.module.css` — PASS
- `grep dropTargetGroup src/components/GroupCard/GroupCard.module.css` — PASS
- `grep countBadge src/components/GroupCard/GroupCard.module.css` — PASS
- `grep useDroppable src/components/IssueCard/IssueCard.tsx` — PASS
- `grep "card-target-" src/components/IssueCard/IssueCard.tsx` — PASS
- `grep setRefs src/components/IssueCard/IssueCard.tsx` — PASS
- `grep dropTargetCard src/components/IssueCard/IssueCard.tsx` — PASS
- `grep ".dropTargetCard" src/components/IssueCard/IssueCard.module.css` — PASS
- `grep "items:" src/components/Lane/Lane.tsx` — PASS
- `grep GroupCard src/components/Lane/Lane.tsx` — PASS
- `grep applyGroupExpansion src/components/Board/Board.tsx` — PASS
- `grep useGroupStore src/components/Board/Board.tsx` — PASS
- `grep "card-target-" src/components/Board/Board.tsx` — PASS
- `grep "group-target-" src/components/Board/Board.tsx` — PASS
- `grep rejectMultiMilestoneMember src/components/Board/Board.tsx` — PASS
- `grep "export function buildHandleDragEnd" src/components/Board/Board.tsx` — PASS
- `grep useGroupStore src/App.tsx` — PASS
- `grep loadGroupsFromStorage src/App.tsx` — PASS

**Test verification:**
- GroupCard.test.tsx — 15 tests (≥10 required) PASS
- IssueCard.test.tsx — 27 tests (22 existing + 5 new ≥4 required) PASS
- Lane.test.tsx — 17 tests (12 existing + 5 new ≥5 required) PASS
- Board.test.tsx — 21 tests (13 existing + 8 new ≥5 required) PASS
- App.test.tsx — 6 tests (5 existing + 1 new) PASS
- Full suite: **38 test files / 446 tests PASS** (412 → 446, +34)
- `npx tsc --noEmit` — clean (0 errors)
- Checkpoint A (`vitest run src/components/IssueCard src/components/Lane src/components/GroupCard`) — 68/68 PASS
- Checkpoint B (`vitest run src/components/Board src/App.test.tsx`) — 34/34 PASS

---

*Phase: 09-grouping*
*Plan: 02*
*Completed: 2026-04-12*
