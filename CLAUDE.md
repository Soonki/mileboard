<!-- GSD:project-start source:PROJECT.md -->
## Project

**mileboard**

Backlogのマイルストーンをカンバンレーンとして表示し、ドラッグ&ドロップで課題のマイルストーン移動を可能にするTauriデスクトップアプリ。月次スプリントプランニング、デイリースクラムでの調整、ロングスパンの計画俯瞰に使用する。

**Core Value:** マイルストーン間の課題移動をドラッグ&ドロップで直感的に行え、チームの計画調整を高速化すること。

### Constraints

- **Tech stack**: Tauri 2.0 + React 18 + TypeScript + Vite — CORS根本解消 + 既存Tauri経験の活用
- **DnDライブラリ**: @dnd-kit/core + sortable — モダン、アクセシブル、軽量（~12KB gzip）
- **状態管理**: Zustand — DnD中の頻繁な更新に適する軽量ライブラリ
- **スタイリング**: CSS Modules — 既存プロトタイプと同様、追加設定不要
- **テスト**: Vitest + React Testing Library — Viteネイティブ統合
- **レーン表示範囲**: 先月〜6ヶ月先（約7レーン）
- **APIレート制限**: Backlog APIのレート制限を考慮した逐次取得が必要
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tauri | 2.10.x | Desktop shell, Rust backend, CORS-free HTTP | Eliminates CORS entirely by proxying API calls through Rust. Existing team experience with Tauri + React + Vite. v2.10.3 is current stable (March 2026). | HIGH |
| React | 18.3.x | UI rendering | PROJECT.md specifies React 18. React 18.3 is the latest 18.x release with deprecation warnings that smooth future React 19 migration. No reason to jump to 19 now -- server components are irrelevant for a Tauri desktop app. | HIGH |
| TypeScript | 5.7.x | Type safety | Current stable TS. Zustand 5 requires TS >= 4.5. Vite 8 has native TS support via Oxc. | HIGH |
| Vite | 8.0.x | Build tool, dev server | Current stable. Uses Rolldown (Rust-based bundler) delivering 10-30x faster builds. Native CSS Modules support, native TS path alias resolution. Vitest 4.1 is fully compatible. | MEDIUM |
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
### Drag and Drop
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop primitives | PROJECT.md specifies @dnd-kit. v6.3.1 is the stable release with ~12M weekly downloads. Well-documented kanban patterns. Accessible by default. ~12KB gzip. | HIGH |
| @dnd-kit/sortable | 10.0.0 | Sortable lists within lanes | Provides useSortable hook for card ordering within and across lanes. Works with @dnd-kit/core. | HIGH |
| @dnd-kit/utilities | 3.2.2 | CSS transform utilities | Helper for applying transform styles to draggable elements. | HIGH |
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
## Installation
# Create project (if starting fresh)
# Core dependencies
# Tauri plugins (JS side)
# Dev dependencies
# Cargo.toml (src-tauri/Cargo.toml) - Rust side of Tauri plugins
## Configuration Notes
### Tauri Capabilities (src-tauri/capabilities/default.json)
### Vite 8 Configuration (vite.config.ts)
### Backlog API Authentication
### Backlog API Rate Limiting
- Rate limits are per-user (not per-API-key)
- Limits vary by plan (Free vs Paid) and request type (Read/Update/Search/Icon)
- Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- HTTP 429 returned when exceeded
- Implementation: Read rate limit headers, implement sequential fetching with backoff for milestone + issue data loading
## Version Lock Strategy
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
