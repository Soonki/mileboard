---
phase: 05-drag-drop-with-optimistic-updates
plan: 01
subsystem: data-layer
tags: [rust, ipc, optimistic-update, rollback, dnd-infrastructure]
dependency_graph:
  requires: [phase-04]
  provides: [update_issue_milestone-ipc, moveIssue-action, dnd-css-tokens]
  affects: [boardStore, tauriBridge, backlog-client]
tech_stack:
  added: [sonner@2]
  patterns: [optimistic-update-with-rollback, milestone-prefix-preservation, fire-and-forget-with-catch]
key_files:
  created:
    - src/services/tauriBridge.test.ts (updateIssueMilestone tests added to existing)
  modified:
    - src-tauri/src/backlog/error.rs
    - src-tauri/src/backlog/client.rs
    - src-tauri/src/backlog/commands.rs
    - src-tauri/src/lib.rs
    - src/types/board.ts
    - src/services/tauriBridge.ts
    - src/stores/boardStore.ts
    - src/stores/boardStore.test.ts
    - src/global.css
    - tests/setup.ts
    - package.json
    - package-lock.json
decisions:
  - "sonner@2をtoast通知に使用 (CLAUDE.mdのTech Stack準拠)"
  - "rebuild_milestone_idsをpub(crate)ヘルパーとして抽出し単体テスト可能に"
  - "laneId規約: 'unassigned' | 'milestone-{id}' (文字列統一でPitfall 6回避)"
  - "moveIssueはfire-and-forget + catchパターン (UIブロッキング回避)"
metrics:
  duration: 8m28s
  completed: "2026-04-08T06:54:01Z"
  tasks: 2
  files: 12
---

# Phase 05 Plan 01: DnDデータ層パイプライン Summary

Rust backendのマイルストーン更新IPCコマンドとフロントエンドのオプティミスティック更新/ロールバックパターンを実装。rebuild_milestone_idsで非プレフィックスマイルストーンを保持しつつ、moveIssueアクションがsnapshot/rollback + toast.errorで失敗を処理する。

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Rust update_issue_milestone + tauriBridge proxy | 24f4c93 | UpdateFailed variant, rebuild_milestone_ids helper, fetch_issue/update_milestone methods, IPC command registration, UpdateIssueMilestoneParams type, updateIssueMilestone proxy |
| 2 | boardStore moveIssue + CSS tokens + sonner | b3e106a | parseMilestoneIdFromLaneId/findIssueInBoardData/applyMoveIssue helpers, moveIssue action with optimistic update + rollback, Phase 5 CSS tokens, sonner mock/install |

## Architecture Notes

### Rust Backend (client.rs)

- `rebuild_milestone_ids(current, new_id, prefix)` -- 純粋関数で非プレフィックスマイルストーンを保持。6テストでカバー
- `fetch_issue` -- 個別課題取得 (update_milestoneの前段)
- `update_milestone` -- fetch_issue -> rebuild -> PATCH の3ステップ。空配列時は `milestoneId[]=""` で全クリア
- 入力バリデーション: issue_id_or_keyの空文字チェック (T-05-01対応)

### Frontend (boardStore.ts)

- `parseMilestoneIdFromLaneId` -- laneId文字列からmilestoneId抽出
- `findIssueInBoardData` -- 全レーン横断でissue検索
- `applyMoveIssue` -- イミュータブルなレーン間移動 (Zustandスプレッド構文パターン準拠)
- `moveIssue` -- snapshot取得 -> 楽観更新 -> API fire-and-forget -> catch内でrollback + toast.error

### Data Flow

```
moveIssue(issueId, from, to)
  |-> applyMoveIssue (即座にUI更新)
  |-> updateIssueMilestone (非同期API)
       |-> invoke('update_issue_milestone')
            |-> BacklogClient.update_milestone
                 |-> fetch_issue (現在のmilestone取得)
                 |-> rebuild_milestone_ids (prefix除外 + 新ID追加)
                 |-> PATCH /issues/{key} (milestoneId[]送信)
       |-> catch: set({ data: snapshot }) + toast.error
```

## Test Coverage

- **Rust:** 6 rebuild_milestone_ids tests + 1 UpdateFailed error test = 7 new tests (total 45)
- **tauriBridge:** 4 updateIssueMilestone tests added (total 11)
- **boardStore:** 21 new tests (helpers + moveIssue action) (total 29)
- **All suites:** 144 frontend tests + 45 Rust tests = 189 total, all green

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] sonner dependency not installed**
- **Found during:** Task 2
- **Issue:** CLAUDE.mdにsonner 2.xが記載されていたが、package.jsonに未追加だった
- **Fix:** `npm install sonner@2` で依存関係を追加
- **Files modified:** package.json, package-lock.json
- **Commit:** b3e106a

## Known Stubs

None -- 全てのデータフローが実装済み。UIコンポーネント (DnDボード) は後続プランで実装。

## Self-Check: PASSED

- All 11 key files verified present
- Commit 24f4c93 verified in git log
- Commit b3e106a verified in git log
- 45 Rust tests passing
- 144 frontend tests passing
