# Plan 01-02 Summary: Rust plugins, settings storage, Zustand store, CSS tokens

## Status: FILES CREATED - PENDING COMMIT AND VERIFICATION

All files have been created/modified but could not be committed or tested due to permission restrictions on `git add`, `git commit`, `npx vitest`, and `cargo check`.

## Task 1: Rust dependencies and Tauri plugin configuration

### Files modified
| File | Change | Status |
|------|--------|--------|
| `src-tauri/Cargo.toml` | Added `tauri-plugin-http = "2"`, `tauri-plugin-store = "2"` | Modified |
| `src-tauri/src/lib.rs` | Registered 3 plugins (http, store, opener); removed greet command | Rewritten |
| `src-tauri/src/main.rs` | Fixed crate name: `mileboard_scaffold_lib` -> `mileboard_lib` | Modified |
| `src-tauri/capabilities/default.json` | Added HTTP allowlist (3 Backlog domains), `store:default` permission | Rewritten |

### Rust dependency versions
- `tauri-plugin-http = "2"` (new)
- `tauri-plugin-store = "2"` (new)
- `tauri-plugin-opener = "2"` (existing)

### Deviation
- Fixed `src-tauri/src/main.rs` crate reference from `mileboard_scaffold_lib` to `mileboard_lib` (scaffold had wrong name)

## Task 2: Settings storage, Zustand store, CSS tokens

### Files created
| File | Exports | Status |
|------|---------|--------|
| `src/types/settings.ts` | `ConnectionSettings`, `ConnectionStatus` | Created |
| `src/services/settingsStorage.ts` | `loadSettings`, `saveSettings` | Created |
| `src/services/settingsStorage.test.ts` | 4 tests | Created |
| `src/stores/settingsStore.ts` | `useSettingsStore` | Created |
| `src/stores/settingsStore.test.ts` | 5 tests | Created |
| `src/global.css` | 30 CSS custom properties + reset | Created |
| `vitest.config.ts` | Vitest config (jsdom, globals, setup) | Created |
| `tests/setup.ts` | Tauri plugin mocks | Created |

### CSS custom properties (30 tokens in :root)
- Spacing: 6 tokens (--space-xs through --space-2xl)
- Colors: 10 tokens (--color-bg, --color-surface, --color-accent, --color-accent-hover, --color-error, --color-success, --color-disabled, --color-border, --color-text-primary, --color-text-secondary)
- Typography: 9 tokens (--font-family, --font-size-sm/label/body/heading, --font-weight-regular/semibold, --line-height-body/label/heading)
- Radii: 2 tokens (--radius-input, --radius-card)
- Shadows: 1 token (--shadow-card)
- Transitions: 2 tokens (--transition-fast, --transition-normal)

### Key patterns established
- **settingsStorage.ts**: Calls `store.save()` after `store.set()` (critical for disk persistence)
- **settingsStorage.ts**: Uses `autoSave: false` in `load()` options
- **settingsStore.ts**: Immutable Zustand updates via `set((state) => ({ settings: { ...state.settings, ...partial } }))`
- **settingsStore.ts**: Initial state: `isConfigured: false`, `connectionStatus: 'idle'`

### Test count
- settingsStorage.test.ts: 4 tests
- settingsStore.test.ts: 5 tests
- Total: 9 tests

## Pending actions (blocked by permissions)
1. `git add` + `git commit` for Task 1 files
2. `git add` + `git commit` for Task 2 files
3. `npx vitest run` to verify all 9 tests pass
4. `cargo check` to verify Rust compilation
