---
status: issues_found
phase: 09-grouping
depth: quick
files_reviewed: 42
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
created: 2026-04-13T11:00:00Z
---

# Phase 9 Code Review (Quick Depth)

## サマリ

- **セキュリティリスク**: ゼロ (ハードコードされたシークレット, XSS, 安全でない `eval`/`innerHTML` なし)
- **Zustand immutability**: `boardStore.applyMoveIssue` の `filter`-with-side-effect を除いて全 store で守られている
- **React Hook ルール違反 / メモリリーク**: 検出なし。`GroupPopover` は `useEffect` cleanup を正しく実装し、専用テスト `removes document event listeners on unmount` が存在
- **TypeScript `any`**: production code には無し (テストの `as unknown as` キャストはモック用途で許容)
- **主な改善余地**:
  1. `applyMoveIssue` の副作用 filter 解消
  2. `Board.tsx` の `handleDragEnd` / `getLaneItems` の memo 化
  3. `Math.random()` ベース groupId の `crypto.randomUUID()` 化

---

## Warning

### WR-01: `applyMoveIssue` の `Array.filter` 内で外部変数を副作用的に変更
**ファイル**: `src/stores/boardStore.ts:80-103`

```ts
let movedIssue: BacklogIssue | null = null;
const newUnassigned = removeFromUnassigned
  ? data.unassignedIssues.filter((i) => {
      if (i.id === issueId) {
        movedIssue = i;   // ← filter コールバック内での副作用
        return false;
      }
      return true;
    })
  : [...data.unassignedIssues];
```

`Array.filter` は宣言的 (副作用フリー) であることが期待される API。コールバック内で外部の `movedIssue` を上書きする実装は: (1) `removeFromUnassigned === false` のときに同じ id が複数 milestone レーンに存在するとループ順序によって後勝ちで上書きされる潜在バグ、(2) コードリーディング負荷増、(3) 共有グローバルルール `coding-style.md` の "no mutation" 方針と非整合。

**修正例**:
```ts
const movedIssue =
  data.unassignedIssues.find((i) => i.id === issueId) ??
  data.milestones
    .find((mwi) => `milestone-${mwi.milestone.id}` === fromLaneId)
    ?.issues.find((i) => i.id === issueId) ??
  null;
if (!movedIssue) return data;
const newUnassigned = removeFromUnassigned
  ? data.unassignedIssues.filter((i) => i.id !== issueId)
  : [...data.unassignedIssues];
```
これにより `find` で 1 度だけ検索 → `filter` を純粋に保つ → `movedIssue!` 非null assertion (line 122) も不要に。

### WR-02: `Board.tsx` の `handleDragEnd` が毎レンダー新規関数として再生成される
**ファイル**: `src/components/Board/Board.tsx:604-618`

`handleDragEnd` は `useMemo` / `useCallback` で memo 化されていないため、`Board` が再レンダーされるたびに `buildHandleDragEnd(...)` で新しい関数が生成され、`DndContext` の prop 同一性が破壊される。`data` の参照変更頻度が高い (楽観的更新で頻繁に新オブジェクトに) 場面で `DndContext` の内部最適化を阻害する可能性。相関的に「ドラッグ中に state が変わると handler が差し替わり、@dnd-kit のクロージャに古い `data` が残る」レース条件の温床にもなりうる。

**修正例**:
```ts
const handleDragEnd = useMemo(
  () =>
    data
      ? buildHandleDragEnd({
          data, orderMap, milestonePrefix, setActiveIssue, setOverLaneId,
          sortField, moveIssue, reorder, updateOnCrossLaneMove, getLaneItems, uiMode,
        })
      : () => {},
  [data, orderMap, milestonePrefix, sortField, moveIssue, reorder,
   updateOnCrossLaneMove, uiMode],
);
```

### WR-03: `getLaneItems` が `Board.tsx` 内で毎レンダー再定義され、`buildHandleDragEnd` 経由で stale closure になり得る
**ファイル**: `src/components/Board/Board.tsx:592-602`

`getLaneItems` は `filteredAndSortedView` (useMemo の結果) を捕捉しているが、関数自体は memo 化されていないため、ドラッグ最中に React の再レンダーが入ると `buildHandleDragEnd` が捕捉した `getLaneItems` と React 最新ツリーの `getLaneItems` が乖離する。`buildHandleDragEnd` 内で `getLaneItems(targetLaneId)` を呼んで `orderMap` 初期値を構築しているため、稀に「ドラッグ開始時の lane items」と「ドロップ時の最新 items」がズレる可能性。

**修正**: `useCallback([filteredAndSortedView])` で固定 + WR-02 と合わせて `handleDragEnd` を `useMemo` 化。

### WR-04: `Math.random()` をグループID生成に使用 — 補強推奨
**ファイル**: `src/stores/groupStore.ts:59-62`

```ts
export function generateGroupId(): GroupId {
  const random = Math.random().toString(36).slice(2, 8);
  return `group:${Date.now()}-${random}`;
}
```

`Math.random()` 6文字 ≒ 22億通り。`Date.now()` ms との組合せで実用上は十分だが、Tauri のような信頼性重視のローカルアプリでは `crypto.randomUUID()` のほうが将来的に他システムと永続化を共有する際に安全。さらに 6 文字 slice は `Math.random` の出力長次第で稀に短くなる (`'0.5'.toString(36)` で末尾 0 切捨) ため、テスト `expect(id).toMatch(/^group:\d+-[a-z0-9]{1,6}$/)` が示すように **1〜6 文字の可変長**であることに留意。

**修正例**:
```ts
export function generateGroupId(): GroupId {
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 8).padStart(6, '0');
  return `group:${Date.now()}-${id}`;
}
```

---

## Info

### IF-01: `global.css` で `--radius-badge` が二重定義
**ファイル**: `src/global.css:47, 49` — 同じ値なのでバグはないが、編集事故時に値が割れる原因に。

### IF-02: GroupCard の未使用 prop プレフィックス `_laneId` / `_milestonePrefix`
**ファイル**: `src/components/GroupCard/GroupCard.tsx:36-37` — 完全に dead パラメータ。本当に使わないなら interface から削除を、保留なら JSDoc に明記。

### IF-03: `handleDissolveClick` の未使用引数
**ファイル**: `src/components/GroupPopover/GroupPopover.tsx:105-111` — `_e: ReactMouseEvent` は完全に未使用。`onClick={() => { ... }}` に置換可能。

### IF-04: `_` 変数によるレストパターン使用 (`removeLaneOrder`)
**ファイル**: `src/stores/reorderStore.ts:51`

```ts
const { [laneId]: _, ...rest } = orderMap;
```
TypeScript `noUnusedLocals` 有効時に警告される可能性。`delete newMap[laneId]` または `_removed` リネーム + `void _removed` が安全。

### IF-05: `replaceWithGroupSlot` の `firstIdx === -1` 分岐の最適化
**ファイル**: `src/components/Board/Board.tsx:193-211` — `firstIdx === -1` の場合 `currentOrder.filter(...)` は無駄。`return [...currentOrder, newGroupId]` で十分。

### IF-06: `IssueCard.tsx` の `hostUrl.replace` が空文字保護を持たない
**ファイル**: `src/components/IssueCard/IssueCard.tsx:65-73` — `hostUrl` が空文字の場合 `https:///view/TEST-1` という不正 URL を `openUrl` に渡す。UI 層で early return + 日本語エラーメッセージが望ましい (CLAUDE.md の "日本語エラーメッセージ" 原則と整合)。

### IF-07: `Board.tsx` のキーボードショートカット `e.key` ベース判定
**ファイル**: `src/components/Board/Board.tsx:628-637` — `e.key === 'M' || 'm'` は Caps Lock 対応済みだが、`e.code === 'KeyM'` のほうが IME / 多言語キーボードに強い実装 (優先度低)。

---

## レビュー対象ファイル (42 ファイル)

src/App.test.tsx, src/App.tsx, src/components/Board/Board.test.tsx, src/components/Board/Board.tsx, src/components/BoardHeader/BoardHeader.tsx, src/components/GroupCard/*, src/components/GroupPopover/*, src/components/IssueCard/*, src/components/Lane/*, src/components/ModeToggle/*, src/global.css, src/services/groupStorage.*, src/services/reorderStorage.*, src/stores/boardStore.*, src/stores/groupStore.*, src/stores/reorderStore.*, src/stores/uiModeStore.*, src/types/group.ts, src/types/reorder.ts, src/utils/bulkMoveUtils.*, src/utils/groupUtils.*, src/utils/reorderUtils.*, tests/setup.ts
