# Phase 5: Drag & Drop with Optimistic Updates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 05-drag-drop-with-optimistic-updates
**Areas discussed:** ドラッグ操作の見た目, マルチマイルストーン警告, エラートーストの挙動, 未割り当てレーンのDnD

---

## ドラッグ操作の見た目

### ドラッグ中のカード表現

| Option | Description | Selected |
|--------|-------------|----------|
| 半透明 + シャドウ | ドラッグ中カードはopacity: 0.7で大きめドロップシャドウ。元位置に薄いプレースホルダー。Trello/Notion風 | |
| 完全不透明 + 拡大 | カードは完全不透明のままscale: 1.05で大きなシャドウ。元位置は非表示。Linear/Jira風 | ✓ |
| Claudeにおまかせ | dnd-kitのデフォルトDragOverlayをベースに実装 | |

**User's choice:** 完全不透明 + 拡大
**Notes:** なし

### ドロップ先レーンのハイライト

| Option | Description | Selected |
|--------|-------------|----------|
| 背景色変更 | ドラッグ中にホバーしているレーンの背景を薄いハイライト色に変更 | ✓ |
| ボーダー + 背景 | 背景色変更に加えてレーンボーダーをアクセントカラーの破線に変更 | |
| Claudeにおまかせ | dnd-kitのオーバー素材検知をベースに実装 | |

**User's choice:** 背景色変更
**Notes:** なし

---

## マルチマイルストーン警告

### 警告バッジデザイン

| Option | Description | Selected |
|--------|-------------|----------|
| アイコンバッジ | カード右上に小さな⚠アイコン。ホバーでツールチップ表示 | ✓ |
| テキストラベル | カード下部に「他N件のMS」テキスト。クリックで詳細展開 | |
| Claudeにおまかせ | コンパクト3行カードを崩さない範囲で適切な表現を選択 | |

**User's choice:** アイコンバッジ
**Notes:** なし

### ドラッグ無効時のフィードバック

| Option | Description | Selected |
|--------|-------------|----------|
| カーソル変更のみ | not-allowedカーソルでドラッグ不可を示す。カード自体は動かない | ✓ |
| カーソル + カード微振動 | not-allowedカーソルに加えてカードが小さく振動(shake)して操作拒否を表現 | |
| Claudeにおまかせ | dnd-kitの標準的な無効ドラッグ表現を採用 | |

**User's choice:** カーソル変更のみ
**Notes:** なし

---

## エラートーストの挙動

### 表示位置

| Option | Description | Selected |
|--------|-------------|----------|
| 右下 | 画面右下にスタック表示。sonnerのデフォルト | ✓ |
| 上部中央 | 画面上部中央。見落としにくいがヘッダーと重なる可能性 | |
| Claudeにおまかせ | sonnerのデフォルト位置をそのまま使用 | |

**User's choice:** 右下
**Notes:** なし

### リトライアクション

| Option | Description | Selected |
|--------|-------------|----------|
| 表示のみ | エラーメッセージ表示のみで自動消滅(5秒)。リトライは再ドラッグで対応 | ✓ |
| リトライボタン付き | 「再試行」ボタン付きトースト。クリックで同じDnD操作を再実行 | |
| Claudeにおまかせ | sonnerの機能範囲で適切な実装を選択 | |

**User's choice:** 表示のみ
**Notes:** なし

---

## 未割り当てレーンのDnD

### 未割り当て → マイルストーン

| Option | Description | Selected |
|--------|-------------|----------|
| 許可 | 未割り当てからマイルストーンへドラッグ可。スプリント計画の主要ワークフロー | ✓ |
| 禁止 | 未割り当てレーンは読み取り専用。マイルストーン間の移動のみ許可 | |

**User's choice:** 許可
**Notes:** なし

### マイルストーン → 未割り当て

| Option | Description | Selected |
|--------|-------------|----------|
| 許可 | マイルストーンから未割り当てへドラッグでプレフィックス一致MSを削除 | ✓ |
| 禁止 | マイルストーン解除は危険。BacklogのUIで行うべき | |
| Claudeにおまかせ | Backlog APIの制約を調査して実現可能性に応じて判断 | |

**User's choice:** 許可
**Notes:** なし

---

## Claude's Discretion

- dnd-kit DragOverlay実装詳細とactivation constraintの閾値
- ドロップターゲットレーンのハイライト色
- ツールチップ実装アプローチ（CSS-only vs ライブラリ）
- ドラッグオーバーレイのscale/shadow CSS値
- boardStore内部のスナップショット/ロールバック実装
- Rust PATCHリクエスト構築詳細
- DnDラッパーレイヤーのコンポーネント分解（DndContext配置場所）

## Deferred Ideas

- ドロップ位置のインサーションポイント表示 (UXP-03 v2)
- レーン内並び替え (PWR-01 v2)
- 複数カード選択・一括移動 (PWR-02 v2)
