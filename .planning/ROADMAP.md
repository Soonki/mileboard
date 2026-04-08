# Roadmap: mileboard

## Completed Milestones

- [x] **v1.0 MVP** (Phases 1-5, 14 plans) — SHIPPED 2026-04-08 — [Archive](milestones/v1.0-ROADMAP.md)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Phases continue numbering from previous milestone (never restart at 01).

### v1.1 フィルタリング・ソート・一括操作

**Milestone Goal:** カードのフィルタリング・ソート・複数選択一括移動でボード操作の効率を大幅に向上させる

- [ ] **Phase 6: フィルタリング** - ステータス・担当者・カテゴリの複数選択フィルタとフィルタバーUI
- [ ] **Phase 7: ソート** - 担当者順・期限日順ソートと方向切替・永続化
- [ ] **Phase 8: レーン内並べ替え** - レーン内DnDによるカード手動並べ替えとローカル永続化
- [ ] **Phase 9: 複数選択・一括移動** - Ctrl/Shift選択と複数カードの一括レーン間移動

## Phase Details

### Phase 6: フィルタリング
**Goal**: ユーザーがステータス・担当者・カテゴリでカードを絞り込み、大量のカードから必要な情報に素早くアクセスできる
**Depends on**: Phase 5 (v1.0 complete)
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05
**Success Criteria** (what must be TRUE):
  1. ユーザーがステータス・担当者・カテゴリそれぞれのドロップダウンから複数の値を選択すると、条件に一致するカードだけが各レーンに表示される
  2. 選択中のフィルタ条件がフィルタバーにチップとして表示され、個別削除または一括クリアできる
  3. フィルタにより全カードが非表示になったレーンに「N件が非表示」のような件数表示がある
  4. フィルタ適用中もレーン間DnDが正常に動作する（フィルタされたビューがDnDのID解決を壊さない）
**Plans**: 3 plans
Plans:
- [ ] 06-01-PLAN.md — FilterState型 + applyFilters/extractOptions純粋関数 + filterStore + CSSトークン
- [ ] 06-02-PLAN.md — FilterDropdown/FilterChip/FilterBar UIコンポーネント
- [ ] 06-03-PLAN.md — Board統合 (FilterBar配置 + useMemoフィルタ + Lane hiddenCount + 動作確認)
**UI hint**: yes

### Phase 7: ソート
**Goal**: ユーザーがレーン内のカードを担当者順・期限日順で並べ替え、計画の優先順位を視覚的に把握できる
**Depends on**: Phase 6
**Requirements**: SORT-01, SORT-02, SORT-03, SORT-04
**Success Criteria** (what must be TRUE):
  1. ユーザーがソートコントロールから担当者順または期限日順を選ぶと、全レーンのカードが即座にその順序で並ぶ
  2. ソート方向（昇順/降順）ボタンで並び順を反転できる
  3. ソート設定がアプリ再起動後も保持されている
  4. ソートモード中はレーンヘッダーまたはフィルタバーにソートインジケーターが表示される
**Plans**: TBD
**UI hint**: yes

### Phase 8: レーン内並べ替え
**Goal**: ユーザーがレーン内でカードをドラッグして好みの順序に並べ替え、その順序がアプリ再起動後も維持される
**Depends on**: Phase 7
**Requirements**: REORD-01, REORD-02, REORD-03
**Success Criteria** (what must be TRUE):
  1. ユーザーがレーン内でカードを上下にドラッグすると、カードの位置がリアルタイムに入れ替わる
  2. カスタム並び順がアプリを再起動しても保持されており、APIリフレッシュ後も維持される
  3. ソートモードが有効な間はレーン内ドラッグが無効化され、ソートモード中であることが視覚的に表示される
**Plans**: TBD
**UI hint**: yes

### Phase 9: 複数選択・一括移動
**Goal**: ユーザーが複数カードをまとめて選択し、一度の操作で別レーンに移動できることで、スプリントプランニングの大量課題移動を高速化する
**Depends on**: Phase 8
**Requirements**: BULK-01, BULK-02, BULK-03
**Success Criteria** (what must be TRUE):
  1. Ctrl+クリックで個別カードの選択/解除、Shift+クリックで範囲選択ができ、選択状態が視覚的にハイライトされる
  2. 複数カードを選択した状態でDnDまたはアクションバーから移動先レーンを指定すると、選択した全カードがまとめて移動する
  3. 一括移動中にプログレス表示があり、一部のカードがAPI失敗した場合は失敗カードのみロールバックされ、成功カードは移動先に残る
  4. 一括移動完了後（部分失敗含む）、ボードデータがBacklog APIと再同期される
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. フィルタリング | 0/3 | Not started | - |
| 7. ソート | 0/? | Not started | - |
| 8. レーン内並べ替え | 0/? | Not started | - |
| 9. 複数選択・一括移動 | 0/? | Not started | - |
