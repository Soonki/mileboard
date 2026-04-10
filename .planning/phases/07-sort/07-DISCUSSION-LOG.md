# Phase 7: ソート - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 07-sort
**Areas discussed:** ソートUIの配置・形式, ソート方向の切替操作, null値のソート順, ソートの適用範囲

---

## ソートUIの配置・形式

| Option | Description | Selected |
|--------|-------------|----------|
| FilterBarの右側に追加 | FilterBarのドロップダウン群の右側にソートコントロールを配置。既存のツールバー行を拡張 | ✓ |
| FilterBarの下に別行 | ソート専用の行をFilterBarの下に追加。スペースに余裕があるが縦方向の消費が増える | |
| LaneHeader内にレーンごと | 各レーンのヘッダーにソートコントロールを配置。柔軟だが複雑 | |

**User's choice:** FilterBarの右側に追加
**Notes:** フィルタドロップダウンとの間にセパレーターを入れて区切る

---

| Option | Description | Selected |
|--------|-------------|----------|
| ドロップダウン | FilterDropdownと同じドロップダウン形式で基準を選択 | ✓ |
| トグルボタン群 | 「担当者」「期限日」の2つのボタンを並べてクリックで切替 | |

**User's choice:** ドロップダウン
**Notes:** FilterDropdownと同じUIパターンを踏襲

---

| Option | Description | Selected |
|--------|-------------|----------|
| API取得順そのまま | Backlog APIが返す順序をそのまま表示 | |
| 常に何かでソート | デフォルトで担当者順など初期ソートを適用 | |
| 課題ID順 | keyIdでソート（ユーザー入力） | ✓ |

**User's choice:** 課題IDでソートしておきたい
**Notes:** ユーザーのフリーテキスト入力。デフォルトは課題ID（keyId）順

---

| Option | Description | Selected |
|--------|-------------|----------|
| 「ソートなし」選択肢 | ドロップダウンに「ソートなし（課題ID順）」を含め、選択でデフォルトに戻る | ✓ |
| クリアボタン | ソートドロップダウンの横に×ボタンを表示し、クリックで解除 | |

**User's choice:** 「ソートなし」選択肢
**Notes:** なし

---

## ソート方向の切替操作

| Option | Description | Selected |
|--------|-------------|----------|
| 矢印トグルボタン | ソートドロップダウンの横に↑/↓ボタン。クリックで昇順⇔降順切替 | ✓ |
| ドロップダウン内に含める | 「担当者順（昇順）」「担当者順（降順）」のように選択肢に方向を含める | |

**User's choice:** 矢印トグルボタン
**Notes:** なし

---

| Option | Description | Selected |
|--------|-------------|----------|
| 昇順がデフォルト | ソート基準選択時はまず昇順で表示 | ✓ |
| 基準ごとに最適なデフォルト | 基準ごとに自然な方向を設定 | |

**User's choice:** 昇順がデフォルト
**Notes:** なし

---

## null値のソート順

| Option | Description | Selected |
|--------|-------------|----------|
| 常に末尾 | 昇順でも降順でもnull値のカードは常にリスト末尾に配置 | ✓ |
| 昇順時は先頭、降順時は末尾 | nullを「最小値」として扱い、ソート方向に従って自然に配置 | |

**User's choice:** 常に末尾
**Notes:** なし

---

## ソートの適用範囲

| Option | Description | Selected |
|--------|-------------|----------|
| 全レーン一括 | ソート基準・方向を選ぶと全レーンのカードが同じ基準でソートされる | ✓ |
| レーンごと個別 | 各レーンのヘッダーで個別にソート設定。柔軟だが複雑 | |

**User's choice:** 全レーン一括
**Notes:** フィルタと同じパターンで一貫性がある

---

## Claude's Discretion

- ソートドロップダウンのスタイリング詳細
- セパレーターの視覚的デザイン
- ↑/↓ボタンの具体的なUnicode文字選択
- sortStore or filterStoreへの統合 vs 独立store

## Deferred Ideas

None — discussion stayed within phase scope
