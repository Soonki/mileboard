# Phase 4: Board Enrichment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 04-board-enrichment
**Areas discussed:** ステータス色分け, メンバー別内訳表示, カードクリック動作, 課題数カウント表示

---

## ステータス色分け

### Q1: ステータスの色をどう決めますか？

| Option | Description | Selected |
|--------|-------------|----------|
| Backlog APIの色をそのまま使う (推奨) | BacklogStatus.colorを直接使用。Backlogの設定と一貫性があり、カスタムステータスも自動対応 | ✓ |
| カスタムパレットにマッピング | ステータス名またはIDでアプリ独自の色にマッピング。統一感は出るがカスタムステータスに対応できない | |
| 併用（API色ベース + フォールバック） | API色を優先使用、取得できない場合はデフォルトパレットにフォールバック | |

**User's choice:** Backlog APIの色をそのまま使う
**Notes:** なし

### Q2: 色をどの要素に適用しますか？

| Option | Description | Selected |
|--------|-------------|----------|
| バッジのみ (推奨) | StatusBadgeの背景色をステータス色に変更。カード自体は現状の白背景を維持 | ✓ |
| カード左ボーダー | カード左端に3-4pxのカラーバーを追加。バッジはグレーのまま | |
| 両方（バッジ + 左ボーダー） | バッジ色 + カード左ボーダーの両方。視覚的に強いが色の主張が強くなりすぎる可能性あり | |

**User's choice:** バッジのみ
**Notes:** なし

---

## メンバー別内訳表示

### Q1: メンバー別課題数をレーンヘッダーにどう表示しますか？

| Option | Description | Selected |
|--------|-------------|----------|
| 常時展開リスト (推奨) | ヘッダーに「田中:3, 佐藤:2, 未:1」のように常に表示 | |
| トグル展開式 | デフォルトは課題数のみ表示。クリックでメンバー内訳を展開/折りたたみ | ✓ |
| ツールチップホバー | ヘッダーには課題数のみ。ホバー時にツールチップでメンバー内訳を表示 | |

**User's choice:** トグル展開式
**Notes:** なし

### Q2: トグルのデフォルト状態は？

| Option | Description | Selected |
|--------|-------------|----------|
| 折りたたみ (推奨) | デフォルトは課題数のみ表示。クリックで内訳を展開 | ✓ |
| 展開 | デフォルトでメンバー内訳も表示。クリックで折りたためる | |
| Claudeに任せる | デフォルト状態はClaude判断 | |

**User's choice:** 折りたたみ
**Notes:** なし

### Q3: メンバー内訳の並び順は？

| Option | Description | Selected |
|--------|-------------|----------|
| 課題数降順 (推奨) | 課題が多いメンバーから表示。負荷の偏りがすぐわかる | ✓ |
| 名前順 | メンバー名の五十音順。特定の人を探しやすい | |
| Claudeに任せる | 並び順はClaude判断 | |

**User's choice:** 課題数降順
**Notes:** なし

---

## カードクリック動作

### Q1: カードクリック時の視覚フィードバックは？

| Option | Description | Selected |
|--------|-------------|----------|
| ホバー+カーソル変更のみ (推奨) | マウスホバーでハイライト + pointerカーソル。シンプルで直感的 | |
| クリックリプル + ホバー | クリック時に短いリプルアニメーション（押し込み感）を追加 | ✓ |
| Claudeに任せる | 視覚フィードバックの詳細はClaude判断 | |

**User's choice:** クリックリプル + ホバー
**Notes:** なし

### Q2: Phase 5のDnDとの競合をどう扱いますか？

| Option | Description | Selected |
|--------|-------------|----------|
| クリックのみ実装、DnDはPhase 5で調整 (推奨) | Phase 4ではonClickのみ実装。Phase 5でDnD追加時にクリック vs ドラッグの判定ロジックを入れる | ✓ |
| DnD互換性を今から考慮 | Phase 4の時点でonPointerUpなどDnDと共存しやすいイベントハンドラを使う | |

**User's choice:** クリックのみ実装、DnDはPhase 5で調整
**Notes:** なし

---

## 課題数カウント表示

### Q1: 課題数の表示フォーマットと配置は？

| Option | Description | Selected |
|--------|-------------|----------|
| マイルストーン名の横 (推奨) | 「Sprint 2504 (6)」のように名前の横に括弧で表示。コンパクト | ✓ |
| 日付の横に別行 | 「6件」を日付範囲の横に表示。名前行と情報行が分離される | |
| Claudeに任せる | カウント表示のフォーマットと配置はClaude判断 | |

**User's choice:** マイルストーン名の横
**Notes:** なし

---

## Claude's Discretion

- Ripple animation timing and CSS implementation
- Badge text color contrast algorithm (luminance-based)
- Toggle expand/collapse animation
- Member breakdown text formatting (truncation, spacing)
- Component decomposition details

## Deferred Ideas

- カードのグルーピングと一括移動 — PWR-02 (v2)
- フィルタリング — FILT-01 (v2)
