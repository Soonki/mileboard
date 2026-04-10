# Phase 7: ソート - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

レーン内のカードをソート基準（担当者順・期限日順）と方向（昇順/降順）で並べ替えできるようにし、ソート設定をplugin-storeで永続化する。ソートUIはFilterBarの右側に統合配置する。

</domain>

<decisions>
## Implementation Decisions

### ソートUIの配置・形式
- **D-01:** ソートコントロールはFilterBarの右側に配置する。フィルタドロップダウン群とソートコントロールの間にセパレーターを入れて区切る
- **D-02:** ソート基準の選択はドロップダウン形式。FilterDropdownと同じUIパターンを踏襲し統一感を保つ
- **D-03:** ドロップダウンの選択肢は「ソートなし（課題ID順）」「担当者順」「期限日順」の3つ
- **D-04:** 「ソートなし」を選択するとデフォルトの課題ID順（keyId）に戻る

### ソート方向の切替操作
- **D-05:** ソートドロップダウンの横に↑/↓トグルボタンを配置。クリックで昇順⇔降順を切り替える
- **D-06:** デフォルトのソート方向は昇順。担当者はA→Z、期限日は早い→遅い順

### null値のソート順
- **D-07:** assignee=null（未割当）およびdueDate=null（期限なし）のカードは、昇順でも降順でも常にリスト末尾に配置する

### ソートの適用範囲
- **D-08:** ソートは全レーンに一括適用する（フィルタと同じパターン）。レーンごとの個別ソートは不要

### フィルタとソートの共存
- **D-09:** ソートはフィルタ適用後のカードに対して適用する（フィルタ → ソートの順）
- **D-10:** boardStore.dataは常にraw unfiltered（Phase 6 D-09引き継ぎ）。ソートもビュー層のみで適用

### Claude's Discretion
- ソートドロップダウンのスタイリング詳細（FilterDropdownとの統一はD-02で方針決定済み）
- セパレーターの視覚的デザイン（縦線、スペース等）
- ↑/↓ボタンの具体的なUnicode文字選択
- sortStore or filterStoreへの統合 vs 独立store — 内部構造はplanner判断

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — SORT-01〜SORT-04の要件定義

### Architecture
- `.planning/codebase/CONVENTIONS.md` — コーディング規約、Zustandパターン、CSS Modules
- `.planning/codebase/STRUCTURE.md` — ディレクトリ構造、ファイル命名規則

### Prior Phase Context
- `.planning/phases/06-filtering/06-CONTEXT.md` — FilterBar配置（D-01）、boardStore.data always raw（D-09）、チェック即反映方式（D-04）

### Existing Code
- `src/stores/boardStore.ts` — BoardData管理、raw unfilteredデータ
- `src/stores/filterStore.ts` — フィルタ状態管理パターン（Zustand Set<>ベース）
- `src/components/FilterBar/FilterBar.tsx` — ソートコントロール統合先（右側に追加）
- `src/components/FilterDropdown/FilterDropdown.tsx` — ソートドロップダウンのUIパターン参考
- `src/components/Lane/Lane.tsx` — ソート後のカード表示、SortableContext使用中
- `src/types/backlog.ts` — BacklogIssue（assignee, dueDate, keyIdフィールド）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FilterDropdown`コンポーネント: ドロップダウンUIパターンをソートドロップダウンに流用可能（チェックボックスではなくラジオ的選択に変更）
- `FilterBar`コンポーネント: ソートコントロールの配置先。右側にセパレーター+ソートUIを追加
- `filterStore`: Zustand storeパターン（Set<>ベース）がソートstoreの参考になる
- `BacklogIssue.keyId`: デフォルトソート（課題ID順）に使用するフィールド

### Established Patterns
- Zustand store: `set()`でスプレッド構文による新オブジェクト生成（immutable）
- CSS Modules: コンポーネントごとに`.module.css`ファイル
- コンポーネント構造: PascalCase/ディレクトリ、.tsx + .module.css + .test.tsx
- Unicode文字のみ（外部アイコンライブラリ不使用）— ↑/↓ボタンにも適用

### Integration Points
- `FilterBar.tsx`: ソートコントロールを右側に追加する統合ポイント
- `Board.tsx`または`Lane.tsx`: フィルタ適用後のissues配列にソートロジックを適用するポイント
- `plugin-store`: settingsStoreと同様のパターンでソート設定を永続化

</code_context>

<specifics>
## Specific Ideas

- デフォルト並び順はAPI取得順ではなく課題ID（keyId）順
- ソートドロップダウンの選択肢: 「ソートなし（課題ID順）」がデフォルト表示テキスト

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-sort*
*Context gathered: 2026-04-10*
