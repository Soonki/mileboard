# Phase 3: Core Kanban Board - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-08
**Phase:** 03-core-kanban-board
**Areas discussed:** レーンレイアウト, カード表示スタイル, 未割当レーンの配置, ボードヘッダーとローディング

---

## レーンレイアウト

### Q1: マイルストーンレーンの配置方向は？

| Option | Description | Selected |
|--------|-------------|----------|
| 横スクロールカラム | Trello風の縦長カラムを横に並べる。DnD（Phase 5）との相性が良い。 | ✓ |
| 横一列スイムレーン | 各レーンが画面幅いっぱいの横長行。縦スクロールでレーン切り替え。 | |

**User's choice:** 横スクロールカラム
**Notes:** None

### Q2: レーンのカラム幅は？

| Option | Description | Selected |
|--------|-------------|----------|
| 固定幅 | 全レーン同じ幅（例: 280px）。統一感がある。 | ✓ |
| 画面フィット | レーンが画面幅を均等分割。7レーンだと細くなる。 | |

**User's choice:** 固定幅
**Notes:** None

### Q3: レーンヘッダーにマイルストーン名以外に表示する情報は？

| Option | Description | Selected |
|--------|-------------|----------|
| 名前 + 日付範囲 | マイルストーン名と開始日〜終了日。計画期間が一目で分かる。 | ✓ |
| 名前のみ | シンプル。日付情報はv2要件UXP-02にあるがMVPで先取りも可。 | |

**User's choice:** 名前 + 日付範囲
**Notes:** None

---

## カード表示スタイル

### Q1: 課題カードの情報密度は？

| Option | Description | Selected |
|--------|-------------|----------|
| コンパクト | 3行: issueKey+ステータス / 件名（省略） / 担当者+優先度 | ✓ |
| 詳細 | 件名全文、カテゴリ、期限日も表示。カードが大きくなる。 | |

**User's choice:** コンパクト
**Notes:** 課題内容はクリックでBacklogのURLに飛んで確認

### Q2: 優先度インジケーターの表示形式は？

| Option | Description | Selected |
|--------|-------------|----------|
| アイコンのみ | ▲▲▲（高）▲▲（中）▲（低）の矢印アイコン。色で区別。 | ✓ |
| テキストラベル | 「高」「中」「低」のテキスト。色付きバッジ形式。 | |

**User's choice:** アイコンのみ
**Notes:** None

### Q3: ステータスバッジの表示形式は？

| Option | Description | Selected |
|--------|-------------|----------|
| テキストバッジ | Backlogステータス名をそのまま表示。Phase 3ではグレー統一。 | ✓ |
| ドットインジケーター | 小さな色付きドット + ステータス名。Phase 4で拡張。 | |

**User's choice:** テキストバッジ
**Notes:** None

---

## 未割当レーンの配置

### Q1: 「未割当」レーンの位置は？

| Option | Description | Selected |
|--------|-------------|----------|
| 先頭（左端） | 時系列レーンの前に固定表示。スプリントプランニングに最適。 | ✓ |
| 末尾（右端） | 時系列レーンの後に配置。月別レーンが優先。 | |

**User's choice:** 先頭（左端）
**Notes:** None

### Q2: 未割当レーンは横スクロール時にsticky固定？

| Option | Description | Selected |
|--------|-------------|----------|
| 固定（sticky） | 横スクロールしても常に左端に見える。DnD操作がいつでも可能。 | |
| 通常配置 | 他のレーンと同様にスクロール領域内。実装がシンプル。 | ✓ |

**User's choice:** 通常配置
**Notes:** None

---

## ボードヘッダーとローディング

### Q1: ボードヘッダーの構成は？

| Option | Description | Selected |
|--------|-------------|----------|
| タイトル + リロード + ⚙ | 左: "mileboard"。右: リロードボタン + ⚙設定ボタン。 | ✓ |
| プロジェクト名 + リロード + ⚙ | 左: Backlogプロジェクト名。複数プロジェクト対応時に便利。 | |

**User's choice:** タイトル + リロード + ⚙
**Notes:** None

### Q2: データ取得中のローディング表示は？

| Option | Description | Selected |
|--------|-------------|----------|
| スケルトン | レーン・カード形状のグレープレースホルダ。パルスアニメーション。 | ✓ |
| 中央スピナー | 画面中央にスピナーと「読み込み中...」テキスト。 | |

**User's choice:** スケルトン
**Notes:** None

### Q3: エラー状態の表示は？

| Option | Description | Selected |
|--------|-------------|----------|
| インラインエラー | ボード領域中央にエラーメッセージ + リトライボタン。ヘッダーは表示のまま。 | ✓ |
| トースト通知 | 画面下部にトーストでエラー表示。ボードは空のまま。 | |

**User's choice:** インラインエラー
**Notes:** None

---

## Claude's Discretion

- カード寸法と内部スペーシング
- スケルトンアニメーションのタイミングとプレースホルダ数
- スクロール動作の詳細（smooth scroll、scroll snap）
- 空レーンのビジュアル処理
- boardStoreの構造（Zustand store）
- コンポーネント分解（Board, Lane, Card, Skeleton, ErrorState）

## Deferred Ideas

None — discussion stayed within phase scope
