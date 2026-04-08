# Phase 6: フィルタリング - Research

**Researched:** 2026-04-09
**Domain:** React client-side filtering, CSS Modules dropdown components, Zustand state management
**Confidence:** HIGH

## Summary

Phase 6はフロントエンド純粋なクライアントサイドフィルタリングの実装である。新しい外部ライブラリは不要で、既存のReact + Zustand + CSS Modulesスタックで完結する。主な作業は(1) フィルタ状態の管理、(2) BoardDataからのフィルタ選択肢の動的抽出、(3) ドロップダウン+チェックボックスUIの構築、(4) フィルタチップ表示、(5) フィルタ適用ロジック（ビュー層のみ）、(6) DnDとの非干渉の保証である。

全データはすでにboardStore.dataにロード済みであり、サーバーサイドフィルタリングやAPI追加コールは不要（REQUIREMENTS.md Out of Scope確認済み）。フィルタはセッション中のみ有効で永続化しない。既存のboardStore.dataはraw unfilteredを維持し（D-09）、フィルタはビュー層で`useMemo`による派生データとして計算する設計がベスト。

**Primary recommendation:** フィルタ状態はZustand storeの新しいスライスとして管理し、フィルタ適用ロジックは純粋関数としてutilsに抽出。Board.tsxのレンダリング層でuseMemoにより各レーンのフィルタ済みissues配列を計算する。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** フィルタバーはBoardHeaderの下に独立行として配置する。3つのドロップダウン（ステータス・担当者・カテゴリ）を横並びに配置し、右側にアクティブなフィルタチップと一括クリアボタンを表示する
- **D-02:** フィルタチップはドロップダウンと同じ行の右側に横並びで表示する。チップが多い場合は折り返し可
- **D-03:** 各フィルタはドロップダウン+チェックボックス形式。ボタンクリックでチェックボックス付きリストが開き、複数選択可能
- **D-04:** チェック即反映方式 -- チェックボックスをクリックした瞬間にフィルタが適用される。「適用」ボタンは不要。ドロップダウンは開いたままで追加選択可能、外クリックで閉じる
- **D-05:** 選択肢はBoardData（取得済みの全カード）から動的に抽出する。追加APIコール不要。該当0件の選択肢は自動的にリストに表示されない
- **D-06:** 担当者ドロップダウンには「未割当」選択肢を含める。assignee === nullのカードを絞り込める
- **D-07:** フィルタ適用中もレーン全体がドロップターゲットとして機能する。非表示カードがあるレーンへもドロップ可能
- **D-08:** DnDはマイルストーン間移動でありフィルタ軸（ステータス・担当者・カテゴリ）は変わらないため、移動後のフィルタ一致/不一致は変化しない
- **D-09:** boardStore.dataは常にraw unfiltered。フィルタはビュー層のみで適用するため、DnDのID解決は壊れない

### Claude's Discretion
- ドロップダウンリスト内の選択肢の並び順（表示順、アルファベット順など）
- フィルタチップの色・スタイリング詳細
- 「N件が非表示」メッセージの正確な文言とスタイル
- フィルタバーコンポーネントの内部構造（分割粒度）

### Deferred Ideas (OUT OF SCOPE)
- なし（ディスカッションはフェーズ範囲内に収まった）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-01 | ステータスで課題カードをフィルタできる（複数選択OR条件） | フィルタ状態のSet\<number\>管理、BacklogIssue.status.idによるマッチング、extractFilterOptions関数 |
| FILT-02 | 担当者で課題カードをフィルタできる（複数選択OR条件） | Set\<number \| null\>管理、assignee?.id / null対応、「未割り当て」特殊選択肢 |
| FILT-03 | Backlogカテゴリで課題カードをフィルタできる（複数選択OR条件） | Set\<number\>管理、BacklogIssue.category[]配列の少なくとも1つがSet内にあるか判定 |
| FILT-04 | アクティブなフィルタ条件が視覚的に表示され、一括クリアできる | FilterChipコンポーネント、clearAllFilters関数、チップ個別削除 |
| FILT-05 | フィルタで全カードが非表示になったレーンに非表示件数が表示される | Lane.tsxのhiddenCount prop、フィルタ済みissues.length === 0時の分岐表示 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **言語:** 日本語で応答、コード識別子・技術用語は英語
- **Immutability:** Zustand `set()`でスプレッド構文。直接mutation禁止
- **ファイル命名:** PascalCase.tsx（コンポーネント）, camelCase.ts（サービス/ユーティリティ）
- **CSS Modules:** コンポーネントごとに.module.css
- **テスト:** TDD、カバレッジ80%以上、テストファイルはソースと同階層
- **アイコン:** Unicode文字のみ（外部アイコンライブラリ不使用）
- **エラー処理:** サービス層はdiscriminated union、UIは日本語エラーメッセージ
- **Tauri mock:** tests/setup.tsでグローバルモック
- **Zustand selector:** `useStore((s) => s.field)`パターン、フルストア展開禁止

## Standard Stack

### Core

このフェーズでは新しいライブラリの追加は不要。既存スタックで完結する。

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.x | UI rendering, useMemo/useState/useRef/useEffect | 既存スタック [VERIFIED: package.json] |
| Zustand | 5.0.x | フィルタ状態管理 | 既存のboardStore/settingsStoreと同パターン [VERIFIED: package.json] |
| CSS Modules | built-in (Vite) | フィルタUI全コンポーネントのスタイリング | 既存パターン [VERIFIED: codebase] |
| Vitest + RTL | 4.1.x / 16.x | テスト | 既存テストインフラ [VERIFIED: package.json, 167テスト全パス] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/user-event | 14.6.x | ドロップダウン操作のテスト（click, keyboard navigation） | FilterDropdownテスト [VERIFIED: package.json devDependencies] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom dropdown | headless-ui, Radix | CLAUDE.mdで外部コンポーネントライブラリ不使用方針。カスタム実装で十分 |
| Zustand filterStore | Board内useState | storeならdevtools対応・他コンポーネントからアクセス容易。Phase 7ソートとも統合しやすい |
| useMemoフィルタ | Zustand derived state | useMemoの方がシンプルでReact ライフサイクルと自然に統合。ビュー層限定の設計にも合致 |

**Installation:**
```bash
# 追加インストール不要
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── FilterBar/
│   │   ├── FilterBar.tsx           # フィルタバー全体のコンテナ
│   │   ├── FilterBar.module.css
│   │   └── FilterBar.test.tsx
│   ├── FilterDropdown/
│   │   ├── FilterDropdown.tsx      # 再利用可能なドロップダウン+チェックボックス
│   │   ├── FilterDropdown.module.css
│   │   └── FilterDropdown.test.tsx
│   └── FilterChip/
│       ├── FilterChip.tsx          # 個別のフィルタチップ
│       ├── FilterChip.module.css
│       └── FilterChip.test.tsx
├── stores/
│   └── filterStore.ts              # フィルタ状態の管理（新規）
│   └── filterStore.test.ts
├── utils/
│   └── filterUtils.ts              # フィルタ適用・選択肢抽出の純粋関数
│   └── filterUtils.test.ts
└── types/
    └── filter.ts                   # FilterState型定義（新規）
```

### Pattern 1: Canonical/Derived Data Separation (D-09)

**What:** boardStore.dataは常にraw unfilteredデータを保持。フィルタはBoard.tsx内のuseMemoで派生データとして計算。
**When to use:** フィルタ適用時。DnDのID解決がフィルタに影響されないことを保証。

```typescript
// Board.tsx内
// Source: codebase pattern + D-09 decision
const data = useBoardStore((s) => s.data);
const { statusIds, assigneeIds, categoryIds } = useFilterStore();

const filteredLanes = useMemo(() => {
  if (!data) return null;
  return {
    milestones: data.milestones.map((mwi) => ({
      ...mwi,
      filteredIssues: applyFilters(mwi.issues, { statusIds, assigneeIds, categoryIds }),
      hiddenCount: mwi.issues.length - applyFilters(mwi.issues, { statusIds, assigneeIds, categoryIds }).length,
    })),
    unassigned: {
      filteredIssues: applyFilters(data.unassignedIssues, { statusIds, assigneeIds, categoryIds }),
      hiddenCount: data.unassignedIssues.length - applyFilters(data.unassignedIssues, { statusIds, assigneeIds, categoryIds }).length,
    },
  };
}, [data, statusIds, assigneeIds, categoryIds]);
```

[VERIFIED: Board.tsx, boardStore.ts -- 既存コードで`data`はraw] [CITED: 06-CONTEXT.md D-09]

### Pattern 2: Pure Filter Function

**What:** フィルタロジックを純粋関数として抽出し、テスト容易にする。
**When to use:** filterUtils.tsに配置。Board.tsxのuseMemoから呼び出す。

```typescript
// src/utils/filterUtils.ts
import type { BacklogIssue } from '../types/backlog';
import type { FilterState } from '../types/filter';

export function applyFilters(
  issues: ReadonlyArray<BacklogIssue>,
  filters: FilterState,
): BacklogIssue[] {
  return issues.filter((issue) => {
    // Status: OR within axis
    if (filters.statusIds.size > 0 && !filters.statusIds.has(issue.status.id)) {
      return false;
    }
    // Assignee: OR within axis, null = unassigned
    if (filters.assigneeIds.size > 0) {
      const assigneeId = issue.assignee?.id ?? null;
      if (!filters.assigneeIds.has(assigneeId)) return false;
    }
    // Category: OR within axis (issue has at least one matching category)
    if (filters.categoryIds.size > 0) {
      const hasMatch = issue.category.some((c) => filters.categoryIds.has(c.id));
      if (!hasMatch) return false;
    }
    return true;
  });
}
```

[VERIFIED: BacklogIssue型 -- status.id: number, assignee: BacklogUser | null, category: BacklogCategory[]] [CITED: src/types/backlog.ts]

### Pattern 3: Filter Options Extraction from BoardData

**What:** フィルタドロップダウンの選択肢をBoardDataの全issueから動的に抽出する。
**When to use:** FilterBar内でuseMemoで計算。

```typescript
// src/utils/filterUtils.ts
export interface FilterOption {
  id: number | null;  // null = unassigned (assignee only)
  label: string;
  sortOrder: number;
}

export function extractStatusOptions(issues: ReadonlyArray<BacklogIssue>): FilterOption[] {
  const seen = new Map<number, { label: string; sortOrder: number }>();
  for (const issue of issues) {
    if (!seen.has(issue.status.id)) {
      seen.set(issue.status.id, {
        label: issue.status.name,
        sortOrder: issue.status.displayOrder,
      });
    }
  }
  return [...seen.entries()]
    .map(([id, { label, sortOrder }]) => ({ id, label, sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
```

[VERIFIED: BacklogStatus -- id, name, displayOrder, colorフィールド確認済み] [CITED: src/types/backlog.ts]

### Pattern 4: Click Outside to Close Dropdown

**What:** ドロップダウンの外をクリックしたら閉じる。
**When to use:** FilterDropdown内のuseEffect + useRef。

```typescript
// FilterDropdown.tsx内
useEffect(() => {
  if (!isOpen) return;
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen]);
```

[ASSUMED -- standard React pattern for click-outside detection]

### Pattern 5: Zustand Filter Store

**What:** フィルタ状態をZustand storeとして管理。
**When to use:** Board, FilterBar, FilterDropdown, FilterChip全てからアクセス。

```typescript
// src/stores/filterStore.ts
import { create } from 'zustand';

interface FilterStoreState {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;
  toggleStatus: (id: number) => void;
  toggleAssignee: (id: number | null) => void;
  toggleCategory: (id: number) => void;
  removeFilter: (axis: 'status' | 'assignee' | 'category', id: number | null) => void;
  clearAll: () => void;
}

export const useFilterStore = create<FilterStoreState>()((set) => ({
  statusIds: new Set(),
  assigneeIds: new Set(),
  categoryIds: new Set(),
  toggleStatus: (id) =>
    set((state) => {
      const next = new Set(state.statusIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { statusIds: next };
    }),
  toggleAssignee: (id) =>
    set((state) => {
      const next = new Set(state.assigneeIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { assigneeIds: next };
    }),
  toggleCategory: (id) =>
    set((state) => {
      const next = new Set(state.categoryIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { categoryIds: next };
    }),
  removeFilter: (axis, id) =>
    set((state) => {
      if (axis === 'status') {
        const next = new Set(state.statusIds);
        next.delete(id as number);
        return { statusIds: next };
      }
      if (axis === 'assignee') {
        const next = new Set(state.assigneeIds);
        next.delete(id);
        return { assigneeIds: next };
      }
      const next = new Set(state.categoryIds);
      next.delete(id as number);
      return { categoryIds: next };
    }),
  clearAll: () =>
    set({ statusIds: new Set(), assigneeIds: new Set(), categoryIds: new Set() }),
}));
```

[VERIFIED: Zustand 5.0.xのcreate APIパターン -- settingsStore.ts, boardStore.tsと同一] [CITED: src/stores/boardStore.ts]

### Anti-Patterns to Avoid

- **boardStore.dataを直接フィルタで変更する:** D-09で禁止。DnDのID解決が壊れる。常にビュー層の派生データとして計算すること
- **フィルタ状態をコンポーネント内useStateで管理:** FilterBar, Board, Laneなど複数コンポーネントからアクセスが必要。prop drillingの地獄になる
- **Zustand selectorでSetオブジェクトを直接返す:** `Set`はreference equalityでZustandが変更検知する。`toggleStatus`で常に`new Set(...)`を生成するパターンで問題なし
- **フィルタ適用ロジックをコンポーネント内にインラインで書く:** テスト困難。純粋関数として`filterUtils.ts`に抽出すること
- **ドロップダウンの外クリック検知にevent.stopPropagation()を使う:** 他のイベントを壊す。`document.addEventListener`+ `ref.contains`パターンを使うこと

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ドロップダウンUI全体 | ブラウザnative select | カスタムdiv+checkbox構成 | native selectは複数選択checkboxをサポートしない。D-03の要件 |
| click outside検知 | 独自のグローバルstate管理 | useRef + document.addEventListener('mousedown') | 標準Reactパターンで十分。useEffectのcleanupで安全 |
| Set操作の不変性 | 配列で代用 | `new Set(prev)` + delete/add | O(1)のhas判定。配列だとincludes()でO(n)。数十件の選択肢では差は小さいが、Setが意図が明確 |

**Key insight:** このフェーズは外部ライブラリが不要な純粋UIロジック。カスタムドロップダウンは複雑に見えるが、要件が明確（チェックボックスリスト、外クリック閉じ、即時適用）なので、headless UIライブラリなしで問題ない。

## Common Pitfalls

### Pitfall 1: Zustand + Set Equality

**What goes wrong:** ZustandはデフォルトでObject.is()による浅い等価比較を使う。同じSetインスタンスを`set()`に渡すと再レンダリングがトリガーされない。
**Why it happens:** `state.statusIds.add(id)`してから`set({ statusIds: state.statusIds })`すると同じ参照なので変更が検知されない。
**How to avoid:** 常に`new Set(state.statusIds)`で新しいインスタンスを作成してから操作する。上記Pattern 5のコードパターンに従う。
**Warning signs:** チェックボックスをクリックしてもUIが更新されない。

[VERIFIED: Zustand 5.x -- create APIはObject.is比較] [CITED: src/stores/boardStore.tsのimmutable updateパターン]

### Pitfall 2: useMemo Dependencies with Set

**What goes wrong:** `useMemo`の依存配列にSetオブジェクトを入れると、毎回新しい参照になるため毎回再計算される（Zustandのtoggle操作は毎回new Setを返すので正しく動作する）。
**Why it happens:** ReactのuseMemoはObject.is比較。new Set()は毎回異なる参照。
**How to avoid:** Zustand selectorで個別のSetを取得し、useMemoの依存配列に入れる。toggleごとに新しいSetが返るのでuseMemoは正しく再計算する。これは意図した動作。過度な最適化は不要。
**Warning signs:** フィルタを変更してもリストが更新されない、または逆に毎フレーム再計算される。

### Pitfall 3: カテゴリフィルタのOR判定漏れ

**What goes wrong:** BacklogIssueのcategoryは配列（`category: BacklogCategory[]`）。単純な`===`比較ではなく、配列の少なくとも1要素がフィルタSetに含まれるかチェックが必要。
**Why it happens:** statusやassigneeは単一値だがcategoryは複数値。同じ判定ロジックをコピペすると壊れる。
**How to avoid:** `issue.category.some(c => filters.categoryIds.has(c.id))`パターン。カテゴリが空配列のissueはcategoryフィルタ適用時に非表示になる（いずれのカテゴリにもマッチしない）。
**Warning signs:** カテゴリフィルタを選択しても期待通りにフィルタされない。

[VERIFIED: BacklogIssue.category: BacklogCategory[] -- 配列型] [CITED: src/types/backlog.ts line 66]

### Pitfall 4: DnD中のフィルタ状態変更

**What goes wrong:** ドラッグ中にフィルタを変更すると、ドラッグ中のカードが消える可能性がある。
**Why it happens:** DragOverlayは`activeIssue`を保持しているが、フィルタ変更でレーン内の表示が変わる。
**How to avoid:** (a) Board.tsxのDnDハンドラは常にboardStore.data（unfiltered）を参照している（既存コード確認済み）ので、DnDのID解決は壊れない。(b) DragOverlayはactiveIssueを直接保持しているのでフィルタ影響なし。(c) ドラッグ中はフィルタ変更をブロックする必要はない -- UIが多少揺れるが機能的には問題ない。
**Warning signs:** ドラッグ完了後にmoveIssueが呼ばれない。

[VERIFIED: Board.tsxのhandleDragEnd -- boardStore.dataを直接参照] [CITED: src/components/Board/Board.tsx lines 84-95]

### Pitfall 5: FilterBar sticky配置とBoard高さの競合

**What goes wrong:** BoardHeaderがsticky top:0 z-index:10、FilterBarがsticky top:56px z-index:9。Boardの高さcalcが固定値だとFilterBar分がずれる。
**Why it happens:** 現在Board.module.cssは`height: calc(100vh - 56px)`。FilterBar追加でさらに高さが必要。
**How to avoid:** flexboxレイアウトでBoardHeaderとFilterBarの下にBoard領域を配置。`calc`ではなく`flex: 1; overflow: hidden`で残り領域を自動計算。App.tsxを`display: flex; flex-direction: column; height: 100vh`にする。
**Warning signs:** Board領域がスクロールバーで溢れる、FilterBarの下にカードが隠れる。

[VERIFIED: Board.module.css -- 現在 height: calc(100vh - 56px)] [CITED: src/components/Board/Board.module.css]

### Pitfall 6: 全issuesからの選択肢抽出で重複

**What goes wrong:** 同じステータスや担当者が複数issueに存在する場合、Mapで重複排除しないとドロップダウンに同じ選択肢が複数表示される。
**Why it happens:** BoardDataはmilestones[].issues[] + unassignedIssuesの2階層構造。全issueを走査する際に重複排除が必要。
**How to avoid:** Map<id, option>で重複排除。Pattern 3のextract関数パターンに従う。
**Warning signs:** ドロップダウンに「未対応」が3回表示される。

## Code Examples

### Example 1: FilterState型定義

```typescript
// src/types/filter.ts
// Source: UI-SPEC State Shape Contract + BacklogIssue型
export interface FilterState {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;
}

export const EMPTY_FILTER: FilterState = {
  statusIds: new Set(),
  assigneeIds: new Set(),
  categoryIds: new Set(),
};

export function hasActiveFilters(state: FilterState): boolean {
  return state.statusIds.size > 0
    || state.assigneeIds.size > 0
    || state.categoryIds.size > 0;
}
```

### Example 2: BoardData全issue走査ヘルパー

```typescript
// src/utils/filterUtils.ts
import type { BacklogIssue } from '../types/backlog';
import type { BoardData } from '../types/board';

export function getAllIssues(data: BoardData): ReadonlyArray<BacklogIssue> {
  const all: BacklogIssue[] = [...data.unassignedIssues];
  for (const mwi of data.milestones) {
    all.push(...mwi.issues);
  }
  return all;
}
```

### Example 3: FilterDropdown Component Structure

```typescript
// src/components/FilterDropdown/FilterDropdown.tsx (概要)
import { useState, useRef, useEffect } from 'react';
import type { FilterOption } from '../../utils/filterUtils';
import styles from './FilterDropdown.module.css';

interface FilterDropdownProps {
  label: string;
  options: ReadonlyArray<FilterOption>;
  selectedIds: ReadonlySet<number | null>;
  onToggle: (id: number | null) => void;
}

export function FilterDropdown({ label, options, selectedIds, onToggle }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const selectedCount = selectedIds.size;

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}フィルタ`}
      >
        {label} {selectedCount > 0 ? `(${selectedCount})` : ''} {'\u25BE'}
      </button>
      {isOpen && (
        <div
          className={styles.panel}
          role="listbox"
          aria-multiselectable="true"
        >
          {options.map((opt) => (
            <div
              key={String(opt.id)}
              className={styles.option}
              role="option"
              aria-selected={selectedIds.has(opt.id)}
              onClick={() => onToggle(opt.id)}
            >
              <span className={`${styles.checkbox} ${selectedIds.has(opt.id) ? styles.checked : ''}`}>
                {selectedIds.has(opt.id) ? '\u2713' : ''}
              </span>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

[CITED: 06-UI-SPEC.md Layout Contract / ARIA Contract]

### Example 4: Lane hiddenCount統合

```typescript
// Lane.tsxの変更部分
interface LaneProps {
  // ...existing props
  hiddenCount?: number;  // 新規追加
}

// render内
{issues.length === 0 ? (
  hiddenCount && hiddenCount > 0 ? (
    <div className={styles.filteredEmpty}>
      {hiddenCount}件がフィルタで非表示
    </div>
  ) : (
    <EmptyLane />
  )
) : (
  issues.map((issue) => (
    <IssueCard key={issue.id} issue={issue} laneId={laneId} milestonePrefix={milestonePrefix} />
  ))
)}
```

[CITED: 06-UI-SPEC.md Filtered-Empty Lane State]

### Example 5: Board.tsxでのフィルタ統合

```typescript
// Board.tsx内のレンダリング部分
// DndContextのevent handlersはboardStore.data（unfiltered）を使い続ける
// Laneに渡すissuesのみフィルタ済みに置き換える

<Lane
  laneId="unassigned"
  name="未割り当て"
  startDate={null}
  releaseDueDate={null}
  issues={filteredLanes.unassigned.filteredIssues}  // フィルタ済み
  hiddenCount={filteredLanes.unassigned.hiddenCount} // 非表示件数
  milestonePrefix={milestonePrefix}
  isDropTarget={overLaneId === 'unassigned'}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 middlewareベースのデバウンス | Zustand v5 vanillaで十分（subscribeWithSelectorはbuilt-in） | 2024 v5.0 | selector-based subscriptionがデフォルト |
| React.memo + useMemo最適化重視 | React 19 compilr-optimized (ただしまだstable) | 2025 React 19 | useMemoは引き続き有効だが過度な最適化は不要 |

**Deprecated/outdated:**
- Zustand v4の`subscribeWithSelector`ミドルウェア: v5ではbuilt-in。importは`zustand`直接でOK

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x + @testing-library/react 16.x |
| Config file | `vitest.config.ts` (jsdom environment, tests/setup.ts) |
| Quick run command | `npx vitest run src/utils/filterUtils.test.ts` |
| Full suite command | `npx vitest run` |

[VERIFIED: 167テスト全パス、vitest.config.ts確認済み]

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | ステータスフィルタで課題が絞り込まれる | unit | `npx vitest run src/utils/filterUtils.test.ts -x` | Wave 0 |
| FILT-02 | 担当者フィルタで課題が絞り込まれる（null含む） | unit | `npx vitest run src/utils/filterUtils.test.ts -x` | Wave 0 |
| FILT-03 | カテゴリフィルタで課題が絞り込まれる（配列OR） | unit | `npx vitest run src/utils/filterUtils.test.ts -x` | Wave 0 |
| FILT-04 | フィルタチップ表示・一括クリア | component | `npx vitest run src/components/FilterBar/FilterBar.test.tsx -x` | Wave 0 |
| FILT-05 | 非表示レーンに件数表示 | component | `npx vitest run src/components/Lane/Lane.test.tsx -x` | Wave 0 (既存ファイル拡張) |
| Cross | フィルタ状態store管理 | unit | `npx vitest run src/stores/filterStore.test.ts -x` | Wave 0 |
| Cross | フィルタ選択肢抽出 | unit | `npx vitest run src/utils/filterUtils.test.ts -x` | Wave 0 |
| Cross | DnDとフィルタの非干渉 | component | `npx vitest run src/components/Board/Board.test.tsx -x` | Wave 0 (既存拡張) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/utils/filterUtils.test.ts src/stores/filterStore.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/utils/filterUtils.test.ts` -- applyFilters, extractStatusOptions, extractAssigneeOptions, extractCategoryOptions, getAllIssues
- [ ] `src/stores/filterStore.test.ts` -- toggle, removeFilter, clearAll
- [ ] `src/components/FilterBar/FilterBar.test.tsx` -- FilterBar全体の統合テスト
- [ ] `src/components/FilterDropdown/FilterDropdown.test.tsx` -- 開閉、チェックボックス操作、外クリック閉じ
- [ ] `src/components/FilterChip/FilterChip.test.tsx` -- チップ表示、削除ボタン
- [ ] `src/components/Lane/Lane.test.tsx` -- hiddenCountプロップ追加テスト（既存ファイル拡張）

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- (フィルタリングは認証不要の純粋UI操作) |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | フィルタ選択肢はBoardData（既にバリデート済み）から動的生成。ユーザー入力のテキストフィールドなし |
| V6 Cryptography | no | -- |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| フィルタ選択肢からのデータ漏洩 | Information Disclosure | リスクなし -- フィルタ選択肢はすでに表示済みのBoardDataから抽出。追加情報の露出なし |

このフェーズはセキュリティリスクが極めて低い。全データはすでにクライアントにロード済みであり、フィルタリングは純粋なクライアントサイドUI操作。APIコールは発生しない。

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | click-outside検知にdocument.addEventListener('mousedown') + ref.containsパターンで十分 | Architecture Patterns -- Pattern 4 | 低 -- 標準パターン。もし問題があればuseEffectの条件調整で対応 |
| A2 | Set<number \| null>でZustand storeのreactivityが正しく動作する | Architecture Patterns -- Pattern 5 | 中 -- new Set()で毎回新参照を作るため問題ないはずだが、テストで確認必須 |
| A3 | FilterBarのsticky配置(top:56px)がBoardHeaderのsticky(top:0)と競合しない | Common Pitfalls -- Pitfall 5 | 中 -- flexboxレイアウト変更で解決可能だが、実装時に確認が必要 |

## Open Questions

1. **FilterBarのsticky vs flex配置**
   - What we know: UI-SPECではsticky top:56px指定。現在のApp.tsxはBoardHeaderとBoardをフラットに並べている。
   - What's unclear: FilterBarをApp.tsx直下に入れるか、Board.tsx内に入れるか。App.tsxに入れるとfilterStoreとboardStoreの両方をApp.tsxが参照する。Board.tsx内ならDndContext内で自然。
   - Recommendation: Board.tsx内にFilterBarを配置（DndContext内だがFilterBarはドラッグ操作と無関係）。Board.tsxのレンダリング構造をflexbox column化してFilterBar + レーン領域にする。App.tsxの変更は最小限。

2. **フィルタ状態リセットのタイミング**
   - What we know: REQUIREMENTS.md Out of Scopeで「セッション中のみ有効」。フィルタ永続化は不要。
   - What's unclear: データ再読み込み（fetchBoard）時にフィルタをクリアするかどうか。
   - Recommendation: データ再読み込み後もフィルタを維持する。選択肢リストは新データから再計算されるが、選択済みのIDが新データに存在しない場合は自動的に非表示になるだけで問題ない。明示的なリセットは不要。

## Sources

### Primary (HIGH confidence)
- `src/types/backlog.ts` -- BacklogIssue, BacklogStatus, BacklogCategory, BacklogUser型定義
- `src/types/board.ts` -- BoardData, MilestoneWithIssues型定義
- `src/stores/boardStore.ts` -- 既存のZustandパターン、immutable update、moveIssue
- `src/components/Board/Board.tsx` -- DndContextとレーン描画の既存パターン
- `src/components/Lane/Lane.tsx` -- レーン描画、EmptyLane分岐
- `.planning/phases/06-filtering/06-CONTEXT.md` -- D-01からD-09のロック済み決定
- `.planning/phases/06-filtering/06-UI-SPEC.md` -- UIレイアウト・インタラクション契約
- `package.json` -- 依存パッケージバージョン確認

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONVENTIONS.md` -- プロジェクトコーディング規約
- `.planning/codebase/STRUCTURE.md` -- ディレクトリ構造

### Tertiary (LOW confidence)
- なし（全ての情報はコードベースまたは計画ドキュメントから直接確認済み）

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 新規ライブラリ不要、全て既存スタックで確認済み
- Architecture: HIGH -- 既存のboardStore/Board.tsx/Lane.tsxパターンの自然な拡張
- Pitfalls: HIGH -- BacklogIssue型の実際のフィールド構造を確認済み
- Filter logic: HIGH -- 純粋関数として抽出可能、型情報から完全にテスト設計可能

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (安定ドメイン -- 外部ライブラリ変更リスクなし)
