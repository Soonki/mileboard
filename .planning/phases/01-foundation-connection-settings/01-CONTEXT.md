# Phase 1: Foundation & Connection Settings - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can configure and validate their Backlog API connection, with settings persisted across app restarts. Includes Tauri project scaffold, settings form UI, connection validation, and persistent storage. Board display and data fetching are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Initial launch flow
- **D-01:** First launch shows the settings form as the main view (full-page centered card). No empty board, no wizard.
- **D-02:** After successful connection test + project selection + save, the app automatically transitions to the board view. Next launch also goes directly to the board.
- **D-03:** Once configured, settings are accessible via a gear icon in the board header. Clicking it opens the settings form as a modal dialog overlaying the board.

### Settings form layout
- **D-04:** Full-page centered card layout for initial setup. All fields in a single group (no section splitting — only 4 fields).
- **D-05:** Each field has placeholder text showing input examples.
- **D-06:** Re-edit from gear icon opens the same form as a modal dialog.

### Validation experience
- **D-07:** Explicit "接続テスト" (Connection Test) button — validation only runs when the user clicks it.
- **D-08:** Connection test validates host connectivity + API key authentication only (not project key existence). Uses Backlog API authentication endpoint.
- **D-09:** Success/failure feedback displayed as inline message within the form (green for success, red for failure with specific error message like "APIキーが無効です" or "ホストに接続できません").

### Project selection flow
- **D-10:** Project key is NOT a text input. After successful connection test, the app fetches the project list from Backlog API and presents a dropdown for selection.
- **D-11:** Form flow: Host URL + API Key input → Connection Test → Success enables Project dropdown (populated from API) + Milestone prefix text input → Save.

### API key storage
- **D-12:** All settings (host, API key, project key, milestone prefix) stored via tauri-plugin-store in plaintext JSON. No encryption or OS keychain — personal desktop app scope makes this acceptable.

### Claude's Discretion
- Loading spinner design during connection test
- Exact spacing, typography, and color palette
- Error message wording details beyond the examples given
- Form field ordering within the single group
- Button styling and disabled states

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements are fully captured in decisions above and in REQUIREMENTS.md.

### Project requirements
- `.planning/REQUIREMENTS.md` — CONN-01, CONN-02, CONN-03 define the connection requirements
- `.planning/PROJECT.md` — Constraints section defines the tech stack (Tauri 2 + React 18 + TypeScript + Vite)

### Technology decisions
- `CLAUDE.md` §Recommended Stack — Tauri plugins (plugin-http, plugin-store, plugin-opener), Zustand, CSS Modules, Vitest
- `CLAUDE.md` §Backlog API Authentication — API key auth pattern
- `CLAUDE.md` §Backlog API Rate Limiting — Rate limit headers and backoff strategy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing source code.

### Established Patterns
- None yet. This phase establishes the foundational patterns for the project.
- CSS Modules specified in PROJECT.md constraints — use `Component.module.css` convention.
- Zustand for state management — will establish the store pattern for settings.

### Integration Points
- Tauri IPC bridge: Settings form (React) ↔ tauri-plugin-store (Rust) for persistence
- Tauri HTTP plugin: Connection test (React) → tauri-plugin-http (Rust) → Backlog API
- Board view: Settings state feeds into the board component (Phase 3 will consume the stored settings)

</code_context>

<specifics>
## Specific Ideas

- Project key must be selected from a dropdown populated by API call, not typed manually — reduces user error and removes the need to look up project keys
- Connection test validates only authentication, not project access — keeps the test fast and focused
- Two distinct UI modes for the same form: full-page (initial setup) and modal (re-edit from board)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-connection-settings*
*Context gathered: 2026-04-07*
