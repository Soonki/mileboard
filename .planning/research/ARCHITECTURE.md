# Architecture Patterns

**Domain:** Backlog Milestone Kanban Viewer (Tauri desktop app)
**Researched:** 2026-04-07

## Recommended Architecture

Mileboard follows Tauri's **Core-Shell architecture**: a Rust backend (Core) handles all Backlog API communication and data persistence, while a React frontend (Shell) renders the kanban UI in a system webview. The two communicate exclusively through Tauri's IPC command system.

```
+------------------------------------------------------------------+
|  Tauri Desktop App                                                |
|                                                                   |
|  +----------------------------+  IPC Commands  +---------------+  |
|  |   React Frontend (Shell)   | <============> | Rust Backend  |  |
|  |                             |  (invoke/      | (Core)        |  |
|  |  - Kanban Board UI          |   response)    |               |  |
|  |  - DnD interactions         |                | - Backlog API |  |
|  |  - Zustand state            |                |   client      |  |
|  |  - Optimistic updates       |                | - Settings    |  |
|  |                             |                |   persistence |  |
|  +----------------------------+                | - Rate limit  |  |
|        |                                        |   handling    |  |
|        | System webview                         +---------------+  |
|        | (OS native: WebView2/WebKit)                 |           |
|                                                       | HTTPS     |
|                                                       v           |
|                                              Backlog REST API v2  |
+------------------------------------------------------------------+
```

### Why This Architecture

1. **CORS elimination**: Backlog API does not support CORS for browser origins. The Rust backend makes all HTTP requests server-side, completely bypassing CORS restrictions. This is the primary reason for choosing Tauri over a web app.
2. **Security**: API keys never touch the webview JavaScript context. The Rust backend holds credentials in managed state and the Store plugin persists them encrypted on disk.
3. **Performance**: reqwest in Rust handles HTTP efficiently. Rate-limit logic lives in one place on the backend rather than scattered across frontend fetch calls.

## Component Boundaries

### Backend Components (Rust, `src-tauri/`)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **`commands/settings`** | Tauri commands for connection config (host, API key, project key, milestone prefix) | Store plugin (persistence), Frontend (IPC) |
| **`commands/milestones`** | Fetch milestones matching prefix, filter by date range | Backlog API client, Frontend (IPC) |
| **`commands/issues`** | Fetch issues per milestone, fetch unassigned issues | Backlog API client, Frontend (IPC) |
| **`commands/issue_update`** | PATCH issue milestone assignment (preserving non-prefix milestones) | Backlog API client, Frontend (IPC) |
| **`backlog_client`** | HTTP client wrapper around reqwest for Backlog REST API v2. Handles auth, base URL construction, rate limiting, error mapping | Backlog REST API v2 (external) |
| **`rate_limiter`** | Tracks X-RateLimit-Remaining / X-RateLimit-Reset headers. Queues or delays requests when approaching limits | backlog_client (internal) |
| **`state`** | Managed Tauri state: connection config (Mutex-wrapped), HTTP client instance | All command modules |

### Frontend Components (React + TypeScript, `src/`)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **`App`** | Root component. Routes between Settings and Board views | Settings store, Board |
| **`SettingsView`** | Connection configuration form. Validates and saves settings via Tauri command | Rust `commands/settings` (IPC) |
| **`KanbanBoard`** | DndContext wrapper. Orchestrates lane layout, drag events, loading/error states | Zustand board store, Lanes |
| **`MilestoneLane`** | Single droppable lane. Renders lane header (count, member breakdown) and card list | KanbanBoard (DnD context), IssueCards |
| **`UnassignedLane`** | Special lane for issues without milestone. Same structure as MilestoneLane but flagged as source-only for certain operations | KanbanBoard, IssueCards |
| **`IssueCard`** | Draggable card showing issue key, summary, status badge, assignee, priority | MilestoneLane (drag source) |
| **`DragOverlay`** | Ghost preview of card during drag. Rendered outside normal flow for smooth animation | DndContext |
| **`stores/boardStore`** | Zustand store: milestones, issues-by-milestone, drag state, optimistic update queue | All board components, Tauri IPC |
| **`stores/settingsStore`** | Zustand store: connection config, validation state | SettingsView, Tauri IPC |
| **`api/tauriBridge`** | Thin wrapper around `invoke()` calls. Maps Tauri command names to typed TypeScript functions | All stores (data fetching/mutation) |

## Data Flow

### 1. Initial Load (Settings -> Board)

```
User opens app
  |
  v
[SettingsView] -- invoke('get_settings') --> [Rust: commands/settings]
  |                                                  |
  |                                          [Store plugin reads file]
  |                                                  |
  v                                                  v
Settings loaded <-- IPC response ---------- Settings { host, apiKey, projectKey, prefix }
  |
  v (if settings valid)
[KanbanBoard] -- invoke('get_milestones', { prefix, dateRange }) --> [Rust: commands/milestones]
  |                                                                          |
  |                                                            [backlog_client: GET /api/v2/versions]
  |                                                            [filter by prefix + date range]
  |                                                                          |
  v                                                                          v
Milestones loaded <-- IPC response ---- Vec<Milestone> sorted by startDate
  |
  v (for each milestone, sequentially to respect rate limits)
[KanbanBoard] -- invoke('get_issues', { milestoneId }) --> [Rust: commands/issues]
  |                                                                |
  |                                                  [backlog_client: GET /api/v2/issues]
  |                                                  [paginate with count=100 + offset]
  |                                                                |
  v                                                                v
Issues loaded <-- IPC response ---- Vec<Issue> per milestone
  |
  v (also fetch unassigned)
[KanbanBoard] -- invoke('get_unassigned_issues', { projectKey }) --> [Rust: commands/issues]
```

### 2. Drag-and-Drop (Milestone Move)

```
User drags IssueCard from Lane A to Lane B
  |
  v
[DndContext onDragEnd] fires
  |
  v
[boardStore] -- OPTIMISTIC UPDATE:
  |   1. Remove issue from Lane A's list
  |   2. Add issue to Lane B's list
  |   3. Save rollback snapshot
  |
  v (async, non-blocking)
[tauriBridge] -- invoke('update_issue_milestone', {
  |                issueIdOrKey,
  |                newMilestoneId,
  |                currentMilestoneIds  // full array for replacement
  |              })
  |
  v
[Rust: commands/issue_update]
  |   1. Build milestoneId[] array:
  |      - Remove old milestone (Lane A's ID)
  |      - Add new milestone (Lane B's ID)
  |      - PRESERVE milestones not matching prefix (critical!)
  |   2. PATCH /api/v2/issues/:issueIdOrKey
  |
  v
Success? --> Confirm optimistic state (no-op)
Failure? --> [boardStore] rolls back to snapshot, shows error toast
```

### 3. Milestone Array Preservation (Critical Data Flow)

The Backlog API replaces the entire `milestoneId[]` array on PATCH. This means:

```
Issue has milestones: [Sprint-2026-04, Release-v2.1, QA-Cycle-3]
User moves from Sprint-2026-04 to Sprint-2026-05
Prefix filter: "Sprint-"

Correct PATCH body:
  milestoneId[] = Sprint-2026-05   (new, matching prefix)
  milestoneId[] = Release-v2.1     (preserved, non-matching prefix)
  milestoneId[] = QA-Cycle-3       (preserved, non-matching prefix)

WRONG (would lose non-prefix milestones):
  milestoneId[] = Sprint-2026-05   (only the new one)
```

The Rust backend must fetch the issue's current milestones, filter by prefix, replace only the matching one, and send the complete array back. This logic belongs exclusively in the Rust backend.

## Patterns to Follow

### Pattern 1: Tauri Command as API Proxy

**What:** Every Backlog API call is wrapped in a Tauri command. The frontend never makes HTTP requests directly.
**When:** Always. No exceptions.
**Why:** CORS avoidance, credential isolation, centralized rate limiting.

```rust
#[tauri::command]
async fn get_milestones(
    state: tauri::State<'_, Mutex<AppConfig>>,
    prefix: String,
    range_start: String,
    range_end: String,
) -> Result<Vec<Milestone>, ApiError> {
    let config = state.lock().unwrap();
    let client = BacklogClient::new(&config);
    let versions = client.get_versions(&config.project_key).await?;

    Ok(versions
        .into_iter()
        .filter(|v| v.name.starts_with(&prefix))
        .filter(|v| in_date_range(v, &range_start, &range_end))
        .collect())
}
```

### Pattern 2: Optimistic Update with Rollback

**What:** Zustand store applies the change immediately, then confirms or rolls back after the async Tauri command completes.
**When:** All drag-and-drop operations.
**Why:** Instant visual feedback. DnD feels broken with server-roundtrip latency.

```typescript
// boardStore.ts (Zustand)
moveIssue: (issueId, fromLaneId, toLaneId) => {
  const snapshot = get().lanes; // save for rollback

  // Optimistic: move immediately
  set((state) => ({
    lanes: moveIssueBetweenLanes(state.lanes, issueId, fromLaneId, toLaneId),
  }));

  // Confirm with backend
  tauriBridge.updateIssueMilestone(issueId, toLaneId, currentMilestoneIds)
    .catch(() => {
      set({ lanes: snapshot }); // rollback
      showErrorToast('Failed to move issue');
    });
},
```

### Pattern 3: Sequential Fetching with Rate-Limit Awareness

**What:** Issue fetching per milestone happens sequentially in the Rust backend, not in parallel from the frontend.
**When:** Initial board load and refresh.
**Why:** Backlog API has per-user-per-minute rate limits. The Rust backend can read `X-RateLimit-Remaining` headers and throttle accordingly.

```rust
// In backlog_client.rs
async fn fetch_with_rate_limit(&self, url: &str) -> Result<Response, ApiError> {
    if self.rate_limiter.should_wait() {
        tokio::time::sleep(self.rate_limiter.wait_duration()).await;
    }
    let response = self.client.get(url).send().await?;
    self.rate_limiter.update_from_headers(response.headers());
    Ok(response)
}
```

### Pattern 4: Typed Tauri Bridge

**What:** A single `tauriBridge.ts` module wraps all `invoke()` calls with TypeScript types.
**When:** All frontend-to-backend communication.
**Why:** Type safety at the boundary. Catches mismatches between Rust command signatures and TypeScript callers at compile time. (Consider `tauri-specta` for auto-generated bindings later, but manual typing is fine for the ~6 commands in MVP.)

```typescript
// api/tauriBridge.ts
import { invoke } from '@tauri-apps/api/core';
import type { Milestone, Issue, Settings } from '../types';

export const tauriBridge = {
  getSettings: () => invoke<Settings>('get_settings'),
  saveSettings: (s: Settings) => invoke<void>('save_settings', { settings: s }),
  getMilestones: (prefix: string, rangeStart: string, rangeEnd: string) =>
    invoke<Milestone[]>('get_milestones', { prefix, rangeStart, rangeEnd }),
  getIssues: (milestoneId: number) =>
    invoke<Issue[]>('get_issues', { milestoneId }),
  getUnassignedIssues: (projectKey: string) =>
    invoke<Issue[]>('get_unassigned_issues', { projectKey }),
  updateIssueMilestone: (issueIdOrKey: string, newMilestoneId: number, currentMilestoneIds: number[]) =>
    invoke<Issue>('update_issue_milestone', { issueIdOrKey, newMilestoneId, currentMilestoneIds }),
};
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Frontend Direct HTTP Calls

**What:** Using `fetch()` or the Tauri HTTP plugin from JavaScript to call Backlog API directly.
**Why bad:** Exposes API keys to webview context. Cannot centralize rate limiting. Defeats the purpose of using Tauri for CORS avoidance.
**Instead:** All HTTP calls go through Rust commands.

### Anti-Pattern 2: Monolithic Rust Command File

**What:** Putting all Tauri commands in a single `lib.rs`.
**Why bad:** Becomes unreadable fast. Backlog client logic mixes with command definitions.
**Instead:** Separate into modules: `commands/`, `backlog_client.rs`, `models.rs`, `rate_limiter.rs`. Register commands from `lib.rs` using `generate_handler![]`.

### Anti-Pattern 3: Parallel API Calls from Frontend

**What:** Frontend fires `invoke('get_issues', ...)` for all 7 milestones simultaneously.
**Why bad:** Exceeds Backlog rate limits. Each invoke is independent; the Rust backend cannot coordinate them.
**Instead:** Use a single `invoke('load_board_data', { prefix, dateRange })` command that fetches milestones then issues sequentially in Rust, or have the frontend await each call sequentially.

### Anti-Pattern 4: Storing Full Issue Objects in DnD State

**What:** Passing complete issue objects through dnd-kit's drag data.
**Why bad:** Unnecessary data transfer during frequent DnD events. dnd-kit works best with IDs.
**Instead:** DnD operations use issue IDs only. Components look up full issue data from the Zustand store by ID.

## Project Directory Structure

```
mileboard/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root: routing between Settings and Board
│   ├── App.module.css
│   ├── types/                    # Shared TypeScript types
│   │   ├── milestone.ts
│   │   ├── issue.ts
│   │   └── settings.ts
│   ├── api/
│   │   └── tauriBridge.ts        # Typed invoke() wrappers
│   ├── stores/
│   │   ├── boardStore.ts         # Zustand: milestones, issues, DnD state
│   │   └── settingsStore.ts      # Zustand: connection config
│   ├── components/
│   │   ├── KanbanBoard/
│   │   │   ├── KanbanBoard.tsx   # DndContext, lane layout, loading states
│   │   │   └── KanbanBoard.module.css
│   │   ├── MilestoneLane/
│   │   │   ├── MilestoneLane.tsx # Droppable lane with header stats
│   │   │   └── MilestoneLane.module.css
│   │   ├── IssueCard/
│   │   │   ├── IssueCard.tsx     # Draggable card with status badge
│   │   │   └── IssueCard.module.css
│   │   ├── DragOverlay/
│   │   │   └── DragOverlay.tsx   # Ghost card during drag
│   │   ├── LaneHeader/
│   │   │   ├── LaneHeader.tsx    # Issue count + member breakdown
│   │   │   └── LaneHeader.module.css
│   │   ├── StatusBadge/
│   │   │   └── StatusBadge.tsx   # Color-coded status indicator
│   │   └── ErrorToast/
│   │       └── ErrorToast.tsx    # Error notification on failed operations
│   └── views/
│       ├── SettingsView/
│       │   ├── SettingsView.tsx  # Connection config form
│       │   └── SettingsView.module.css
│       └── BoardView/
│           └── BoardView.tsx     # Board wrapper with data loading
│
└── src-tauri/                    # Backend (Rust)
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json          # Permissions: store, http (if needed)
    ├── icons/
    └── src/
        ├── main.rs               # Desktop entry (minimal, calls lib::run)
        ├── lib.rs                # Tauri setup: plugins, state, command registration
        ├── models.rs             # Serde structs: Milestone, Issue, Settings, ApiError
        ├── backlog_client.rs     # reqwest wrapper for Backlog API v2
        ├── rate_limiter.rs       # Rate limit tracking from response headers
        └── commands/
            ├── mod.rs
            ├── settings.rs       # get_settings, save_settings
            ├── milestones.rs     # get_milestones
            ├── issues.rs         # get_issues, get_unassigned_issues
            └── issue_update.rs   # update_issue_milestone
```

## Tauri Capabilities Configuration

The `capabilities/default.json` defines what the main window can do:

```json
{
  "identifier": "default",
  "description": "Default capabilities for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "store:default"
  ]
}
```

Note: The Tauri HTTP plugin is NOT needed in capabilities because HTTP calls are made from Rust (via reqwest directly), not from JavaScript. The frontend only uses `invoke()` which is part of core capabilities.

## Suggested Build Order

The dependency graph dictates this build sequence:

### Phase 1: Foundation (no API calls yet)
1. **Tauri project scaffold** - `create-tauri-app` with React + TypeScript + Vite
2. **Rust models** (`models.rs`) - Define Milestone, Issue, Settings structs with serde
3. **Settings persistence** - Store plugin setup, `get_settings`/`save_settings` commands
4. **Settings UI** - SettingsView form, settingsStore, validation

**Rationale:** Settings must work before anything else. No API dependency.

### Phase 2: Data Fetching (read-only)
5. **Backlog client** (`backlog_client.rs`) - reqwest wrapper with auth headers
6. **Rate limiter** (`rate_limiter.rs`) - Header parsing, wait-duration calculation
7. **Milestone commands** - Fetch, filter by prefix and date range
8. **Issue commands** - Fetch per milestone with pagination, fetch unassigned
9. **Tauri bridge** (`tauriBridge.ts`) - Typed invoke wrappers

**Rationale:** Read-only data pipeline. Can verify API integration without risk.

### Phase 3: Kanban Display (read-only UI)
10. **KanbanBoard** - DndContext shell, horizontal lane layout
11. **MilestoneLane** - Droppable containers, lane headers with counts
12. **IssueCard** - Card display with status badge, assignee, priority
13. **LaneHeader** - Issue count + member-by-member breakdown
14. **Board data loading** - boardStore fetches milestones then issues sequentially

**Rationale:** Full visual board without mutations. Safe to demo and validate layout.

### Phase 4: Drag-and-Drop + Mutations
15. **DnD event handlers** - onDragStart, onDragOver, onDragEnd in KanbanBoard
16. **DragOverlay** - Ghost card rendering during drag
17. **Optimistic update** - boardStore snapshot/rollback pattern
18. **update_issue_milestone command** - PATCH with milestone array preservation
19. **Multi-milestone warning** - Detect, display warning badge, disable inter-lane DnD
20. **Error toast** - Rollback notification on failure

**Rationale:** Mutations are the riskiest part (data integrity). Build on proven read-only foundation.

### Phase 5: Polish
21. **Card click to browser** - `shell.open()` for Backlog issue URL
22. **Loading skeletons** - Per-lane loading indicators
23. **Status color coding** - CSS variable mapping per status
24. **Edge cases** - Empty lanes, zero milestones, API errors

## Scalability Considerations

| Concern | At 7 lanes / 50 issues | At 7 lanes / 500 issues | At 12 lanes / 1000+ issues |
|---------|------------------------|-------------------------|----------------------------|
| API load time | ~3-5 seconds (7 sequential calls) | ~15-30 seconds (pagination + rate limits) | Consider batch command or loading indicator per lane |
| DnD performance | No concern | Virtualize card lists if needed | Definitely virtualize (react-window) |
| Memory | Negligible | ~5MB issue data | Consider pagination within lanes |
| Rate limits | Well within limits | May approach limits on full refresh | Need intelligent caching in Rust backend |

For the MVP scope (7 lanes, typical team of 5-15 with ~20-50 issues per milestone), performance will not be an issue. The architecture supports scaling up later without structural changes.

## Sources

- [Tauri Architecture Overview](https://v2.tauri.app/concept/architecture/) - HIGH confidence
- [Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/) - HIGH confidence
- [Tauri Project Structure](https://v2.tauri.app/start/project-structure/) - HIGH confidence
- [Tauri HTTP Client Plugin](https://v2.tauri.app/plugin/http-client/) - HIGH confidence
- [Tauri State Management](https://v2.tauri.app/develop/state-management/) - HIGH confidence
- [Tauri Store Plugin](https://v2.tauri.app/plugin/store/) - HIGH confidence
- [Tauri Capabilities](https://v2.tauri.app/security/capabilities/) - HIGH confidence
- [Calling the Frontend from Rust (Events)](https://v2.tauri.app/develop/calling-frontend/) - HIGH confidence
- [Backlog API: Update Issue](https://developer.nulab.com/docs/backlog/api/2/update-issue/) - HIGH confidence
- [Backlog API: Rate Limit](https://developer.nulab.com/docs/backlog/rate-limit/) - HIGH confidence
- [Backlog API: Get Issue List](https://developer.nulab.com/docs/backlog/api/2/get-issue-list/) - HIGH confidence
- [Build a Kanban Board with dnd-kit and React (LogRocket)](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - MEDIUM confidence
- [dannysmith/tauri-template (production-ready Tauri v2 + React 19 template)](https://github.com/dannysmith/tauri-template) - MEDIUM confidence
