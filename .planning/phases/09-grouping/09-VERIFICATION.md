---
status: passed
phase: 09-grouping
must_haves_total: 7
must_haves_verified: 7
created: 2026-04-12T17:40:00Z
verified: 2026-04-12T17:40:00Z
score: 7/7 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 09: グルーピング・一括移動 Verification Report

**Phase Goal:** 複数の関連課題を付箋を重ねるようなスタック表現でグループ化し、1枚のカードとして扱う。レーン内では代表カードのみ表示され、グループクリックで展開して内訳を閲覧できる。グループをDnDで別レーンに移動すると含まれる全課題が一括でマイルストーン移動される。
**Verified:** 2026-04-12T17:40:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                          | Status     | Evidence                                                                                                                                                          |
| --- | ------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC1 | ユーザーは複数カードを選択してグループ化できる（付箋スタック表現）                       | VERIFIED   | Board.tsx:271-328 (card-target branch) + GroupCard.tsx + GroupCard.module.css 影レイヤー2枚 (translate 3px/6px) + groupStore.createGroup                            |
| SC2 | レーン内ではグループの代表カード1枚のみ表示され、重なりでグループであることが視覚的にわかる | VERIFIED   | GroupCard.tsx (representativeCard + shadowLayer1/2) + groupUtils.applyGroupExpansion (memberIdToGroupId による top-level からのメンバー除外) + Board.tsx 統合          |
| SC3 | ユーザーはグループをクリックして展開し、含まれる課題一覧を閲覧できる                       | VERIFIED   | GroupCard.tsx:67-72 onClick→onExpand(groupId, rect) + Board.tsx:704-766 expandedGroupId state + GroupPopover.tsx (createPortal + member list + Backlog URL open) |
| SC4 | ユーザーはグループをDnDで別レーンに移動でき、含まれる全課題が一括でマイルストーン移動される | VERIFIED   | Board.tsx:366-399 group→lane branch → useBoardStore.bulkMoveGroup → boardStore.ts:208-294 (optimistic + 3並列 bulkMoveIssues + per-failure rollback)              |
| SC5 | 1レーン内に複数のグループを作成できる                                                | VERIFIED   | groupUtils.applyGroupExpansion は laneGroups (Object.values(groups).filter(g=>g.laneId===laneId)) を全て描画。複数 group を同レーン内で並べる test も groupUtils.test.ts 存在 |
| SC6 | ユーザーはグループを解除して個別カードに戻せる                                       | VERIFIED   | GroupPopover.tsx:151-157 「グループを解除する」ボタン → useGroupStore.dissolveGroup; groupStore.removeMember も memberIds<2 で auto-dissolve (GRP-06)。GroupPopover member drag-out も Board.tsx で処理 |
| SC7 | 一括移動中に進捗が表示され、部分失敗時は個別ロールバック+resyncされる                    | VERIFIED   | boardStore.bulkMoveGroup (loading toast + onProgress 完了カウンタ + 個別 rollback applyMoveIssue 逆方向 + groupStore.removeMember + 部分失敗 toast.error) |

**Score:** 7/7 truths verified (Roadmap SC 4 件 + 拡張 SC 3 件)

### Required Artifacts

| Artifact                                                  | Expected                                          | Status     | Details                                                       |
| --------------------------------------------------------- | ------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `src/types/group.ts`                                      | Group/GroupMap/GroupId/GroupSlot 型               | VERIFIED   | export interface Group/GroupSlot, type GroupId, GroupMap 確認 |
| `src/types/reorder.ts`                                    | ReorderEntry union + isGroupEntry                 | VERIFIED   | gsd-tools verify artifacts: PASS                              |
| `src/services/groupStorage.ts`                            | plugin-store load/save + validation               | VERIFIED   | loadGroupConfig / saveGroupConfig export                      |
| `src/services/reorderStorage.ts`                          | 後方互換バリデーション                            | VERIFIED   | gsd-tools verify artifacts: PASS                              |
| `src/stores/groupStore.ts`                                | useGroupStore + setGroups (Plan 04 拡張)          | VERIFIED   | createGroup/addMember/removeMember/dissolveGroup/moveGroup/loadFromStorage/setGroups 全て確認 |
| `src/stores/boardStore.ts`                                | bulkMoveGroup + fetchBoard prune                  | VERIFIED   | bulkMoveGroup 実装 (line 208-294) + fetchBoard 内 pruneStaleMembers + setGroups (line 162-165) |
| `src/stores/uiModeStore.ts`                               | UI mode 切替 (sort/group)                         | VERIFIED   | useUiModeStore + toggleMode (UX refinement Fix 5)             |
| `src/utils/groupUtils.ts`                                 | applyGroupExpansion + helpers                     | VERIFIED   | resolveRepresentativeCard / applyGroupExpansion / pruneStaleMembers / rejectMultiMilestoneMember 全て export |
| `src/utils/bulkMoveUtils.ts`                              | runWithConcurrency + bulkMoveIssues               | VERIFIED   | gsd-tools verify artifacts: PASS                              |
| `src/components/GroupCard/GroupCard.tsx`                  | 付箋スタック + DnD + click expand                 | VERIFIED   | useSortable + useDroppable 両方装着, shadowLayer1/2 + countBadge + onClick→onExpand |
| `src/components/GroupCard/GroupCard.module.css`           | 影レイヤー / countBadge / dropTargetGroup          | VERIFIED   | shadowLayer1/shadowLayer2 (translate(3px,3px) / translate(6px,6px)) + countBadge / countBadgePill / dropTargetGroup スタイル確認 |
| `src/components/GroupPopover/GroupPopover.tsx`            | Portal + 配置 + 外クリック/Escape + dissolve      | VERIFIED   | createPortal + useLayoutEffect (右 default → 左 flip → top clamp) + mousedown/Escape リスナー + dissolveButton |
| `src/components/IssueCard/IssueCard.tsx`                  | useDroppable card-target-${id}                    | VERIFIED   | useDroppable({id:`card-target-${issue.id}`}) + setRefs + dropTargetCard クラス |
| `src/components/Lane/Lane.tsx`                            | items prop + GroupSlot 分岐 render + uiMode       | VERIFIED   | items: Array<BacklogIssue \| GroupSlot> + isGroupSlot 型ガード + GroupCard 分岐 + sortingStrategy 切替 |
| `src/components/Board/Board.tsx`                          | applyGroupExpansion + buildHandleDragEnd 4分岐 + GroupPopover 統合 | VERIFIED | filteredAndSortedView (line 500-565) + buildHandleDragEnd (line 246-) (card-target/group-target/group-drag/lane分岐) + Popover render (line 743-766) |
| `src/components/ModeToggle/ModeToggle.tsx`                | sort/group モードトグル UI                        | VERIFIED   | role=radiogroup + 2 ボタン + Ctrl+Shift+M shortcut (Board.tsx 内)              |
| `src/App.tsx`                                             | groupStore.loadFromStorage useEffect              | VERIFIED   | useEffect(loadGroupsFromStorage, [...]) (line 35-36)         |

### Key Link Verification

| From                                       | To                                | Via                                         | Status   | Details                                                                |
| ------------------------------------------ | --------------------------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `src/services/reorderStorage.ts`           | `src/types/reorder.ts`            | ReorderMap/ReorderEntry import              | VERIFIED | gsd-tools verify key-links Plan 00: PASS                               |
| `src/stores/reorderStore.ts`               | `src/types/reorder.ts`            | ReorderMap import                            | VERIFIED | gsd-tools verify key-links Plan 00: PASS                               |
| `src/utils/reorderUtils.ts`                | `src/types/reorder.ts`            | ReorderEntry import                          | VERIFIED | gsd-tools verify key-links Plan 00: PASS                               |
| `src/utils/bulkMoveUtils.ts`               | `src/services/tauriBridge.ts`     | updateIssueMilestone 呼び出し                | VERIFIED | gsd-tools verify key-links Plan 03: PASS                               |
| `src/stores/boardStore.ts`                 | `src/utils/bulkMoveUtils.ts`      | bulkMoveIssues 呼び出し                      | VERIFIED | gsd-tools verify key-links Plan 03: PASS                               |
| `src/stores/boardStore.ts`                 | `src/stores/groupStore.ts`        | useGroupStore.getState() moveGroup/removeMember | VERIFIED | gsd-tools verify key-links Plan 03: PASS                               |
| `src/stores/boardStore.ts`                 | `sonner`                          | toast.loading/success/error 呼び出し         | VERIFIED | grep 確認: line 240, 254, 262, 272, 290 全て該当 (gsd-tools regex のescapeミスでツール出力false; 手動 grep で全種類PASS) |
| `src/components/Board/Board.tsx`           | `src/utils/groupUtils.ts`         | applyGroupExpansion / rejectMultiMilestoneMember | VERIFIED | line 29-30 import + line 513/533 invocation                            |
| `src/components/Board/Board.tsx`           | `src/stores/groupStore.ts`        | useGroupStore createGroup/addMember/dissolveGroup | VERIFIED | grep: useGroupStore line 8 import + getState() 多数                     |
| `src/components/Board/Board.tsx`           | `src/components/GroupPopover/GroupPopover.tsx` | GroupPopover render                | VERIFIED | line 41 import + line 758-764 conditional render                       |
| `src/components/Board/Board.tsx`           | `src/stores/boardStore.ts`        | bulkMoveGroup 呼び出し                       | VERIFIED | line 382-384 useBoardStore.getState().bulkMoveGroup(...)               |
| `src/components/IssueCard/IssueCard.tsx`   | `@dnd-kit/core`                    | useDroppable import                          | VERIFIED | line 3 import                                                           |
| `src/App.tsx`                              | `src/stores/groupStore.ts`        | loadFromStorage useEffect                    | VERIFIED | line 5 import + line 19/35 hook + useEffect                            |
| `src/components/GroupPopover/GroupPopover.tsx` | `src/stores/groupStore.ts`    | dissolveGroup 呼び出し                        | VERIFIED | line 5 import + line 108 useGroupStore.getState().dissolveGroup        |
| `src/stores/boardStore.ts`                 | `src/utils/groupUtils.ts`         | pruneStaleMembers 呼び出し                   | VERIFIED | line 10 import + line 163 invocation                                    |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| GroupCard.tsx | slot (GroupSlot) | Board.tsx applyGroupExpansion(...).items → Lane.tsx items prop → GroupCard slot prop | Yes — applyGroupExpansion は groupStore.groups (永続化済み GroupMap) と filteredIssues から動的構築 | FLOWING |
| GroupPopover.tsx | slot (GroupSlot) | Board.tsx findGroupSlotInView(filteredAndSortedView, expandedGroupId) | Yes — filteredAndSortedView は live useMemo (groupMap subscription) | FLOWING |
| Board.tsx filteredAndSortedView | items: Array<BacklogIssue\|GroupSlot> | data (from boardStore.fetchBoard → backlog API) + applyGroupExpansion(groupMap from useGroupStore) | Yes — boardStore は tauriBridge fetchBoardData 経由で実 API 叩く + groupStore は plugin-store から復元 | FLOWING |
| boardStore.bulkMoveGroup | result | bulkMoveIssues → runWithConcurrency tasks → updateIssueMilestone (tauriBridge → Rust reqwest → Backlog API) | Yes — 実 API 呼び出し | FLOWING |
| ModeToggle | mode | useUiModeStore.mode + toggleMode | Yes — Zustand state (default 'sort', UI からトグル可能) | FLOWING |

### Behavioral Spot-Checks

| Behavior                          | Command                                              | Result                                                          | Status |
| --------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | ------ |
| 全テスト pass                     | `npx vitest run`                                     | **544 passed (42 test files)**                                  | PASS   |
| TypeScript clean                  | `npx tsc --noEmit`                                   | EXIT=0 (0 errors)                                               | PASS   |
| Phase 9 artifact: groupStore     | `ls src/stores/groupStore.ts`                        | FOUND                                                           | PASS   |
| Phase 9 artifact: GroupCard      | `ls src/components/GroupCard/GroupCard.tsx`           | FOUND                                                           | PASS   |
| Phase 9 artifact: GroupPopover   | `ls src/components/GroupPopover/GroupPopover.tsx`     | FOUND                                                           | PASS   |
| Phase 9 artifact: bulkMoveUtils  | `ls src/utils/bulkMoveUtils.ts`                       | FOUND                                                           | PASS   |
| Phase 9 commits on main          | `git log --oneline`                                  | 09-00 〜 09-04 commit (a29113d, 6cfdf5d, a70b331, 1801b40, 46c7b26, 66c0d77, 7cb1950, a09b8bd, 30c6b43, 9110217, bf630a0, e5423ab, bcff070, 4943743, c1b7394, fd0a500, 1c1546a, a44f215, d6ce275, 5fb8ee4, 1d90349, 9035e51, 54c3e2d, 3b8d30f, a470ed7, 2806e17, c808443, f8fe26f, ad06f41, 893fb2d) 全て確認 | PASS   |
| toast.warning 不使用              | `grep "toast.warning" src/stores/boardStore.ts`      | NO MATCH (D-18 遵守)                                           | PASS   |
| Tauri 実機 QA (Plan 04 Task 3)   | (manual)                                             | ユーザー approve 済み (15項目QA + 5UX fix)                       | PASS (manual approval) |

### Requirements Coverage

| Requirement | Source Plans          | Description                                                          | Status     | Evidence                                                                                            |
| ----------- | --------------------- | -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| GRP-01      | 09-00, 01, 02         | 複数カードを選択してグループ化（付箋スタック表現）                        | SATISFIED  | groupStore.createGroup + Board.tsx card-target branch + GroupCard 影レイヤー (Plan 02 Summary)        |
| GRP-02      | 09-00, 01, 02         | レーン内ではグループの代表カード1枚のみ表示・重なり視覚化                 | SATISFIED  | applyGroupExpansion による memberIdToGroupId 除外 + GroupCard 影2枚 (Plan 02 Summary)                  |
| GRP-03      | 09-01, 04             | グループをクリックで展開・課題一覧閲覧                                  | SATISFIED  | GroupCard.onClick → onExpand + GroupPopover createPortal + memberList (Plan 04 Summary)               |
| GRP-04      | 09-03, 04             | グループ DnD 別レーン → 全課題一括移動                                  | SATISFIED  | Board.tsx group→lane branch + boardStore.bulkMoveGroup + bulkMoveIssues 3並列 (Plan 03+04 Summary)    |
| GRP-05      | 09-00, 01, 02         | 1レーン内に複数のグループを作成できる                                  | SATISFIED  | applyGroupExpansion は laneGroups を Object.values で全描画 (Plan 01 Summary - groupUtils tests)        |
| GRP-06      | 09-01, 04             | グループ解除（個別カードに戻す） / dissolve / drag-out / auto           | SATISFIED  | GroupPopover dissolve button + groupStore.removeMember auto-dissolve + Board.tsx popover member drag-out branch (Plan 04 Summary) |
| GRP-07      | 09-03, 04             | 一括移動中の進捗 + 部分失敗の個別 rollback + resync                    | SATISFIED  | boardStore.bulkMoveGroup loading toast + onProgress + per-failure applyMoveIssue 逆方向 + removeMember (Plan 03 Summary) |

**Orphan check:** REQUIREMENTS.md は GRP-01〜07 を Phase 9 に紐付け。Plans の `requirements` フロントマター ([GRP-01..GRP-07]) 集合と完全一致。Orphan 0 件。

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |

なし — Phase 9 関連ファイルに TODO/FIXME/PLACEHOLDER は0件。SettingsForm の `placeholder=""` は HTML input 属性で Phase 9 とは無関係。BoardPlaceholder.tsx は Phase 5 の既存 fallback コンポーネント。

### Human Verification Required

なし — Plan 04 Task 3 で実機 QA を実施済みで「approve」signal を受領済み。15項目の手動 QA を経て5つの UX fix を適用し最終承認を取得。視覚要素 (付箋スタック / GroupPopover 配置 / mode toggle UX) は実機検証完了。

### Gaps Summary

ギャップなし。Phase 9 のすべての Roadmap Success Criteria (4/4)、すべての Requirements (GRP-01〜07)、すべての主要 artifact (17 件)、すべての key link (15 件)、すべての data-flow path (5 件) が verify されている。

**実装の完成度の根拠:**
1. **テスト網羅:** 544/544 緑、tsc 0 errors
2. **データフロー:** boardStore.fetchBoard → groupStore.setGroups → useGroupStore subscription → Board.filteredAndSortedView → applyGroupExpansion → Lane.items → GroupCard slot → GroupPopover slot のフル経路がライブデータで流れている
3. **多経路でのグループ化方法:** card-on-card (Branch 1) と card-on-group (Branch 2) の2系統で GRP-01 を達成
4. **多経路での解除方法:** dissolve button (Plan 04) + auto-dissolve (memberIds<2 trigger) + popover drag-out (Plan 04 branch) の3系統で GRP-06 を達成
5. **バルク移動のロバスト性:** 楽観更新 + 個別ロールバック + 全失敗ロールバック + sonner 進捗 toast (D-18 toast.warning なし)
6. **UX refinement:** 実機 QA で発覚した5つの問題を sort/group モードトグル (uiModeStore + ModeToggle) で根本解決し、ユーザー承認を取得
7. **Phase 8 後方互換:** ReorderEntry union + reorderStorage バリデーション緩和 で既存 Phase 8 reorder データを破壊しない (T-09-00-02 mitigation)
8. **永続化:** plugin-store による GroupMap 復元 (App.tsx 起動時 loadFromStorage)

---

_Verified: 2026-04-12T17:40:00Z_
_Verifier: Claude (gsd-verifier)_
