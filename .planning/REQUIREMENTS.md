# Requirements: mileboard

**Defined:** 2026-04-07
**Core Value:** マイルストーン間の課題移動をドラッグ&ドロップで直感的に行え、チームの計画調整を高速化すること

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Connection

- [ ] **CONN-01**: ユーザーはAPIキー・ホスト・プロジェクトキーを入力し接続を検証できる
- [ ] **CONN-02**: 接続設定はローカルに永続化され再起動後も保持される
- [ ] **CONN-03**: ユーザーはマイルストーンフィルタ用プレフィックスを設定できる

### Board Display

- [ ] **BOARD-01**: プレフィックスに一致するマイルストーンが先月〜6ヶ月先の範囲で時系列レーン表示される
- [ ] **BOARD-02**: マイルストーン未設定の課題が「未割当」レーンに表示される
- [ ] **BOARD-03**: 各課題がキー・件名・ステータスバッジ・担当者・優先度付きカードで表示される
- [ ] **BOARD-04**: ステータスに応じた色分けでカードが視覚的に区別される
- [ ] **BOARD-05**: レーンヘッダーに課題数が表示される
- [ ] **BOARD-06**: レーンヘッダーにメンバー別課題数の内訳が表示される

### Drag & Drop

- [ ] **DND-01**: カードをレーン間でドラッグ&ドロップするとマイルストーンが変更される
- [ ] **DND-02**: 楽観的UI更新でカードが即座に移動し、API失敗時は元レーンにロールバックされる
- [ ] **DND-03**: 複数マイルストーン持ちの課題は最古開始日のレーンに表示され、警告表示付きでレーン間DnDが無効化される

### UX

- [ ] **UX-01**: 初期データ取得中にローディング状態が表示される
- [ ] **UX-02**: API失敗時にエラートーストが表示される
- [ ] **UX-03**: カードクリックでBacklog課題がブラウザで開かれる

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Filters

- **FILT-01**: ユーザーは担当者でカードをフィルタできる

### UX Polish

- **UXP-01**: レーンを折りたたんでヘッダーのみ表示にできる
- **UXP-02**: レーンヘッダーにマイルストーンの開始日・終了日が表示される
- **UXP-03**: ドラッグ中にドロップゾーンと挿入位置が視覚的にハイライトされる

### Power Features

- **PWR-01**: レーン内のカードをソート順（優先度、ステータス等）で並べ替えできる
- **PWR-02**: 複数カードを選択し一括で別マイルストーンに移動できる

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| ステータスフィルタ | 担当者フィルタで十分。必要なら v3 で検討 |
| 優先度フィルタ | 担当者フィルタで十分。必要なら v3 で検討 |
| キーボードDnD | アクセシビリティ向上だが MVP/v2 には不要 |
| 自動リフレッシュ（ポーリング） | 手動リロードで十分。v3 で検討 |
| キーワード検索 | 7レーン程度なら目視で十分 |
| 接続プロファイル切り替え | 単一プロジェクト運用が前提 |
| 課題の作成・編集 | Backlog本体のUI機能。カードクリックで遷移 |
| ステータスカラム表示（従来カンバン） | Backlog本体に存在。mileboard の価値はマイルストーンレーン |
| WIPカウント・WIP制限警告 | メンバー別課題数で偏りの把握は十分 |
| ガントチャート・タイムライン表示 | Backlog本体に存在 |
| 通知・Webhook | デスクトップアプリにはポーリングで十分 |
| モバイル対応 | デスクトップアプリとして構築。計画作業はPC前提 |
| オフラインモード | Backlogデータのライブビュー。オフライン編集は競合リスク大 |
| コメント・アクティビティ表示 | Backlog本体の協調機能を複製する価値なし |
| カスタムフィールド表示 | 5つのコアフィールドで十分 |
| マルチプロジェクト統合ビュー | クロスプロジェクトのマイルストーン競合リスク |
| 分析・バーンダウン・ベロシティ | Backlog本体に存在 |
| レーン内の手動並び順の永続化 | Backlog APIに課題順序の概念なし。リフレッシュで混乱 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | Pending | Pending |
| CONN-02 | Pending | Pending |
| CONN-03 | Pending | Pending |
| BOARD-01 | Pending | Pending |
| BOARD-02 | Pending | Pending |
| BOARD-03 | Pending | Pending |
| BOARD-04 | Pending | Pending |
| BOARD-05 | Pending | Pending |
| BOARD-06 | Pending | Pending |
| DND-01 | Pending | Pending |
| DND-02 | Pending | Pending |
| DND-03 | Pending | Pending |
| UX-01 | Pending | Pending |
| UX-02 | Pending | Pending |
| UX-03 | Pending | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 0
- Unmapped: 15 ⚠️

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial definition*
