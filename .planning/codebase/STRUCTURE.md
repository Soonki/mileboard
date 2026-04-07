# Directory Structure: mileboard

**Status:** Pre-implementation — no source code exists yet. This document describes the planned structure as defined in `.planning/research/ARCHITECTURE.md` and the Phase 1 execution plans.
**Last updated:** 2026-04-07

---

## Top-Level Directory Layout

```
mileboard/
├── index.html                    # Vite entry HTML
├── package.json                  # npm dependencies and scripts
├── vite.config.ts                # Vite 8 config (SWC plugin, test env, port 1420)
├── vitest.config.ts              # Vitest config (jsdom environment, test setup file)
├── tsconfig.json                 # TypeScript root config
├── tsconfig.node.json            # TypeScript config for Vite/Node scripts
├── eslint.config.js              # ESLint 9 flat config
├── .prettierrc                   # Prettier formatting config
├── .gitignore
│
├── src/                          # Frontend: React + TypeScript
├── src-tauri/                    # Backend: Rust + Tauri
├── tests/                        # Global test infrastructure
│
├── .planning/                    # GSD workflow planning artifacts
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── config.json
│   ├── codebase/                 # Codebase maps (this directory)
│   │   ├── ARCHITECTURE.md
│   │   └── STRUCTURE.md
│   ├── phases/                   # Phase-specific plans and context
│   │   └── 01-foundation-connection-settings/
│   │       ├── 01-CONTEXT.md
│   │       ├── 01-RESEARCH.md
│   │       ├── 01-UI-SPEC.md
│   │       ├── 01-VALIDATION.md
│   │       ├── 01-01-PLAN.md     # Wave 1: API service layer + types
│   │       ├── 01-02-PLAN.md     # Wave 1: Scaffold, persistence, CSS tokens
│   │       └── 01-03-PLAN.md     # Wave 2: Settings UI components
│   └── research/                 # Research outputs
│       ├── ARCHITECTURE.md
│       ├── FEATURES.md
│       ├── PITFALLS.md
│       ├── STACK.md
│       └── SUMMARY.md
│
└── CLAUDE.md                     # Project-level Claude instructions
```

---

## Frontend Source Structure (`src/`)

```
src/
├── main.tsx                      # React DOM root — mounts <App />, imports global.css
├── App.tsx                       # Root component: routes Settings ↔ Board on isConfigured
├── App.module.css                # Root-level layout styles
├── global.css                    # CSS custom properties (design tokens) + CSS reset
│
├── types/                        # Shared TypeScript type definitions
│   ├── settings.ts               # ConnectionSettings, ConnectionStatus
│   ├── backlog.ts                # BacklogUser, BacklogProject, BacklogError
│   ├── milestone.ts              # Milestone (board domain type)
│   └── issue.ts                  # Issue, IssueStatus, Priority (board domain types)
│
├── api/                          # Tauri IPC bridge (single integration point)
│   └── tauriBridge.ts            # Typed invoke() wrappers for all Tauri commands
│
├── services/                     # Pure async functions (no React dependencies)
│   ├── backlogApi.ts             # testConnection(), fetchProjects() — uses plugin-http
│   ├── backlogApi.test.ts        # Unit tests (7 test cases)
│   ├── settingsStorage.ts        # loadSettings(), saveSettings() — uses plugin-store
│   └── settingsStorage.test.ts   # Unit tests (4 test cases)
│
├── stores/                       # Zustand stores
│   ├── settingsStore.ts          # useSettingsStore: connection config + form state
│   ├── settingsStore.test.ts     # Unit tests (5 test cases)
│   ├── boardStore.ts             # useBoardStore: milestones, issues, DnD state
│   └── boardStore.test.ts        # Unit tests
│
├── components/                   # Feature-organized reusable components
│   ├── SettingsForm/
│   │   ├── SettingsForm.tsx      # Form with 6 UI states (progressive disclosure)
│   │   ├── SettingsForm.module.css
│   │   └── SettingsForm.test.tsx
│   ├── SettingsCard/
│   │   ├── SettingsCard.tsx      # Full-page centered card wrapper (initial setup)
│   │   └── SettingsCard.module.css
│   ├── SettingsModal/
│   │   ├── SettingsModal.tsx     # Modal overlay wrapper (re-edit from board)
│   │   └── SettingsModal.module.css
│   ├── KanbanBoard/
│   │   ├── KanbanBoard.tsx       # DndContext shell; orchestrates lane layout
│   │   └── KanbanBoard.module.css
│   ├── MilestoneLane/
│   │   ├── MilestoneLane.tsx     # Droppable lane with header stats
│   │   └── MilestoneLane.module.css
│   ├── IssueCard/
│   │   ├── IssueCard.tsx         # Draggable card: key, summary, status, assignee, priority
│   │   └── IssueCard.module.css
│   ├── DragOverlay/
│   │   └── DragOverlay.tsx       # Ghost card rendered outside normal DOM flow
│   ├── LaneHeader/
│   │   ├── LaneHeader.tsx        # Issue count + per-member breakdown
│   │   └── LaneHeader.module.css
│   ├── StatusBadge/
│   │   └── StatusBadge.tsx       # Color-coded status indicator chip
│   ├── BoardPlaceholder/
│   │   └── BoardPlaceholder.tsx  # Placeholder board shown after settings save (Phase 1)
│   └── ErrorToast/
│       └── ErrorToast.tsx        # Error notification on failed DnD operations
│
└── views/                        # Page-level compositions
    ├── SettingsView/
    │   ├── SettingsView.tsx      # Composes SettingsCard + SettingsForm for initial setup
    │   └── SettingsView.module.css
    └── BoardView/
        └── BoardView.tsx         # Board wrapper: loads data, renders KanbanBoard
```

---

## Rust Backend Structure (`src-tauri/`)

```
src-tauri/
├── Cargo.toml                    # Rust dependencies (tauri 2, plugin-http, plugin-store, plugin-opener, serde)
├── Cargo.lock
├── build.rs                      # Tauri build script (generated)
├── tauri.conf.json               # Tauri app config: identifier, window settings, bundle config
│
├── capabilities/
│   └── default.json              # Permission grants for main window
│                                 # Allows: core:default, http (*.backlog.com/**), store:default, opener:default
│
├── icons/                        # App icons (generated by create-tauri-app)
│
└── src/
    ├── main.rs                   # Desktop binary entry — calls lib::run()
    ├── lib.rs                    # Tauri builder: registers plugins + state + all commands
    ├── models.rs                 # Serde structs: Milestone, Issue, Settings, ApiError
    ├── backlog_client.rs         # reqwest HTTP wrapper for Backlog API v2
    │                             # Auth (apiKey query param), base URL, error mapping
    ├── rate_limiter.rs           # X-RateLimit-Remaining/Reset header tracking + wait logic
    └── commands/
        ├── mod.rs                # Module declarations
        ├── settings.rs           # get_settings, save_settings (plugin-store)
        ├── milestones.rs         # get_milestones (prefix filter + date range)
        ├── issues.rs             # get_issues (paginated), get_unassigned_issues
        └── issue_update.rs       # update_issue_milestone (PATCH with array preservation)
```

---

## Test Infrastructure

```
tests/
└── setup.ts                      # Global Vitest setup — mocks @tauri-apps/plugin-http and
                                  #   @tauri-apps/plugin-store with vi.fn()
```

`vitest.config.ts` at project root configures:
- `environment: 'jsdom'`
- `setupFiles: ['tests/setup.ts']`
- `globals: true`

---

## Config Files Location

| File | Location | Purpose |
|------|----------|---------|
| `vite.config.ts` | project root | Vite 8 build config (SWC plugin, dev port 1420, Vitest test block) |
| `vitest.config.ts` | project root | Vitest config (jsdom, global mocks, setup file) |
| `tsconfig.json` | project root | TypeScript compilation settings |
| `tsconfig.node.json` | project root | TypeScript settings for Vite config files |
| `eslint.config.js` | project root | ESLint 9 flat config with typescript-eslint |
| `.prettierrc` | project root | Prettier formatting rules |
| `tauri.conf.json` | `src-tauri/` | Tauri app identity, window config, bundle settings |
| `Cargo.toml` | `src-tauri/` | Rust crate dependencies and features |
| `capabilities/default.json` | `src-tauri/capabilities/` | Tauri security permission grants |
| `package.json` | project root | npm scripts, JS/TS dependency versions |

---

## Naming Conventions

### Files and Directories

| Entity | Convention | Example |
|--------|-----------|---------|
| React component files | `PascalCase.tsx` | `IssueCard.tsx` |
| CSS Module files | `PascalCase.module.css` | `IssueCard.module.css` |
| Component directories | `PascalCase/` | `IssueCard/` |
| Test files | `*.test.tsx` or `*.test.ts` | `backlogApi.test.ts` |
| Zustand store files | `camelCaseStore.ts` | `settingsStore.ts` |
| Service files | `camelCase.ts` | `backlogApi.ts`, `settingsStorage.ts` |
| Type files | `camelCase.ts` | `settings.ts`, `backlog.ts` |
| Rust modules | `snake_case.rs` | `backlog_client.rs`, `rate_limiter.rs` |
| Rust command functions | `snake_case` | `get_milestones`, `update_issue_milestone` |

### TypeScript / React

| Entity | Convention | Example |
|--------|-----------|---------|
| React components | `PascalCase` functional | `export function IssueCard(...)` |
| Zustand stores | `use` prefix, `PascalCase` | `useSettingsStore`, `useBoardStore` |
| TypeScript interfaces | `PascalCase` | `ConnectionSettings`, `BacklogUser` |
| TypeScript type aliases | `PascalCase` | `ConnectionStatus` |
| Constants | `UPPER_SNAKE_CASE` | `STORE_FILE`, `SETTINGS_KEY` |
| CSS Module classes | `camelCase` | `styles.formField`, `styles.errorMessage` |

### Rust

| Entity | Convention |
|--------|-----------|
| Structs | `PascalCase` |
| Functions | `snake_case` |
| Tauri commands | `snake_case` (maps to `invoke('snake_case', ...)`) |
| Modules | `snake_case` |

---

## Key File Purposes

### Phase 1 Core Files (first to be created)

| File | Purpose |
|------|---------|
| `src/types/settings.ts` | `ConnectionSettings` interface + `ConnectionStatus` type — foundation for settings form |
| `src/types/backlog.ts` | `BacklogUser`, `BacklogProject`, `BacklogError` — Backlog API response shapes |
| `src/services/backlogApi.ts` | `testConnection()` and `fetchProjects()` — CORS-free HTTP via plugin-http |
| `tests/setup.ts` | Mocks `@tauri-apps/plugin-http` and `@tauri-apps/plugin-store` for all unit tests |
| `vitest.config.ts` | Test runner config (jsdom environment, global mocks) |
| `src/services/settingsStorage.ts` | `loadSettings()` / `saveSettings()` wrapping tauri-plugin-store |
| `src/stores/settingsStore.ts` | Zustand store for all connection settings state and form transients |
| `src/global.css` | All CSS custom properties (design tokens): spacing, colors, typography, radii, shadows |
| `src-tauri/src/lib.rs` | Registers plugin-http, plugin-store, plugin-opener + all Tauri commands |
| `src-tauri/capabilities/default.json` | HTTP allowlist: `*.backlog.com`, `*.backlog.jp`, `*.backlogtool.com` only |
| `src/App.tsx` | Reads `isConfigured`; renders `SettingsView` (full-page) or `BoardView` |
| `src/components/SettingsForm/SettingsForm.tsx` | 6-state progressive settings form (idle → testing → success/error → project select → save) |

### Later Phase Key Files

| File | Purpose |
|------|---------|
| `src/api/tauriBridge.ts` | Single integration point for all `invoke()` calls — typed wrappers |
| `src-tauri/src/backlog_client.rs` | reqwest wrapper — auth headers, base URL, error mapping |
| `src-tauri/src/rate_limiter.rs` | Rate-limit header tracking — prevents HTTP 429 |
| `src-tauri/src/commands/issue_update.rs` | PATCH milestone with non-prefix milestone preservation |
| `src/stores/boardStore.ts` | Kanban state + optimistic DnD update/rollback pattern |
| `src/components/KanbanBoard/KanbanBoard.tsx` | DndContext root; handles `onDragEnd` and overlays |
| `src/components/IssueCard/IssueCard.tsx` | Draggable card with `useDraggable` from @dnd-kit/core |
| `src/components/MilestoneLane/MilestoneLane.tsx` | Droppable container with `useDroppable` from @dnd-kit/core |
