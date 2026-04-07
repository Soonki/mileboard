# Plan 01-03 Summary: Settings UI Components

## Status: IMPLEMENTATION COMPLETE, COMMITS PENDING

All files created and all tests passing. Git commits could not be created due to sandbox permission restrictions (git write operations blocked).

## Files Created

### Task 1: App shell, entry point, and board placeholder
| File | Purpose | Export |
|------|---------|--------|
| `src/main.tsx` | Entry point, imports global.css, renders App in StrictMode | - |
| `src/App.tsx` | Root component with isConfigured routing | `App` (default) |
| `src/App.test.tsx` | 5 tests for App routing and modal behavior | - |
| `src/components/BoardPlaceholder/BoardPlaceholder.tsx` | Placeholder for Phase 3 board | `BoardPlaceholder` |
| `src/components/SettingsCard/SettingsCard.tsx` | Full-page centered card wrapper for first launch | `SettingsCard` |
| `src/components/SettingsCard/SettingsCard.module.css` | CSS Grid centering, 480px max-width card | - |
| `src/components/SettingsModal/SettingsModal.tsx` | Modal overlay for re-editing from board | `SettingsModal` |
| `src/components/SettingsModal/SettingsModal.module.css` | Fixed overlay, fade-in/scale-in animations | - |

### Task 2: SettingsForm component with 6-state logic
| File | Purpose | Export |
|------|---------|--------|
| `src/components/SettingsForm/SettingsForm.tsx` | Main form with 6-state progressive disclosure | `SettingsForm` |
| `src/components/SettingsForm/SettingsForm.module.css` | All form field styles, spinner, buttons | - |
| `src/components/SettingsForm/SettingsForm.test.tsx` | 13 tests covering all 6 states | - |

### Task 3: SettingsCard and SettingsModal wrappers
These were created as part of Task 1 (SettingsCard.tsx, SettingsCard.module.css, SettingsModal.tsx, SettingsModal.module.css).

### Infrastructure (restored from Plans 01-01 and 01-02)
| File | Notes |
|------|-------|
| `tests/setup.ts` | Updated with proper store mock (get/set/save methods) |
| `vitest.config.ts` | jsdom environment, globals enabled |
| `tsconfig.json` | Strict mode, react-jsx |
| `tsconfig.node.json` | Bundler module resolution |
| `package.json` | All dependencies |

## State Machine Implemented (6 States)

1. **Initial** — Host + API key fields enabled. Test button disabled. Project dropdown + milestone prefix disabled.
2. **Fields entered** — Test button enabled when both hostUrl and apiKey are non-empty.
3. **Testing** — Spinner on test button, all inputs disabled.
4. **Success (4a)** — Green checkmark + "接続に成功しました". Project dropdown enabled + loading. Milestone prefix enabled.
5. **Error (4b)** — Red error message. Fields re-enabled for correction.
6. **Project selected** — Save button enabled when project is selected.
7. **Save complete** — saveToStorage() + markConfigured() called. Page mode transitions to board; modal mode calls onSaved().

## Test Results

```
 Test Files  2 passed (2)
      Tests  18 passed (18)
   Duration  1.32s
```

### App.test.tsx (5 tests)
- Renders SettingsCard when isConfigured=false
- Renders BoardPlaceholder when isConfigured=true
- Calls loadFromStorage on mount
- Renders SettingsModal when gear icon is clicked
- Closes SettingsModal when onClose is called

### SettingsForm.test.tsx (13 tests)
- Disables test button when hostUrl empty
- Disables test button when apiKey empty
- Enables test button when both filled
- Calls testConnection on click
- Enables project dropdown after success
- Enables milestone prefix after success
- Shows error message on failure
- Disables save until project selected
- Enables save when success + project selected
- Calls saveToStorage and markConfigured on save
- API key input type=password by default
- Toggle switches to type=text
- Shows success message with checkmark

## Japanese Copy Contract Compliance

All strings match the UI-SPEC copywriting contract exactly:
- Title: "Backlog接続設定"
- Labels: "ホストURL", "APIキー", "プロジェクト", "マイルストーン接頭辞"
- Placeholders: "例: your-space.backlog.com", "Backlogの個人設定から取得", "先に接続テストを実行してください", "プロジェクト一覧を取得中...", "例: Sprint-, 2026-"
- Buttons: "接続テスト", "保存"
- Success: "接続に成功しました" with checkmark
- Gear icon: Unicode ⚙ (U+2699)
- Close button: × character

## Deviations from Plan

1. **tests/setup.ts enhanced**: Added proper store mock with `get`, `set`, `save` methods to prevent unhandled rejection errors when loadFromStorage is called during tests.
2. **Git commits not created**: Sandbox permissions blocked all git write operations (git add, git commit, git reset, git merge). The orchestrator must handle committing the files.
3. **Prerequisite files recreated**: Because the worktree was behind the expected base commit (2234a49 vs 9115ba6), all Plan 01-01 and 01-02 files were recreated in the worktree.

## Patterns Established

- **CSS Modules pattern**: `Component.module.css` with CSS custom properties from `global.css`
- **Zustand selector pattern**: Individual selectors `useSettingsStore((s) => s.field)` for fine-grained re-rendering
- **Form state machine**: Progressive disclosure controlled by `connectionStatus` from store
- **Modal pattern**: Escape key + overlay click to close, stopPropagation on modal content

## Pending Commits (orchestrator must execute)

```bash
# Commit 1: Prerequisites (if not already present)
git add src/types/ src/services/ src/stores/ src/global.css src/vite-env.d.ts tests/setup.ts vitest.config.ts tsconfig.json tsconfig.node.json package.json
git commit -m "chore: restore prerequisite files from Plans 01-01 and 01-02"

# Commit 2: Task 1
git add src/main.tsx src/App.tsx src/App.test.tsx src/components/BoardPlaceholder/ src/components/SettingsCard/ src/components/SettingsModal/
git commit -m "feat(01-03): App shell, entry point, and board placeholder"

# Commit 3: Task 2
git add src/components/SettingsForm/
git commit -m "feat(01-03): SettingsForm component with 6-state logic"

# Commit 4: Task 3 (already included in Task 1 commit - SettingsCard and SettingsModal)
# No separate commit needed since these were created together with App shell
```
