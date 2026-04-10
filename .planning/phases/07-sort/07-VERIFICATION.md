---
phase: 07-sort
verified: 2026-04-11T00:10:00Z
status: human_needed
score: 12/12 must-haves verified
overrides_applied: 0
human_verification:
  - test: "SortDropdownが3つの選択肢を表示し、選択後にカードの並び順が変わることを確認"
    expected: "担当者順を選択すると全レーンのカードが担当者名のlocaleCompare('ja')順に並び替わる"
    why_human: "実際のカード表示順はVitest/RTLでは検証できない。Tauri WebViewでのレンダリング確認が必要"
  - test: "方向トグルボタン（↑/↓）をクリックして昇順/降順の切り替えを確認"
    expected: "↑ボタンクリックで昇順(A→Z)、↓ボタンクリックで降順(Z→A)にカードが並び替わる"
    why_human: "視覚的な並び順変化の確認。リアルタイムUIの動作は自動化困難"
  - test: "アプリ再起動後にソート設定が復元されることを確認"
    expected: "期限日順+降順を設定してアプリを再起動すると、同じソート設定が維持されている"
    why_human: "plugin-storeの実際の永続化はTauriランタイム環境でのみ検証可能（テストはモック使用）"
  - test: "ソートとフィルタを同時に使用できることを確認"
    expected: "担当者フィルタで特定ユーザーを選択した状態でソートすると、フィルタ適用後の範囲でソートが機能する"
    why_human: "フィルタ+ソートの組み合わせ動作はE2Eレベルの確認が必要"
  - test: "DnDとソートの共存を確認"
    expected: "ソートモード中でもカードを別レーンにドラッグ&ドロップで移動でき、移動後のレーン内でソートが再適用される"
    why_human: "DnDとソートパイプラインの実際の相互作用はブラウザランタイムでのみ確認可能"
---

# Phase 7: ソート Verification Report

**Phase Goal:** レーン内のカードをソートできるようにし、ユーザーが一覧性を高めるための並び順制御を提供する
**Verified:** 2026-04-11T00:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | applySortToIssuesがassignee.nameのlocaleCompare('ja')で担当者順ソートする | VERIFIED | sortUtils.ts:28 `a.assignee!.name.localeCompare(b.assignee!.name, 'ja')` — テスト12/12パス |
| 2 | applySortToIssuesがdueDate文字列比較で期限日順ソートする | VERIFIED | sortUtils.ts:42 `a.dueDate!.localeCompare(b.dueDate!)` — ISO8601文字列比較実装 |
| 3 | field='none'のときkeyId昇順で返す | VERIFIED | sortUtils.ts:19 `[...issues].sort((a, b) => a.keyId - b.keyId)` |
| 4 | assignee=nullおよびdueDate=nullのカードがdirectionに関係なく常に末尾に配置される | VERIFIED | パーティション方式実装確認 + null末尾テスト4件パス |
| 5 | sortStoreのsetField/toggleDirectionがplugin-storeに即時保存する | VERIFIED | sortStore.ts:18-25 fire-and-forgetパターンでsaveSortConfig呼び出し、テスト確認済み |
| 6 | sortStoreのloadFromStorageがplugin-storeからSortConfigを復元する | VERIFIED | sortStore.ts:28-32 loadSortConfig()呼び出し後に set({field, direction}) |
| 7 | 不正なplugin-storeデータ時にfield='none', direction='asc'にフォールバックする | VERIFIED | sortStorage.ts:22-28 T-07-01バリデーション実装 — loadSortConfig nullでsetは呼ばれない |
| 8 | SortDropdownが3つの選択肢（ソートなし/担当者順/期限日順）を単一選択で表示する | VERIFIED | SortDropdown.tsx SORT_OPTIONS配列3件 + role="listbox"(aria-multiselectable無し) — テスト確認 |
| 9 | ソートドロップダウンの横に上下トグルボタンが表示され、クリックで昇順と降順が切り替わる | VERIFIED | FilterBar.tsx:83-91 方向トグルボタン実装 + テスト「clicking direction toggle calls toggleDirection」パス |
| 10 | FilterBarの右側にセパレーター+ソートコントロールが配置される | VERIFIED | FilterBar.tsx:80-92 separator/sortControls DOM構造 + テスト「renders separator」パス |
| 11 | Board.tsxのuseMemoがフィルタからソートの順でカード配列を処理する | VERIFIED | Board.tsx:76-106 `applyFilters`→`applySortToIssues`パイプライン実装 + sort integration testパス |
| 12 | ソート設定がアプリ起動時にplugin-storeから復元される | VERIFIED | App.tsx:21-23 独立useEffectでloadSortFromStorage() 呼び出し |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/sort.ts` | SortField, SortDirection, SortConfig型定義 | VERIFIED | 全3型をexport |
| `src/utils/sortUtils.ts` | applySortToIssues純粋関数 | VERIFIED | ReadonlyArray引数、localeCompare('ja')、パーティション方式、immutable |
| `src/services/sortStorage.ts` | loadSortConfig, saveSortConfig永続化関数 | VERIFIED | STORE_FILE='settings.json', SORT_KEY='sort', store.save()呼び出し確認 |
| `src/stores/sortStore.ts` | useSortStore Zustandストア | VERIFIED | field='none'/direction='asc'デフォルト、setField/toggleDirection/loadFromStorage実装 |
| `src/components/SortDropdown/SortDropdown.tsx` | ソート基準選択ドロップダウン（単一選択） | VERIFIED | role="listbox"、3 role="option"、キーボードナビゲーション実装 |
| `src/components/SortDropdown/SortDropdown.module.css` | SortDropdownスタイル | VERIFIED | ファイル存在確認 |
| `src/components/FilterBar/FilterBar.tsx` | セパレーター+SortDropdown+方向トグル統合 | VERIFIED | separator/sortControls/directionToggle実装 |
| `src/components/Board/Board.tsx` | useMemoにソート処理追加 | VERIFIED | filteredAndSortedView、applySortToIssues呼び出し、sortField/sortDirectionを依存配列に追加 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| sortStore.ts | sortStorage.ts | saveSortConfig/loadSortConfig呼び出し | WIRED | sortStore.ts:3でimport、setField/toggleDirection/loadFromStorageで使用 |
| sortStore.ts | types/sort.ts | SortField, SortDirection型import | WIRED | sortStore.ts:2 `import type { SortField, SortDirection }` |
| sortUtils.ts | types/sort.ts | SortField, SortDirection型import | WIRED | sortUtils.ts:2 `import type { SortField, SortDirection }` |
| sortUtils.ts | types/backlog.ts | BacklogIssue型import | WIRED | sortUtils.ts:1 `import type { BacklogIssue }` |
| SortDropdown.tsx | sortStore.ts | useSortStoreセレクタ | WIRED | SortDropdown.tsx:2 `import { useSortStore }` + 13-14行で使用 |
| FilterBar.tsx | SortDropdown.tsx | SortDropdownコンポーネントimport | WIRED | FilterBar.tsx:13 `import { SortDropdown }` + 82行でレンダリング |
| Board.tsx | sortUtils.ts | applySortToIssues import | WIRED | Board.tsx:17 `import { applySortToIssues }` + 85/92行で使用 |
| Board.tsx | sortStore.ts | useSortStoreセレクタ | WIRED | Board.tsx:15 `import { useSortStore }` + 72-73行で使用 |
| App.tsx | sortStore.ts | loadFromStorage呼び出し | WIRED | App.tsx:3 `import { useSortStore }` + 14/21-23行でuseEffect |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| Board.tsx | filteredAndSortedView | boardStore.data → applyFilters → applySortToIssues | Yes — DB由来のboardStore.dataをフィルタ・ソート処理 | FLOWING |
| SortDropdown.tsx | field | useSortStore((s) => s.field) | Yes — Zustand storeから動的に読み取り | FLOWING |
| FilterBar.tsx | sortField, sortDirection, toggleDirection | useSortStore selectors | Yes — Zustand storeから動的に読み取り | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| sortUtils全テスト | `npx vitest run src/utils/sortUtils.test.ts` | 12/12 passed | PASS |
| sortStorage全テスト | `npx vitest run src/services/sortStorage.test.ts` | 5/5 passed | PASS |
| sortStore全テスト | `npx vitest run src/stores/sortStore.test.ts` | 8/8 passed | PASS |
| SortDropdown全テスト | `npx vitest run src/components/SortDropdown/SortDropdown.test.tsx` | 13/13 passed | PASS |
| FilterBars全テスト（ソート統合含む） | `npx vitest run src/components/FilterBar/FilterBar.test.tsx` | 20/20 passed | PASS |
| Board全テスト（ソート統合含む） | `npx vitest run src/components/Board/Board.test.tsx` | 11/11 passed | PASS |
| フルテストスイート | `npx vitest run` | 302/302 passed (30 files) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| SORT-01 | 07-01, 07-02 | レーン内のカードを担当者順でソートできる | SATISFIED | applySortToIssues (assignee+localeCompare)、SortDropdown '担当者順'選択肢、Board.tsx pipeline |
| SORT-02 | 07-01, 07-02 | レーン内のカードを期限日順でソートできる | SATISFIED | applySortToIssues (dueDate文字列比較)、SortDropdown '期限日順'選択肢、Board.tsx pipeline |
| SORT-03 | 07-02 | ソート方向（昇順/降順）を切り替えられる | SATISFIED | FilterBar方向トグルボタン、useSortStore.toggleDirection、sortUtils dirMultiplier |
| SORT-04 | 07-01, 07-02 | ソート設定がアプリ再起動後も保持される | SATISFIED (requires E2E) | sortStorage.ts (settings.json 'sort'キー)、App.tsx loadSortFromStorage useEffect — 実際の永続化はE2E確認要 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (なし) | — | — | — | — |

アンチパターン（TODO/FIXME/placeholder/return null/hardcoded empty data）は検出されませんでした。

### Human Verification Required

#### 1. カード表示順の視覚的確認（SORT-01/SORT-02）

**Test:** `npm run tauri dev` でアプリを起動し、SortDropdownで「担当者順」→「期限日順」と順番に選択する
**Expected:** 全レーンのカードが選択したソート基準で並び替わる。担当者名は日本語ロケール順、期限日はISO 8601昇順
**Why human:** 実際のカード表示順はVitest/RTLでは検証できない。Tauri WebViewでの実レンダリング確認が必要

#### 2. 昇順/降順トグルの動作確認（SORT-03）

**Test:** 担当者順ソート選択後、↑ボタンと↓ボタンを交互にクリックする
**Expected:** ↑ボタン（asc）で名前A→Z順、↓ボタン（desc）で名前Z→A順にカードが並び替わる
**Why human:** 視覚的な並び順変化の確認。aria-labelで「降順に切り替え」「昇順に切り替え」のトグル動作確認も含む

#### 3. アプリ再起動後のソート設定復元確認（SORT-04）

**Test:** 期限日順+降順を設定してアプリを完全終了し、再起動する
**Expected:** 再起動後も期限日順+降順が維持されており、sortStoreのfield='dueDate'/direction='desc'が復元される
**Why human:** plugin-storeの実際の永続化はTauriランタイム環境でのみ検証可能（テストはモック使用）

#### 4. フィルタ+ソートの組み合わせ動作確認

**Test:** 担当者フィルタで特定ユーザーを選択し、その後期限日順ソートを適用する
**Expected:** フィルタで絞り込まれたカードのみに対してソートが適用される（filterAfterSort順序の確認）
**Why human:** フィルタ+ソートパイプラインの実際の動作はブラウザランタイムでのみ確認可能

#### 5. DnDとソートの共存確認

**Test:** 担当者順ソートが有効な状態でカードを別レーンにドラッグ&ドロップで移動する
**Expected:** カードが移動先レーンに追加され、移動後の並び順は担当者順ソートが維持される。DnDハンドラは未フィルタデータ(data)のみ参照するため、boardStore.dataの一貫性が保たれる
**Why human:** DnD中のuseMemo再計算タイミングとソートパイプラインの相互作用はブラウザランタイムでのみ確認可能

### Gaps Summary

自動検証可能な全12 must-havesはVERIFIEDです。コード品質・型安全性・テストカバレッジ（69テスト、6ファイル）に問題は検出されませんでした。

残存事項は自動化不能なE2E動作確認のみです:
- SORT-01/02: 実際のカード並び順の視覚的確認
- SORT-03: 昇順/降順トグルの実動作確認
- SORT-04: Tauriランタイムでのplugin-store永続化確認

---

_Verified: 2026-04-11T00:10:00Z_
_Verifier: Claude (gsd-verifier)_
