# Phase 8: レーン内並べ替え - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

レーン内でカードをDnDして任意の並び順に変更でき、カスタム順序をplugin-storeで永続化する。ソートモード中はレーン内並べ替えを無効化し、レーン間DnD（マイルストーン移動）は有効のまま維持する。

</domain>

<decisions>
## Implementation Decisions

### カスタム順序とソートの関係
- **D-01:** ソートモード中もカスタム順序はplugin-storeに保持される。「ソートなし」に戻すとカスタム順序が復帰する（ソートはカスタム順序を破壊しない）
- **D-02:** カスタム順序が未設定のレーン（初回表示・新規マイルストーン）はデフォルトで課題ID順（keyId）で表示する（Phase 7の「ソートなし（課題ID順）」と一貫）

### カスタム順序の永続化方式
- **D-03:** データ構造は `laneId→issueId[]` マッピング。レーンごとに課題IDの配列を保存する
- **D-04:** 永続化された順序に含まれない新規課題（APIリフレッシュで追加された課題など）はリスト末尾にkeyId順で追加する。既存の手動順序を乱さない

### ソート排他時のUX表現
- **D-05:** ソートモード中はuseSortableのdisabled=trueでレーン内ドラッグを無効化する。カーソルがgrabからdefaultに変わることで自然に気づく。バナーやツールチップは不要
- **D-06:** ソートモード中もレーン間DnD（マイルストーン移動）は有効のまま維持する（ROADMAP制約通り）。レーン内並べ替えのみ無効

### レーン間移動後の順序処理
- **D-07:** カードをレーン間で移動した場合、移動先レーンのカスタム順序の末尾に追加する
- **D-08:** レーン間移動時、移動元レーンのカスタム順序からその課題IDを削除する。両レーンの順序を更新して永続化する

### Claude's Discretion
- reorderStoreの内部構造（独立store vs 既存storeへの統合）
- handleDragEnd内の同一レーン検出とarrayMoveの実装詳細
- plugin-storeへの保存タイミング（即座 vs デバウンス）
- カスタム順序配列と実際のissueリストの差分マージアルゴリズム

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — REORD-01〜REORD-03の要件定義

### Architecture
- `.planning/codebase/CONVENTIONS.md` — コーディング規約、Zustandパターン、CSS Modules
- `.planning/codebase/STRUCTURE.md` — ディレクトリ構造、ファイル命名規則

### Prior Phase Context
- `.planning/phases/06-filtering/06-CONTEXT.md` — boardStore.data always raw unfiltered（D-09）
- `.planning/phases/07-sort/07-CONTEXT.md` — ソートUIの配置（D-01〜D-04）、ソート適用順序（D-09, D-10）、null値末尾配置（D-07）

### Existing Code
- `src/stores/boardStore.ts` — BoardData管理、moveIssue楽観的更新、raw unfilteredデータ
- `src/stores/sortStore.ts` — ソート状態管理（field, direction）。ソートモード検出に使用
- `src/stores/filterStore.ts` — フィルタ状態管理パターン参考
- `src/services/sortStorage.ts` — plugin-store永続化パターン参考（loadSortConfig/saveSortConfig）
- `src/components/Board/Board.tsx` — DndContext, handleDragEnd（現在はレーン間移動のみ）、filteredAndSortedView useMemo
- `src/components/Lane/Lane.tsx` — SortableContext + verticalListSortingStrategy使用中
- `src/components/IssueCard/IssueCard.tsx` — useSortable使用中（disabled=isMultiMilestone）
- `src/utils/sortUtils.ts` — applySortToIssues純粋関数
- `src/types/sort.ts` — SortField, SortDirection型定義

No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SortableContext` + `useSortable`: Lane/IssueCardに既に組み込み済み。レーン内並べ替えのDnD基盤はほぼ揃っている
- `sortStorage.ts`: plugin-store永続化パターン（load/save関数ペア）をカスタム順序の永続化に流用可能
- `sortStore.ts`: Zustand storeパターン（field, direction + loadFromStorage）がreorderStoreの参考に
- `applySortToIssues`: ソートモード検出（field !== 'none'）でレーン内並べ替え無効化の条件判定に使用可能

### Established Patterns
- Zustand store: `set()`でスプレッド構文による新オブジェクト生成（immutable）
- CSS Modules: コンポーネントごとに`.module.css`ファイル
- plugin-store永続化: services/xxxStorage.tsにload/save関数を定義し、storeから呼び出す
- Unicode文字のみ（外部アイコンライブラリ不使用）

### Integration Points
- `Board.tsx handleDragEnd`: 現在は `fromLaneId !== toLaneId` のみ処理。同一レーン内reorderのロジックを追加する主要統合ポイント
- `Board.tsx filteredAndSortedView`: フィルタ→ソートパイプラインの後にカスタム順序を適用するか、ソートなし時のみカスタム順序を適用するかの分岐ポイント
- `IssueCard.tsx useSortable`: disabled条件にソートモード判定を追加する統合ポイント
- `sortStore.ts field`: `field !== 'none'`でソートモード中かを判定し、レーン内並べ替え無効化のトリガーに

</code_context>

<specifics>
## Specific Ideas

- デフォルト並び順はkeyId順（Phase 7と一貫）
- カスタム順序のデータ構造例: `{ "milestone-123": [45, 12, 78, 33], "unassigned": [22, 44] }`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-reorder*
*Context gathered: 2026-04-11*
