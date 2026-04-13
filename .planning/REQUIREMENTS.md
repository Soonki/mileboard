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

- [x] **SORT-01**: レーン内のカードを担当者順でソートできる
- [x] **SORT-02**: レーン内のカードを期限日順でソートできる
- [x] **SORT-03**: ソート方向（昇順/降順）を切り替えられる
- [x] **SORT-04**: ソート設定がアプリ再起動後も保持される

### レーン内並べ替え

- [x] **REORD-01**: レーン内でカードをDnDして並び順を変更できる
- [x] **REORD-02**: カスタム並び順がアプリ再起動後も保持される（plugin-store）
- [x] **REORD-03**: ソートモード中は手動並べ替えが無効になり、モード表示される

### グルーピング・一括移動

- [x] **GRP-01**: 複数カードを選択してグループ化できる（付箋を重ねるようなスタック表現）
- [x] **GRP-02**: レーン内ではグループの代表カード1枚のみ表示され、重なりでグループであることが視覚的にわかる
- [x] **GRP-03**: グループをクリックすると展開され、含まれる課題一覧を閲覧できる
- [x] **GRP-04**: グループをDnDで別レーンに移動すると、含まれる全課題が一括移動される
- [x] **GRP-05**: 1レーン内に複数のグループを作成できる
- [x] **GRP-06**: グループの解除（個別カードに戻す）ができる
- [x] **GRP-07**: 一括移動中に進捗が表示され、部分失敗時は個別ロールバック+resyncされる

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
| FILT-01 | Phase 6 | Complete |
| FILT-02 | Phase 6 | Complete |
| FILT-03 | Phase 6 | Complete |
| FILT-04 | Phase 6 | Complete |
| FILT-05 | Phase 6 | Complete |
| SORT-01 | Phase 7 | Complete |
| SORT-02 | Phase 7 | Complete |
| SORT-03 | Phase 7 | Complete |
| SORT-04 | Phase 7 | Complete |
| REORD-01 | Phase 8 | Complete |
| REORD-02 | Phase 8 | Complete |
| REORD-03 | Phase 8 | Complete |
| GRP-01 | Phase 9 | Complete |
| GRP-02 | Phase 9 | Complete |
| GRP-03 | Phase 9 | Complete |
| GRP-04 | Phase 9 | Complete |
| GRP-05 | Phase 9 | Complete |
| GRP-06 | Phase 9 | Complete |
| GRP-07 | Phase 9 | Complete |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
