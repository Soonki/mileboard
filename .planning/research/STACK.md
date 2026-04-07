# Technology Stack

**Project:** mileboard (Backlog Milestone Kanban Viewer)
**Researched:** 2026-04-07
**Overall Confidence:** HIGH

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tauri | 2.10.x | Desktop shell, Rust backend, CORS-free HTTP | Eliminates CORS entirely by proxying API calls through Rust. Existing team experience with Tauri + React + Vite. v2.10.3 is current stable (March 2026). | HIGH |
| React | 18.3.x | UI rendering | PROJECT.md specifies React 18. React 18.3 is the latest 18.x release with deprecation warnings that smooth future React 19 migration. No reason to jump to 19 now -- server components are irrelevant for a Tauri desktop app. | HIGH |
| TypeScript | 5.7.x | Type safety | Current stable TS. Zustand 5 requires TS >= 4.5. Vite 8 has native TS support via Oxc. | HIGH |
| Vite | 8.0.x | Build tool, dev server | Current stable. Uses Rolldown (Rust-based bundler) delivering 10-30x faster builds. Native CSS Modules support, native TS path alias resolution. Vitest 4.1 is fully compatible. | MEDIUM |

**Vite version rationale:** Vite 8 is a significant architecture change (Rolldown replaces esbuild+Rollup). For a greenfield project this is the right choice -- no migration burden, and it is the actively-developed version. Vite 6.4 still receives security patches but not feature work. If Vite 8 causes issues with any plugin, fall back to Vite 7.3 (which also has Rolldown support and receives important fixes).

**React version rationale:** React 19 works with Tauri 2 (confirmed by community templates), but its headline features (server components, Actions, use() hook) are server-oriented and provide minimal benefit for a desktop kanban app. React 18.3 is stable, battle-tested, and avoids unnecessary migration risk.

### Build Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @vitejs/plugin-react-swc | 4.3.x | React Fast Refresh + JSX transform via SWC | Faster than Babel-based @vitejs/plugin-react. SWC handles JSX/TSX transform in dev. Note: Vite's future direction is Oxc, but SWC plugin works fine on Vite 8. | HIGH |

### Tauri Plugins

| Plugin (JS) | Plugin (Rust) | Version | Purpose | Why | Confidence |
|-------------|---------------|---------|---------|-----|------------|
| @tauri-apps/plugin-http | tauri-plugin-http | 2.5.x | HTTP client for Backlog API | Official Tauri plugin. Provides fetch-like API that bypasses CORS entirely (requests go through Rust's reqwest). Supports custom headers for API key auth. | HIGH |
| @tauri-apps/plugin-store | tauri-plugin-store | 2.4.x | Persistent key-value storage | Stores API key, host URL, project key, milestone prefix. Persists across app restarts. JSON-backed file on disk. | HIGH |
| @tauri-apps/plugin-opener | tauri-plugin-opener | 2.5.x | Open URLs in default browser | Required for "card click opens Backlog issue in browser" feature. Replaces deprecated shell.open(). | HIGH |

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0.x | Client state management | PROJECT.md specifies Zustand for DnD-heavy frequent updates. v5.0.12 is current. Requires React 18+ (matches our stack). Uses native useSyncExternalStore. Lightweight (~1.1KB gzip). No boilerplate, no providers, selector-based re-rendering. | HIGH |

**Zustand 5 migration notes (for reference):** v5 drops default exports, requires React 18+, and has stricter TypeScript types on setState replace flag. Since this is greenfield, no migration needed -- use v5 patterns from the start.

### Drag and Drop

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | PROJECT.md specifies @dnd-kit. v6.3.1 is the stable release with ~12M weekly downloads. Well-documented kanban patterns. Accessible by default. ~12KB gzip. | HIGH |
| @dnd-kit/sortable | 10.0.0 | Sortable lists within lanes | Provides useSortable hook for card ordering within and across lanes. Works with @dnd-kit/core. | HIGH |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | Helper for applying transform styles to draggable elements. | HIGH |

**Why NOT @dnd-kit/react (the new rewrite):** The @dnd-kit/react package (v0.3.2) is the next-generation rewrite with a cleaner API, but it is still in 0.x (pre-stable). For a production kanban app, the legacy @dnd-kit/core (v6.3.1) is the safer choice with proven kanban patterns, extensive documentation, and community examples. Plan to migrate to @dnd-kit/react when it reaches 1.0.

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| CSS Modules | (built into Vite) | Scoped component styles | PROJECT.md specifies CSS Modules. Zero-config in Vite 8. Naming convention: `Component.module.css`. No runtime cost. Team familiarity from existing prototype. | HIGH |

### Notifications / Toast

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| sonner | 2.x | Toast notifications | Required for error toasts and optimistic update failure rollback feedback. Lightweight (~5KB), beautiful defaults, TypeScript-first. ~7M weekly downloads. Simpler API than react-toastify. | MEDIUM |

### Testing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vitest | 4.1.x | Unit + integration tests | Vite-native test runner. v4.1.2 is current, fully compatible with Vite 8. Shares Vite config (transforms, aliases, CSS modules). | HIGH |
| @testing-library/react | 16.x | React component testing | Standard React component testing. Renders in jsdom, tests user-visible behavior. | HIGH |
| @testing-library/jest-dom | 6.x | DOM assertion matchers | Provides toBeInTheDocument(), toHaveClass(), etc. | HIGH |
| jsdom | 26.x | DOM environment for Vitest | Vitest environment for rendering React components in tests. | HIGH |

### Linting and Formatting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | 9.x | Code linting | Flat config format. Use @eslint/js + typescript-eslint. | HIGH |
| Prettier | 3.x | Code formatting | Consistent formatting. Integrates with ESLint via eslint-config-prettier. | HIGH |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Tauri 2 | Electron | 10x larger binary, higher memory usage. Tauri provides same capability for this use case. |
| React Version | React 18.3 | React 19 | Server components irrelevant for desktop. 18.3 is stable, avoids migration risk. Upgrade path clear when needed. |
| Build Tool | Vite 8 | Vite 6 | Vite 6 only gets security patches. Greenfield project should use current stable. |
| State | Zustand 5 | Jotai | Zustand is simpler for this use case (single store, frequent DnD updates). Jotai's atomic model adds complexity without benefit here. |
| State | Zustand 5 | Redux Toolkit | Overkill for a focused desktop app. Zustand has 1/10th the boilerplate. |
| DnD | @dnd-kit/core 6.x | @dnd-kit/react 0.3.x | 0.x pre-stable. Insufficient docs and community patterns for kanban. Migrate when 1.0 ships. |
| DnD | @dnd-kit/core 6.x | react-beautiful-dnd | Deprecated/unmaintained by Atlassian. No longer receiving updates. |
| DnD | @dnd-kit/core 6.x | react-dnd | Heavier, more complex API, less accessible. |
| Styling | CSS Modules | Tailwind CSS | Team already uses CSS Modules in existing Tauri prototype. No need to introduce new paradigm. |
| Styling | CSS Modules | styled-components | Runtime CSS-in-JS has performance cost in DnD-heavy UIs. CSS Modules are zero-runtime. |
| Toast | sonner | react-toastify | react-toastify is 16KB gzip vs sonner's ~5KB. sonner has cleaner API and better defaults. |
| HTTP | @tauri-apps/plugin-http | Browser fetch | Browser fetch still subject to CORS in webview. Tauri HTTP plugin routes through Rust, bypassing CORS entirely. |
| Storage | @tauri-apps/plugin-store | localStorage | localStorage does not persist reliably across Tauri app updates. plugin-store writes to filesystem with proper serialization. |

---

## Installation

```bash
# Create project (if starting fresh)
npm create tauri-app@latest mileboard -- --template react-ts

# Core dependencies
npm install react@18.3 react-dom@18.3 zustand@5
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install sonner

# Tauri plugins (JS side)
npm install @tauri-apps/plugin-http @tauri-apps/plugin-store @tauri-apps/plugin-opener

# Dev dependencies
npm install -D typescript@5.7 vite@8 @vitejs/plugin-react-swc@4
npm install -D vitest@4 jsdom @testing-library/react @testing-library/jest-dom
npm install -D eslint@9 @eslint/js typescript-eslint prettier eslint-config-prettier
npm install -D @types/react @types/react-dom
```

```toml
# Cargo.toml (src-tauri/Cargo.toml) - Rust side of Tauri plugins
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-http = "2"
tauri-plugin-store = "2"
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Configuration Notes

### Tauri Capabilities (src-tauri/capabilities/default.json)

Tauri 2 requires explicit permission grants for plugins:

```json
{
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "http:default",
    "store:default",
    "opener:default"
  ]
}
```

The HTTP plugin also needs URL scope configuration to restrict which domains the app can contact:

```json
{
  "permissions": [
    {
      "identifier": "http:default",
      "allow": [{ "url": "https://*.backlog.com/**" }, { "url": "https://*.backlog.jp/**" }]
    }
  ]
}
```

### Vite 8 Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // New in Vite 8: native TS path alias support
  },
  server: {
    port: 1420, // Tauri default
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

### Backlog API Authentication

Backlog API v2 supports two auth methods:
1. **API Key** (simpler, recommended for desktop app) - append `?apiKey=xxx` to requests
2. **OAuth 2.0** (more complex, token expires in 3600s)

For a desktop app, API Key auth is sufficient and simpler. The key is stored in `@tauri-apps/plugin-store` on disk, never exposed to the webview's localStorage.

### Backlog API Rate Limiting

- Rate limits are per-user (not per-API-key)
- Limits vary by plan (Free vs Paid) and request type (Read/Update/Search/Icon)
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- HTTP 429 returned when exceeded
- Implementation: Read rate limit headers, implement sequential fetching with backoff for milestone + issue data loading

---

## Version Lock Strategy

Pin major versions in package.json to avoid unintended breaking changes:

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^5.0.0",
    "@dnd-kit/core": "^6.3.0",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.0",
    "sonner": "^2.0.0",
    "@tauri-apps/plugin-http": "^2.5.0",
    "@tauri-apps/plugin-store": "^2.4.0",
    "@tauri-apps/plugin-opener": "^2.5.0"
  }
}
```

---

## Sources

- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/) - Tauri official blog
- [Tauri Core Releases](https://v2.tauri.app/release/) - v2.10.3 current
- [Tauri HTTP Client Plugin](https://v2.tauri.app/plugin/http-client/) - Official docs
- [Tauri Store Plugin](https://v2.tauri.app/plugin/store/) - Official docs
- [Tauri Opener Plugin](https://v2.tauri.app/plugin/opener/) - Official docs
- [Vite 8.0 Announcement](https://vite.dev/blog/announcing-vite8) - Rolldown architecture
- [Vite Releases](https://vite.dev/releases) - Version support policy
- [Zustand v5 Migration](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) - Breaking changes
- [Zustand npm](https://www.npmjs.com/package/zustand) - v5.0.12, 20M weekly downloads
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) - v6.3.1, ~12M weekly downloads
- [@dnd-kit/react npm](https://www.npmjs.com/package/@dnd-kit/react) - v0.3.2 (pre-stable)
- [dnd-kit Migration Guide](https://dndkit.com/react/guides/migration) - core to react migration path
- [Backlog API Overview](https://developer.nulab.com/docs/backlog/) - REST API v2
- [Backlog Rate Limit](https://developer.nulab.com/docs/backlog/rate-limit/) - Per-user limits
- [Backlog Authentication](https://developer.nulab.com/docs/backlog/auth/) - API key + OAuth 2.0
- [Vitest npm](https://www.npmjs.com/package/vitest) - v4.1.2, Vite 8 compatible
- [@vitejs/plugin-react-swc npm](https://www.npmjs.com/package/@vitejs/plugin-react-swc) - v4.3.0
- [Sonner](https://sonner.emilkowal.ski/) - Toast component
- [Vite CSS Modules](https://vite.dev/guide/features) - Built-in support
