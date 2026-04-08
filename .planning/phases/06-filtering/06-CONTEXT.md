# Phase 6: フィルタリング - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

ステータス・担当者・カテゴリの3軸で課題カードを複数選択OR条件でフィルタリングし、大量のカードから必要な情報に素早くアクセスできるようにする。フィルタバーUI、フィルタチップ表示、非表示レーンの件数表示を含む。

</domain>

<decisions>
## Implementation Decisions

### フィルタバーの配置・レイアウト
- **D-01:** フィルタバーはBoardHeaderの下に独立行として配置する。3つのドロップダウン（ステータス・担当者・カテゴリ）を横並びに配置し、右側にアクティブなフィルタチップと一括クリアボタンを表示する
- **D-02:** フィルタチップはドロップダウンと同じ行の右側に横並びで表示する。チップが多い場合は折り返し可

### フィルタ選択UIの形式
- **D-03:** 各フィルタはドロップダウン+チェックボックス形式。ボタンクリックでチェックボックス付きリストが開き、複数選択可能
- **D-04:** チェック即反映方式 — チェックボックスをクリックした瞬間にフィルタが適用される。「適用」ボタンは不要。ドロップダウンは開いたままで追加選択可能、外クリックで閉じる

### フィルタ選択肢の生成元
- **D-05:** 選択肢はBoardData（取得済みの全カード）から動的に抽出する。追加APIコール不要。該当0件の選択肢は自動的にリストに表示されない
- **D-06:** 担当者ドロップダウンには「未割当」選択肢を含める。assignee === nullのカードを絞り込める

### DnD中・移動後のフィルタ挙動
- **D-07:** フィルタ適用中もレーン全体がドロップターゲットとして機能する。非表示カードがあるレーンへもドロップ可能
- **D-08:** DnDはマイルストーン間移動でありフィルタ軸（ステータス・担当者・カテゴリ）は変わらないため、移動後のフィルタ一致/不一致は変化しない
- **D-09:** boardStore.dataは常にraw unfiltered（v1.1 research決定済み）。フィルタはビュー層のみで適用するため、DnDのID解決は壊れない

### Claude's Discretion
- ドロップダウンリスト内の選択肢の並び順（表示順、アルファベット順など）
- フィルタチップの色・スタイリング詳細
- 「N件が非表示」メッセージの正確な文言とスタイル
- フィルタバーコンポーネントの内部構造（分割粒度）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FILT-01〜FILT-05の要件定義

### Architecture
- `.planning/codebase/CONVENTIONS.md` — コーディング規約、Zustandパターン、CSS Modules、コンポーネント構造
- `.planning/codebase/STRUCTURE.md` — ディレクトリ構造、ファイル命名規則

### Existing Code
- `src/stores/boardStore.ts` — BoardData管理、フィルタはここのdataに対してビュー層で適用
- `src/types/backlog.ts` — BacklogIssue（status, assignee, category[]フィールド）
- `src/types/board.ts` — BoardData, MilestoneWithIssues
- `src/components/BoardHeader/BoardHeader.tsx` — 既存ヘッダー（フィルタバーの直上に位置）
- `src/components/Board/Board.tsx` — DndContext shell（フィルタとDnDの統合ポイント）
- `src/components/Lane/Lane.tsx` — レーン描画（フィルタ適用後のカード表示）
- `src/components/IssueCard/IssueCard.tsx` — カード描画（フィルタ対象）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BacklogIssue`型: `status`, `assignee`, `category[]`フィールドがフィルタ軸として利用可能
- `BoardData`構造: `milestones[].issues[]`と`unassignedIssues[]`から全カードを走査してフィルタ選択肢を抽出可能
- `StatusBadge`コンポーネント: ステータス表示の色・スタイルを既に持っている。フィルタチップのスタイル参考に
- CSS design tokens: `global.css`のカスタムプロパティ（色、スペーシング、影など）を全UIに適用

### Established Patterns
- Zustand store: `set()`でスプレッド構文による新オブジェクト生成（immutable update）
- CSS Modules: コンポーネントごとに`.module.css`ファイル
- コンポーネント構造: PascalCase/ディレクトリ、.tsx + .module.css + .test.tsx
- Unicode文字のみ（外部アイコンライブラリ不使用）

### Integration Points
- `Board.tsx`: フィルタ状態を管理し、Lane/IssueCardにフィルタ済みデータを渡すハブ
- `BoardHeader.tsx`: フィルタバーの直上。フィルタバーは独立コンポーネントとしてBoardHeaderの下に配置
- `boardStore.ts`: フィルタ状態をstoreに持つか、Board内のuseStateで管理するかはplanner判断

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 06-filtering*
*Context gathered: 2026-04-08*
