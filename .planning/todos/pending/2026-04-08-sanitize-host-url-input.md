---
created: "2026-04-08T01:37:57.963Z"
title: Sanitize host URL input
area: ui
files:
  - src/services/backlogApi.ts:4-6
  - src/components/SettingsForm/SettingsForm.tsx:73
---

## Problem

`buildApiUrl` が `https://${host}/api/v2...` と自動的にプロトコルを付与するため、ユーザーが `https://xxx.backlog.com` のように `https://` 付きでホストURLを入力すると `https://https://xxx.backlog.com/...` となり接続テストが失敗する。

placeholder には `例: your-space.backlog.com` と表示しているが、ユーザーはブラウザからURLをコピペすることが多く、プロトコル付きで入力するケースが多い。

## Solution

以下のいずれかで対応:
1. **SettingsForm の onChange でサニタイズ**: `hostUrl` 更新時に `https://` / `http://` プレフィックスを自動除去
2. **backlogApi.ts の buildApiUrl でサニタイズ**: URL構築時にプロトコル部分を除去してから組み立て
3. **バリデーション追加**: `https://` を含む場合にインラインエラーメッセージで注意喚起

推奨: 方法1 (入力時サニタイズ) が最もシンプルで確実。
