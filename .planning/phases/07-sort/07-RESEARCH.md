# Phase 7: ソート - Research

**Researched:** 2026-04-10
**Domain:** Zustand状態管理 + ソートロジック + plugin-store永続化 + UIコントロール
**Confidence:** HIGH

## Summary

Phase 7はレーン内カードのソート機能を追加する。ソート基準は「担当者順」「期限日順」「ソートなし（課題ID順）」の3種類で、昇順/降順の切り替えが可能。ソート設定はplugin-storeで永続化される。

技術的にはPhase 6のフィルタリングと同じアーキテクチャパターンを踏襲する。boardStore.dataはraw unfilteredのまま保持し、Board.tsxのuseMemoパイプラインにフィルタ適用後のソートステップを追加する。ソート状態管理はZustand storeで行い、plugin-storeによる永続化を組み込む。UIはFilterBarの右側にセパレーター+ソートドロップダウン+方向トグルボタンを配置する。

**Primary recommendation:** filterStoreと同様の独立したsortStoreを作成し、Board.tsxのfilteredView useMemoにソート処理を追加する。ソートロジックはsortUtils.tsに純粋関数として切り出す。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** ソートコントロールはFilterBarの右側に配置する。フィルタドロップダウン群とソートコントロールの間にセパレーターを入れて区切る
- **D-02:** ソート基準の選択はドロップダウン形式。FilterDropdownと同じUIパターンを踏襲し統一感を保つ
- **D-03:** ドロップダウンの選択肢は「ソートなし（課題ID順）」「担当者順」「期限日順」の3つ
- **D-04:** 「ソートなし」を選択するとデフォルトの課題ID順（keyId）に戻る
- **D-05:** ソートドロップダウンの横に上/下トグルボタンを配置。クリックで昇順と降順を切り替える
- **D-06:** デフォルトのソート方向は昇順。担当者はA→Z、期限日は早い→遅い順
- **D-07:** assignee=null（未割当）およびdueDate=null（期限なし）のカードは、昇順でも降順でも常にリスト末尾に配置する
- **D-08:** ソートは全レーンに一括適用する（フィルタと同じパターン）。レーンごとの個別ソートは不要
- **D-09:** ソートはフィルタ適用後のカードに対して適用する（フィルタ → ソートの順）
- **D-10:** boardStore.dataは常にraw unfiltered（Phase 6 D-09引き継ぎ）。ソートもビュー層のみで適用

### Claude's Discretion
- ソートドロップダウンのスタイリング詳細（FilterDropdownとの統一はD-02で方針決定済み）
- セパレーターの視覚的デザイン（縦線、スペース等）
- 上/下ボタンの具体的なUnicode文字選択
- sortStore or filterStoreへの統合 vs 独立store -- 内部構造はplanner判断

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SORT-01 | レーン内のカードを担当者順でソートできる | sortUtils.ts純粋関数でassignee.nameのlocaleCompare実装、null末尾処理 |
| SORT-02 | レーン内のカードを期限日順でソートできる | sortUtils.ts純粋関数でdueDate文字列比較実装、null末尾処理 |
| SORT-03 | ソート方向（昇順/降順）を切り替えられる | sortStore.directionトグル + UIの上/下ボタン |
| SORT-04 | ソート設定がアプリ再起動後も保持される | plugin-storeのsortStorage.ts、settingsStorage.tsと同パターン |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | ソート状態管理（sortStore） | プロジェクト既採用、filterStoreと同パターン [VERIFIED: package.json] |
| @tauri-apps/plugin-store | 2.4.2 | ソート設定永続化 | プロジェクト既採用、settingsStorage.tsと同パターン [VERIFIED: package.json] |
| react | 19.1.0 | UIコンポーネント | プロジェクト既採用 [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.3 | テストフレームワーク | ソートロジック・store・コンポーネントのテスト [VERIFIED: package.json] |
| @testing-library/react | 16.3.2 | コンポーネントテスト | SortDropdown・FilterBar統合テスト [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 独立sortStore | filterStoreに統合 | 独立storeの方がfilterとsortの関心分離が明確。Phase 8でソートモード/手動並べ替えの排他制御が必要になるため、独立storeが拡張しやすい |

**Installation:** 新規パッケージ不要。全て既存依存で実装可能。

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── sort.ts                      # SortField, SortDirection, SortConfig型定義
├── stores/
│   ├── sortStore.ts                 # useSortStore: ソート状態 + アクション
│   └── sortStore.test.ts            # storeテスト
├── services/
│   ├── sortStorage.ts               # loadSortConfig / saveSortConfig
│   └── sortStorage.test.ts          # 永続化テスト
├── utils/
│   ├── sortUtils.ts                 # applySortを含む純粋関数
│   └── sortUtils.test.ts            # ソートロジックテスト
├── components/
│   ├── SortDropdown/
│   │   ├── SortDropdown.tsx         # ソート基準選択ドロップダウン
│   │   ├── SortDropdown.module.css
│   │   └── SortDropdown.test.tsx
│   └── FilterBar/
│       ├── FilterBar.tsx            # 修正: ソートコントロール統合
│       ├── FilterBar.module.css     # 修正: セパレーター+ソートUI
│       └── FilterBar.test.tsx       # 修正: ソートUI統合テスト追加
└── components/
    └── Board/
        └── Board.tsx                # 修正: useMemoにソート処理追加
```

### Pattern 1: ソート型定義
**What:** ソートの状態を表す型をsort.tsに定義
**When to use:** sortStore、sortUtils、コンポーネントが共通で使用
**Example:**
```typescript
// Source: プロジェクト内パターン（filterStore/filter.ts参照）
export type SortField = 'none' | 'assignee' | 'dueDate';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}
```

### Pattern 2: sortStore（Zustand、filterStoreパターン踏襲）
**What:** ソート設定の状態管理 + plugin-store永続化
**When to use:** ソート基準・方向の変更、アプリ起動時の設定復元
**Example:**
```typescript
// Source: filterStore.ts + settingsStore.tsの確立済みパターン
import { create } from 'zustand';
import type { SortField, SortDirection, SortConfig } from '../types/sort';
import { loadSortConfig, saveSortConfig } from '../services/sortStorage';

interface SortStoreState {
  field: SortField;
  direction: SortDirection;

  setField: (field: SortField) => void;
  toggleDirection: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useSortStore = create<SortStoreState>()((set, get) => ({
  field: 'none',
  direction: 'asc',

  setField: (field) => {
    set({ field });
    saveSortConfig({ field, direction: get().direction });
  },

  toggleDirection: () => {
    const next = get().direction === 'asc' ? 'desc' : 'asc';
    set({ direction: next });
    saveSortConfig({ field: get().field, direction: next });
  },

  loadFromStorage: async () => {
    const config = await loadSortConfig();
    if (config) {
      set({ field: config.field, direction: config.direction });
    }
  },
}));
```

### Pattern 3: ソートロジック（純粋関数）
**What:** フィルタ適用済み配列にソートを適用する純粋関数
**When to use:** Board.tsxのuseMemo内でapplyFilters後に呼ぶ
**Example:**
```typescript
// Source: filterUtils.tsのapplyFiltersパターン踏襲
import type { BacklogIssue } from '../types/backlog';
import type { SortField, SortDirection } from '../types/sort';

export function applySortToIssues(
  issues: ReadonlyArray<BacklogIssue>,
  field: SortField,
  direction: SortDirection,
): BacklogIssue[] {
  if (field === 'none') {
    // D-04: デフォルトはkeyId昇順
    return [...issues].sort((a, b) => a.keyId - b.keyId);
  }

  const sorted = [...issues].sort((a, b) => {
    if (field === 'assignee') {
      return compareAssignee(a, b);
    }
    return compareDueDate(a, b);
  });

  // D-07: null値は常に末尾（directionに関係なく）
  // non-null部分のみ方向反転
  if (direction === 'desc') {
    return reverseNonNullSection(sorted, field);
  }
  return sorted;
}
```

### Pattern 4: Board.tsx useMemoパイプライン拡張
**What:** 既存のfilteredView useMemoにソート処理を追加
**When to use:** D-09準拠で「フィルタ → ソート」の順に適用
**Example:**
```typescript
// Board.tsx 既存のfilteredView useMemoを拡張
const sortField = useSortStore((s) => s.field);
const sortDirection = useSortStore((s) => s.direction);

const filteredAndSortedView = useMemo(() => {
  if (!data) return null;
  const filters: FilterState = { statusIds, assigneeIds, categoryIds };
  const hasFilters = statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0;

  const unassignedFiltered = hasFilters
    ? applyFilters(data.unassignedIssues, filters)
    : data.unassignedIssues;
  const unassignedSorted = applySortToIssues(unassignedFiltered, sortField, sortDirection);

  return {
    milestones: data.milestones.map((mwi) => {
      const filtered = hasFilters ? applyFilters(mwi.issues, filters) : mwi.issues;
      const sorted = applySortToIssues(filtered, sortField, sortDirection);
      return {
        milestone: mwi.milestone,
        filteredIssues: sorted,
        hiddenCount: hasFilters ? mwi.issues.length - filtered.length : 0,
      };
    }),
    unassigned: {
      filteredIssues: unassignedSorted,
      hiddenCount: hasFilters
        ? data.unassignedIssues.length - unassignedFiltered.length
        : 0,
    },
  };
}, [data, statusIds, assigneeIds, categoryIds, sortField, sortDirection]);
```

### Pattern 5: FilterBarへのソートUI統合
**What:** FilterBarの右側にセパレーター+SortDropdown+方向トグルを追加
**When to use:** D-01準拠のUI配置
**Example:**
```typescript
// FilterBar.tsx — ソートコントロール追加部分のイメージ
<div className={styles.filterBar} role="toolbar" aria-label="フィルタとソート">
  <div className={styles.dropdowns}>
    {/* 既存のフィルタドロップダウン3つ */}
    <FilterDropdown label="ステータス" ... />
    <FilterDropdown label="担当者" ... />
    <FilterDropdown label="カテゴリ" ... />

    {/* セパレーター */}
    <div className={styles.separator} role="separator" aria-orientation="vertical" />

    {/* ソートコントロール */}
    <SortDropdown />
    <button
      type="button"
      className={styles.directionToggle}
      onClick={toggleDirection}
      aria-label={direction === 'asc' ? '降順に切り替え' : '昇順に切り替え'}
    >
      {direction === 'asc' ? '\u2191' : '\u2193'}
    </button>
  </div>
  {/* 既存のchips領域 */}
</div>
```

### Anti-Patterns to Avoid
- **boardStore.dataにソート結果を格納:** D-10違反。ソートはビュー層のuseMemoのみで適用する。boardStore.dataは常にraw unfiltered
- **Array.sort()のin-place mutation:** `issues.sort()`は元配列を変更する。必ず`[...issues].sort()`でコピーしてからソートする
- **FilterDropdownコンポーネントの直接改造:** FilterDropdownはmultiselect（チェックボックス）用に設計されている。ソートは単一選択（ラジオ的）なので、新しいSortDropdownコンポーネントを作成する。FilterDropdownのスタイリングを参考にしつつ、振る舞いは単一選択に変更
- **ソート中にSortableContextのitems順序を無視:** Lane.tsxのSortableContextにはソート後のissueIds配列を渡す必要がある。現在はfilteredIssuesから生成されているので、sorted配列が渡れば自動的に正しくなる

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| plugin-store永続化 | 独自ファイルI/O | settingsStorage.tsと同パターンのsortStorage.ts | load/set/saveの3段階はplugin-storeの確立済みパターン [VERIFIED: settingsStorage.ts] |
| 日本語文字列比較 | 独自比較関数 | String.prototype.localeCompare('ja') | filterUtils.tsのextractAssigneeOptionsで既使用のパターン [VERIFIED: filterUtils.ts] |
| ドロップダウンUI | 完全新規作成 | FilterDropdownのスタイリング流用 + 単一選択ロジック新規 | CSSとアクセシビリティパターンは共通化可能 [VERIFIED: FilterDropdown.tsx] |

**Key insight:** Phase 6で確立されたパターン（filterStore、filterUtils、FilterDropdown、Board.tsx useMemo、テストmock）がほぼそのまま踏襲可能。新規の技術的課題はnull値のソート順処理のみ。

## Common Pitfalls

### Pitfall 1: Array.sort()のin-place mutation
**What goes wrong:** `issues.sort(compareFn)`は元配列を直接変更するため、Zustand storeのimmutabilityルールに違反する
**Why it happens:** JavaScriptのArray.sort()がin-placeであることを忘れがち
**How to avoid:** 必ず`[...issues].sort(compareFn)`でコピーを作成してからソート。sortUtils.tsの関数シグネチャで`ReadonlyArray<BacklogIssue>`を受け取ることで、TypeScriptレベルでも防止
**Warning signs:** テストで「immutability」検証が失敗する、元データの順序が変わる

### Pitfall 2: null値のソート順がdirectionで反転してしまう
**What goes wrong:** 単純に配列全体をreverse()すると、末尾に置きたいnull値が先頭に来てしまう
**Why it happens:** D-07では「null値は昇順でも降順でも常に末尾」だが、単純な比較関数の符号反転ではこれを実現できない
**How to avoid:** ソート関数を2段階に分ける: (1) null/非nullをpartition、(2) 非null部分のみにdirectionを適用、(3) null部分を末尾に結合
**Warning signs:** null値カードが先頭に表示される、ソート方向切替時にnull値の位置が変わる

### Pitfall 3: plugin-store永続化のsave()忘れ
**What goes wrong:** `store.set()`だけではメモリ上の変更のみ。`store.save()`を呼ばないとディスクに書き込まれない
**Why it happens:** settingsStorage.tsのコメントにも「CRITICAL: must call save()」と記載されている通り、落とし穴が存在
**How to avoid:** sortStorage.tsでsaveSettingsと同じset→saveパターンを厳守。テストでsave()呼び出しを検証
**Warning signs:** アプリ再起動後にソート設定が初期状態に戻る

### Pitfall 4: localeCompare使用時のundefined/null安全性
**What goes wrong:** `null.name`や`undefined.localeCompare()`でランタイムエラー
**Why it happens:** assignee === nullの場合、`issue.assignee.name`でTypeError
**How to avoid:** compareFnの冒頭でnullチェックを行い、早期returnでnull値を末尾に送る
**Warning signs:** ソート有効時にassignee未割当カードが表示されるとクラッシュ

### Pitfall 5: useMemo依存配列にsortField/sortDirectionを含め忘れ
**What goes wrong:** ソート設定を変更してもビューが再計算されない
**Why it happens:** Board.tsxのuseMemoの依存配列にsortStore状態を追加し忘れる
**How to avoid:** useMemoの依存配列にsortField, sortDirectionを明示的に含める
**Warning signs:** ソートドロップダウンを変更してもカード順が変わらない

### Pitfall 6: SortDropdownでFilterDropdownのaria-multiselectable="true"を踏襲
**What goes wrong:** ソートは単一選択なのにスクリーンリーダーが「複数選択可能」と読み上げる
**Why it happens:** FilterDropdownのコードをコピーして改造する際にaria属性を変更し忘れ
**How to avoid:** SortDropdownではaria-multiselectable を削除または"false"に設定。role="listbox"は維持しつつ、選択は排他的に
**Warning signs:** アクセシビリティテストで指摘される

## Code Examples

### ソートユーティリティ関数（核心ロジック）

```typescript
// Source: プロジェクトパターン（filterUtils.ts参照） + D-07 null末尾ルール
import type { BacklogIssue } from '../types/backlog';
import type { SortField, SortDirection } from '../types/sort';

/**
 * フィルタ適用済みの課題配列にソートを適用する。
 * - field='none': keyId昇順（デフォルト）
 * - D-07: assignee=null, dueDate=nullは常に末尾
 * - D-09: この関数はapplyFilters後の配列に対して呼ぶ
 */
export function applySortToIssues(
  issues: ReadonlyArray<BacklogIssue>,
  field: SortField,
  direction: SortDirection,
): BacklogIssue[] {
  if (field === 'none') {
    return [...issues].sort((a, b) => a.keyId - b.keyId);
  }

  const isNullValue = (issue: BacklogIssue): boolean => {
    if (field === 'assignee') return issue.assignee === null;
    return issue.dueDate === null;
  };

  // Partition: non-null values vs null values
  const withValue: BacklogIssue[] = [];
  const withNull: BacklogIssue[] = [];
  for (const issue of issues) {
    if (isNullValue(issue)) {
      withNull.push(issue);
    } else {
      withValue.push(issue);
    }
  }

  // Sort non-null values
  withValue.sort((a, b) => {
    if (field === 'assignee') {
      // assigneeはnon-null確定（partition済み）
      const cmp = a.assignee!.name.localeCompare(b.assignee!.name, 'ja');
      return direction === 'asc' ? cmp : -cmp;
    }
    // dueDate: ISO 8601文字列なので文字列比較でOK
    const cmp = a.dueDate!.localeCompare(b.dueDate!);
    return direction === 'asc' ? cmp : -cmp;
  });

  // null値は常に末尾（D-07）。null同士はkeyId順で安定ソート
  withNull.sort((a, b) => a.keyId - b.keyId);

  return [...withValue, ...withNull];
}
```

### plugin-store永続化パターン

```typescript
// Source: settingsStorage.ts確立済みパターン [VERIFIED: settingsStorage.ts]
import { load } from '@tauri-apps/plugin-store';
import type { SortConfig } from '../types/sort';

const STORE_FILE = 'settings.json';  // 同じファイル内にキーを分けて格納
const SORT_KEY = 'sort';

export async function loadSortConfig(): Promise<SortConfig | null> {
  const store = await load(STORE_FILE, { autoSave: false });
  const config = await store.get<SortConfig>(SORT_KEY);
  return config ?? null;
}

export async function saveSortConfig(config: SortConfig): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: false });
  await store.set(SORT_KEY, config);
  await store.save();  // CRITICAL: must call save()
}
```

### SortDropdownコンポーネント骨格

```typescript
// Source: FilterDropdown.tsxのUIパターン + 単一選択への変更
// D-02: FilterDropdownと同じUIパターン、D-03: 3つの選択肢
interface SortDropdownProps {
  field: SortField;
  onSelect: (field: SortField) => void;
}

const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: 'none', label: 'ソートなし' },
  { value: 'assignee', label: '担当者順' },
  { value: 'dueDate', label: '期限日順' },
];

// UIはFilterDropdownと同じドロップダウンスタイルだが、
// チェックボックスではなくラジオ的選択（選択時にパネルを閉じる）
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Array.sort()直接使用 | toSorted() (ES2023) | 2023年 | toSorted()はコピーを返すため安全だが、TypeScript targetがES2020の場合は[...arr].sort()を使用 |

**注意:** プロジェクトのtsconfig.jsonターゲットがES2020+であるため、Array.prototype.toSorted()は使用不可の可能性が高い。`[...issues].sort()`パターンを推奨。 [ASSUMED]

## Assumptions Log

> plannerとdiscuss-phaseがユーザー確認すべきとみなす項目。

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | tsconfig.jsonのtargetがES2020+であるためtoSorted()が使えない | State of the Art | `[...arr].sort()`で問題なく対応可能なので影響は軽微 |
| A2 | settings.jsonに'sort'キーを追加しても既存の'connection'キーに影響しない | Code Examples (sortStorage) | plugin-storeはキー単位で独立管理されるため問題ないはず。settingsStorage.tsのload()パターンから確認済み |

**A2について追加検証:** settingsStorage.tsでは`store.get<ConnectionSettings>(SETTINGS_KEY)`で特定キーのみ取得しており、同一ファイル内に別キーを追加しても影響なし。plugin-storeのload()はファイル全体をロードするが、get()はキー単位なので安全。 [VERIFIED: settingsStorage.ts]

## Open Questions

1. **SortDropdownをFilterDropdownから派生するか、完全新規か**
   - What we know: FilterDropdownはmultiselect（Set<>ベース、チェックボックスUI）。SortDropdownは単一選択（ラジオ的、選択時パネル閉じ）
   - What's unclear: コードの共通化度合い。CSSは流用可能だが、JSXロジックは異なる
   - Recommendation: SortDropdownを新規コンポーネントとして作成し、FilterDropdownのCSS Module（.trigger, .panel, .option等）を参考にスタイルを統一。JSXはシンプルに新規実装（選択肢が3つ固定なので複雑さが低い）

2. **sortStoreのsetField/toggleDirection呼び出し時のsaveSortConfig**
   - What we know: settingsStore.saveToStorage()はexplicit呼び出し（ユーザーが保存ボタンを押す）。ソートは即時反映が望ましい
   - What's unclear: saveSortConfigの呼び出しタイミング（アクション内でfire-and-forget vs debounce）
   - Recommendation: setFieldとtoggleDirectionのアクション内で即時fire-and-forget呼び出し。ソート変更の頻度は低いためdebounce不要。エラー時はconsole.errorせず静かに失敗（非クリティカル）

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.3 + React Testing Library 16.3.2 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/utils/sortUtils.test.ts src/stores/sortStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SORT-01 | 担当者順ソート | unit | `npx vitest run src/utils/sortUtils.test.ts -x` | -- Wave 0 |
| SORT-02 | 期限日順ソート | unit | `npx vitest run src/utils/sortUtils.test.ts -x` | -- Wave 0 |
| SORT-03 | 昇順/降順切替 | unit + component | `npx vitest run src/stores/sortStore.test.ts src/components/SortDropdown/SortDropdown.test.tsx -x` | -- Wave 0 |
| SORT-04 | 設定永続化 | unit | `npx vitest run src/services/sortStorage.test.ts src/stores/sortStore.test.ts -x` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/utils/sortUtils.test.ts src/stores/sortStore.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/utils/sortUtils.test.ts` -- SORT-01, SORT-02, SORT-03のロジックテスト
- [ ] `src/stores/sortStore.test.ts` -- ストアの状態遷移・immutabilityテスト
- [ ] `src/services/sortStorage.test.ts` -- plugin-store永続化テスト
- [ ] `src/components/SortDropdown/SortDropdown.test.tsx` -- UIコンポーネントテスト
- [ ] `src/components/FilterBar/FilterBar.test.tsx` -- 既存テストにソートUI統合テスト追加

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | -- |
| V3 Session Management | no | -- |
| V4 Access Control | no | -- |
| V5 Input Validation | yes | SortField型をstring literalで制限。ドロップダウン選択値のバリデーション |
| V6 Cryptography | no | -- |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| plugin-storeへの不正値injection | Tampering | loadSortConfig時に型バリデーション。不正値はデフォルト値にフォールバック |

**Note:** ソート機能はクライアントサイドのみ（APIコール不要）。セキュリティリスクは極めて低い。plugin-storeから読み込んだ値のバリデーションのみ注意。

## Project Constraints (from CLAUDE.md)

- **言語:** 日本語で応答。コード識別子・技術用語は英語
- **Immutability:** Zustand set()でスプレッド構文。Array.sort()は`[...arr].sort()`でコピーしてから
- **ファイル命名:** PascalCase.tsx（コンポーネント）、camelCase.ts（サービス・ストア・ユーティリティ）
- **エラー処理:** discriminated union `{ success, data?, error? }`。UIは日本語エラーメッセージ
- **テスト:** TDD（RED -> GREEN -> IMPROVE）。カバレッジ80%以上。テストファイルはソースと同階層
- **Tauri mock:** tests/setup.tsでTauriプラグインをグローバルモック
- **アイコン:** 外部アイコンライブラリ不使用、Unicode文字のみ（上/下矢印も Unicode）
- **CSS:** CSS Modules + design tokens（global.css custom properties）
- **store:** selector-based subscriptions。`useFilterStore((s) => s.field)`パターン
- **DnD:** ソートモード中はレーン間DnDは有効（Phase 8でレーン内並べ替えとの排他制御が入る）

## Sources

### Primary (HIGH confidence)
- filterStore.ts -- Zustand storeパターン、Set<>ベース状態管理
- filterUtils.ts -- applyFilters純粋関数パターン、localeCompare('ja')使用
- settingsStorage.ts -- plugin-store永続化パターン（load/set/save）
- FilterDropdown.tsx -- ドロップダウンUIパターン、アクセシビリティ属性
- Board.tsx -- filteredView useMemoパイプライン、フィルタ適用フロー
- backlog.ts -- BacklogIssue型定義（assignee, dueDate, keyIdフィールド）
- FilterBar.tsx -- FilterBar構造、ソートコントロール統合先
- FilterBar.module.css -- FilterBarスタイリング、dropdowns/chips構造
- FilterDropdown.module.css -- ドロップダウンスタイリングパターン
- package.json -- 全依存パッケージのバージョン確認
- global.css -- CSS design tokens一覧
- tests/setup.ts -- グローバルモック構成
- vitest.config.ts -- テスト設定

### Secondary (MEDIUM confidence)
- CONVENTIONS.md -- コーディング規約（Phase 1策定時の計画ドキュメント）

### Tertiary (LOW confidence)
- なし

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 全て既存プロジェクト依存で新規パッケージ不要 [VERIFIED: package.json]
- Architecture: HIGH -- Phase 6のフィルタリングパターンをほぼ完全に踏襲 [VERIFIED: filterStore.ts, filterUtils.ts, Board.tsx]
- Pitfalls: HIGH -- 実コードベースの分析に基づく具体的な注意点 [VERIFIED: 各ソースファイル]

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (安定した内部アーキテクチャ)
