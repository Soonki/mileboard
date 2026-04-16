# mileboard

A desktop app that displays [Backlog](https://backlog.com/) milestones as kanban lanes with drag-and-drop issue movement between milestones.

Built with [Tauri 2](https://v2.tauri.app/), React, and Rust.

## Features

- **Milestone kanban lanes** — previous month through 6 months ahead
- **Drag-and-drop** — move issues between milestones instantly
- **Milestone prefix filtering** — show only milestones matching a prefix (e.g. "Sprint")
- **Filter by status, assignee, and category** — narrow down the board view
- **Rate-limit aware** — respects Backlog API rate limits with automatic backoff
- **CORS-free API calls** — Rust backend proxies all Backlog API requests
- **Persistent settings** — API key, host, project key, and prefix saved locally

> **Note:** API keys are stored in plaintext JSON in the OS app data directory. Do not use this application on shared machines. Consider using a Backlog API key with minimal scope.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2.x |
| Frontend | React + TypeScript | 19.x / 6.0.x |
| Build | Vite | 8.x |
| State | Zustand | 5.x |
| Drag & Drop | @dnd-kit/core + sortable | 6.x / 10.x |
| Styling | CSS Modules | built-in |
| Notifications | sonner | 2.x |
| Testing | Vitest + React Testing Library | 4.x / 16.x |
| Backend | Rust (Tauri commands + tauri-plugin-http) | — |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS
- A [Backlog](https://backlog.com/) account with an API key

### Windows build prerequisites

Building the MSI installer requires [WiX Toolset v3.x](https://wixtoolset.org/releases/) (v4 is not yet supported by Tauri). NSIS is downloaded automatically by Tauri on first build.

- WiX Toolset 3.11.2 or later
- Microsoft Edge WebView2 Runtime (pre-installed on Windows 11; will be downloaded by the installer on Windows 10)

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
npm run tauri build              # build for the current host OS
npm run tauri:build:windows      # Windows: build NSIS + MSI installers
```

Output (Windows):

- NSIS installer: `src-tauri/target/release/bundle/nsis/mileboard_<version>_x64-setup.exe`
- MSI installer: `src-tauri/target/release/bundle/msi/mileboard_<version>_x64_en-US.msi`

> **Unsigned builds:** Installers are not code-signed. On first run, Windows SmartScreen may show "Windows protected your PC" — click **More info → Run anyway**.

## Releases

Pre-built Windows installers are available on the [Releases page](https://github.com/Soonki/mileboard/releases).

- **NSIS** (`.exe`): recommended for most users, installs to `%LOCALAPPDATA%\mileboard` without admin rights.
- **MSI** (`.msi`): for enterprise deployment via GPO or `msiexec /quiet`.

Releases are built automatically from git tags (`v*`) via [`.github/workflows/release.yml`](.github/workflows/release.yml).

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
- **CORS bypass:** Rust backend (via `tauri-plugin-http`) proxies all Backlog API calls instead of browser `fetch`

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
- CORS回避 — Rustバックエンド経由でBacklog APIを呼び出し
- 設定の永続化 — APIキー・ホスト・プロジェクトキー・プレフィックスをローカル保存

> **注意:** APIキーはOSのアプリデータディレクトリに平文JSONで保存されます。共有マシンでの使用はお控えください。

### セットアップ

```bash
git clone https://github.com/Soonki/mileboard.git
cd mileboard
npm install
```

### 起動

```bash
npm run tauri dev
```

初回起動時に設定画面が表示されます。Backlogのホスト名・APIキー・プロジェクトキーを入力してください。

### ビルド

```bash
npm run tauri:build:windows
```

Windows 向けの NSIS (`.exe`) と MSI インストーラが `src-tauri/target/release/bundle/` 配下に生成されます。未署名のため、初回起動時に SmartScreen の警告が出たら「詳細情報」→「実行」をクリックしてください。

MSI の生成には [WiX Toolset v3.x](https://wixtoolset.org/releases/) が事前にインストールされている必要があります。

### リリース

ビルド済み Windows インストーラは [Releases ページ](https://github.com/Soonki/mileboard/releases) から入手できます。NSIS (`.exe`) は管理者権限不要、MSI (`.msi`) は `msiexec /quiet` によるサイレント配布に対応します。未署名のため SmartScreen 警告は想定内です。リリースビルドは git tag (`v*`) のプッシュで [`.github/workflows/release.yml`](.github/workflows/release.yml) により自動生成されます。
