# Phase 8: レーン内並べ替え - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-11
**Phase:** 08-reorder
**Areas discussed:** カスタム順序とソートの関係, カスタム順序の永続化方式, ソート排他時のUX表現, レーン間移動後の順序処理

---

## カスタム順序とソートの関係

| Option | Description | Selected |
|--------|-------------|----------|
| 保持して復帰 | ソート中はソート順で表示、「ソートなし」に戻すとカスタム順序に復帰。永続化済みのカスタム順序は保持される | ✓ |
| ソートでリセット | ソートを適用するとカスタム順序がクリアされる。ソート解除後はデフォルト順（課題ID順）に戻る | |
| ソート結果を新順序として保存 | ソート結果をそのまま新しいカスタム順序として永続化する。ソート解除後もその並びが維持される | |

**User's choice:** 保持して復帰
**Notes:** なし

| Option | Description | Selected |
|--------|-------------|----------|
| 課題ID順（keyId） | Phase 7の「ソートなし（課題ID順）」と一貫。カスタム順序がない場合はkeyId順で表示 | ✓ |
| API取得順 | Backlog APIが返す順序をそのまま使用。予測しにくいが実装がシンプル | |

**User's choice:** 課題ID順（keyId）
**Notes:** Phase 7との一貫性を重視

---

## カスタム順序の永続化方式

| Option | Description | Selected |
|--------|-------------|----------|
| laneId→issueId[] | レーンごとに課題IDの配列を保存。並べ替えは配列入れ替えだけ。シンプルで直感的 | ✓ |
| issueId→position | 各課題IDにレーン内の位置番号を付与。挙動は同じだが管理がやや複雑 | |

**User's choice:** laneId→issueId[]
**Notes:** なし

| Option | Description | Selected |
|--------|-------------|----------|
| リスト末尾に追加 | 保存済み順序の後ろに新規課題をkeyId順で追加。既存の手動順序を乱さない | ✓ |
| リスト先頭に追加 | 新規課題が目立つように先頭に配置。新着に気づきやすいが、既存順序がシフトする | |

**User's choice:** リスト末尾に追加
**Notes:** なし

---

## ソート排他時のUX表現

| Option | Description | Selected |
|--------|-------------|----------|
| ドラッグ無効化のみ | ソートモード中はuseSortableのdisabled=trueでドラッグ操作を無効化。カーソルがgrabからdefaultに変わるので自然に気づく。シンプル | ✓ |
| ドラッグ無効化 + バナー表示 | ドラッグ無効化に加えて、FilterBar付近に「ソート中は手動並べ替え無効」のインジケーターを表示 | |
| ドラッグ無効化 + ツールチップ | カードをドラッグしようとしたときにツールチップで「ソートを解除して並べ替え」と表示 | |

**User's choice:** ドラッグ無効化のみ
**Notes:** なし

| Option | Description | Selected |
|--------|-------------|----------|
| はい、レーン間は有効 | ROADMAP制約通り。ソート中もマイルストーン変更のDnDは可能。レーン内並べ替えのみ無効 | ✓ |
| いいえ、全DnD無効 | ソートモード中は全てのDnDを無効にする。シンプルだがマイルストーン移動ができなくなる | |

**User's choice:** はい、レーン間は有効
**Notes:** ROADMAP制約に従う

---

## レーン間移動後の順序処理

| Option | Description | Selected |
|--------|-------------|----------|
| 末尾に追加 | 移動先レーンのカスタム順序の末尾に追加。既存の並び順を乱さず、後から手動で並べ替え可能 | ✓ |
| ドロップ位置に挿入 | カードをドロップした位置（カード間）に挿入。直感的だが、closestCornersとの位置検出の実装が複雑 | |
| 先頭に挿入 | 移動先レーンの先頭に配置。移動したカードが目立つが、既存順序がシフトする | |

**User's choice:** 末尾に追加
**Notes:** なし

| Option | Description | Selected |
|--------|-------------|----------|
| はい、削除する | 移動元のカスタム順序からissueIdを除去し、移動先の末尾に追加。両レーンの順序を更新して永続化 | ✓ |
| いいえ、そのまま | 移動元の順序は触らない。次回表示時に存在しないissueIdは自動的に無視される | |

**User's choice:** はい、削除する
**Notes:** なし

---

## Claude's Discretion

- reorderStoreの内部構造（独立store vs 既存storeへの統合）
- handleDragEnd内の同一レーン検出とarrayMoveの実装詳細
- plugin-storeへの保存タイミング（即座 vs デバウンス）
- カスタム順序配列と実際のissueリストの差分マージアルゴリズム

## Deferred Ideas

None — discussion stayed within phase scope
