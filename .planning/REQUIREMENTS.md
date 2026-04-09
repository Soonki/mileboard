# Requirements: mileboard

**Defined:** 2026-04-08
**Core Value:** マイルストーン間の課題移動をドラッグ&ドロップで直感的に行え、チームの計画調整を高速化すること

## v1.1 Requirements

Requirements for v1.1 release. Each maps to roadmap phases.

### フィルタリング

- [x] **FILT-01**: ステータスで課題カードをフィルタできる（複数選択OR条件）
- [x] **FILT-02**: 担当者で課題カードをフィルタできる（複数選択OR条件）
- [x] **FILT-03**: Backlogカテゴリで課題カードをフィルタできる（複数選択OR条件）
- [x] **FILT-04**: アクティブなフィルタ条件が視覚的に表示され、一括クリアできる
- [x] **FILT-05**: フィルタで全カードが非表示になったレーンに非表示件数が表示される

### ソート

- [ ] **SORT-01**: レーン内のカードを担当者順でソートできる
- [ ] **SORT-02**: レーン内のカードを期限日順でソートできる
- [ ] **SORT-03**: ソート方向（昇順/降順）を切り替えられる
- [ ] **SORT-04**: ソート設定がアプリ再起動後も保持される

### レーン内並べ替え

- [ ] **REORD-01**: レーン内でカードをDnDして並び順を変更できる
- [ ] **REORD-02**: カスタム並び順がアプリ再起動後も保持される（plugin-store）
- [ ] **REORD-03**: ソートモード中は手動並べ替えが無効になり、モード表示される

### 複数選択・一括移動

- [ ] **BULK-01**: Ctrl+クリックで個別カード選択、Shift+クリックで範囲選択できる
- [ ] **BULK-02**: 選択した複数カードをDnDでまとめて別レーンに移動できる
- [ ] **BULK-03**: 一括移動中に進捗が表示され、部分失敗時は個別ロールバック+resyncされる

## Future Requirements

### 自動化・効率化

- **AUTO-01**: 自動リフレッシュ（定期的にボードデータを再取得）
- **AUTO-02**: キーボードショートカットによるカード操作

## Out of Scope

| Feature | Reason |
|---------|--------|
| サーバーサイドフィルタリング | 全データはクライアントにロード済み、APIコール不要 |
| フィルタ条件の永続化 | セッション中のみ有効、再起動で初期状態に戻す方がシンプル |
| キーワード検索 | フィルタ3軸で十分、テキスト検索はv2以降で検討 |
| レーン間のカード順序同期 | Backlog APIにカード順序の概念なし、ローカル保持のみ |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILT-01 | Phase 6 | Pending |
| FILT-02 | Phase 6 | Pending |
| FILT-03 | Phase 6 | Pending |
| FILT-04 | Phase 6 | Pending |
| FILT-05 | Phase 6 | Pending |
| SORT-01 | Phase 7 | Pending |
| SORT-02 | Phase 7 | Pending |
| SORT-03 | Phase 7 | Pending |
| SORT-04 | Phase 7 | Pending |
| REORD-01 | Phase 8 | Pending |
| REORD-02 | Phase 8 | Pending |
| REORD-03 | Phase 8 | Pending |
| BULK-01 | Phase 9 | Pending |
| BULK-02 | Phase 9 | Pending |
| BULK-03 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
