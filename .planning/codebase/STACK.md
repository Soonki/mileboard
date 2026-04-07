# Technology Stack

**Project:** mileboard
**Status:** Pre-implementation (planning phase complete, no source files yet)
**Last updated:** 2026-04-07

---

## Languages and Versions

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 6.0.2 | Frontend — React components, stores, services, type definitions |
| Rust | 1.77.2+ (stable) | Backend — Tauri shell, Backlog API client, command handlers |
| CSS Modules | (built into Vite) | Component-scoped styling, `Component.module.css` convention |

> **Rust toolchain note:** The research phase verified Node.js v24.13.0 and npm 10.5.0 are present. Tauri 2.10 requires Rust ≥ 1.77.2; `rustup default stable` must be run before first build if the machine defaults to an older Rust.

---

## Runtime / Platform

| Component | Technology | Notes |
|-----------|-----------|-------|
| Desktop shell | Tauri 2.10.x | Wraps React webview in a native OS window |
| Webview | WebView2 (Windows) / WebKit (macOS/Linux) | System-native; no bundled Chromium |
| HTTP runtime | Rust `reqwest` (via Tauri HTTP plugin backend) | All Backlog API calls proxied through Rust — bypasses CORS entirely |
| Frontend runtime | Vite 8.0.x dev server / Rolldown bundle | Port 1420 (Tauri default, strict) |
| Node.js | 24.13.0 | Build tooling only; not embedded in the app |

---

## Frameworks and Libraries

### Core Runtime Dependencies

Versions are from the verified research spec (`.planning/phases/01-foundation-connection-settings/01-RESEARCH.md`) and match `.planning/research/STACK.md`. No `package.json` or `Cargo.toml` exists yet — these are the planned pinned versions.

#### JavaScript / TypeScript (`package.json` — planned)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI rendering framework |
| `react-dom` | ^18.3.1 | React DOM bindings |
| `zustand` | ^5.0.12 | Client state management — lightweight, selector-based, ideal for DnD-heavy updates |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop primitives — kanban multi-container patterns |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists within and across lanes |
| `@dnd-kit/utilities` | ^3.2.2 | CSS transform utilities for draggable elements |
| `sonner` | ^2.0.0 | Toast notifications — error feedback on optimistic update failure |
| `@tauri-apps/api` | ^2.10.1 | Tauri frontend IPC bridge (`invoke()`) |
| `@tauri-apps/plugin-http` | ^2.5.8 | Tauri HTTP plugin JS side — `fetch` from `@tauri-apps/plugin-http` |
| `@tauri-apps/plugin-store` | ^2.4.2 | Persistent JSON key-value storage for settings |
| `@tauri-apps/plugin-opener` | ^2.5.x | Open Backlog issue URLs in default browser |

#### Rust (`src-tauri/Cargo.toml` — planned)

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2.x | Tauri framework core |
| `tauri-plugin-http` | 2.x | HTTP plugin Rust side (wraps `reqwest`) |
| `tauri-plugin-store` | 2.x | Store plugin Rust side |
| `tauri-plugin-opener` | 2.x | Opener plugin Rust side |
| `serde` | 1.x | Serialization/deserialization for IPC payloads |
| `serde_json` | 1.x | JSON support for serde |
| `tokio` | (via tauri) | Async runtime for Rust backend |
| `reqwest` | (via tauri-plugin-http) | HTTP client used in Rust backend |

---

## Dev Dependencies

#### JavaScript / TypeScript (`package.json` devDependencies — planned)

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^8.0.5 | Build tool and dev server (Rolldown-based, 10-30x faster builds) |
| `@vitejs/plugin-react-swc` | ^4.3.0 | React Fast Refresh + JSX transform via SWC |
| `typescript` | ^6.0.2 | TypeScript compiler |
| `vitest` | ^4.1.2 | Unit and integration test runner (Vite-native) |
| `@testing-library/react` | ^16.3.2 | React component testing |
| `@testing-library/jest-dom` | ^6.9.1 | DOM assertion matchers (`toBeInTheDocument()`, etc.) |
| `jsdom` | ^29.0.2 | DOM environment for Vitest |
| `@types/react` | ^18.3.28 | TypeScript types for React 18 |
| `@types/react-dom` | ^18.3.7 | TypeScript types for React DOM |
| `eslint` | ^9.x | Code linting — flat config format |
| `@eslint/js` | (with ESLint 9) | ESLint JS base config |
| `typescript-eslint` | (with ESLint 9) | TypeScript ESLint rules |
| `prettier` | ^3.8.1 | Code formatting |
| `eslint-config-prettier` | (with Prettier 3) | Disables ESLint rules conflicting with Prettier |

---

## Build Tools and Configuration

### Vite (`vite.config.ts` — planned structure)

- Plugin: `@vitejs/plugin-react-swc` for React Fast Refresh
- `resolve.tsconfigPaths: true` — Vite 8 native TypeScript path alias support
- `server.port: 1420` with `strictPort: true` — Tauri default
- `test.environment: 'jsdom'` with `setupFiles: ['tests/setup.ts']` and `globals: true`
- CSS Modules: zero-config in Vite 8 (`*.module.css` naming convention)

### Tauri (`src-tauri/tauri.conf.json` — planned)

- Window: single `main` window
- Build: devUrl points to Vite dev server at `http://localhost:1420`
- `frontendDist` points to compiled Vite output

### Tauri Capabilities (`src-tauri/capabilities/default.json` — planned)

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default",
    "opener:default"
  ]
}
```

> **Note:** The Tauri HTTP plugin is NOT needed in capabilities because all HTTP calls go through Rust `reqwest` directly (not from JavaScript). The frontend only calls `invoke()` which requires `core:default` only.

HTTP plugin URL scope (separate permission file — planned):
- `https://*.backlog.com/**`
- `https://*.backlog.jp/**`
- `https://*.backlogtool.com/**`

### Vitest (`vitest.config.ts` — planned)

- Environment: `jsdom`
- Setup files: `tests/setup.ts` (mocks `@tauri-apps/plugin-http` and `@tauri-apps/plugin-store`)
- Globals: `true`
- Minimum coverage: 80%

### TypeScript (`tsconfig.json` — planned)

- Strict mode enabled
- Target: ES2020+
- Path aliases for `src/` imports

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite build + Vitest test configuration |
| `tsconfig.json` | TypeScript compiler options |
| `package.json` | JS/TS dependency manifest and npm scripts |
| `src-tauri/Cargo.toml` | Rust dependency manifest |
| `src-tauri/tauri.conf.json` | Tauri app metadata, window config, build paths |
| `src-tauri/capabilities/default.json` | Tauri permission grants for plugins |
| `src-tauri/build.rs` | Tauri build script (boilerplate) |
| `tests/setup.ts` | Vitest global setup — mocks Tauri plugins for unit tests |
| `vitest.config.ts` | Vitest configuration (environment, setup, globals) |
| `src/global.css` | CSS custom properties (design tokens) and CSS reset |

---

## Planned Project Directory Structure

```
mileboard/
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── index.html
├── tests/
│   └── setup.ts                        # Vitest global mock setup
├── src/                                # Frontend (React + TypeScript)
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.module.css
│   ├── global.css                      # CSS design tokens
│   ├── types/
│   │   ├── settings.ts                 # ConnectionSettings, ConnectionStatus
│   │   ├── backlog.ts                  # BacklogUser, BacklogProject, BacklogError
│   │   ├── milestone.ts
│   │   └── issue.ts
│   ├── services/
│   │   ├── backlogApi.ts               # testConnection(), fetchProjects()
│   │   ├── backlogApi.test.ts
│   │   ├── settingsStorage.ts          # loadSettings(), saveSettings()
│   │   └── settingsStorage.test.ts
│   ├── api/
│   │   └── tauriBridge.ts              # Typed invoke() wrappers
│   ├── stores/
│   │   ├── boardStore.ts               # Zustand: milestones, issues-by-lane, DnD state
│   │   ├── boardStore.test.ts
│   │   ├── settingsStore.ts            # Zustand: connection config
│   │   └── settingsStore.test.ts
│   └── components/
│       ├── SettingsForm/
│       ├── SettingsCard/
│       ├── SettingsModal/
│       ├── KanbanBoard/
│       ├── MilestoneLane/
│       ├── IssueCard/
│       ├── DragOverlay/
│       ├── LaneHeader/
│       ├── StatusBadge/
│       └── BoardPlaceholder/
└── src-tauri/                          # Backend (Rust)
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json
    └── src/
        ├── main.rs
        ├── lib.rs                      # Plugin registration, state, command handlers
        ├── models.rs                   # Serde structs: Milestone, Issue, Settings
        ├── backlog_client.rs           # reqwest wrapper for Backlog API v2
        ├── rate_limiter.rs             # X-RateLimit header tracking
        └── commands/
            ├── mod.rs
            ├── settings.rs             # get_settings, save_settings
            ├── milestones.rs           # get_milestones
            ├── issues.rs               # get_issues, get_unassigned_issues
            └── issue_update.rs         # update_issue_milestone
```
