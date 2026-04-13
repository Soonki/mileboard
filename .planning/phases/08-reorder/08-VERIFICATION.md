---
status: passed
phase: 08-reorder
must_haves_total: 4
must_haves_verified: 4
created: 2026-04-12T19:45:00Z
re_verification:
  previous_status: none
  previous_score: none
  gaps_closed: []
  gaps_remaining: []
  regressions: []
---

# Phase 8: レーン内並べ替え Verification Report

**Phase Goal:** レーン内でカードをDnDして任意の並び順に変更でき、カスタム順序をplugin-storeで永続化する。ソートモード中はレーン内並べ替えを無効化し、レーン間DnD（マイルストーン移動）は有効のまま維持する。

**Verified:** 2026-04-12T19:45:00Z
**Status:** passed
**Re-verification:** No — initial (retroactive) verification. Phase 8 completed 2026-04-11 without a VERIFICATION.md.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ユーザーはレーン内でカードをDnDして並び順を変更できる（REORD-01） | VERIFIED | `Board.tsx:432-452` handleDragEnd の `fromLaneId === toLaneId` 分岐で `reorder(fromLaneId, activeIdNum, overIdNum)` を呼ぶ。`reorderStore.reorder` が `arrayMove` で `orderMap[laneId]` を更新。初回並べ替え時は `getLaneItems` + `setLaneOrder` で現表示順を orderMap に seeding。Board.test.tsx の `buildHandleDragEnd` unit テスト（'sort mode: intra-lane numeric reorder still fires' など）でカバー。 |
| 2 | カスタム並び順はアプリ再起動後も保持される（REORD-02） | VERIFIED | `reorderStorage.ts` が `saveReorderConfig` / `loadReorderConfig` で plugin-store の `settings.json` に `reorder` キーで永続化。`reorderStore.reorder / setLaneOrder / removeLaneOrder / updateOnCrossLaneMove` すべてが `saveReorderConfig(newMap).catch(() => {})` で即時保存。`App.tsx:4, 17, 30-32` で起動時に `useReorderStore.loadFromStorage()` を `useEffect` で呼び出し orderMap を復元。reorderStorage.test.ts / reorderStore.test.ts の loadFromStorage テストでカバー。 |
| 3 | ソートモード中は手動並べ替えが無効になる（カーソル変化で自然に気づく）（REORD-03, D-05） | VERIFIED | `IssueCard.tsx:25` で `const isSortActive = useSortStore((s) => s.field !== 'none')`、`IssueCard.tsx:41` で `useSortable({ id, disabled: isMultiMilestone \|\| isSortActive })`、`IssueCard.tsx:81` で `isSortActive` 時に `styles.cardDragDisabled` クラス（cursor: default）を付与。さらに `Board.tsx:435` の handleDragEnd で `if (sortField !== 'none') return` の二重ガード。IssueCard.test.tsx の "disables sorting when sort is active" / "applies cardDragDisabled class when sort is active" テストでカバー。 |
| 4 | ソートモード中もレーン間DnD（マイルストーン移動）は有効のまま維持される（D-06） | VERIFIED | `IssueCard.tsx` の `disabled` 条件は `useSortable` のみ（= sortable の draggable 無効化）。`Board.tsx` の handleDragEnd で `sortField !== 'none'` ガードは `fromLaneId === toLaneId` 分岐内にのみ存在し、cross-lane 分岐（`moveIssue` + `updateOnCrossLaneMove`）には sort ガードが無いため、ソートモード中もレーン間移動が動作する。Phase 9 が Phase 8 の `updateOnCrossLaneMove` API を引き続き使用しており回帰なし。Plan 02 の human-verification（task 3）で 2026-04-11 に approved。 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Data Flows | Status |
|----------|----------|--------|-------------|-------|------------|--------|
| `src/types/reorder.ts` | ReorderMap 型定義 | YES | YES (16 lines, Phase 9 で `ReorderEntry` union に拡張) | YES (Board.tsx / reorderStore.ts / reorderStorage.ts / reorderUtils.ts が import) | N/A (型のみ) | VERIFIED |
| `src/utils/reorderUtils.ts` | applyCustomOrder 純粋関数 | YES | YES (41 lines、カスタム順序適用 + keyId フォールバック + 新規末尾追加 + Phase 9 group skip) | YES (Board.tsx:27, 510, 530 が呼出) | YES (orderMap → applyCustomOrder → filteredAndSortedView.items → Lane 描画) | VERIFIED |
| `src/services/reorderStorage.ts` | plugin-store load/save | YES | YES (43 lines、T-08-01 バリデーション + Phase 9 後方互換) | YES (reorderStore.ts が両関数を import) | YES (plugin-store `settings.json#reorder` → ReorderMap) | VERIFIED |
| `src/stores/reorderStore.ts` | Zustand useReorderStore | YES (79 lines) | YES (`orderMap`, `reorder`, `setLaneOrder`, `removeLaneOrder`, `updateOnCrossLaneMove`, `loadFromStorage` すべて実装) | YES (Board.tsx, App.tsx, groupStore 等が import) | YES (reorder → saveReorderConfig fire-and-forget → plugin-store) | VERIFIED |
| `src/components/Board/Board.tsx` | handleDragEnd 同一レーン検出 + filteredAndSortedView カスタム順序パイプライン | YES | YES (`buildHandleDragEnd` factory + `fromLaneId === toLaneId` 分岐 + `applyCustomOrder` を `sortField === 'none'` 時に適用) | YES (App.tsx → Board） | YES (orderMap → applyCustomOrder → items → Lane → IssueCard) | VERIFIED |
| `src/components/IssueCard/IssueCard.tsx` | useSortable disabled 条件にソートモード判定 | YES | YES (`isSortActive` 宣言 + `disabled: isMultiMilestone \|\| isSortActive` + `cardDragDisabled` クラス) | YES (Lane 経由で描画) | YES (sortStore.field → isSortActive → useSortable.disabled) | VERIFIED |
| `src/App.tsx` | reorderStore 起動時復元 | YES | YES (`useReorderStore` import + `loadReorderFromStorage` セレクタ + useEffect) | YES | YES (起動時 plugin-store → reorderStore.orderMap) | VERIFIED |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/stores/reorderStore.ts` | `src/services/reorderStorage.ts` | `saveReorderConfig / loadReorderConfig` | WIRED | reorderStore.ts:4-7 で両関数を import。`reorder`, `setLaneOrder`, `removeLaneOrder`, `updateOnCrossLaneMove` の各アクションで `saveReorderConfig(newMap).catch(() => {})` を呼出。`loadFromStorage` で `loadReorderConfig()` を await。 |
| `src/stores/reorderStore.ts` | `src/types/reorder.ts` | `ReorderMap` 型 import | WIRED | reorderStore.ts:3 で `import type { ReorderEntry, ReorderMap } from '../types/reorder'`。Phase 9 拡張で ReorderEntry も import。 |
| `src/utils/reorderUtils.ts` | `src/types/backlog.ts` | `BacklogIssue` 型 import | WIRED | reorderUtils.ts:1 で `import type { BacklogIssue } from '../types/backlog'`。 |
| `src/components/Board/Board.tsx` | `src/stores/reorderStore.ts` | `useReorderStore` 経由の `reorder` / `updateOnCrossLaneMove` | WIRED | Board.tsx:22 で import、Board.tsx:482-484 で `orderMap`, `reorder`, `updateOnCrossLaneMove` セレクタ、Board.tsx:604-617 で `buildHandleDragEnd` に渡して handleDragEnd を構築。 |
| `src/components/Board/Board.tsx` | `src/utils/reorderUtils.ts` | `applyCustomOrder` | WIRED | Board.tsx:27 で import、filteredAndSortedView の useMemo 内で unassigned レーン (line 510) と milestone レーン (line 530) の両方で `sortField === 'none'` ガードつきで呼出。`orderMap` が useMemo 依存配列に入っているため orderMap 更新で view が再計算される。 |
| `src/components/IssueCard/IssueCard.tsx` | `src/stores/sortStore.ts` | `useSortStore` でソートモード検出 | WIRED | IssueCard.tsx:7 で `import { useSortStore }`、IssueCard.tsx:25 で `useSortStore((s) => s.field !== 'none')`。 |
| `src/App.tsx` | `src/stores/reorderStore.ts` | `loadFromStorage` 起動時呼出 | WIRED | App.tsx:4 で import、App.tsx:17 で `loadReorderFromStorage` セレクタ、App.tsx:30-32 で `useEffect(() => loadReorderFromStorage(), [loadReorderFromStorage])`。 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/stores/reorderStore.ts` | `orderMap` | `loadReorderConfig()` → plugin-store `settings.json#reorder`、および `reorder/setLaneOrder/updateOnCrossLaneMove` 経由のユーザー操作更新 | YES | FLOWING |
| `src/components/Board/Board.tsx` filteredAndSortedView | `items` (Array<BacklogIssue \| GroupSlot>) | `useBoardStore.data` → `applyFilters` → `applySortToIssues` → `applyCustomOrder(sorted, orderMap[laneId] ?? [])` → `applyGroupExpansion`（sortField === 'none' 時のみ custom order 適用） | YES | FLOWING |
| `src/components/IssueCard/IssueCard.tsx` | `useSortable.disabled` | `isMultiMilestone \|\| isSortActive` ← `useSortStore((s) => s.field !== 'none')` | YES | FLOWING |
| `src/App.tsx` | `loadReorderFromStorage` | `useReorderStore((s) => s.loadFromStorage)` → useEffect 起動時発火 | YES | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 8 関連ユニットテスト全件パス | `npx vitest run src/utils/reorderUtils.test.ts src/services/reorderStorage.test.ts src/stores/reorderStore.test.ts` | 3 files, 36 tests passed (884ms) | PASS |
| フルスイートリグレッションなし | `npx vitest run` | 42 files, 544 tests passed (5.23s) | PASS |
| REORD-01 arrayMove 動作 | reorderStore.test.ts "moves activeId to overId position within lane using arrayMove" (初期 [1,2,3] → reorder('lane1', 1, 3) → [2,3,1]) | passed | PASS |
| REORD-02 loadFromStorage 復元 | reorderStore.test.ts "restores orderMap from plugin-store" | passed | PASS |
| REORD-03 isSortActive で disabled | IssueCard.test.tsx "disables sorting when sort is active" (useSortStore.field='assignee' で disabled=true) | passed | PASS |
| D-07/D-08 cross-lane orderMap 更新 | reorderStore.test.ts "removes issueId from fromLane and appends to toLane (D-07, D-08)" | passed | PASS |
| D-04 新規課題 keyId 昇順末尾 | reorderUtils.test.ts "appends new issues not in savedIds in keyId ascending order (D-04)" | passed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REORD-01 | 08-01, 08-02 | レーン内でカードをDnDして並び順を変更できる | SATISFIED | Board.tsx handleDragEnd 同一レーン分岐 + reorderStore.reorder + arrayMove。unit テスト + Plan 02 の手動 E2E approved。 |
| REORD-02 | 08-01, 08-02 | カスタム並び順がアプリ再起動後も保持される（plugin-store） | SATISFIED | reorderStorage.ts (load/save) + App.tsx useEffect 起動時復元 + reorderStore の fire-and-forget 即時保存。unit テストでロード・セーブをカバー。 |
| REORD-03 | 08-02 | ソートモード中は手動並べ替えが無効になり、モード表示される | SATISFIED (部分的) | コードレベル: IssueCard.tsx の `isSortActive` + `useSortable disabled` + `cardDragDisabled` クラス (cursor: default) により実装。REQUIREMENTS.md では "Pending" と記載されているが、これは「モード表示」の明示的な UI バナー等が D-05 で "バナー・ツールチップ不要" と決定されたためで、機能は ROADMAP の成功条件 #3「ソートモード中は手動並べ替えが無効になる（カーソル変化で自然に気づく）」と完全に整合する。Plan 02 Task 3 で human approved。 |

Note: REQUIREMENTS.md は REORD-01 / REORD-02 を Complete、REORD-03 を Pending と記載しているが、これは後続 doc 更新漏れであり実装上は 3 要件すべてカバー済み（Plan 02 の requirements frontmatter は `[REORD-01, REORD-02, REORD-03]`、Plan 02 SUMMARY の requirements-completed は `[REORD-01, REORD-02, REORD-03]`、Plan 02 Task 3 の human verification で REORD-03 も approved）。実装 + テスト + human verification の三重ソースから REORD-03 は satisfied と判定。

### Anti-Patterns Found

None.

- TODO / FIXME / 'placeholder' / 'coming soon' 等のスタブマーカー: Phase 8 で作成/変更された 7 ファイルに 0 件。
- `return null` / `return []` / `return {}` 等の hollow return: reorderUtils.ts の `return []` は Phase 9 の `group:${id}` エントリを skip する意図的な flatMap ブランチで、同じ関数内で新規 issues を末尾に追加する実データパスが存在するためスタブではない。
- fire-and-forget save の `.catch(() => {})`: sortStore と同パターンの承認済み決定（08-RESEARCH.md Pitfall 4 の議論、plan-01 で明示）。非クリティカル操作のため UI トーストは不要。
- 空イベントハンドラ / `() => {}`: 0 件（Board.tsx 618 の `: () => {}` は `data === null` 時のフォールバックで、status guard により実行経路上は到達しない防御コード）。

### Human Verification Required

なし。Plan 02 Task 3 の `checkpoint:human-verify` ゲートは 2026-04-11 に approved 済みで以下の項目が検証済み:

- REORD-01（intra-lane reorder）
- REORD-02（persistence、再起動後復元）
- REORD-03（sort exclusion + cursor 変化）
- D-01（カスタム順序の復帰: sort → no-sort 切替）
- D-05（cursor の grab → default 変化）
- D-06（ソートモード中のレーン間DnD維持）
- D-07/D-08（cross-lane 移動時の両レーン orderMap 更新）

追加の人手検証は不要（Phase 9 が同じ reorderStore API と updateOnCrossLaneMove を引き続き exercise しており、Phase 9 Plan 04 の実機 QA で Phase 8 のレーン内並べ替え + plugin-store 永続化 + ソートモード排他が間接的に再検証されている — 回帰なしを確認）。

### Gaps Summary

ギャップなし。Phase 8 の 4 つの ROADMAP 成功条件すべてが、コード実装・ユニットテスト (36件 passed)・Plan 02 Task 3 の human E2E approval・Phase 9 による間接的 regression test (全 544 テスト passed) の四重証跡で裏付けられている。

Phase 9 は Phase 8 の型 (`ReorderMap`) を `Record<string, number[]>` から `Record<string, ReorderEntry[]>` に拡張したが、`ReorderEntry = number | \`group:${string}\`` は旧形式 `number[]` のスーパーセットであり、reorderStorage の後方互換バリデーション (reorderStorage.test.ts "returns ReorderMap for Phase 8 legacy format") により既存の永続化データは暗黙的にマイグレーションなしで動作する。Phase 8 の behavioral contract は保持されている。

---

*Verified: 2026-04-12T19:45:00Z*
*Verifier: Claude (gsd-verifier, retroactive)*
