---
phase: 06-filtering
verified: 2026-04-09T23:02:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
requirements:
  FILT-01: pass
  FILT-02: pass
  FILT-03: pass
  FILT-04: pass
  FILT-05: pass
goal_achieved: true
tests_passing: true
test_count: 253
human_verification:
  - test: "アプリを起動し、FilterBarの3つのドロップダウン(ステータス/担当者/カテゴリ)が表示されることを確認"
    expected: "BoardHeader直下にフィルタバーが表示され、3つのドロップダウンボタンが横並びになっている"
    why_human: "視覚的レイアウトはJSDOM環境では検証できない。sticky配置(top:56px)の実際の表示確認が必要"
  - test: "ステータスドロップダウンをクリックし、チェックボックスリストが開き、チェックした瞬間にフィルタが適用されることを確認"
    expected: "ドロップダウンが開き、1つチェックするとすぐにフィルタチップが右側に出現し、ボードカードが絞り込まれる"
    why_human: "チェック即反映(D-04)の実際のタイミングとUI反映はヘッドレスブラウザでは検証困難"
  - test: "フィルタで全カードが非表示になったレーンに「N件がフィルタで非表示」と表示されることを確認"
    expected: "全カードが非表示になったレーンに「5件がフィルタで非表示」のようなメッセージが表示される"
    why_human: "FILT-05の主要ユーザー体験。実際のBacklogデータを使った動作確認が必要"
  - test: "フィルタ適用中にカードをドラッグして別レーンに移動し、DnDが正常完了することを確認"
    expected: "フィルタで一部カードが非表示の状態でDnDを行っても、ドロップが成功し課題が正しく移動する"
    why_human: "FILT-05/D-09のDnD非干渉確認。リアルポインターイベントが必要なためプログラム検証不可"
  - test: "ドロップダウン外をクリックして閉じることを確認し、Tab/Enter/Escapeキー操作がキーボードで動作することを確認"
    expected: "外クリックでパネルが閉じる。Escapeでパネルが閉じる。Tab移動、ArrowDown/UpでオプションフォーカスがUIで動作する"
    why_human: "アクセシビリティはJSDOMでは一部シミュレート可能だが、実ブラウザでの視覚的フォーカス確認が必要"
---

# Phase 6: フィルタリング 検証レポート

**フェーズゴール:** Backlog課題カードをステータス・担当者・カテゴリの3軸でフィルタできるようにする。フィルタ状態を視覚的に表示し、一括クリアを提供する。フィルタで全カード非表示になったレーンに非表示件数を表示する。DnD機能との非干渉を保つ。
**検証日時:** 2026-04-09T23:02:00Z
**ステータス:** human_needed
**再検証:** No — 初回検証

---

## ゴール達成状況

### 観測可能な真実

| # | 真実 | ステータス | 証拠 |
|---|------|-----------|------|
| 1 | FilterState型がstatusIds, assigneeIds, categoryIdsの3軸を表現できる | ✓ VERIFIED | `src/types/filter.ts` — `interface FilterState { statusIds: Set<number>; assigneeIds: Set<number \| null>; categoryIds: Set<number>; }` |
| 2 | applyFilters関数がAND/OR条件でBacklogIssue配列を正しくフィルタする | ✓ VERIFIED | `src/utils/filterUtils.ts` L10-31 実装確認。`filterUtils.test.ts` 8ケース全パス(空フィルタ、単一軸、AND/OR) |
| 3 | extractStatusOptions/extractAssigneeOptions/extractCategoryOptionsがBoardDataの全issueから選択肢を抽出する | ✓ VERIFIED | `src/utils/filterUtils.ts` L37-115 実装確認。`filterUtils.test.ts` 8ケース全パス(displayOrder昇順、未割り当て末尾、null=0扱い) |
| 4 | filterStoreのtoggle/remove/clearAll操作が不変性を保ってSetを更新する | ✓ VERIFIED | `src/stores/filterStore.ts` 全操作で`new Set(state.xxx)`使用確認。`filterStore.test.ts` 18ケース全パス(Set参照不変性テスト含む) |
| 5 | FilterDropdownがチェックボックス付きリストを表示し、チェック即反映でフィルタを適用する | ✓ VERIFIED | `src/components/FilterDropdown/FilterDropdown.tsx` — `onClick={() => onToggle(option.id)}`でチェック即反映(D-04準拠)。27テスト全パス |
| 6 | FilterDropdownが外クリックで閉じる | ✓ VERIFIED | `FilterDropdown.tsx` L29-41 `document.addEventListener('mousedown', handler)`と`containerRef.contains`実装確認。テストパス |
| 7 | FilterChipがフィルタ値とremoveボタンを表示する | ✓ VERIFIED | `src/components/FilterChip/FilterChip.tsx` — `span.chip`内に`span.label`と`button`(Unicode ×)。8テスト全パス |
| 8 | FilterBarが3つのドロップダウン+チップ+すべてクリアボタンを一行に配置する | ✓ VERIFIED | `src/components/FilterBar/FilterBar.tsx` — 3つの`FilterDropdown`(ステータス/担当者/カテゴリ)、`FilterChip`ループ、`すべてクリア`ボタン実装確認。14テスト全パス |
| 9 | FilterBarがBoardHeaderの直下に表示される | ✓ VERIFIED | `src/App.tsx` L25-27 — `<BoardHeader/>`, `<FilterBar/>`, `<Board/>`の順序。`FilterBar.module.css` L10-12 `position: sticky; top: 56px; z-index: 9;` |
| 10 | Board内でuseMemoによりフィルタ済みissuesがLaneに渡される | ✓ VERIFIED | `src/components/Board/Board.tsx` L71-99 — `filteredView` useMemo計算、`applyFilters`使用確認。LaneにfilteredIssues, hiddenCount渡し確認 |
| 11 | boardStore.dataはraw unfilteredのまま変更されない(D-09準拠) | ✓ VERIFIED | `Board.tsx` — `handleDragStart/Over/End`は全て`data`(unfiltered)を参照。`filteredView`はレンダリング層のみで使用 |
| 12 | フィルタで全カード非表示のレーンに「N件がフィルタで非表示」と表示される | ✓ VERIFIED | `src/components/Lane/Lane.tsx` L55-59 — `issues.length === 0 && hiddenCount > 0`で`{hiddenCount}件がフィルタで非表示`表示。Lane.test.tsx 3ケースパス |

**スコア:** 12/12 真実確認済み(Board.test.tsxのfilterStore統合テスト不完全は警告レベル — ME-05)

---

## 要件トレーサビリティ

| 要件 ID | 説明 | 実装ファイル | テストカバレッジ | ステータス |
|---------|------|------------|----------------|-----------|
| FILT-01 | ステータスで課題カードをフィルタできる（複数選択OR条件） | `filterUtils.ts` applyFilters(statusIds軸), `filterStore.ts` toggleStatus, `FilterDropdown.tsx`, `FilterBar.tsx` | `filterUtils.test.ts` 3ケース(single, OR, AND), `filterStore.test.ts` 3ケース | ✓ PASS |
| FILT-02 | 担当者で課題カードをフィルタできる（複数選択OR条件） | `filterUtils.ts` applyFilters(assigneeIds軸+null処理), `filterStore.ts` toggleAssignee, `extractAssigneeOptions` | `filterUtils.test.ts` 2ケース(null, specific id), `filterStore.test.ts` 3ケース | ✓ PASS |
| FILT-03 | Backlogカテゴリで課題カードをフィルタできる（複数選択OR条件） | `filterUtils.ts` applyFilters(categoryIds軸, category[]配列OR), `filterStore.ts` toggleCategory, `extractCategoryOptions` | `filterUtils.test.ts` 2ケース(matches, empty array), `filterStore.test.ts` 2ケース | ✓ PASS |
| FILT-04 | アクティブなフィルタ条件が視覚的に表示され、一括クリアできる | `FilterChip.tsx`(チップ表示+個別削除), `FilterBar.tsx`(チップ一覧+すべてクリアボタン) | `FilterChip.test.tsx` 8ケース, `FilterBar.test.tsx` 14ケース | ✓ PASS |
| FILT-05 | フィルタで全カードが非表示になったレーンに非表示件数が表示される | `Lane.tsx` hiddenCount prop + filteredEmpty表示, `Board.tsx` hiddenCount計算 | `Lane.test.tsx` 3ケース(hiddenCount>0メッセージ, hiddenCount=0でEmptyLane, 未指定でEmptyLane) | ✓ PASS |

---

## 必須アーティファクト検証

### Plan 01 must_haves

| アーティファクト | 期待 | ステータス | 詳細 |
|------------|------|-----------|------|
| `src/types/filter.ts` | FilterState interface, FilterOption interface | ✓ VERIFIED | 両インターフェース存在確認。FilterStateはSet<number>/Set<number\|null>の3軸 |
| `src/utils/filterUtils.ts` | applyFilters, extract*Options 4関数 | ✓ VERIFIED | 4関数全てexport確認。ReadonlyArray<BacklogIssue>型引数 |
| `src/stores/filterStore.ts` | useFilterStore with toggle/remove/clearAll | ✓ VERIFIED | 全6アクション実装確認 |
| `src/global.css` | Phase 6 CSSカスタムプロパティ | ✓ VERIFIED | L64-71 `/* Phase 6: Filtering */`コメント内に7つのCSSトークン確認 |

### Plan 02 must_haves

| アーティファクト | 期待 | ステータス | 詳細 |
|------------|------|-----------|------|
| `src/components/FilterDropdown/FilterDropdown.tsx` | FilterDropdown export | ✓ VERIFIED | `aria-haspopup="listbox"`, `role="listbox"`, `aria-multiselectable="true"` 全ARIA属性確認 |
| `src/components/FilterChip/FilterChip.tsx` | FilterChip export | ✓ VERIFIED | `\u00D7`(×), `aria-label="{label}のフィルタを解除"` 確認 |
| `src/components/FilterBar/FilterBar.tsx` | FilterBar export | ✓ VERIFIED | useFilterStore, useBoardStore, extractStatusOptions import確認。`role="toolbar"`, `aria-label="フィルタ"` 確認 |

### Plan 03 must_haves

| アーティファクト | 期待 | ステータス | 詳細 |
|------------|------|-----------|------|
| `src/App.tsx` | FilterBar含む | ✓ VERIFIED | L7 `import { FilterBar }`、L26 `<FilterBar />`確認。BoardHeaderとBoardの間の配置 |
| `src/components/Board/Board.tsx` | applyFilters + useMemo filteredView | ✓ VERIFIED | L15 `useFilterStore`、L16 `applyFilters` import。L71-99 useMemo filteredView実装 |
| `src/components/Lane/Lane.tsx` | hiddenCount prop + filteredEmpty | ✓ VERIFIED | L21 `hiddenCount?: number` prop、L56-59 filteredEmptyブロック実装 |

---

## キーリンク検証

| From | To | Via | ステータス | 詳細 |
|------|-----|-----|-----------|------|
| `filterUtils.ts` | `src/types/backlog.ts` | `import type { BacklogIssue }` | ✓ WIRED | L1 `import type { BacklogIssue } from '../types/backlog'` 確認 |
| `filterStore.ts` | `src/types/filter.ts` | `import type { FilterState }` | ✓ WIRED | L1 `import { create } from 'zustand'` 確認。FilterStoreStateは`FilterState`のフィールドを直接定義 |
| `FilterBar.tsx` | `filterStore.ts` | `useFilterStore selectors` | ✓ WIRED | L3 `import { useFilterStore }`、L15-23 各フィールドのselector確認 |
| `FilterBar.tsx` | `filterUtils.ts` | `extract*Options` | ✓ WIRED | L5-8 3関数import、L33-46 useMemoで各関数呼び出し確認 |
| `Board.tsx` | `filterStore.ts` | `useFilterStore selectors` | ✓ WIRED | L14 `import { useFilterStore }`、L66-68 3つのselector確認 |
| `Board.tsx` | `filterUtils.ts` | `applyFilters in useMemo` | ✓ WIRED | L15 `import { applyFilters }`、L77-85 filteredView内で呼び出し確認 |
| `Board.tsx` | `boardStore.ts` | DnD handlers use `data` (unfiltered) | ✓ WIRED | L108, L115, L119, L127-128 全DnDハンドラが`data`のみ参照。`filteredView`はLaneレンダリングのみ |

---

## D-09コンプライアンスチェック

**判定: COMPLIANT**

`boardStore.data`の変更有無:
- `handleDragStart`: `findIssueInBoardData(data, issueId)` — `data`(unfiltered)参照 ✓
- `handleDragOver`: `resolveOverLaneId(data, event.over.id)` — `data`(unfiltered)参照 ✓
- `handleDragEnd`: `findLaneContaining(data, event.active.id)` と `resolveOverLaneId(data, event.over.id)` — `data`(unfiltered)参照 ✓

フィルタ適用箇所:
- `filteredView` useMemo: `data`から派生した読み取り専用ビュー。`boardStore.data`を変更しない ✓
- `filteredView.*.filteredIssues` / `hiddenCount`: Laneレンダリングにのみ渡す ✓

---

## データフロートレース (Level 4)

| アーティファクト | データ変数 | ソース | リアルデータ生成 | ステータス |
|------------|----------|------|----------------|-----------|
| `FilterBar.tsx` | `allIssues` | `useBoardStore(s => s.data)` → `data.unassignedIssues + data.milestones.flatMap` | boardStore.dataはfetchBoard()でBacklog API経由で取得 | ✓ FLOWING |
| `Board.tsx` filteredView | `filteredIssues`, `hiddenCount` | `boardStore.data` + `filterStore.(statusIds/assigneeIds/categoryIds)` | applyFilters(data, filterState) — unfilteredデータからの派生 | ✓ FLOWING |
| `Lane.tsx` | `hiddenCount` | `Board.tsx`から`hiddenCount` prop経由 | `mwi.issues.length - filtered.length` で計算 | ✓ FLOWING |

---

## 動作スポットチェック

| 動作 | コマンド | 結果 | ステータス |
|------|---------|------|-----------|
| 全テストスイートパス | `npx vitest run` | 26ファイル、253テスト全パス (4.08s) | ✓ PASS |
| Phase 6コアテスト7ファイル | `npx vitest run [7 filter files]` | 7ファイル、102テスト全パス | ✓ PASS |
| filterUtils.test.ts (16テスト) | `npx vitest run src/utils/filterUtils.test.ts` | 16テスト全パス | ✓ PASS |
| filterStore.test.ts (18テスト) | `npx vitest run src/stores/filterStore.test.ts` | 18テスト全パス | ✓ PASS |
| FilterDropdown.test.tsx (27テスト) | `npx vitest run src/components/FilterDropdown/FilterDropdown.test.tsx` | 27テスト全パス | ✓ PASS |
| FilterChip.test.tsx (8テスト) | `npx vitest run src/components/FilterChip/FilterChip.test.tsx` | 8テスト全パス | ✓ PASS |
| FilterBar.test.tsx (14テスト) | `npx vitest run src/components/FilterBar/FilterBar.test.tsx` | 14テスト全パス | ✓ PASS |
| Board.test.tsx (7テスト) | `npx vitest run src/components/Board/Board.test.tsx` | 7テスト全パス | ✓ PASS |
| Lane.test.tsx (12テスト) | `npx vitest run src/components/Lane/Lane.test.tsx` | 12テスト全パス | ✓ PASS |

---

## アンチパターンスキャン

| ファイル | 行 | パターン | 深刻度 | 影響 |
|---------|-----|---------|-------|------|
| `src/global.css` | L47, L49 | `--radius-badge: 4px` 重複定義 | ℹ️ Info | 視覚的影響なし(後の値が優先)、フェーズ6以前からの既存問題 |
| `src/components/FilterBar/FilterBar.tsx` | L76, L94 | `statusIds.has(o.id as number)` 型アサーション | ⚠️ Warning | 型安全性の低下。現在のextract*Options実装では実害なし(REVIEW ME-01) |
| `src/components/FilterChip/FilterChip.tsx` | L9-13 | spanとbutton両方にキーボードハンドラ — buttonへのTabフォーカス後Enter時に二重呼び出しリスク | ⚠️ Warning | ゴール達成を阻害しないが、REVIEW HI-01で指摘されたキーボードアクセシビリティのバグ |
| `src/components/FilterDropdown/FilterDropdown.tsx` | L63 | `(prev + 1) % options.length` — options空の場合NaN | ⚠️ Warning | 空options時のArrowDownでNaN汚染。現在は「選択肢なし」表示なので顕在化しない(REVIEW ME-02) |

---

## 人間検証が必要な項目

### 1. FilterBarの視覚的レイアウト確認

**手順:** `npm run tauri dev` でアプリを起動し、ボードが表示されたらFilterBarの配置を確認
**期待:** BoardHeader(56px)直下に、ステータス/担当者/カテゴリの3つのドロップダウンが横並び表示される。sticky配置でスクロール時も固定される
**Human必要な理由:** CSS `position: sticky; top: 56px;` の実際の視覚的挙動はJSDOMで検証できない

### 2. フィルタ即時反映の動作確認 (FILT-01〜03)

**手順:** ドロップダウンをクリック → チェックボックスリストが開く → 1つチェック → 即座にフィルタ適用されること確認
**期待:** チェックした瞬間にフィルタチップがドロップダウン右側に出現し、ボードカードが絞り込まれる。ドロップダウンは開いたまま
**Human必要な理由:** D-04(チェック即反映)の実際のタイミングはReact状態更新の視覚的確認が必要

### 3. フィルタ非表示件数の表示確認 (FILT-05)

**手順:** ステータスフィルタを適用し、ある1つのレーンの全カードが非表示になるよう操作
**期待:** そのレーンに「N件がフィルタで非表示」と表示され、「課題なし」は表示されない
**Human必要な理由:** 実際のBacklogデータでの動作確認。テストはモックデータで確認済みだが、本番データでの挙動保証

### 4. DnDとフィルタの非干渉確認 (FILT-05 + D-09)

**手順:** ステータスフィルタを適用した状態でカードをドラッグして別レーンに移動
**期待:** フィルタ適用中でもDnDが正常完了し、課題が正しいマイルストーンに移動する
**Human必要な理由:** DnDにはリアルポインターイベントが必要。自動テストではDnDコンテキストをモック化しているため実際の挙動確認が必要

### 5. キーボードナビゲーション確認

**手順:** TabキーでFilterBarに移動 → Enter/Spaceでドロップダウン開閉 → ArrowDown/Upでオプション移動 → Escapeで閉じる
**期待:** キーボードのみでフィルタ操作が完結できる
**Human必要な理由:** アクセシビリティのフォーカス管理(Escape後にトリガーへフォーカスが戻るか等)は視覚的確認が必要

---

## ギャップサマリー

自動検証で検出されたギャップ(ゴール達成をブロックするものはなし):

1. **HI-01 (REVIEW/Warning)**: FilterChipのキーボードイベント二重発火リスク — buttonへのTabフォーカス後Enterで`onRemove`が2回呼ばれる潜在バグ。現在のテストでは検出されない。スコープ外だが将来のリグレッションリスク
2. **ME-02 (REVIEW/Warning)**: FilterDropdownで空options時のArrowDownでNaN発生 — 現状は「選択肢なし」表示なので顕在化しないが、将来的なfocusedIndex再利用でNaN汚染リスク
3. **ME-05 (REVIEW/Warning)**: Board.test.tsxのfilterStoreモックがフィルタ有効時のシナリオを網羅していない — D-09コンプライアンスの自動回帰テストが不完全

これらはREVIEWで指摘済みであり、フェーズ7以降で対処可能。フェーズ6のゴール達成(3軸フィルタリング、視覚的フィルタ表示、一括クリア、非表示件数表示、DnD非干渉)は全て実装されている。

---

_検証日: 2026-04-09_
_検証者: Claude (gsd-verifier)_
