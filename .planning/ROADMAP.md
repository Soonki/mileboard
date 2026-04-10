# Roadmap: mileboard

## Completed Milestones

- [x] **v1.0 MVP** (Phases 1-5, 14 plans) — SHIPPED 2026-04-08 — [Archive](milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1 フィルタリング・ソート・一括操作

**Progress:** 1/4 phases complete

- [x] **Phase 6: フィルタリング** (3 plans) — COMPLETE 2026-04-09 — FILT-01, FILT-02, FILT-03, FILT-04, FILT-05
- [ ] **Phase 7: ソート** (2 plans) — SORT-01, SORT-02, SORT-03, SORT-04
- [ ] **Phase 8: レーン内並べ替え** — REORD-01, REORD-02, REORD-03
- [ ] **Phase 9: 複数選択・一括移動** — BULK-01, BULK-02, BULK-03

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Phases continue numbering from previous milestone (never restart at 01).

### Phase 7: ソート

**Goal:** レーン内のカードをソートできるようにし、ユーザーが一覧性を高めるための並び順制御を提供する

**Scope:**
- ソート基準：担当者順、期限日順
- ソート方向：昇順/降順の切替
- ソート設定の永続化（plugin-store）
- ソートUIコントロール（ソートボタン/ドロップダウン）

**Requirements:** SORT-01, SORT-02, SORT-03, SORT-04

**Depends on:** Phase 6 (フィルタリング — FilterBar UIパターン、boardStore構造)

**Plans:** 2 plans

Plans:
- [x] 07-01-PLAN.md — Sort型定義 + sortUtils純粋関数 + sortStorage永続化 + sortStore
- [x] 07-02-PLAN.md — SortDropdown UI + FilterBar統合 + Board.tsxソートパイプライン + 動作確認

**Constraints:**
- ソートはフィルタと共存する（フィルタ適用後のカードに対してソート）
- DnDとの共存：ソートモード中はレーン間DnDは有効だが、レーン内並べ替え（Phase 8）とは排他
- ソート設定はplugin-storeで永続化（SORT-04）

### Phase 8: レーン内並べ替え

**Goal:** レーン内でカードをDnDして任意の並び順に変更でき、カスタム順序を永続化する

**Scope:**
- レーン内DnDでカード並べ替え
- カスタム並び順の永続化（plugin-store）
- ソートモードとの排他制御

**Requirements:** REORD-01, REORD-02, REORD-03

**Depends on:** Phase 7 (ソート — ソートモード状態管理)

### Phase 9: 複数選択・一括移動

**Goal:** 複数カードを選択してまとめて別レーンに移動できるようにし、大量課題の計画調整を高速化する

**Scope:**
- Ctrl+クリック個別選択、Shift+クリック範囲選択
- 複数カードのDnD一括移動
- 進捗表示と部分失敗時のロールバック

**Requirements:** BULK-01, BULK-02, BULK-03

**Depends on:** Phase 8 (レーン内並べ替え — DnD拡張基盤)
