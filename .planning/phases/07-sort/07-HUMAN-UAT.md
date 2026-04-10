---
status: partial
phase: 07-sort
source: [07-VERIFICATION.md]
started: 2026-04-10T15:11:43Z
updated: 2026-04-10T15:11:43Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. カード表示順の視覚的確認
expected: 担当者順・期限日順を選択してカードが実際に並び替わること。null値（担当者未設定・期限日未設定）のカードは常に末尾に表示される
result: [pending]

### 2. 昇順/降順トグルの動作確認
expected: 方向トグルボタン（↑↓）をクリックすると並び順が正しく反転すること。ソートフィールドが「ソートなし」のときはトグルが無効化されていること
result: [pending]

### 3. アプリ再起動後のソート設定復元確認
expected: ソート設定を変更後、アプリを再起動してもplugin-storeから設定が復元され、前回の選択が反映されること
result: [pending]

### 4. フィルタ+ソートの組み合わせ動作確認
expected: フィルタを適用した状態でソートを変更すると、フィルタ後の範囲にソートが正しく適用されること
result: [pending]

### 5. DnDとソートの共存確認
expected: ソート中にドラッグ&ドロップで課題を別レーンに移動しても、boardStore.dataの一貫性が保たれ、正常に動作すること
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
