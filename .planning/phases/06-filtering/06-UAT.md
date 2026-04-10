---
status: complete
phase: 06-filtering
source:
  - 06-01-SUMMARY.md
  - 06-02-SUMMARY.md
  - 06-03-SUMMARY.md
started: 2026-04-10T00:00:00Z
updated: 2026-04-10T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: |
  アプリを一度終了してから `npm run tauri dev` でクリーンに再起動する。
  サーバーがエラーなく起動し、ボードが正常に表示され、マイルストーン・課題データがBacklog APIから取得されて画面に表示される。
result: pass

### 2. FilterBar表示確認
expected: |
  BoardHeaderの直下、Boardの直上に FilterBar が表示される。
  「ステータス」「担当者」「カテゴリ」の3つのドロップダウンボタンが横並びで見える。スクロールしてもFilterBarはsticky(top:56px)で画面上部に固定される。
result: pass

### 3. ステータスドロップダウンの開閉と単体フィルタ
expected: |
  「ステータス」ドロップダウンをクリックすると、チェックボックス付きの選択肢リストが開く。
  1つチェックを入れると即座にフィルタが適用され（カードが絞り込まれる）、ドロップダウンの右側に選択したステータス名のチップが表示される。
result: pass

### 4. 軸内OR条件（同一軸で複数選択）
expected: |
  ステータスドロップダウンで2つ以上チェックを入れると、OR条件でどちらか一方のステータスに該当するカード全てが表示される。チップも選択した数だけ追加される。
result: pass

### 5. 軸間AND条件（ステータス × 担当者）
expected: |
  ステータスに加えて担当者ドロップダウンでも選択すると、AND条件で「選択したステータスのいずれか」かつ「選択した担当者のいずれか」に一致するカードのみが表示される。
result: pass

### 6. hiddenCount表示（フィルタで空になったレーン）
expected: |
  フィルタの組み合わせで全カードが非表示になったレーンには「N件がフィルタで非表示」と表示される（N はそのレーンで非表示になった件数）。通常のEmptyLane（空レーン）表示とは区別される。
result: pass

### 7. チップ単体解除（×ボタン）
expected: |
  フィルタチップの「×」ボタンをクリックすると、そのフィルタ条件のみが解除される。他のチップ／フィルタ条件は維持される。
result: pass

### 8. 「すべてクリア」ボタン
expected: |
  複数フィルタ適用中に「すべてクリア」ボタンをクリックすると、全軸のフィルタが一括解除される。全チップが消え、全カードが再表示される。
result: pass

### 9. フィルタ適用中のDnD（D-09コンプライアンス）
expected: |
  フィルタを適用して一部のカードが非表示の状態で、表示中のカードを別レーンにドラッグ&ドロップすると正常に移動が完了する。
  非表示カードを含めてDnD計算が壊れない（IDのずれやクラッシュなし）。
result: pass

### 10. ドロップダウン外クリックでの閉鎖
expected: |
  ドロップダウンが開いている状態で、ドロップダウン領域の外（ボード上など）をクリックすると、ドロップダウンが自動的に閉じる。
result: pass

### 11. キーボードナビゲーション
expected: |
  Tabキーでドロップダウンにフォーカス→Enter/Spaceで開く→ArrowDown/ArrowUpで選択肢を移動（循環する）→Enter/Spaceでチェック切替→Escapeで閉じる。Escape後はトリガーボタンにフォーカスが戻る。
result: pass

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none]
