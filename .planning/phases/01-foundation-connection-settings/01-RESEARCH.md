# Phase 1: Foundation & Connection Settings - Research

**Researched:** 2026-04-07
**Domain:** Tauri 2 scaffold + React 18 settings form + Backlog API validation + persistent storage
**Confidence:** HIGH

## Summary

Phase 1 はグリーンフィールドプロジェクトの基盤構築フェーズである。Tauri 2 + React 18 + TypeScript + Vite 8 のプロジェクトスキャフォールド、Backlog API 接続設定フォーム（ホストURL、APIキー、プロジェクト選択、マイルストーン接頭辞）、接続テスト検証、tauri-plugin-store による設定永続化を実装する。

現在の開発環境には Node.js v24.13.0、npm 10.5.0、Rust stable 1.94.1（ただしデフォルトは 1.73.0 に固定されており切り替えが必要）が揃っている。Tauri 2.10 は Rust 1.77.2 以上を要求するため、`rustup default stable` によるツールチェーン切り替えが Phase 1 の前提条件となる。

**Primary recommendation:** `npm create tauri-app@latest` でスキャフォールドし、React 18 にダウングレード後、tauri-plugin-http + tauri-plugin-store を追加して設定フォームを構築する。接続テストは `GET /api/v2/users/myself?apiKey=xxx` エンドポイントで認証検証し、成功後に `GET /api/v2/projects` でプロジェクト一覧を取得する。

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** First launch shows the settings form as the main view (full-page centered card). No empty board, no wizard.
- **D-02:** After successful connection test + project selection + save, the app automatically transitions to the board view. Next launch also goes directly to the board.
- **D-03:** Once configured, settings are accessible via a gear icon in the board header. Clicking it opens the settings form as a modal dialog overlaying the board.
- **D-04:** Full-page centered card layout for initial setup. All fields in a single group (no section splitting -- only 4 fields).
- **D-05:** Each field has placeholder text showing input examples.
- **D-06:** Re-edit from gear icon opens the same form as a modal dialog.
- **D-07:** Explicit "接続テスト" (Connection Test) button -- validation only runs when the user clicks it.
- **D-08:** Connection test validates host connectivity + API key authentication only (not project key existence). Uses Backlog API authentication endpoint.
- **D-09:** Success/failure feedback displayed as inline message within the form (green for success, red for failure with specific error message).
- **D-10:** Project key is NOT a text input. After successful connection test, the app fetches the project list from Backlog API and presents a dropdown for selection.
- **D-11:** Form flow: Host URL + API Key input -> Connection Test -> Success enables Project dropdown (populated from API) + Milestone prefix text input -> Save.
- **D-12:** All settings (host, API key, project key, milestone prefix) stored via tauri-plugin-store in plaintext JSON. No encryption or OS keychain.

### Claude's Discretion
- Loading spinner design during connection test
- Exact spacing, typography, and color palette
- Error message wording details beyond the examples given
- Form field ordering within the single group
- Button styling and disabled states

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONN-01 | User can enter API key, host, and project key and validate the connection | Backlog API `GET /api/v2/users/myself` for auth validation, `GET /api/v2/projects` for project list. tauri-plugin-http for CORS-free requests. |
| CONN-02 | Connection settings are persisted locally and survive app restarts | tauri-plugin-store with `LazyStore` or `load()` API. JSON file in app data directory. |
| CONN-03 | User can set a milestone filter prefix | Simple text input stored alongside other settings in the same store file. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Tauri 2.0 + React 18 + TypeScript + Vite (locked)
- **State management**: Zustand (locked)
- **Styling**: CSS Modules with `Component.module.css` convention (locked)
- **Testing**: Vitest + React Testing Library (locked)
- **Immutability**: Always create new objects, never mutate (coding style rule)
- **File size**: 200-400 lines typical, 800 max (coding style rule)
- **Functions**: < 50 lines (coding style rule)
- **Test coverage**: 80% minimum (testing rule)
- **Error handling**: Explicit at every level, never silently swallow (coding style rule)
- **Security**: No hardcoded secrets, validate all user input (security rule)
- **Commit format**: Conventional commits (git workflow rule)

## Standard Stack

### Core (Phase 1 で使用するもの)
| Library | Version | Purpose | Why Standard | Source |
|---------|---------|---------|--------------|--------|
| Tauri | 2.10.x | Desktop shell + Rust backend | CORS-free HTTP, locked decision | [VERIFIED: npm registry @tauri-apps/cli 2.10.1] |
| React | 18.3.1 | UI rendering | CLAUDE.md locked. 18.3.1 is latest 18.x | [VERIFIED: npm registry react@18.3.1] |
| React DOM | 18.3.1 | React DOM bindings | Matches React version | [VERIFIED: npm registry react-dom@18.3.1] |
| TypeScript | 6.0.2 | Type safety | Latest stable | [VERIFIED: npm registry] |
| Vite | 8.0.5 | Build tool, dev server | CLAUDE.md locked. Rolldown-based | [VERIFIED: npm registry] |
| @vitejs/plugin-react-swc | 4.3.0 | React Fast Refresh + JSX | SWC-based, faster than Babel | [VERIFIED: npm registry] |
| @tauri-apps/api | 2.10.1 | Tauri frontend API | Core IPC bridge | [VERIFIED: npm registry] |
| @tauri-apps/plugin-http | 2.5.8 | HTTP client (CORS-free) | Backlog API calls via Rust | [VERIFIED: npm registry] |
| @tauri-apps/plugin-store | 2.4.2 | Persistent key-value storage | Settings persistence (D-12) | [VERIFIED: npm registry] |
| Zustand | 5.0.12 | Client state management | CLAUDE.md locked. Lightweight, selector-based | [VERIFIED: npm registry] |

### Supporting (Phase 1 開発ツール)
| Library | Version | Purpose | When to Use | Source |
|---------|---------|---------|-------------|--------|
| Vitest | 4.1.2 | Unit + integration tests | All test execution | [VERIFIED: npm registry] |
| @testing-library/react | 16.3.2 | React component testing | Component behavior tests | [VERIFIED: npm registry] |
| @testing-library/jest-dom | 6.9.1 | DOM assertion matchers | toBeInTheDocument() etc. | [VERIFIED: npm registry] |
| jsdom | 29.0.2 | DOM environment | Vitest environment for React | [VERIFIED: npm registry] |
| @types/react | 18.3.28 | React type definitions | TypeScript support for React 18 | [VERIFIED: npm registry @types/react@18] |
| @types/react-dom | 18.3.7 | React DOM type definitions | TypeScript support | [VERIFIED: npm registry @types/react-dom@18] |
| ESLint | 9.x | Code linting | Flat config format | [VERIFIED: npm registry 10.2.0 available but 9.x is CLAUDE.md spec] |
| Prettier | 3.8.1 | Code formatting | Consistent formatting | [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tauri-plugin-store | localStorage | localStorage doesn't persist reliably across Tauri updates. plugin-store writes to filesystem. Locked by D-12. |
| tauri-plugin-http | Browser fetch | Browser fetch subject to CORS in webview. Locked by CLAUDE.md. |
| Zustand | React Context | Context causes unnecessary re-renders. Zustand is locked. |
| CSS Modules | Tailwind | Team uses CSS Modules. Locked by CLAUDE.md. |

**Installation (Phase 1):**
```bash
# 1. Scaffold Tauri project
npm create tauri-app@latest mileboard -- --template react-ts

# 2. Downgrade React to 18 (scaffold creates React 19)
npm install react@18.3.1 react-dom@18.3.1
npm install -D @types/react@18.3.28 @types/react-dom@18.3.7

# 3. Tauri plugins (JS side)
npm install @tauri-apps/plugin-http @tauri-apps/plugin-store

# 4. State management
npm install zustand

# 5. Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Rust side (src-tauri/Cargo.toml):**
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-http = "2"
tauri-plugin-store = "2"
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Architecture Patterns

### Recommended Project Structure
```
mileboard/
├── index.html                    # Vite entry HTML
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts              # or vitest workspace in vite.config.ts
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Root component (routing: settings vs board)
│   ├── global.css                # CSS custom properties, reset, font stack
│   ├── types/
│   │   ├── settings.ts           # Settings type definitions
│   │   └── backlog.ts            # Backlog API response types
│   ├── stores/
│   │   └── settingsStore.ts      # Zustand store for connection settings
│   ├── services/
│   │   ├── backlogApi.ts         # Backlog API client (fetch via tauri-plugin-http)
│   │   └── settingsStorage.ts    # tauri-plugin-store wrapper
│   ├── components/
│   │   ├── SettingsForm/
│   │   │   ├── SettingsForm.tsx
│   │   │   ├── SettingsForm.module.css
│   │   │   └── SettingsForm.test.tsx
│   │   ├── SettingsCard/
│   │   │   ├── SettingsCard.tsx
│   │   │   └── SettingsCard.module.css
│   │   ├── SettingsModal/
│   │   │   ├── SettingsModal.tsx
│   │   │   └── SettingsModal.module.css
│   │   ├── FormField/
│   │   │   ├── FormField.tsx
│   │   │   └── FormField.module.css
│   │   └── GearIcon/
│   │       ├── GearIcon.tsx
│   │       └── GearIcon.module.css
│   └── hooks/
│       └── useConnectionTest.ts  # Connection test logic hook
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs                # Plugin registration
│   └── capabilities/
│       └── default.json          # HTTP + Store permissions
└── tests/
    └── setup.ts                  # Vitest global setup
```

### Pattern 1: Zustand Settings Store
**What:** Zustand store managing connection settings state + form state (loading, validation result, project list)
**When to use:** All settings-related state management
**Example:**
```typescript
// Source: Zustand v5 docs + CLAUDE.md conventions
import { create } from 'zustand';

interface ConnectionSettings {
  hostUrl: string;
  apiKey: string;
  projectId: number | null;
  projectKey: string;
  milestonePrefix: string;
}

interface SettingsState {
  // Persisted settings (loaded from store on init)
  settings: ConnectionSettings;
  isConfigured: boolean; // true if valid settings exist

  // Form transient state
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError: string | null;
  projects: Array<{ id: number; projectKey: string; name: string }>;
  isLoadingProjects: boolean;

  // Actions (immutable updates)
  updateSettings: (partial: Partial<ConnectionSettings>) => void;
  setConnectionStatus: (status: SettingsState['connectionStatus'], error?: string) => void;
  setProjects: (projects: SettingsState['projects']) => void;
  markConfigured: () => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: {
    hostUrl: '',
    apiKey: '',
    projectId: null,
    projectKey: '',
    milestonePrefix: '',
  },
  isConfigured: false,
  connectionStatus: 'idle',
  connectionError: null,
  projects: [],
  isLoadingProjects: false,

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
  setConnectionStatus: (status, error) =>
    set({ connectionStatus: status, connectionError: error ?? null }),
  setProjects: (projects) =>
    set({ projects, isLoadingProjects: false }),
  markConfigured: () =>
    set({ isConfigured: true }),
}));
```

### Pattern 2: Backlog API Client (tauri-plugin-http)
**What:** Service layer wrapping tauri-plugin-http fetch for Backlog API calls
**When to use:** All Backlog API interactions
**Example:**
```typescript
// Source: Tauri HTTP plugin docs (https://v2.tauri.app/plugin/http-client/)
// + Backlog API docs (https://developer.nulab.com/docs/backlog/)
import { fetch } from '@tauri-apps/plugin-http';

interface BacklogError {
  errors: Array<{
    message: string;
    code: number;
    moreInfo: string;
  }>;
}

interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  mailAddress: string;
}

interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  archived: boolean;
}

function buildApiUrl(host: string, path: string, apiKey: string): string {
  // host example: "your-space.backlog.com"
  return `https://${host}/api/v2${path}?apiKey=${apiKey}`;
}

export async function testConnection(
  host: string,
  apiKey: string
): Promise<{ success: true; user: BacklogUser } | { success: false; error: string }> {
  try {
    const url = buildApiUrl(host, '/users/myself', apiKey);
    const response = await fetch(url, { method: 'GET' });

    if (response.ok) {
      const user: BacklogUser = await response.json();
      return { success: true, user };
    }

    if (response.status === 401) {
      return { success: false, error: 'APIキーが無効です。Backlogの個人設定で確認してください。' };
    }

    const errorBody: BacklogError = await response.json();
    const backlogError = errorBody.errors?.[0];

    if (backlogError?.code === 11) {
      return { success: false, error: 'APIキーが無効です。Backlogの個人設定で確認してください。' };
    }

    return { success: false, error: '予期しないエラーが発生しました。しばらくしてから再試行してください。' };
  } catch {
    return { success: false, error: 'ホストに接続できません。URLを確認してください。' };
  }
}

export async function fetchProjects(
  host: string,
  apiKey: string
): Promise<BacklogProject[]> {
  const url = buildApiUrl(host, '/projects', apiKey);
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error('プロジェクト一覧の取得に失敗しました。');
  }

  const projects: BacklogProject[] = await response.json();
  return projects.filter((p) => !p.archived);
}
```

### Pattern 3: Settings Persistence (tauri-plugin-store)
**What:** Wrapper around tauri-plugin-store for settings load/save
**When to use:** App startup (load) and settings save
**Example:**
```typescript
// Source: Tauri Store plugin docs (https://v2.tauri.app/plugin/store/)
import { load } from '@tauri-apps/plugin-store';

const STORE_FILE = 'settings.json';
const SETTINGS_KEY = 'connection';

interface PersistedSettings {
  hostUrl: string;
  apiKey: string;
  projectId: number;
  projectKey: string;
  milestonePrefix: string;
}

export async function loadSettings(): Promise<PersistedSettings | null> {
  const store = await load(STORE_FILE, { autoSave: false });
  const settings = await store.get<PersistedSettings>(SETTINGS_KEY);
  return settings ?? null;
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: false });
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}
```

### Pattern 4: App Root Routing (Settings vs Board)
**What:** App.tsx uses `isConfigured` from settings store to render either SettingsCard (first launch) or Board placeholder + modal
**When to use:** App entry point
**Example:**
```typescript
// Minimal router based on settings state
function App() {
  const isConfigured = useSettingsStore((s) => s.isConfigured);
  const [showSettings, setShowSettings] = useState(false);

  if (!isConfigured) {
    return <SettingsCard />;
  }

  return (
    <>
      <BoardHeader onSettingsClick={() => setShowSettings(true)} />
      <BoardPlaceholder /> {/* Phase 3 replaces this */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
```

### Anti-Patterns to Avoid
- **API key in URL logged to console:** fetch URL contains apiKey query param. Never `console.log` the full URL. Use debug-only logging with key masking.
- **Mutating Zustand state directly:** Always return new objects in `set()`. Never `state.settings.hostUrl = 'x'`.
- **Storing transient form state in persistent store:** Only persist final saved settings. Form validation state, loading states, project list cache are Zustand-only (not persisted).
- **Using browser fetch instead of tauri-plugin-http:** Browser fetch in Tauri webview is still subject to CORS. Always use `import { fetch } from '@tauri-apps/plugin-http'`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests to Backlog | Custom XMLHttpRequest or browser fetch | `@tauri-apps/plugin-http` fetch | CORS bypass, consistent with Tauri architecture |
| Persistent key-value storage | File I/O or localStorage | `@tauri-apps/plugin-store` | Reliable cross-update persistence, JSON serialization handled |
| Client state management | React Context + useReducer | Zustand store | Avoids unnecessary re-renders, locked by CLAUDE.md |
| CSS scoping | BEM naming or CSS-in-JS | CSS Modules | Zero-runtime, locked by CLAUDE.md |
| Form validation state machine | Manual boolean flags | Zustand store with discriminated union status | Type-safe state transitions, prevents impossible states |

**Key insight:** Phase 1 はライブラリの組み合わせが核心。Tauri plugin-http でCORS回避、plugin-store で永続化、Zustand でUIステート管理。これら3つの統合パターンを正しく確立することが、後続全フェーズの基盤となる。

## Common Pitfalls

### Pitfall 1: Rust Toolchain Version Mismatch
**What goes wrong:** `cargo build` fails with "Rust version 1.77.2 or newer required" error
**Why it happens:** System default is rustc 1.73.0, but Tauri 2.10 requires >= 1.77.2
**How to avoid:** Run `rustup default stable` before scaffold. Verify with `rustc --version` (should show 1.94.1+)
**Warning signs:** Any compilation error mentioning edition or MSRV

### Pitfall 2: React 19 Default in create-tauri-app
**What goes wrong:** Scaffold installs React 19, but project requires React 18 (CLAUDE.md locked)
**Why it happens:** `create-tauri-app` templates use latest React by default
**How to avoid:** After scaffold, immediately run `npm install react@18.3.1 react-dom@18.3.1` and update `@types/react@18 @types/react-dom@18`
**Warning signs:** `package.json` shows `"react": "^19.x"`

### Pitfall 3: Missing Tauri HTTP Capabilities
**What goes wrong:** `fetch()` from plugin-http throws "denied" error at runtime
**Why it happens:** Tauri 2 requires explicit URL allowlisting in capabilities/default.json
**How to avoid:** Configure HTTP scope to allow `https://*.backlog.com/*`, `https://*.backlog.jp/*`, `https://*.backlogtool.com/*`
**Warning signs:** Promise rejection with access denied message when calling API

### Pitfall 4: API Key Exposure in URL
**What goes wrong:** Backlog API key visible in query parameters, potentially logged
**Why it happens:** Backlog uses `?apiKey=xxx` query parameter authentication
**How to avoid:** Never log full API URLs. Mask apiKey in any debug output. D-12 accepts plaintext storage but doesn't mean log it.
**Warning signs:** API key visible in dev console Network tab (not a security issue in Tauri since no browser address bar, but avoid console logging)

### Pitfall 5: Store Not Saving on Close
**What goes wrong:** Settings lost after app restart despite appearing saved
**Why it happens:** `autoSave: false` requires explicit `store.save()` call. Forgetting this means data stays in memory only.
**How to avoid:** Always call `store.save()` after `store.set()`. Consider wrapping in a single `saveSettings()` function.
**Warning signs:** Settings work during session but gone after restart

### Pitfall 6: Backlog API Error Code Confusion
**What goes wrong:** Generic error messages instead of specific feedback (D-09)
**Why it happens:** Not differentiating Backlog error codes (401 vs network error vs code 11 AuthenticationError)
**How to avoid:** Map HTTP status codes and Backlog error codes to specific Japanese error messages per UI-SPEC copywriting contract
**Warning signs:** All errors show the same message

### Pitfall 7: ESLint 9 vs 10 Confusion
**What goes wrong:** ESLint config doesn't work or conflicts
**Why it happens:** ESLint 10 just released but CLAUDE.md specifies 9.x. Flat config format required in both.
**How to avoid:** Pin to `eslint@9` in devDependencies. Use flat config (`eslint.config.js`).
**Warning signs:** Config file format errors

## Code Examples

Verified patterns from official sources:

### Tauri Capabilities Configuration
```json
// Source: https://v2.tauri.app/plugin/http-client/ + https://v2.tauri.app/plugin/store/
// File: src-tauri/capabilities/default.json
{
  "identifier": "default",
  "description": "Default capabilities for mileboard",
  "windows": ["main"],
  "permissions": [
    "core:default",
    {
      "identifier": "http:default",
      "allow": [
        { "url": "https://*.backlog.com/api/v2/**" },
        { "url": "https://*.backlog.jp/api/v2/**" },
        { "url": "https://*.backlogtool.com/api/v2/**" }
      ]
    },
    "store:default",
    "opener:default"
  ]
}
```

### Tauri Plugin Registration (Rust)
```rust
// Source: https://v2.tauri.app/plugin/http-client/ + https://v2.tauri.app/plugin/store/
// File: src-tauri/src/lib.rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### CSS Custom Properties (global.css)
```css
/* Source: 01-UI-SPEC.md design contract */
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  --color-bg: #F8F9FA;
  --color-surface: #FFFFFF;
  --color-accent: #2563EB;
  --color-accent-hover: #1D4ED8;
  --color-error: #DC2626;
  --color-success: #16A34A;
  --color-disabled: #9CA3AF;
  --color-border: #D1D5DB;
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;

  --font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-size-sm: 12px;
  --font-size-label: 13px;
  --font-size-body: 14px;
  --font-size-heading: 20px;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;

  --radius-input: 6px;
  --radius-card: 8px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
}
```

### Vitest Configuration
```typescript
// Source: Vitest docs + Vite 8 compatibility
// File: vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped', // readable class names in tests
      },
    },
  },
});
```

### Test Setup File
```typescript
// File: tests/setup.ts
import '@testing-library/jest-dom/vitest';

// Mock tauri-plugin-http for tests
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

// Mock tauri-plugin-store for tests
vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(() => Promise.resolve({
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
    save: vi.fn(() => Promise.resolve()),
  })),
}));
```

### Backlog API Response Type Definitions
```typescript
// Source: https://developer.nulab.com/docs/backlog/api/2/get-own-user/
// Source: https://developer.nulab.com/docs/backlog/api/2/get-project-list/
// Source: https://developer.nulab.com/docs/backlog/error-response/

export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  lang: string | null;
  mailAddress: string;
  lastLoginTime: string;
}

export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  chartEnabled: boolean;
  subtaskingEnabled: boolean;
  archived: boolean;
  displayOrder: number;
}

export interface BacklogApiError {
  errors: Array<{
    message: string;
    code: number; // 1-13, see error-response docs
    moreInfo: string;
  }>;
}

// Backlog error codes relevant to Phase 1:
// Code 11: AuthenticationError (invalid API key or unauthorized user)
// Code 1:  InternalError (server issue)
// Code 6:  NoResourceError (resource not found)
// Code 13: TooManyRequestsError (rate limit)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri v1 shell.open() | tauri-plugin-opener | Tauri 2.0 (2024) | shell plugin deprecated, use opener plugin |
| Vite 6 | Vite 8 (Rolldown) | 2026 | 10-30x faster builds, native TS support via Oxc |
| Zustand v4 createStore | Zustand v5 create<T>()() | 2024 | Curried form for TypeScript, no default exports |
| ESLint .eslintrc | ESLint flat config (eslint.config.js) | ESLint 9 (2024) | Legacy config format no longer supported |
| Tauri allowlist (v1) | Capabilities + ACL (v2) | Tauri 2.0 (2024) | Granular per-window permission model |

**Deprecated/outdated:**
- `tauri-plugin-shell`: Replaced by `tauri-plugin-opener` for URL opening
- Zustand default export `create`: Use named export `import { create } from 'zustand'` in v5
- `localStorage` in Tauri: Unreliable across updates, use `tauri-plugin-store`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `create-tauri-app` template for React will install React 19 by default, requiring downgrade to 18 | Standard Stack | LOW - if template already uses React 18, skip downgrade step. Easily detected at scaffold time. |
| A2 | Backlog API `GET /users/myself` returns 401 for invalid API keys | Code Examples | MEDIUM - if different status code returned, error mapping in connection test needs adjustment. Verify during implementation. |
| A3 | Tauri HTTP plugin capabilities support `**` glob pattern for URL paths | Code Examples | MEDIUM - if only `*` single-segment glob supported, URL pattern needs adjustment. Test at runtime. |
| A4 | `npm create tauri-app@latest mileboard -- --template react-ts` is the correct non-interactive scaffold command | Standard Stack | LOW - if flag format differs, interactive mode still works. |
| A5 | ESLint 9.x is the intended version per CLAUDE.md despite ESLint 10 being available | Standard Stack | LOW - CLAUDE.md says "9.x", follow it. |

## Open Questions

1. **Backlog API URL host format normalization**
   - What we know: Users enter `your-space.backlog.com` as host. Valid domains are `*.backlog.com`, `*.backlog.jp`, `*.backlogtool.com`
   - What's unclear: Should the app accept full URLs like `https://your-space.backlog.com` and strip the protocol? Or enforce bare hostname only?
   - Recommendation: Accept both formats. Strip `https://` and trailing `/` from input before constructing API URLs. Show placeholder example as `your-space.backlog.com` (no protocol).

2. **Project dropdown re-validation on host/key change**
   - What we know: D-11 defines the flow: test -> enable dropdown -> save
   - What's unclear: If user changes host or API key after a successful test, should the project dropdown be reset?
   - Recommendation: Yes. Reset connection status, clear project list, and disable dropdown/save when host or API key fields change.

3. **Board placeholder in Phase 1**
   - What we know: D-02 says after save, app transitions to board view. But board is Phase 3.
   - What's unclear: What to show as the board view in Phase 1?
   - Recommendation: Show a minimal placeholder ("Board coming soon" or empty container with gear icon header). Phase 3 replaces this with real board.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, dev server | Yes | v24.13.0 | -- |
| npm | Package management | Yes | 10.5.0 | -- |
| Rust (stable) | Tauri compilation | Yes | 1.94.1 | -- |
| Rust (default) | Currently active | Yes (but wrong version) | 1.73.0 | `rustup default stable` to switch to 1.94.1 |
| Tauri CLI | Project scaffold, dev | Yes (via npx) | 2.10.1 | -- |
| WebView2 | Tauri runtime (Windows) | Yes (Windows 11 built-in) | -- | -- |
| MSVC Build Tools | Rust compilation (Windows) | Yes (rustup MSVC target active) | -- | -- |

**Missing dependencies with no fallback:**
- None

**Missing dependencies with fallback:**
- Rust default toolchain (1.73.0) is too old for Tauri 2.10 (requires >= 1.77.2). **Fix: `rustup default stable`** to switch to installed 1.94.1.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (Wave 0 -- needs creation) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONN-01 | Connection test calls /users/myself and returns success/error | unit | `npx vitest run src/services/backlogApi.test.ts -t "testConnection"` | Wave 0 |
| CONN-01 | Project list fetched after successful connection | unit | `npx vitest run src/services/backlogApi.test.ts -t "fetchProjects"` | Wave 0 |
| CONN-01 | Settings form renders all fields, connection test button triggers API call | integration | `npx vitest run src/components/SettingsForm/SettingsForm.test.tsx` | Wave 0 |
| CONN-02 | Settings saved to store and loaded on init | unit | `npx vitest run src/services/settingsStorage.test.ts` | Wave 0 |
| CONN-02 | App shows board (placeholder) when settings exist, settings form when not | integration | `npx vitest run src/App.test.tsx -t "routing"` | Wave 0 |
| CONN-03 | Milestone prefix field is part of saved settings | unit | `npx vitest run src/services/settingsStorage.test.ts -t "milestonePrefix"` | Wave 0 |
| CONN-03 | Milestone prefix input enabled only after connection test | integration | `npx vitest run src/components/SettingsForm/SettingsForm.test.tsx -t "prefix"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration with jsdom environment
- [ ] `tests/setup.ts` -- Global test setup with Tauri plugin mocks
- [ ] `src/services/backlogApi.test.ts` -- Backlog API client tests (CONN-01)
- [ ] `src/services/settingsStorage.test.ts` -- Storage wrapper tests (CONN-02, CONN-03)
- [ ] `src/components/SettingsForm/SettingsForm.test.tsx` -- Form integration tests (CONN-01, CONN-03)
- [ ] `src/App.test.tsx` -- App routing tests (CONN-02)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (API key handling) | API key stored via tauri-plugin-store. No encryption per D-12 (personal desktop app). Never log API key values. |
| V3 Session Management | No | Desktop app, no sessions |
| V4 Access Control | No | Single-user desktop app |
| V5 Input Validation | Yes | Validate host URL format (domain pattern). Sanitize API key (no HTML injection in error display). Validate project selection (from known list). |
| V6 Cryptography | No | D-12 explicitly chose plaintext storage |

### Known Threat Patterns for Tauri + Backlog API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in query parameter visible in logs | Information Disclosure | Never console.log full API URLs. Mask apiKey in debug output. |
| Unrestricted HTTP scope allows requests to arbitrary hosts | Tampering | Lock capabilities to `*.backlog.com`, `*.backlog.jp`, `*.backlogtool.com` only |
| XSS via Backlog API response data rendered in UI | Tampering | React's JSX auto-escapes. Never use `dangerouslySetInnerHTML` with API data. |
| Plaintext API key on disk | Information Disclosure | Accepted risk per D-12. tauri-plugin-store file is in app data dir with OS user permissions. |

## Sources

### Primary (HIGH confidence)
- [npm registry] - All package versions verified via `npm view` (2026-04-07)
- [Tauri HTTP Client Plugin](https://v2.tauri.app/plugin/http-client/) - fetch API, capabilities, permissions
- [Tauri Store Plugin](https://v2.tauri.app/plugin/store/) - load/get/set/save API, LazyStore
- [Backlog API: Get Own User](https://developer.nulab.com/docs/backlog/api/2/get-own-user/) - Authentication test endpoint
- [Backlog API: Get Project List](https://developer.nulab.com/docs/backlog/api/2/get-project-list/) - Project dropdown data
- [Backlog API: Error Response](https://developer.nulab.com/docs/backlog/error-response/) - Error codes 1-13
- [Backlog API: Authentication](https://developer.nulab.com/docs/backlog/auth/) - API key query parameter pattern
- [Tauri Project Structure](https://v2.tauri.app/start/project-structure/) - Standard layout
- [Tauri Create Project](https://v2.tauri.app/start/create-project/) - Scaffolding commands
- [Tauri GitHub Cargo.toml](https://github.com/tauri-apps/tauri/blob/dev/Cargo.toml) - MSRV 1.77.2
- [Tauri Capabilities](https://v2.tauri.app/security/capabilities/) - Permission model

### Secondary (MEDIUM confidence)
- [Zustand v5 patterns](https://zustand.docs.pmnd.rs/) - Store creation, TypeScript, selectors
- [Vite 8 CSS Modules](https://vite.dev/guide/features) - Built-in support, configuration

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm registry. Tauri plugin APIs verified against official docs.
- Architecture: HIGH - Patterns derived from official Tauri docs, Zustand docs, and Backlog API docs.
- Pitfalls: HIGH - Rust version mismatch verified by comparing installed 1.73.0 vs required 1.77.2. React 19 default confirmed by npm registry showing latest React is 19.x.

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable ecosystem, 30-day validity)
