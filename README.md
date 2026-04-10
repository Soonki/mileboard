# mileboard

A desktop app that displays [Backlog](https://backlog.com/) milestones as kanban lanes with drag-and-drop issue movement between milestones.

Built with [Tauri 2](https://v2.tauri.app/), React, and Rust.

<!-- TODO: Add screenshot -->
<!-- ![mileboard screenshot](docs/screenshot.png) -->

## Features

- **Milestone kanban lanes** — previous month through 6 months ahead
- **Drag-and-drop** — move issues between milestones instantly
- **Milestone prefix filtering** — show only milestones matching a prefix (e.g. "Sprint")
- **Filter by status, assignee, and category** — narrow down the board view
- **Rate-limit aware** — respects Backlog API rate limits with automatic backoff
- **CORS-free API calls** — Rust backend proxies all Backlog API requests
- **Persistent settings** — API key, host, project key, and prefix saved locally

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript 5.8 |
| Build | Vite 7 |
| State | Zustand 5 |
| Drag & Drop | @dnd-kit/core + sortable |
| Styling | CSS Modules |
| Notifications | sonner |
| Testing | Vitest + React Testing Library |
| Backend | Rust (Tauri commands + reqwest) |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- A [Backlog](https://backlog.com/) account with an API key

## Setup

```bash
git clone https://github.com/Soonki/mileboard.git
cd mileboard
npm install
```

## Development

```bash
# Full Tauri app (frontend + Rust backend)
npm run tauri dev

# Frontend only (no Tauri shell)
npm run dev

# Run tests
npx vitest           # watch mode
npx vitest run       # single run

# Rust tests
cd src-tauri && cargo test
```

## Build

```bash
npm run tauri build
```

The built binary will be in `src-tauri/target/release/`.

## Architecture

```
+-------------------------------------+
|  React Frontend (WebView)           |
|  +---------+  +------------------+  |
|  | Zustand  |  | Components      |  |
|  | Stores   |  | (DnD Board)     |  |
|  +----+-----+  +--------+-------+  |
|       +---- tauriBridge -+          |
+------------- IPC boundary ----------+
|  Rust Backend (Tauri)               |
|  +------------------------------+   |
|  | BacklogClient (reqwest)      |   |
|  | -> Rate-limited API calls    |   |
|  +------------------------------+   |
+-------------------------------------+
         |
    Backlog REST API v2
```

- **Frontend -> Backend:** IPC commands via `tauriBridge.ts` (never call Tauri APIs directly)
- **State:** Two Zustand stores — `settingsStore` (connection config) and `boardStore` (issues/milestones)
- **CORS bypass:** Rust `reqwest` proxies all Backlog API calls instead of browser `fetch`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on reporting bugs, suggesting features, and submitting pull requests.

## License

[MIT](LICENSE)

---

## 日本語

mileboard は [Backlog](https://backlog.com/) のマイルストーンをカンバンレーンとして表示し、ドラッグ&ドロップで課題のマイルストーン移動を可能にするデスクトップアプリです。

### 主な機能

- マイルストーンをカンバンレーンとして表示（先月〜6ヶ月先）
- ドラッグ&ドロップで課題をマイルストーン間移動
- マイルストーンプレフィックスでフィルタリング
- ステータス・担当者・カテゴリーでフィルタリング
- Backlog APIレート制限の自動対応

### セットアップ

```bash
git clone https://github.com/Soonki/mileboard.git
cd mileboard
npm install
npm run tauri dev
```

初回起動時に設定画面が表示されます。Backlogのホスト名・APIキー・プロジェクトキーを入力してください。
