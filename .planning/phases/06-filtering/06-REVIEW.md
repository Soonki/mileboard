---
phase: 06-filtering
reviewed: 2026-04-09T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - src/types/filter.ts
  - src/utils/filterUtils.ts
  - src/utils/filterUtils.test.ts
  - src/stores/filterStore.ts
  - src/stores/filterStore.test.ts
  - src/global.css
  - src/components/FilterDropdown/FilterDropdown.tsx
  - src/components/FilterDropdown/FilterDropdown.module.css
  - src/components/FilterDropdown/FilterDropdown.test.tsx
  - src/components/FilterChip/FilterChip.tsx
  - src/components/FilterChip/FilterChip.module.css
  - src/components/FilterChip/FilterChip.test.tsx
  - src/components/FilterBar/FilterBar.tsx
  - src/components/FilterBar/FilterBar.module.css
  - src/components/FilterBar/FilterBar.test.tsx
  - src/App.tsx
  - src/App.module.css
  - src/components/Board/Board.tsx
  - src/components/Board/Board.module.css
  - src/components/Board/Board.test.tsx
  - src/components/Lane/Lane.tsx
  - src/components/Lane/Lane.module.css
  - src/components/Lane/Lane.test.tsx
findings:
  critical: 0
  high: 1
  medium: 5
  low: 5
  total: 11
status: issues_found
---

# Phase 6: Code Review Report (フィルタリング)

**Reviewed:** 2026-04-09
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Phase 6のフィルタリング機能（基盤層・UI層・統合層）に対してstandardレベルのコードレビューを実施しました。全体として、アーキテクチャはD-09決定（`boardStore.data`はraw unfilteredのまま、ビュー層のみでフィルタを適用）を忠実に守っており、`Board.tsx`のDnDハンドラ（`handleDragStart`, `handleDragOver`, `handleDragEnd`）は全て`data`（unfiltered）を参照しているため、DnDのID解決は壊れません。

`filterStore`の全操作は`new Set(...)`による新インスタンス生成で不変性を保持しており、Zustandの参照等価比較が正しく動作します。`applyFilters`は軸間AND・軸内OR条件を正しく実装しています。

ただし以下の問題が見つかりました：

- **HIGH**: `FilterChip`のキーボードイベントがbutton要素とspan要素の両方で発火し、`onRemove`が二重呼び出しされる潜在バグ
- **MEDIUM**: `FilterBar`の`Set.has(o.id as number)`型アサーション（null安全性の型表現が不正確）、`FilterDropdown`の空options時のArrowDownでのNaN汚染、Escape閉鎖後のフォーカス復元なし、など複数のアクセシビリティ・型安全性問題
- **LOW**: テストカバレッジの抜け漏れ、未使用import、CSSセレクタの特異度など軽微な品質改善

Critical（セキュリティ脆弱性・クラッシュ）は検出されませんでした。XSSリスクは全てReactの自動エスケープで緩和されており、ハードコードされた秘密情報もありません。

---

## High

### HI-01: FilterChipでonRemoveが二重呼び出しされる可能性

**File:** `src/components/FilterChip/FilterChip.tsx:9-33`

**Issue:**
`FilterChip`はspan（tabIndex=0）の中にbutton要素を含み、両方にキーボードハンドラが設定されています。ユーザーがbutton要素にTabフォーカスを移動してEnterキーを押した場合、以下の順で2回`onRemove()`が呼ばれます：

1. ブラウザがEnterキーを受け取り、buttonの`click`イベントを発火 → `onRemove()`（1回目）
2. 同一の`keydown`イベントがDOMツリーをバブリングし、親span要素の`onKeyDown`に到達 → `e.key === 'Enter'`にマッチし`onRemove()`（2回目）

現在のテスト（L55-77）はchip span要素に直接`.focus()`を当ててEnter/Deleteを送っているため、button要素にフォーカスが無いこのケースでは二重起動を検出できません。実運用でTabキーでフォーカスをchipから内側ボタンに移動した後にEnterを押すと症状が発現します。

**Fix:**
キーボードハンドラをspanではなくbutton側に集約するか、onKeyDown内で`event.target`がspan自身かどうかをチェックしてbutton発信のイベントを無視します。

```typescript
export function FilterChip({ label, onRemove }: FilterChipProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    // buttonからバブリングしてきたEnter/Deleteは無視
    // (buttonのEnter/Spaceはネイティブにclick→onRemoveを発火するため二重起動を回避)
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === 'Delete') {
      e.preventDefault();
      onRemove();
    }
  };

  return (
    <span className={styles.chip} tabIndex={0} onKeyDown={handleKeyDown}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={`${label}のフィルタを解除`}
      >
        {'\u00D7'}
      </button>
    </span>
  );
}
```

併せてregressionテストを追加：

```typescript
it('does not call onRemove twice when Enter is pressed on inner button', async () => {
  const onRemove = vi.fn();
  const user = userEvent.setup();
  render(<FilterChip {...defaultProps} onRemove={onRemove} />);
  const removeButton = screen.getByRole('button', { name: '処理中のフィルタを解除' });
  removeButton.focus();
  await user.keyboard('{Enter}');
  expect(onRemove).toHaveBeenCalledTimes(1);
});
```

---

## Medium

### ME-01: FilterBarで `Set.has(o.id as number)` の型アサーションは型安全ではない

**File:** `src/components/FilterBar/FilterBar.tsx:76, 94`

**Issue:**
`FilterOption.id`は`number | null`型ですが、statusとcategoryのチップレンダリングで`statusIds.has(o.id as number)`と`categoryIds.has(o.id as number)`という型アサーションが使われています。

```typescript
statusOptions.filter((o) => statusIds.has(o.id as number))
categoryOptions.filter((o) => categoryIds.has(o.id as number))
```

`Set<number>.has(null)`は実行時にはfalseを返すだけで実害はなく、かつ現在の`extractStatusOptions`/`extractCategoryOptions`は`id: null`を含まないオプションを返すため（`FilterOption.id`はassigneeのみ`null`を取り得る）、論理的には安全です。しかし：

1. 型アサーションは将来的な型変更（例：`extractStatusOptions`が`null`を含むoptionを返すようにリファクタされた場合）の型チェックによる保護を失わせる
2. assigneeOptionsのハンドリング（L85）は`as number`なしで正常に動作しており、同じパターンを他軸に適用できる
3. CLAUDE.mdの方針「immutability and type safety」に反する

**Fix:**
型ガードでnullを除外するか、assigneeと同じく`as number`を取り除いて`Set<number>`の型を`Set<number | null>`に緩和します。一番直接的なのは型ガード：

```typescript
{statusOptions
  .filter((o): o is FilterOption & { id: number } => o.id !== null && statusIds.has(o.id))
  .map((o) => (
    <FilterChip
      key={`status-${o.id}`}
      label={o.label}
      onRemove={() => removeFilter('status', o.id)}
    />
  ))}
{categoryOptions
  .filter((o): o is FilterOption & { id: number } => o.id !== null && categoryIds.has(o.id))
  .map((o) => (
    <FilterChip
      key={`category-${o.id}`}
      label={o.label}
      onRemove={() => removeFilter('category', o.id)}
    />
  ))}
```

---

### ME-02: FilterDropdownで空オプション時のArrowDownがNaNを発生させる

**File:** `src/components/FilterDropdown/FilterDropdown.tsx:63, 68-70`

**Issue:**
options配列が空の時にArrowDownキーを押すと以下の計算が発生します：

```typescript
setFocusedIndex((prev) => (prev + 1) % options.length);
// (-1 + 1) % 0 = 0 % 0 = NaN
```

ArrowUp側（L68-70）は`prev <= 0 ? options.length - 1 : prev - 1`で`-1`を返し、同じく不正な状態になります。

現在はpanel内に`options.length === 0`時に「選択肢なし」メッセージだけが表示されるため、NaNがビジブルなバグとして顕在化しません。しかし将来的に`focusedIndex`を他用途で使うとNaN汚染が広がる可能性があります。

**Fix:**
ハンドラの冒頭でearly returnを追加します。

```typescript
const handlePanelKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    return;
  }
  // 空options時のキーボードナビゲーション無効化
  if (options.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setFocusedIndex((prev) => (prev + 1) % options.length);
    return;
  }
  // ... rest unchanged
};
```

---

### ME-03: FilterDropdownでEscape閉鎖後にtriggerへフォーカスが戻らない

**File:** `src/components/FilterDropdown/FilterDropdown.tsx:23-26, 56-59`

**Issue:**
`close()`関数はisOpenをfalseにしてpanelをunmountするだけで、キーボード操作中にEscapeを押した場合のフォーカス管理をしていません。WAI-ARIA Authoring Practicesの[Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)ではドロップダウン閉鎖時にtrigger buttonへフォーカスを戻すことが推奨されています。

現状、ユーザーがキーボードでドロップダウンを操作→Escapeで閉じると、フォーカスが`document.body`に戻り、Tabキーで再度triggerまで移動する必要があります。キーボードユーザーのアクセシビリティが損なわれます。

**Fix:**
triggerのrefを追加し、Escapeで閉じる際にフォーカスを戻します。

```typescript
const triggerRef = useRef<HTMLButtonElement>(null);

const close = useCallback(() => {
  setIsOpen(false);
  setFocusedIndex(-1);
}, []);

// panelのEscape処理にフォーカス復元を追加
const handlePanelKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
    triggerRef.current?.focus();
    return;
  }
  // ...
};

// trigger buttonにrefを設定
<button ref={triggerRef} /* ... */>
```

クリック外による閉鎖では意図的なフォーカス移動なのでフォーカスを戻さない方が自然です。Escape時のみに限定します。

---

### ME-04: FilterBarで `hasActiveFilters` selectorが関数参照を購読している

**File:** `src/components/FilterBar/FilterBar.tsx:23, 50`

**Issue:**
```typescript
const hasActiveFilters = useFilterStore((s) => s.hasActiveFilters);
// ...
const activeFilters = hasActiveFilters();
```

Zustandで関数セレクタを使用すると、購読される値は関数参照そのものです。`hasActiveFilters`は`create`内で定義された関数なのでstoreが作り直されない限り参照は変わらず、このselectorの変化ではrerenderが起きません。

本実装ではstatusIds/assigneeIds/categoryIdsもselectorで購読しているため、Setが更新されるとrerenderが発生し、その時に`hasActiveFilters()`が再評価されます。結果として動作には問題ありませんが：

1. `hasActiveFilters`関数を呼ぶまでコンポーネント内で`activeFilters`の最新値が確定しない
2. 他のselectorに依存する暗黙的な正しさに頼っている（設計的な脆弱性）
3. 単純に`statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0`をコンポーネント内で計算した方が明示的

**Fix:**
コンポーネント内で明示的に計算し、`hasActiveFilters` selectorを削除します。

```typescript
// hasActiveFilters selectorを削除
const hasActiveFilters =
  statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0;

// 使用箇所
{hasActiveFilters && (
  <button /* ... */>すべてクリア</button>
)}
```

storeに`hasActiveFilters()`メソッドを残す理由がない場合は`filterStore.ts`から削除してもよいです。残す場合はテストは影響を受けません。

---

### ME-05: Board.test.tsxでfilterStoreのモックが不完全

**File:** `src/components/Board/Board.test.tsx:25-32`

**Issue:**
Board.tsxは`useFilterStore`から`statusIds`, `assigneeIds`, `categoryIds`のみを購読していますが、filterStoreモックは以下の状態でフィルタ有効時のテストケース（hiddenCount > 0のLane）をカバーしていません。

```typescript
vi.mock('../../stores/filterStore', () => ({
  useFilterStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      statusIds: new Set(),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    }),
}));
```

D-09コンプライアンス（フィルタ適用中もDnDハンドラがunfiltered dataを使う）の保証テストが不在であり、将来のリグレッションで「フィルタ適用中にDnDが壊れる」バグが検出できません。

**Fix:**
mockFilterStateを可変にし、フィルタ適用時のBoardビヘイビア（Laneに正しいフィルタ済みissuesとhiddenCountが渡される、DnDハンドラはunfiltered dataを使う）を検証するテストを追加します。

```typescript
let mockFilterState = {
  statusIds: new Set<number>(),
  assigneeIds: new Set<number | null>(),
  categoryIds: new Set<number>(),
};

vi.mock('../../stores/filterStore', () => ({
  useFilterStore: (selector: (s: typeof mockFilterState) => unknown) =>
    selector(mockFilterState),
}));

// 追加テスト: フィルタ適用時のhiddenCount
it('passes hiddenCount to Lane when filter is active and matches nothing', () => {
  mockFilterState.statusIds = new Set([999]); // 存在しないstatus
  mockStoreState = { ...mockStoreState, status: 'loaded', data: {
    milestones: [{
      milestone: { id: 1, /* ... */ },
      issues: [/* ... 1件のissue */],
    }],
    unassignedIssues: [],
  }};
  // ... Lane モックにhiddenCountを受け取らせて検証
});
```

---

## Low

### LO-01: FilterDropdown.test.tsxで`within`のimportが未使用

**File:** `src/components/FilterDropdown/FilterDropdown.test.tsx:2, 244`

**Issue:**
L2で`within`をimportし、L244で使用されています：
```typescript
const options = within(listbox).getAllByRole('option');
```
使用は1箇所のみで、その次のテスト（L248-255のArrowUp）は`screen.getAllByRole('option')`を使っています。一貫性が無いので片方に統一すると可読性が向上します。ただしこれはテストの動作には影響しません。

**Fix:**
`within(listbox)`に統一するか、`screen`に統一します（listboxが複数ある場合は`within`推奨だが、このテストでは単一のFilterDropdownをレンダリングしているため`screen`で十分）。

---

### LO-02: global.cssに`--radius-badge`が重複定義

**File:** `src/global.css:47, 49`

**Issue:**
`--radius-badge: 4px;`がL47とL49で重複して定義されています。Phase 6の変更ではありませんが、Phase 6の作業時に気付くべき既存の問題です。

```css
--radius-input: 6px;
--radius-badge: 4px;    /* L47 */
--radius-card: 8px;
--radius-badge: 4px;    /* L49 重複 */
```

**Fix:**
L49の重複行を削除します。

---

### LO-03: filterStore.removeFilterの型設計が不正確

**File:** `src/stores/filterStore.ts:11, 54-69`

**Issue:**
`removeFilter`のシグネチャは`(axis: 'status' | 'assignee' | 'category', id: number | null)`ですが、`status`と`category`軸に対して`id: null`を受け取っても意味がありません。結果として実装内で`as number`キャストが必要になっています（L58, L67）。

```typescript
if (axis === 'status') {
  const next = new Set(state.statusIds);
  next.delete(id as number);  // null を渡されたら delete(null) となりno-op
  return { statusIds: next };
}
```

**Fix:**
オーバーロードかdiscriminated unionで型を絞り込みます。

```typescript
removeFilter: (
  axis: 'status' | 'assignee' | 'category',
  id: number | null,
) => void;

// 実装:
removeFilter: (axis, id) =>
  set((state) => {
    if (axis === 'status') {
      if (id === null) return {}; // no-op
      const next = new Set(state.statusIds);
      next.delete(id);
      return { statusIds: next };
    }
    // ... assignee/category同様
  }),
```

あるいはaxis別の個別メソッド（`removeStatus`, `removeAssignee`, `removeCategory`）に分解します。

---

### LO-04: FilterBar.module.cssの`.clearAll`がdropdown相対の配置をしていない

**File:** `src/components/FilterBar/FilterBar.module.css:29-42`

**Issue:**
`.clearAll`と`.chips`はflex container内の兄弟要素ではなく、`.chips`の子要素として配置されています（FilterBar.tsx L102）。`.chips`は`flex-wrap: wrap`なので、チップが多い時に`.clearAll`がwrapされた新行に配置されます。UI-SPECで「チップの右側」配置なら意図通りですが、`margin-left: var(--space-sm)`が効かない場合があります（flex wrap時の1行目）。

**Fix:**
軽微なスタイル改善なので、現状のまま残してOKです。UX優先度が低いと判断します。視覚的に気になる場合のみ、`.clearAll`を`.chips`の外に出して独立した`.actions`コンテナにします。

---

### LO-05: applyFiltersを複数回呼ばずにmemoizeできる

**File:** `src/components/Board/Board.tsx:77-98`

**Issue:**
`filteredView` useMemo内で`applyFilters`が`unassignedIssues`と各マイルストーンの`issues`に対して最大N+1回呼び出されます。`hiddenCount`計算のために元の配列長との差分を取っているため、同じ結果を2回計算していません（一度結果を`filtered`に保持してから`length`を引いている）。よって問題は最小限ですが、複数マイルストーンで新しい配列が毎回作られます。

パフォーマンスは "out of v1 scope" なので**削除する必要はありません**。コードの可読性として、現状の実装はD-09準拠かつ明示的で妥当です。

**Fix:**
変更不要。記録目的のみ。

---

## Positive Observations

レビューで明確に良い実装と判断した点：

- **D-09コンプライアンス完全**: Board.tsxの`handleDragStart`, `handleDragOver`, `handleDragEnd`は全て`data`（unfiltered）を参照しており、`filteredView`はLaneレンダリングにのみ使用。DnDのID解決は絶対に壊れない実装になっている
- **filterStore不変性**: 全てのtoggle/remove/clearAll操作が`new Set(...)`を使っており、Zustandの参照等価比較が正しく機能する
- **applyFiltersのロジック**: 軸間AND / 軸内ORが仕様通り。空Set時のスキップ処理も正しい
- **日本語エラーメッセージ**: 「選択肢なし」「未割り当て」「すべてクリア」「N件がフィルタで非表示」等、全ユーザー向け文言が日本語化されている（CLAUDE.md準拠）
- **ARIA属性**: `aria-haspopup="listbox"`, `aria-expanded`, `aria-multiselectable="true"`, `role="option"`, `aria-selected`, `role="toolbar"`, `aria-label`が適切に設定されている
- **型安全性**: `any`使用なし、`FilterState`と`FilterOption`は明示的なinterface定義
- **テストカバレッジ**: applyFilters/extract*Options/filterStore/FilterDropdown/FilterChip/FilterBarに対して包括的なユニットテストが存在
- **XSSリスクなし**: `dangerouslySetInnerHTML`使用なし、全てのユーザー入力はReactの自動エスケープを経由
- **ハードコード秘密情報なし**: APIキー・トークン等の埋め込みなし
- **`readonly`入力型**: `applyFilters`が`ReadonlyArray<BacklogIssue>`を受け取り、呼び出し側の配列不変性を守っている

---

_Reviewed: 2026-04-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
