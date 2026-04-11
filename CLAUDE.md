# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**言語:** 日本語で応答すること。コード識別子や技術用語はそのまま英語で可。

## Project

**mileboard** — Backlogのマイルストーンをカンバンレーンとして表示し、ドラッグ&ドロップで課題のマイルストーン移動を可能にするTauriデスクトップアプリ。

**Core Value:** マイルストーン間の課題移動をドラッグ&ドロップで直感的に行え、チームの計画調整を高速化すること。

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.10.x |
| Frontend | React | 19.x |
| Language | TypeScript | 6.0.x |
| Build | Vite | 8.0.x (Rolldown) |
| State | Zustand | 5.0.x |
| DnD | @dnd-kit/core + sortable | 6.3.1 / 10.0.0 |
| Styling | CSS Modules | built-in |
| Toast | sonner | 2.x |
| Test | Vitest + RTL | 4.1.x / 16.x |
| Lint | (未導入) | — |

**Tauri plugins:** `plugin-http` (CORS-free API calls), `plugin-store` (persistent settings), `plugin-opener` (open URLs in browser)

## Architecture

```
┌─────────────────────────────────────┐
│  React Frontend (WebView)           │
│  ┌─────────┐  ┌──────────────────┐  │
│  │ Zustand  │  │ Components       │  │
│  │ Stores   │  │ (DnD Board)      │  │
│  └────┬─────┘  └────────┬────────┘  │
│       └──── tauriBridge ─┘          │
├──────────── IPC boundary ───────────┤
│  Rust Backend (Tauri)               │
│  ┌──────────────────────────────┐   │
│  │ BacklogClient (reqwest)      │   │
│  │ → Rate-limited API calls     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
         │
    Backlog REST API v2
```

- **Frontend → Backend:** IPC commands via `tauriBridge.ts` proxy（直接Tauri APIを呼ばない）
- **State:** 2つのZustand store — `settingsStore`（接続設定）, `boardStore`（課題・マイルストーン）
- **CORS回避:** ブラウザfetchではなくRust reqwest経由でBacklog APIを呼ぶ
- **milestoneId[]の罠:** Backlog PATCH APIはmilestoneIdを全配列置換する。プレフィックス以外のマイルストーンを保持する処理が必須

## Commands

```bash
# Development
npm run tauri dev          # Tauri + Vite dev server起動

# Frontend only
npm run dev                # Vite dev server（フロントエンドのみ）
npm run build              # Production build

# Test
npx vitest                 # Watch mode
npx vitest run             # Single run
npx vitest run src/path    # Single file

# Tauri
npm run tauri build        # Production binary
```

## Key Conventions

- **Immutability:** Zustand `set()` でスプレッド構文による新オブジェクト生成。直接mutation禁止
- **ファイル命名:** `PascalCase.tsx`（コンポーネント）, `camelCase.ts`（サービス）, `Component.module.css`（スタイル）
- **エラー処理:** サービス層は discriminated union `{ success, data?, error? }` を返す。UIは日本語エラーメッセージ
- **テスト:** TDD（RED → GREEN → IMPROVE）。カバレッジ80%以上。テストファイルはソースと同階層
- **Tauri mock:** `tests/setup.ts` でTauriプラグインをグローバルモック
- **アイコン:** 外部アイコンライブラリ不使用、Unicode文字のみ

## Backlog API

- 認証: APIキー
- レート制限: `X-RateLimit-Remaining` ヘッダーを監視、429時はバックオフ
- レーン範囲: 先月〜6ヶ月先（約7レーン）
