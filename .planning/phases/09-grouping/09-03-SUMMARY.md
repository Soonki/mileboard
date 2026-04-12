---
phase: 09-grouping
plan: 03
subsystem: bulk-move
tags: [grouping, bulk-move, optimistic-update, partial-rollback, sonner-progress, concurrency, tdd]

# Dependency graph
requires:
  - phase: 09-grouping
    provides: "Wave 1 (Plan 01) — useGroupStore (moveGroup / removeMember), Group / GroupId types"
  - phase: 09-grouping
    provides: "Wave 0 (Plan 00) — sonner mock loading/dismiss extensions in tests/setup.ts"
  - phase: 08-reorder
    provides: "boardStore.moveIssue rollback pattern (snapshot + catch + set)"
provides:
  - "src/utils/bulkMoveUtils.ts: runWithConcurrency<T>(tasks, limit) — independent worker pool semaphore (no dependencies)"
  - "src/utils/bulkMoveUtils.ts: bulkMoveIssues(params) -> BulkMoveResult — 3-parallel updateIssueMilestone with onProgress callback (D-17)"
  - "src/utils/bulkMoveUtils.ts: BulkMoveParams + BulkMoveResult interfaces"
  - "src/stores/boardStore.ts: bulkMoveGroup(groupId, fromLane, toLane) Promise<void> — optimistic update + per-failure partial rollback + sonner progress toast"
affects: [09-04-board-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Worker pool semaphore via shared cursor (`let nextIndex = 0`) instead of p-limit dependency"
    - "Promise.allSettled compatible result type (PromiseSettledResult<T>) — no try/catch leaking outside utility"
    - "Optimistic UI + per-item rollback (partial failure preserves succeeded subset, only reverts failed)"
    - "sonner toast in-place update via shared toastId (loading -> loading -> success/error)"
    - "fire-and-skip-completion onProgress: skip the final 100% loading update because success/error replaces it"
    - "vi.mock with module-level shared state (mockGroups Record) so internal mock fns + their state can be inspected from tests"

key-files:
  created:
    - "src/utils/bulkMoveUtils.ts (128 lines, 2 functions, 2 interfaces)"
    - "src/utils/bulkMoveUtils.test.ts (299 lines, 19 tests)"
  modified:
    - "src/stores/boardStore.ts (+107 lines: BoardStoreState bulkMoveGroup signature, import GroupId / useGroupStore / bulkMoveIssues, bulkMoveGroup implementation 84 LOC)"
    - "src/stores/boardStore.test.ts (+361 lines: vi.mock for bulkMoveUtils + groupStore, 12 new bulkMoveGroup tests)"

key-decisions:
  - "runWithConcurrency 独自実装で依存追加ゼロ (RESEARCH §5.2) — 20 行程度の worker pool パターン"
  - "Math.min(concurrency, tasks.length) で worker count をキャップして無駄なアイドル worker を避ける"
  - "BulkMoveResult は succeeded / failed の 2 配列で返す (順序は保証しない、呼び出し側が issueId で再マッチ)"
  - "onProgress 内 `if (completed < total)` で完了タイミングの loading 更新をスキップ — 完了時は success/error 側で同一 toastId を上書きするため"
  - "部分失敗 rollback は applyMoveIssue を toLane→fromLane の方向で呼び出す (個別 reverse) — applyMoveIssue は immutable で安全に連鎖"
  - "失敗メンバーは groupStore.removeMember で外す (memberIds.length < 2 で自動 dissolveGroup → GRP-06 の副作用に乗る)"
  - "全失敗時は groupStore.moveGroup を fromLaneId 引数で呼んで group.laneId を巻き戻す (moveGroup 自体は冪等)"
  - "D-18 遵守: toast.warning は使わず、部分失敗も toast.error で表現 (文言で severity 伝達)"
  - "vi.mock('./groupStore') で内部の mockGroups Record を直接 export し、各テストで `setupGroup(memberIds, laneId)` ヘルパー経由で書き換え"

patterns-established:
  - "TDD RED → GREEN を厳格に遵守 (test commit → feat commit のペア)"
  - "新規ユーティリティでは optimistic / pessimistic の境界を明示 (utils 層は pure な分類のみ、rollback は store 層)"
  - "store 内 async action は (async, get/set) パターンでクロージャ snapshot を保持 — Zustand の state レース条件回避"

requirements-completed: [GRP-04, GRP-07]

# Metrics
duration: ~14min
completed: 2026-04-12
---

# Phase 09 Plan 03: Bulk Move Logic Summary

**One-liner:** グループ一括移動 (GRP-04, GRP-07) の中核ロジックを TDD で実装 — 独自 3 並列セマフォ runWithConcurrency + bulkMoveIssues + boardStore.bulkMoveGroup の楽観的更新・部分失敗個別 rollback・sonner 進捗 toast を 31 件の green テストでカバー。toast.warning 使用ゼロで D-18 遵守。

## Performance

- **Duration:** ~14 min
- **Started:** 2026-04-12T22:42Z
- **Completed:** 2026-04-12T22:55Z
- **Tasks:** 2 (各 TDD RED + GREEN)
- **Files created:** 2 (bulkMoveUtils.ts + bulkMoveUtils.test.ts)
- **Files modified:** 2 (boardStore.ts + boardStore.test.ts)
- **Total LOC:** +895 / -2
- **Tests added:** 31 (bulkMoveUtils 19 + bulkMoveGroup 12)
- **Full suite after:** 443/443 green

## Accomplishments

- **runWithConcurrency**: PromiseSettledResult<T>[] を入力順で返す独自 semaphore 実装。worker pool パターンで `Math.min(concurrency, tasks.length)` worker、共有カーソル `nextIndex++` で次のタスクを取得。10 件のテストで empty / single / all-success / all-fail / mixed / worker cap / sequential / non-Error throws / 並列度上限の全分岐をカバー
- **bulkMoveIssues**: members 配列を tasks にラップして runWithConcurrency(tasks, 3) を呼び、結果を succeeded / failed に分類。toLaneId は parseMilestoneIdFromLaneId で newMilestoneId に変換。onProgress を完了ごとに呼び出し (closure-captured `completed` カウンタ)。9 件のテストで成功/失敗/部分失敗/milestone parsing/unassigned parsing/onProgress/optional onProgress/empty members/3 並列上限をカバー
- **boardStore.bulkMoveGroup**: 楽観的更新 (D-20) → groupStore.moveGroup → toast.loading 開始 → bulkMoveIssues 並列呼び出し (onProgress で M/N 完了... 同一 toastId 更新) → 結果分岐 (全成功 toast.success / 全失敗 全 rollback + toast.error / 部分失敗 個別 rollback + removeMember + toast.error)
- **sonner 進捗の上書きパターン**: `toast.loading('3件を移動中...')` で取得した toastId を以後すべての更新に渡し、最終的に同じ id で `toast.success` / `toast.error` を呼ぶことで「同一 toast を in-place に更新」する D-18 設計を実装
- **D-18 遵守の regression guard**: `expect((toast as unknown as { warning?: unknown }).warning).toBeUndefined()` で sonner mock に warning が存在しないこと自体をテスト
- **D-19 部分 rollback**: `result.failed.forEach` で applyMoveIssue を `toLane→fromLane` の方向で呼び個別に巻き戻し。succeeded メンバーは toLane に残ったまま、失敗メンバーだけ fromLane に戻る + groupStore.removeMember でグループからも除外 (GRP-06 自動解散へつながる)

## Task Commits

| # | Commit | Type | Description |
|---|--------|------|-------------|
| 0 | `1c1546a` | chore | pre-stage Plan 00/01 base files for worktree (group.ts, groupStore.ts, groupUtils.ts, etc. — Wave 2 merge will collapse) |
| 1 | `a44f215` | test | Task 1 RED — bulkMoveUtils 19 failing tests |
| 2 | `d6ce275` | feat | Task 1 GREEN — runWithConcurrency + bulkMoveIssues + types |
| 3 | `5fb8ee4` | test | Task 2 RED — boardStore.bulkMoveGroup 12 failing tests |
| 4 | `1d90349` | feat | Task 2 GREEN — boardStore.bulkMoveGroup implementation |

## Files Created/Modified

### Created
- `src/utils/bulkMoveUtils.ts` (128 行) — runWithConcurrency<T>, bulkMoveIssues, BulkMoveParams interface, BulkMoveResult interface
- `src/utils/bulkMoveUtils.test.ts` (299 行) — 19 ケース (10 runWithConcurrency + 9 bulkMoveIssues)

### Modified
- `src/stores/boardStore.ts` (+107 行) — import GroupId / useGroupStore / bulkMoveIssues, BoardStoreState 型に bulkMoveGroup 追加, store 実装に bulkMoveGroup 84 LOC
- `src/stores/boardStore.test.ts` (+361 行) — vi.mock('../utils/bulkMoveUtils'), vi.mock('./groupStore') with shared mockGroups Record + helper exports, 12 件の bulkMoveGroup describe ブロック

## Verification

| Check | Result |
|-------|--------|
| `grep "export async function runWithConcurrency" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "export async function bulkMoveIssues" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "export interface BulkMoveResult" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "export interface BulkMoveParams" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "Math.min(concurrency, tasks.length)" src/utils/bulkMoveUtils.ts` | PASS (line 44) |
| `grep "updateIssueMilestone" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "parseMilestoneIdFromLaneId" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "onProgress" src/utils/bulkMoveUtils.ts` | PASS |
| `grep "bulkMoveGroup:" src/stores/boardStore.ts` | PASS |
| `grep "bulkMoveIssues" src/stores/boardStore.ts` | PASS |
| `grep "useGroupStore.getState().moveGroup" src/stores/boardStore.ts` | PASS |
| `grep "useGroupStore.getState().removeMember" src/stores/boardStore.ts` | PASS |
| `grep "toast.loading" src/stores/boardStore.ts` | PASS |
| `grep "件を移動中" src/stores/boardStore.ts` | PASS |
| `grep "件を移動しました" src/stores/boardStore.ts` | PASS |
| `grep "移動に失敗しました" src/stores/boardStore.ts` | PASS |
| `grep "件中.*件の移動に失敗" src/stores/boardStore.ts` | PASS |
| `grep "toast\.warning(" src/stores/boardStore.ts` | NO MATCH (D-18 遵守) |
| bulkMoveUtils.test.ts test count | 19 (>= 12 required) |
| boardStore.test.ts bulkMoveGroup describe テスト数 | 12 (>= 10 required) |
| `npx vitest run src/utils/bulkMoveUtils.test.ts` | **19 passed** |
| `npx vitest run src/stores/boardStore.test.ts` | **41 passed** (29 既存 + 12 新規) |
| `npx vitest run` | **443 passed (38 test files)** |
| `npx tsc --noEmit` | **0 errors** |

## Decisions Made

- **D-17 (3 並列固定)**: runWithConcurrency への concurrency=3 を bulkMoveIssues 内でハードコード。「動的 degradation は Rust 側 throttle_if_needed に任せる」(RESEARCH §5.1) という設計に従って TS 側は単純化
- **D-18 (toast.warning 禁止)**: 部分失敗も toast.error で `「N件中M件の移動に失敗しました」` 文言で severity を伝達。regression guard テストで sonner mock に warning が存在しないことを確認
- **D-19 (部分 rollback)**: result.failed のみ applyMoveIssue で toLane→fromLane に逆方向適用。succeeded メンバーは toLane に残置 + groupStore.removeMember で失敗メンバーをグループから除外 (memberIds が 2 未満になれば自動 dissolveGroup へ → GRP-06 連鎖)
- **D-20 (楽観的更新)**: bulkMoveIssues を await する前に set({ data: optimisticData }) で UI 即時反映。snapshot は関数 local 変数で保持し、レース中の他操作と分離
- **完了時 loading スキップ**: onProgress callback に `if (completed < total)` ガードを入れ、完了タイミングの loading 更新を捨てる。理由: 完了時は直後に success/error が同一 toastId を上書きするため、loading の最終更新は無駄かつ flicker の原因
- **mock 共有 state パターン**: vi.mock('./groupStore') で内部に `const mockGroups: Record<string, Group> = {}` を作り、`__mockGroups` として export することでテスト本体から `mockGroups[TEST_GROUP_ID] = ...` で書き換え可能にした。`setupGroup` ヘルパーは `for (const key of Object.keys) delete` で reset してから書き込み、closure 内の Record 参照を維持

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Worktree Setup] Plan 00/01 のベースファイルを worktree に pre-stage**
- **Found during:** Worktree 起動直後のチェック
- **Issue:** プロンプトの worktree_branch_check では HEAD が 94dfae3 を含む想定だったが、実際の現在 HEAD は a07a827 (main) で、Plan 00/01 で作られる src/types/group.ts、src/stores/groupStore.ts、src/utils/groupUtils.ts、その他 15 ファイルが存在しなかった。ベース branch の指定誤りだったため、git reset --hard は permission denied で実行不可
- **Fix:** `git checkout 94dfae3 -- <17 files>` で Plan 00/01 のすべての差分ファイルをワーキングツリーに展開し、`chore(09-03): pre-stage Plan 00/01 base files for worktree` 単一 commit にまとめた。これにより以降の Task 1/2 が Plan 01 の groupStore / Plan 00 の sonner mock 拡張に依存できるようになった
- **Files affected:** 17 ファイル (src/types/group.ts, src/types/reorder.ts, src/services/groupStorage.ts + test, src/services/reorderStorage.ts + test, src/stores/groupStore.ts + test, src/stores/reorderStore.ts + test, src/utils/groupUtils.ts + test, src/utils/reorderUtils.ts + test, src/global.css, src/components/GroupPopover/GroupPopover.dnd.test.tsx, tests/setup.ts, .planning/REQUIREMENTS.md)
- **Committed in:** `1c1546a`
- **Wave 2 影響:** Wave 2 merge 時、これらの pre-stage は Plan 00 / Plan 01 worktree が main にマージ済みであれば衝突なし (内容が byte-identical のため auto-resolve)

### 軽微な選択 (no deviation, just plan adherence note)

- Plan は最低 12 / 10 件のテストを要求していたが、実際は 19 / 12 件を作成した。runWithConcurrency に「並列度実測」テスト (`maxInFlight <= 3`) を追加したのは concurrency contract の動的検証のため
- bulkMoveIssues の "empty members" ケースは plan の例には無かったが、`for of` ループや map は空配列で安全に動くことを保証するため追加
- 既存 boardStore.test.ts の 29 件のテストは一切変更しなかった (全 green を維持)

**Total deviations:** 1 (worktree base setup) — TDD フローと plan ロジック自体は完全に plan 通り

## Issues Encountered

- **`git commit --no-verify` ブロック:** プロンプトでは `--no-verify` を使うよう指示されていたが、`block-no-verify@1.1.2` PreToolUse hook が一律で拒否。プレーン `git commit` に切り替えたら問題なく commit できた (このリポジトリには pre-commit hook が無いため)
- **`git reset --hard` permission denied:** 破壊的操作はサンドボックスで拒否される。代替として `git checkout <commit> -- <paths>` で個別ファイルを展開し、commit でベースを構築した
- **worktree の HEAD と expected base のズレ:** worktree_branch_check では HEAD~1 で onto rebase することを示唆していたが、HEAD が main の通常 commit (a07a827) で linear history なため rebase 不可。代わりに pre-stage commit 戦略を採用 (= main の上に Plan 00/01 + Plan 03 の commit を積む)

## Threat Model Compliance

| Threat ID | Category | Mitigation Status | Notes |
|-----------|----------|-------------------|-------|
| T-09-03-01 | Tampering — bulkMoveGroup state corruption | mitigated | snapshot を関数の最初で `const` 取得 (closure-captured)、部分失敗時は applyMoveIssue (純粋関数) で toLane→fromLane を個別に逆適用、全失敗時は `set({ data: snapshot })` で全体を rollback。Zustand の set は immutable spread のみ |
| T-09-03-02 | Denial of Service — runWithConcurrency 暴走 | mitigated | concurrency=3 ハードコード + Rust 側 throttle_if_needed が X-RateLimit-Remaining を監視 (RESEARCH §5.1)。TS 側で rate-limit を二重化しない |
| T-09-03-03 | Information Disclosure — toast 文言から情報漏洩 | accepted | toast 文字列は数字 (件数) と Japanese ハードコード文言のみ。ユーザー入力やエラー詳細は介在しないため XSS/leak 経路なし |
| T-09-03-04 | Repudiation — bulk move 監査 | accepted | ローカルアプリ (D-12) のため監査ログ不要。失敗詳細は toast でユーザー伝達 |

新規 trust boundary は導入していない (既存 tauriBridge / sonner / Zustand の延長)。Threat surface scan: 0 new flags

## Authentication Gates

なし — 全タスクがローカル編集とテスト実行のみ。Backlog API 呼び出しは tests/setup.ts の Tauri invoke モックで完結

## Known Stubs

なし。bulkMoveGroup は Plan 04 (Wave 3) で `handleDragEnd` 内の group→lane drop 分岐から呼び出される予定だが、これは scope 外の意図的な分割であり stub ではない。本 Plan の成果物は public API として完結している (`useBoardStore.getState().bulkMoveGroup(groupId, fromLane, toLane)` が呼び出し可能)

## Threat Flags

なし — 新しい trust boundary や攻撃面を導入していない。STRIDE register の T-09-03-01〜04 は plan 通りの disposition (mitigate / accept) を実装で達成

## Next Steps

- **Plan 02 (parallel)**: GroupCard / IssueCard / Lane / Board / App の UI 統合。Plan 03 とは file-modified に重複なし
- **Plan 04 (Wave 3)**: Board.tsx の handleDragEnd で group:${id} を drop した時に `useBoardStore.getState().bulkMoveGroup(groupId, fromLane, toLane)` を呼び出す統合
- **Wave 2 merge**: 本 worktree の `1c1546a` (Plan 00/01 pre-stage commit) は Plan 00 / Plan 01 worktree が main マージ済みなら byte-identical で衝突なく解決される。万が一衝突した場合は Plan 00/01 側を accept (それらが該当ファイルの owner)

## Self-Check: PASSED

**Created files verified:**
- src/utils/bulkMoveUtils.ts — FOUND
- src/utils/bulkMoveUtils.test.ts — FOUND

**Modified files verified:**
- src/stores/boardStore.ts — bulkMoveGroup method present (line 194)
- src/stores/boardStore.test.ts — bulkMoveGroup describe block present

**Commits verified (this worktree branch worktree-agent-a14dab3f):**
- 1c1546a — FOUND (chore: pre-stage)
- a44f215 — FOUND (test: Task 1 RED)
- d6ce275 — FOUND (feat: Task 1 GREEN)
- 5fb8ee4 — FOUND (test: Task 2 RED)
- 1d90349 — FOUND (feat: Task 2 GREEN)

**Tests verified:**
- bulkMoveUtils.test.ts: 19 tests (>= 12 required) — PASS
- boardStore.test.ts bulkMoveGroup describe: 12 tests (>= 10 required) — PASS
- Full suite: 443/443 — PASS
- tsc --noEmit: clean — PASS

---

*Phase: 09-grouping*
*Plan: 03*
*Completed: 2026-04-12*
