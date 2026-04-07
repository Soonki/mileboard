# Architecture: mileboard

**Status:** Pre-implementation — no source code exists yet. This document describes the planned architecture as defined in `.planning/research/ARCHITECTURE.md` and the Phase 1 execution plans.
**Last updated:** 2026-04-07

---

## Architecture Pattern

Mileboard follows Tauri's **Core-Shell architecture**:

- **Core (Rust backend, `src-tauri/`)** — handles all Backlog API communication, credential storage, and rate limiting. The only component that touches the network.
- **Shell (React frontend, `src/`)** — renders the kanban UI in a system webview (WebView2 on Windows, WebKit on macOS/Linux). Communicates with the Core exclusively through Tauri's IPC command system.

```
+------------------------------------------------------------------+
|  Tauri Desktop App                                                |
|                                                                   |
|  +----------------------------+  IPC Commands  +---------------+  |
|  |   React Frontend (Shell)   | <============> | Rust Backend  |  |
|  |                             |  invoke() /    | (Core)        |  |
|  |  - Kanban Board UI          |  response      |               |  |
|  |  - DnD interactions         |                | - Backlog API |  |
|  |  - Zustand state            |                |   client      |  |
|  |  - Optimistic updates       |                | - Settings    |  |
|  |                             |                |   persistence |  |
|  +----------------------------+                | - Rate limit  |  |
|        |                                        |   handling    |  |
|        | System webview                         +---------------+  |
|        | (WebView2 / WebKit)                          |           |
|                                                       | HTTPS     |
|                                                       v           |
|                                              Backlog REST API v2  |
+------------------------------------------------------------------+
```

**Why this pattern:**
- CORS is eliminated entirely — Backlog API does not support browser CORS; all HTTP goes through Rust.
- API keys never enter the webview JavaScript context.
- Rate-limit logic lives in one place (Rust), not scattered across frontend fetch calls.

---

## Layers and Boundaries

### Layer 1 — Rust Backend (`src-tauri/src/`)

| Module | File | Role |
|--------|------|------|
| Entry point | `main.rs` | Minimal desktop entry; calls `lib::run()` |
| App bootstrap | `lib.rs` | Tauri builder: registers plugins, state, and commands |
| Data models | `models.rs` | Serde structs: `Milestone`, `Issue`, `Settings`, `ApiError` |
| HTTP client | `backlog_client.rs` | reqwest wrapper for Backlog REST API v2. Handles auth, base URL, error mapping |
| Rate limiter | `rate_limiter.rs` | Reads `X-RateLimit-*` headers; delays requests when approaching limits |
| Commands | `commands/settings.rs` | `get_settings`, `save_settings` — delegates to tauri-plugin-store |
| Commands | `commands/milestones.rs` | `get_milestones` — fetches and filters by prefix + date range |
| Commands | `commands/issues.rs` | `get_issues`, `get_unassigned_issues` — paginated issue fetching |
| Commands | `commands/issue_update.rs` | `update_issue_milestone` — PATCH with milestone array preservation |

**Trust rule:** Only Rust modules call the Backlog API. The frontend has zero direct network access to Backlog.

### Layer 2 — IPC Boundary

Tauri's `invoke()` / `#[tauri::command]` mechanism forms a strict typed boundary. The frontend calls named commands; the Rust side returns serialized JSON. No shared memory, no direct function calls across the boundary.

Permissions are declared in `src-tauri/capabilities/default.json`. HTTP to Backlog domains is allowed only from Rust (not from JavaScript); the capabilities file restricts the JS webview to `core:default`, `store:default`, and `opener:default`.

### Layer 3 — Frontend (`src/`)

| Module | Path | Role |
|--------|------|------|
| Entry | `src/main.tsx` | React DOM root; imports `global.css` |
| Root component | `src/App.tsx` | Routes between `SettingsView` and `BoardView` based on `isConfigured` |
| IPC bridge | `src/api/tauriBridge.ts` | Typed wrappers around `invoke()`. Single integration point for all backend calls |
| Types | `src/types/` | Shared TypeScript interfaces (`ConnectionSettings`, `Milestone`, `Issue`, etc.) |
| Stores | `src/stores/` | Zustand stores for settings and board state |
| Services | `src/services/` | Pure async functions (API client, storage wrappers) consumed by stores |
| Components | `src/components/` | Feature-organized React components with co-located CSS Modules |
| Views | `src/views/` | Page-level compositions (`SettingsView`, `BoardView`) |

---

## Data Flow

### 1. App Initialization (Settings Load)

```
App mounts
  │
  ▼
App.tsx useEffect calls loadFromStorage()
  │
  ▼
settingsStore.ts → settingsStorage.ts → @tauri-apps/plugin-store
  │
  ▼
If settings exist and are valid: isConfigured = true → show BoardView
If no settings:                  isConfigured = false → show SettingsView (full-page)
```

### 2. Connection Test Flow

```
User enters hostUrl + apiKey → clicks "接続テスト"
  │
  ▼
SettingsForm.tsx calls testConnection(host, apiKey)
  │
  ▼
src/services/backlogApi.ts → @tauri-apps/plugin-http fetch()
  │                          (routes through Rust's reqwest, bypasses CORS)
  ▼
Backlog API: GET /api/v2/users/myself?apiKey=...
  │
  ├─ 200 OK  → success: true, user object → show green validation message
  │            → fetch project list → populate project dropdown
  └─ 401/err  → success: false, Japanese error string → show red message
```

### 3. Board Data Load (Phases 2-3)

```
BoardView mounts → boardStore.loadBoard()
  │
  ▼
tauriBridge.getMilestones(prefix, rangeStart, rangeEnd)
  │  invoke('get_milestones', ...)
  ▼
Rust: commands/milestones.rs
  → backlog_client.rs: GET /api/v2/versions
  → filter by prefix + date range
  → return Vec<Milestone> sorted by startDate
  │
  ▼ (sequentially, one milestone at a time — rate-limit safe)
tauriBridge.getIssues(milestoneId) for each milestone
  │  invoke('get_issues', ...)
  ▼
Rust: commands/issues.rs
  → backlog_client.rs: GET /api/v2/issues (paginated, count=100+offset)
  → rate_limiter.rs: read X-RateLimit-Remaining, sleep if needed
  → return Vec<Issue>
  │
  ▼
boardStore: populate lanes map { milestoneId → Issue[] }
  → React re-renders KanbanBoard
```

### 4. Drag-and-Drop with Optimistic Update (Phase 5)

```
User drags IssueCard from Lane A to Lane B
  │
  ▼
DndContext.onDragEnd fires in KanbanBoard.tsx
  │
  ▼
boardStore.moveIssue(issueId, fromLaneId, toLaneId):
  1. snapshot = get().lanes              // save rollback point
  2. set(state => moveIssueBetweenLanes) // IMMEDIATE optimistic update
  │
  ▼ (async, non-blocking — UI already shows the move)
tauriBridge.updateIssueMilestone(issueIdOrKey, newMilestoneId, currentMilestoneIds)
  │  invoke('update_issue_milestone', ...)
  ▼
Rust: commands/issue_update.rs
  → Fetch current issue milestones
  → Remove old milestone (matching prefix)
  → Add new milestone
  → PRESERVE milestones NOT matching prefix  ← critical correctness requirement
  → PATCH /api/v2/issues/:issueIdOrKey
  │
  ├─ Success → no-op (optimistic state is correct)
  └─ Failure → boardStore: set({ lanes: snapshot }) + show error toast via sonner
```

### 5. Milestone Array Preservation (Critical Data Integrity)

The Backlog API PATCH replaces the entire `milestoneId[]` array. The Rust backend must:
1. Fetch the issue's current full milestone list.
2. Remove only the old milestone (matched by prefix).
3. Add the new milestone.
4. Keep all other milestones intact (e.g., `Release-v2.1` when the prefix is `Sprint-`).
5. Send the complete reconstructed array in the PATCH body.

This logic lives exclusively in `src-tauri/src/commands/issue_update.rs`.

---

## Key Abstractions

### `tauriBridge` (`src/api/tauriBridge.ts`)

The single integration point between the React frontend and the Rust backend. All `invoke()` calls are centralized here with TypeScript-typed signatures. Components and stores never call `invoke()` directly.

```typescript
// Planned shape — not yet implemented
export const tauriBridge = {
  getSettings: () => invoke<Settings>('get_settings'),
  saveSettings: (s: Settings) => invoke<void>('save_settings', { settings: s }),
  getMilestones: (prefix, rangeStart, rangeEnd) => invoke<Milestone[]>('get_milestones', ...),
  getIssues: (milestoneId) => invoke<Issue[]>('get_issues', ...),
  getUnassignedIssues: (projectKey) => invoke<Issue[]>('get_unassigned_issues', ...),
  updateIssueMilestone: (issueIdOrKey, newMilestoneId, currentMilestoneIds) =>
    invoke<Issue>('update_issue_milestone', ...),
};
```

### `BacklogClient` (`src-tauri/src/backlog_client.rs`)

Wraps reqwest with Backlog-specific behavior: API key query parameter injection, base URL construction (`https://{host}/api/v2`), error deserialization into `ApiError`, and rate-limit-aware request dispatch.

### `boardStore` (`src/stores/boardStore.ts`)

Zustand store that owns all kanban state. Stores milestones, issues-by-milestone-ID map, DnD active state, and loading/error flags. The `moveIssue` action implements the optimistic update + rollback pattern. Uses selector-based subscriptions to minimize re-renders during frequent DnD events.

### `settingsStore` (`src/stores/settingsStore.ts`)

Zustand store for connection configuration. Owns the `isConfigured` flag that controls which view `App.tsx` renders. Wraps `settingsStorage.ts` for persistence. Holds transient form state (connectionStatus, projects list) that is not persisted.

---

## Entry Points

| Entry Point | Path | Description |
|-------------|------|-------------|
| Rust app entry | `src-tauri/src/main.rs` | Binary entry; calls `lib::run()` |
| Rust library | `src-tauri/src/lib.rs` | Tauri builder setup; registers all plugins and commands |
| React entry | `src/main.tsx` | React DOM root; mounts `<App />`, imports `global.css` |
| Root component | `src/App.tsx` | Reads `isConfigured` from `settingsStore`; renders `SettingsView` or `BoardView` |
| HTML shell | `index.html` | Vite entry HTML; references `src/main.tsx` |

---

## State Management Approach

**Library:** Zustand 5.x — chosen for minimal boilerplate and performance during frequent DnD updates.

**Two stores:**

| Store | File | Persisted? | Scope |
|-------|------|------------|-------|
| `useSettingsStore` | `src/stores/settingsStore.ts` | Yes (via `settingsStorage.ts` → plugin-store) | Connection config, form state |
| `useBoardStore` | `src/stores/boardStore.ts` | No (session-only) | Milestones, issues, DnD state |

**Immutability rule:** All store actions use `set(state => ({ ...state, field: newValue }))` — never in-place mutation. This enables safe snapshots for optimistic rollback.

**DnD and state:** During drag operations, dnd-kit passes only issue IDs through drag data (not full objects). Components look up full issue data from `boardStore` by ID. This avoids expensive serialization on every DnD event.

**Optimistic update pattern:**
```
snapshot = get().lanes
set(applyOptimisticChange)    // immediate
api.call().catch(() => {
  set({ lanes: snapshot })    // rollback on failure
  toast.error(...)
})
```
