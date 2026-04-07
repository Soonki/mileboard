# Codebase Conventions

**Project:** mileboard (Backlog Milestone Kanban Viewer)
**Stack:** Tauri 2.10 + React 18.3 + TypeScript 6.0 + Vite 8.0
**Status:** Greenfield — conventions are established by planning documents; no source code exists yet.

---

## Code Style

### Formatting

- **Formatter:** Prettier 3.x (authoritative — overrides editor defaults)
- **Linter:** ESLint 9.x in flat-config format using `@eslint/js` + `typescript-eslint`
- ESLint and Prettier are integrated via `eslint-config-prettier` (Prettier rules win on formatting conflicts)
- TypeScript version: 6.0.2 (`tsconfig.json` should target ES2020+, strict mode)

### File Size Limits

Per `CLAUDE.md` coding-style rules:
- **Typical:** 200–400 lines
- **Maximum:** 800 lines (hard limit — extract if approaching)
- **Functions:** < 50 lines each

### Immutability (Critical)

All state updates must return new objects. Never mutate existing ones.

```typescript
// CORRECT — Zustand action pattern
updateSettings: (partial) =>
  set((state) => ({ settings: { ...state.settings, ...partial } })),

// WRONG — direct mutation
updateSettings: (partial) => {
  state.settings.hostUrl = partial.hostUrl; // DO NOT DO THIS
},
```

This applies to all Zustand store actions, component state, and utility functions.

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|-----------|---------|
| React component file | `PascalCase.tsx` | `SettingsForm.tsx` |
| Component styles | `PascalCase.module.css` | `SettingsForm.module.css` |
| Component test | `PascalCase.test.tsx` | `SettingsForm.test.tsx` |
| Zustand store | `camelCaseStore.ts` | `settingsStore.ts` |
| Store test | `camelCaseStore.test.ts` | `settingsStore.test.ts` |
| Service / utility | `camelCase.ts` | `backlogApi.ts`, `settingsStorage.ts` |
| Service test | `camelCase.test.ts` | `backlogApi.test.ts` |
| Type definition file | `camelCase.ts` | `settings.ts`, `backlog.ts` |
| Custom hook | `useFeatureName.ts` | `useConnectionTest.ts` |
| Global CSS | `global.css` | `src/global.css` |

### Components

- Components use `PascalCase` for the name and default export
- Each component lives in its own subdirectory under `src/components/` or `src/views/`
- Co-locate `.tsx`, `.module.css`, and `.test.tsx` in the same folder

```
src/components/SettingsForm/
├── SettingsForm.tsx
├── SettingsForm.module.css
└── SettingsForm.test.tsx
```

### TypeScript

- **Interfaces:** `PascalCase` with descriptive names — `ConnectionSettings`, `BacklogUser`
- **Type aliases:** `PascalCase` — `ConnectionStatus`
- **Constants:** `UPPER_SNAKE_CASE` within module scope — `STORE_FILE`, `SETTINGS_KEY`
- **Zustand hook exports:** prefix with `use` — `useSettingsStore`, `useBoardStore`
- **Enum-like string unions** (not actual TypeScript enums):

```typescript
export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';
```

### CSS

- CSS custom property tokens follow `--category-name` — e.g., `--color-accent`, `--space-md`
- CSS Module class names use `camelCase` — `.formField`, `.connectionButton`
- BEM-style nesting via CSS Modules (not traditional BEM string concatenation)

---

## Import Patterns

### Import Order (enforced by ESLint)

1. Node built-ins
2. External packages (React, Tauri, dnd-kit, Zustand, etc.)
3. Internal aliases / absolute paths
4. Relative paths (same directory or parent)
5. Type-only imports last (or inline with `import type`)

### Named Imports (never default imports for utilities)

```typescript
// CORRECT
import { fetch } from '@tauri-apps/plugin-http';
import { load } from '@tauri-apps/plugin-store';
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// Type imports
import type { ConnectionSettings } from '../types/settings';
import type { BacklogUser, BacklogProject } from '../types/backlog';
```

### Tauri Plugin Imports

- HTTP calls always come from `@tauri-apps/plugin-http` (never browser `fetch`)
- Storage always uses `@tauri-apps/plugin-store` (never `localStorage`)
- IPC uses `invoke` from `@tauri-apps/api/core`

```typescript
// From src/services/backlogApi.ts — the established pattern
import { fetch } from '@tauri-apps/plugin-http';
```

```typescript
// From src/services/settingsStorage.ts — the established pattern
import { load } from '@tauri-apps/plugin-store';
```

### Tauri Bridge Pattern

All `invoke()` calls are wrapped in `src/api/tauriBridge.ts`. Components and stores never call `invoke()` directly.

```typescript
// src/api/tauriBridge.ts
import { invoke } from '@tauri-apps/api/core';
import type { Milestone, Issue, Settings } from '../types';

export const tauriBridge = {
  getSettings: () => invoke<Settings>('get_settings'),
  saveSettings: (s: Settings) => invoke<void>('save_settings', { settings: s }),
  getMilestones: (prefix: string, rangeStart: string, rangeEnd: string) =>
    invoke<Milestone[]>('get_milestones', { prefix, rangeStart, rangeEnd }),
};
```

---

## Error Handling

### Principles

- **Never silently swallow errors** — always handle or propagate
- **User-facing messages in Japanese** (project requirement)
- **No console.log in service files** — especially never log URLs that contain API keys

### Service Layer (backlogApi.ts pattern)

Services return discriminated unions for recoverable errors, throw `Error` for unrecoverable ones:

```typescript
// CORRECT — discriminated union for API client
export async function testConnection(
  host: string,
  apiKey: string
): Promise<{ success: true; user: BacklogUser } | { success: false; error: string }> {
  try {
    const response = await fetch(buildApiUrl(host, '/users/myself', apiKey), { method: 'GET' });

    if (response.ok) {
      const user: BacklogUser = await response.json();
      return { success: true, user };
    }
    if (response.status === 401) {
      return { success: false, error: 'APIキーが無効です。Backlogの個人設定で確認してください。' };
    }
    return { success: false, error: '予期しないエラーが発生しました。しばらくしてから再試行してください。' };
  } catch {
    return { success: false, error: 'ホストに接続できません。URLを確認してください。' };
  }
}

// CORRECT — throw for unrecoverable failures in fetch utilities
export async function fetchProjects(host: string, apiKey: string): Promise<BacklogProject[]> {
  const response = await fetch(buildApiUrl(host, '/projects', apiKey), { method: 'GET' });
  if (!response.ok) {
    throw new Error('プロジェクト一覧の取得に失敗しました。');
  }
  const projects: BacklogProject[] = await response.json();
  return projects.filter((p) => !p.archived);
}
```

### Exact Error Message Strings (Phase 1)

These strings are contract-level and must not be changed without updating tests:

| Scenario | Message |
|----------|---------|
| HTTP 401 or Backlog error code 11 | `APIキーが無効です。Backlogの個人設定で確認してください。` |
| Network / connection failure (catch block) | `ホストに接続できません。URLを確認してください。` |
| Unexpected API error | `予期しないエラーが発生しました。しばらくしてから再試行してください。` |
| Project list fetch failure | `プロジェクト一覧の取得に失敗しました。` |

### Store-Level Error Handling (boardStore)

Optimistic updates store a rollback snapshot; on failure, restore it and show a toast:

```typescript
moveIssue: (issueId, fromLaneId, toLaneId) => {
  const snapshot = get().lanes; // save for rollback

  set((state) => ({
    lanes: moveIssueBetweenLanes(state.lanes, issueId, fromLaneId, toLaneId),
  }));

  tauriBridge.updateIssueMilestone(issueId, toLaneId, currentMilestoneIds)
    .catch(() => {
      set({ lanes: snapshot }); // rollback
      showErrorToast('Failed to move issue');
    });
},
```

### Security: API Key Protection

- CRITICAL: Never call `console.log` in `src/services/backlogApi.ts` or any file that constructs API URLs
- API keys appear in URLs via `?apiKey=xxx` query string — logging URLs = leaking keys
- `buildApiUrl()` output must never reach any logging facility

---

## State Management Patterns

### Zustand Store Structure

All stores follow this pattern (from `src/stores/settingsStore.ts` design):

```typescript
import { create } from 'zustand';
import type { ConnectionSettings, ConnectionStatus } from '../types/settings';

interface SettingsStoreState {
  // Persisted state
  settings: ConnectionSettings;
  isConfigured: boolean;

  // Transient UI state (not persisted)
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  projects: Array<{ id: number; projectKey: string; name: string }>;
  isLoadingProjects: boolean;

  // Actions (all use immutable set() pattern)
  updateSettings: (partial: Partial<ConnectionSettings>) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setProjects: (projects: Array<{ id: number; projectKey: string; name: string }>) => void;
  setIsLoadingProjects: (loading: boolean) => void;
  markConfigured: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>()((set, get) => ({
  // ... initial state and actions
}));
```

### Store Rules

1. **Single named export** per store: `useSettingsStore`, `useBoardStore`
2. **No default exports** from store files (Zustand v5 drops default exports)
3. **Selector-based subscriptions** in components — never destructure the full store:

```typescript
// CORRECT
const settings = useSettingsStore((s) => s.settings);
const isConfigured = useSettingsStore((s) => s.isConfigured);

// WRONG — causes full re-renders on any store change
const { settings, isConfigured } = useSettingsStore();
```

4. **Async actions** live in the store, not in components
5. **`get()` for reading state** inside async actions; never capture state in a closure

### Persistence Pattern (tauri-plugin-store)

```typescript
// src/services/settingsStorage.ts
import { load } from '@tauri-apps/plugin-store';
import type { ConnectionSettings } from '../types/settings';

const STORE_FILE = 'settings.json';
const SETTINGS_KEY = 'connection';

export async function loadSettings(): Promise<ConnectionSettings | null> {
  const store = await load(STORE_FILE, { autoSave: false });
  const settings = await store.get<ConnectionSettings>(SETTINGS_KEY);
  return settings ?? null;
}

export async function saveSettings(settings: ConnectionSettings): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: false });
  await store.set(SETTINGS_KEY, settings);
  await store.save(); // CRITICAL: must call save() — without it, data is memory-only
}
```

---

## Component Patterns

### File Structure

Every component that has styles or tests lives in its own subdirectory:

```
src/components/ComponentName/
├── ComponentName.tsx          # Component implementation
├── ComponentName.module.css   # Scoped styles
└── ComponentName.test.tsx     # Tests (for non-trivial components)
```

Simple presentational components with no logic (e.g., `StatusBadge`) may omit the test file.

### CSS Modules

```typescript
// CORRECT
import styles from './SettingsForm.module.css';

// In JSX
<div className={styles.formWrapper}>
  <button className={styles.connectionButton} disabled={isDisabled}>
    接続テスト
  </button>
</div>
```

Never use inline styles except for dynamic values that CSS custom properties cannot express.

### Design Token Usage

All visual values come from CSS custom properties defined in `src/global.css`:

```css
/* src/global.css — the single source of truth for all tokens */
:root {
  --color-accent: #2563EB;
  --color-error: #DC2626;
  --color-success: #16A34A;
  --space-md: 16px;
  --radius-card: 8px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --transition-fast: 150ms ease-out;
  /* ... full set in global.css */
}
```

Do not hardcode hex values, pixel values, or easing curves in component CSS — always reference a token.

### Icon Strategy

No icon library. Use Unicode characters directly:
- Gear (settings): `⚙` (U+2699)
- Checkmark (success): `✓` (U+2713)

### Component Props

- Props interfaces are declared inline (not imported from a separate types file) for small components
- For shared prop shapes, add to the relevant type file under `src/types/`

### DnD Components

DnD operations use issue IDs only — never pass full issue objects through dnd-kit drag data:

```typescript
// CORRECT — use ID in drag data, look up full object from store
const { setNodeRef, transform } = useDraggable({ id: issue.id });
const fullIssue = useBoardStore((s) => s.issues[issueId]);

// WRONG — passing full objects through DnD
const { setNodeRef } = useDraggable({ id: issue.id, data: { issue } });
```

### Project Directory Structure

```
mileboard/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.module.css
│   ├── global.css
│   ├── types/
│   │   ├── settings.ts       # ConnectionSettings, ConnectionStatus
│   │   ├── backlog.ts        # BacklogUser, BacklogProject, BacklogError
│   │   ├── milestone.ts
│   │   └── issue.ts
│   ├── api/
│   │   └── tauriBridge.ts    # All invoke() wrappers
│   ├── stores/
│   │   ├── settingsStore.ts
│   │   └── boardStore.ts
│   ├── services/
│   │   ├── backlogApi.ts     # testConnection, fetchProjects
│   │   └── settingsStorage.ts # loadSettings, saveSettings
│   ├── hooks/
│   │   └── useConnectionTest.ts
│   ├── components/
│   │   ├── SettingsForm/
│   │   ├── SettingsCard/
│   │   ├── SettingsModal/
│   │   ├── KanbanBoard/
│   │   ├── MilestoneLane/
│   │   ├── IssueCard/
│   │   ├── DragOverlay/
│   │   ├── LaneHeader/
│   │   ├── StatusBadge/
│   │   └── ErrorToast/
│   └── views/
│       ├── SettingsView/
│       └── BoardView/
├── tests/
│   └── setup.ts              # Global Vitest setup + Tauri plugin mocks
└── src-tauri/
    └── src/
        ├── lib.rs
        ├── models.rs
        ├── backlog_client.rs
        ├── rate_limiter.rs
        └── commands/
            ├── mod.rs
            ├── settings.rs
            ├── milestones.rs
            ├── issues.rs
            └── issue_update.rs
```
