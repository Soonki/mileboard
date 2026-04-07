# Phase 1: Foundation & Connection Settings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 01-foundation-connection-settings
**Areas discussed:** 初回起動フロー, 設定フォームのレイアウト, APIキーの保存方法, バリデーション体験

---

## 初回起動フロー

| Option | Description | Selected |
|--------|-------------|----------|
| 設定フォーム即表示 | 設定がないとボードは表示できないので、設定完了までフォームをメインビューとして表示 | ✓ |
| 空ボード + 設定誘導 | ボード画面を表示しつつ、「まず接続設定をしてください」というプロンプトを表示 | |
| ウェルカムウィザード | ステップバイステップのウィザードで接続設定をガイド | |

**User's choice:** 設定フォーム即表示
**Notes:** 最短パスで使えるようにする

| Option | Description | Selected |
|--------|-------------|----------|
| 自動でボードへ遷移 | 接続テスト成功後、自動的にボード画面に切り替わる | ✓ |
| 「ボードを開く」ボタン | 接続テスト成功後、ボタンを表示してユーザーがタイミングを制御 | |
| 成功メッセージのみ | Phase 1では設定のみ、ボード遷移はPhase 3で実装 | |

**User's choice:** 自動でボードへ遷移

| Option | Description | Selected |
|--------|-------------|----------|
| ヘッダーの歯車アイコン | ボードヘッダーに設定アイコンを配置。クリックで設定フォームを表示 | ✓ |
| サイドバー | 左サイドバーで設定を常時アクセス可能に | |
| Claudeにおまかせ | 再編集のUI配置はClaudeに任せる | |

**User's choice:** ヘッダーの歯車アイコン

---

## 設定フォームのレイアウト

| Option | Description | Selected |
|--------|-------------|----------|
| フルページ中央配置 | 画面中央にカード型フォーム。初回はフルページ、設定済み後はモーダルで再表示 | ✓ |
| モーダルダイアログ | ボード上にモーダルとしてオーバーレイ表示 | |
| サイドパネル | 左サイドに常駐する設定パネル | |

**User's choice:** フルページ中央配置

| Option | Description | Selected |
|--------|-------------|----------|
| シンプルな1グループ | 4フィールドを縦並びで一つのグループに | ✓ |
| 接続情報 + フィルタ | Host/API Key/Projectを「接続情報」、Prefixを「表示設定」セクションに分離 | |

**User's choice:** シンプルな1グループ

| Option | Description | Selected |
|--------|-------------|----------|
| モーダルダイアログ | ボード上にモーダルで設定フォームをオーバーレイ | ✓ |
| フルページ遷移 | 初回と同じフルページ設定画面に遷移 | |
| Claudeにおまかせ | 再編集UIの形式はClaudeに任せる | |

**User's choice:** モーダルダイアログ

---

## APIキーの保存方法

| Option | Description | Selected |
|--------|-------------|----------|
| plugin-store平文 | tauri-plugin-storeでJSONファイルに保存。最もシンプルで確実 | ✓ |
| OS keychain (keyring) | tauri-plugin-keyringでOSのキーチェーンに保存 | |
| plugin-store暗号化 | tauri-plugin-storeに保存するが、値を暗号化 | |

**User's choice:** plugin-store平文
**Notes:** 個人デスクトップアプリでの利用なので、OSレベルの暗号化は過剰

---

## バリデーション体験

| Option | Description | Selected |
|--------|-------------|----------|
| 「接続テスト」ボタン | 全フィールド入力後、明示的にボタンを押して検証 | ✓ |
| フォーム送信時に一括 | 「保存」ボタンのタイミングでバリデーション実行 | |
| リアルタイム（フィールド変更毎） | 各フィールド入力時に都度検証 | |

**User's choice:** 「接続テスト」ボタン

| Option | Description | Selected |
|--------|-------------|----------|
| インラインメッセージ | フォーム内に成功（緑）/失敗（赤）メッセージを表示 | ✓ |
| トースト通知 | 画面上部/下部にトーストで表示 | |
| Claudeにおまかせ | フィードバックのUIデザインはClaudeに任せる | |

**User's choice:** インラインメッセージ

| Option | Description | Selected |
|--------|-------------|----------|
| API認証のみ | ホスト接続 + APIキーの認証のみ | ✓ |
| プロジェクト取得まで | ホスト + APIキー + プロジェクトキーの存在確認まで | |
| プレフィックスマッチまで | 上記に加えてプレフィックスに一致するマイルストーンの存在確認まで | |

**User's choice:** API認証のみ

### プロジェクト選択（追加議論）

**User's input:** プロジェクトキーは入力せず、API経由で一覧取得後に選択したい

| Option | Description | Selected |
|--------|-------------|----------|
| ドロップダウン選択（API一覧） | 接続テスト成功後にAPIからプロジェクト一覧を取得してドロップダウンで選択 | ✓ |
| テキスト入力 + ドロップダウン両対応 | ドロップダウン + テキスト入力両方対応 | |

**User's choice:** ドロップダウン選択（API一覧）

---

## Claude's Discretion

- Loading spinner design during connection test
- Exact spacing, typography, and color palette
- Error message wording details
- Form field ordering
- Button styling and disabled states

## Deferred Ideas

None — discussion stayed within phase scope
