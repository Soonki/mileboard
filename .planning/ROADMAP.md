# Roadmap: mileboard

## Overview

Backlogのマイルストーンをカンバンレーンとして表示し、ドラッグ&ドロップで課題のマイルストーン移動を可能にするTauriデスクトップアプリ。v1.0でMVP（マイルストーン表示・DnD移動）を完成させ、v1.1でチームの計画調整を高速化する生産性機能（フィルタ・ソート・並べ替え・グルーピング）を追加する。

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-04-08)
- 🚧 **v1.1 Productivity** - Phases 6-9 (in progress, Phase 9 next)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-04-08</summary>

v1.0 の詳細は `.planning/milestones/v1.0-ROADMAP.md` の archive を参照（削除済み — git history 参照）。

</details>

### 🚧 v1.1 Productivity (In Progress)

**Milestone Goal:** チームの計画調整を高速化する。フィルタ・ソート・レーン内並べ替え・複数課題のグルーピング一括移動を提供し、大量課題を扱うワークフローでもボードが破綻しないようにする。

#### Phase 6: フィルタリング
**Goal**: Backlog課題カードをステータス・担当者・カテゴリの3軸でフィルタできるようにする。フィルタ状態を視覚的に表示し、一括クリアを提供する。フィルタで全カード非表示になったレーンに非表示件数を表示する。DnD機能との非干渉を保つ。
**Depends on**: Phase 5
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05
**Success Criteria** (what must be TRUE):
  1. ユーザーはステータス・担当者・カテゴリでカードをフィルタできる（複数選択OR条件）
  2. アクティブなフィルタ条件が視覚的に表示され、一括クリアできる
  3. フィルタで全カードが非表示になったレーンに非表示件数が表示される
  4. フィルタ適用中もDnDによるマイルストーン移動が正常動作する
**Plans**: 3 plans

Plans:
- [x] 06-01: FilterStore + FilterDropdown 基盤
- [x] 06-02: FilterBar + ActiveFilterChips 統合
- [x] 06-03: Board/Lane フィルタ適用と hiddenCount 表示

**Status**: Complete (2026-04-09)

#### Phase 7: ソート
**Goal**: レーン内のカードをソート基準（担当者順・期限日順）と方向（昇順/降順）で並べ替えできるようにし、ソート設定をplugin-storeで永続化する。ソートUIはFilterBarの右側に統合配置する。
**Depends on**: Phase 6
**Requirements**: SORT-01, SORT-02, SORT-03, SORT-04
**Success Criteria** (what must be TRUE):
  1. ユーザーはレーン内のカードを担当者順または期限日順でソートできる
  2. ユーザーはソート方向（昇順/降順）を切り替えられる
  3. ソート設定はアプリ再起動後も保持される
  4. null値（未割当・期限なし）のカードは昇順でも降順でも末尾に配置される
**Plans**: 2 plans

Plans:
- [x] 07-01: sortStore + sortUtils + SortDropdown 基盤
- [x] 07-02: FilterBar統合 + Lane適用 + plugin-store永続化

**Status**: Complete (2026-04-11)

#### Phase 8: レーン内並べ替え
**Goal**: レーン内でカードをDnDして任意の並び順に変更でき、カスタム順序をplugin-storeで永続化する。ソートモード中はレーン内並べ替えを無効化し、レーン間DnD（マイルストーン移動）は有効のまま維持する。
**Depends on**: Phase 7
**Requirements**: REORD-01, REORD-02, REORD-03
**Success Criteria** (what must be TRUE):
  1. ユーザーはレーン内でカードをDnDして並び順を変更できる
  2. カスタム並び順はアプリ再起動後も保持される
  3. ソートモード中は手動並べ替えが無効になる（カーソル変化で自然に気づく）
  4. ソートモード中もレーン間DnD（マイルストーン移動）は有効のまま維持される
**Plans**: 2 plans

Plans:
- [x] 08-01: reorderStore + reorderStorage + applyCustomOrder 基盤
- [x] 08-02: Board/IssueCard/App 統合（handleDragEnd 同一レーン分岐、起動時復元）

**Status**: Complete (2026-04-11)

#### Phase 9: グルーピング・一括移動
**Goal**: 複数の関連課題を付箋を重ねるようなスタック表現でグループ化し、1枚のカードとして扱う。レーン内では代表カードのみ表示され、グループクリックで展開して内訳を閲覧できる。グループをDnDで別レーンに移動すると含まれる全課題が一括でマイルストーン移動される。
**Depends on**: Phase 8
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, GRP-05, GRP-06, GRP-07
**Success Criteria** (what must be TRUE):
  1. ユーザーは複数カードを選択してグループ化できる（付箋スタック表現）
  2. レーン内ではグループの代表カード1枚のみ表示され、重なりでグループであることが視覚的にわかる
  3. ユーザーはグループをクリックして展開し、含まれる課題一覧を閲覧できる
  4. ユーザーはグループをDnDで別レーンに移動でき、含まれる全課題が一括でマイルストーン移動される
  5. 1レーン内に複数のグループを作成できる
  6. ユーザーはグループを解除して個別カードに戻せる
  7. 一括移動中に進捗が表示され、部分失敗時は個別ロールバック+resyncされる
**Plans**: 5 plans

Plans:
- [x] 09-00-PLAN.md — 基盤整備: ReorderEntry 型拡張 / 後方互換 / Group 型定義 / CSS トークン / sonner mock / Portal PoC
- [x] 09-01-PLAN.md — groupStore + groupStorage + groupUtils (resolveRepresentativeCard / applyGroupExpansion / pruneStaleMembers)
- [x] 09-02-PLAN.md — GroupCard + IssueCard droppable + Lane GroupSlot 対応 + Board handleDragEnd (card→card / card→group)
- [x] 09-03-PLAN.md — bulkMoveUtils (runWithConcurrency) + boardStore.bulkMoveGroup (楽観更新 + 部分失敗 rollback + sonner 進捗)
- [x] 09-04-PLAN.md — GroupPopover + group→lane bulk wiring + dissolve + fetchBoard prune + 実機 QA

**Status**: Not started

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 6. フィルタリング | v1.1 | 3/3 | Complete | 2026-04-09 |
| 7. ソート | v1.1 | 2/2 | Complete | 2026-04-11 |
| 8. レーン内並べ替え | v1.1 | 2/2 | Complete | 2026-04-11 |
| 9. グルーピング・一括移動 | v1.1 | 0/TBD | Not started | - |

---

*Reconstructed: 2026-04-12 from existing phase artifacts after .planning/ROADMAP.md was removed in commit 65e0263 (OSS cleanup). File is gitignored and kept as local GSD scaffolding.*
