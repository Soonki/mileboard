# Testing Conventions

**Project:** mileboard (Backlog Milestone Kanban Viewer)
**Stack:** Vitest 4.1.x + React Testing Library 16.x + jsdom 29.x
**Status:** Greenfield — conventions are derived from planning documents; no source code exists yet.

---

## Test Framework and Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.1.2 | Test runner — Vite-native, shares Vite config |
| @testing-library/react | 16.3.2 | React component rendering and user-event queries |
| @testing-library/jest-dom | 6.9.1 | DOM assertion matchers (`toBeInTheDocument()`, `toHaveClass()`, etc.) |
| jsdom | 29.0.2 | DOM environment for component rendering in Vitest |

### Vitest Configuration

Vitest is configured in a standalone `vitest.config.ts` (not embedded in `vite.config.ts`):

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    globals: true,
  },
});
```

Key settings:
- `environment: 'jsdom'` — enables DOM APIs for React component tests
- `setupFiles: ['tests/setup.ts']` — global mocks run before every test file
- `globals: true` — enables `describe`, `it`, `expect`, `vi` without explicit imports

---

## Test File Organization

### Co-location Rule

Test files live **next to the file they test**:

```
src/services/backlogApi.ts
src/services/backlogApi.test.ts     ← unit test, same directory

src/stores/settingsStore.ts
src/stores/settingsStore.test.ts    ← unit test, same directory

src/components/SettingsForm/
├── SettingsForm.tsx
├── SettingsForm.module.css
└── SettingsForm.test.tsx           ← integration/component test, same directory
```

### Global Test Infrastructure

The `tests/` directory at project root contains only global test setup, not test files:

```
tests/
└── setup.ts      ← global mocks for Tauri plugins (required by every test)
```

### Naming Conventions

| Test type | File suffix | Example |
|-----------|------------|---------|
| Unit (service/store) | `.test.ts` | `backlogApi.test.ts` |
| Component (React) | `.test.tsx` | `SettingsForm.test.tsx` |
| App-level integration | `.test.tsx` | `App.test.tsx` |

---

## Test Patterns and Practices

### TDD Workflow (Mandatory)

All new implementation follows RED → GREEN → IMPROVE:

1. Write the test file first (RED — test must fail before implementation exists)
2. Run `npx vitest run <testfile>` to confirm failure
3. Write minimal implementation to pass (GREEN)
4. Run tests again to confirm pass
5. Refactor / improve (IMPROVE) while keeping tests green

### Unit Tests (Services)

Service tests mock external dependencies (Tauri plugins) and verify return values:

```typescript
// src/services/backlogApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testConnection, fetchProjects } from './backlogApi';
import { fetch } from '@tauri-apps/plugin-http'; // mocked via tests/setup.ts

const mockFetch = vi.mocked(fetch);

describe('testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with user when API key is valid', async () => {
    const user = { id: 1, userId: 'user1', name: 'Test User', roleType: 1, mailAddress: 'a@b.com' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => user,
    } as Response);

    const result = await testConnection('space.backlog.com', 'validkey');

    expect(result).toEqual({ success: true, user });
  });

  it('returns error message for 401 (invalid API key)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const result = await testConnection('space.backlog.com', 'badkey');

    expect(result).toEqual({
      success: false,
      error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
    });
  });

  it('returns error message for network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await testConnection('invalid.host', 'key');

    expect(result).toEqual({
      success: false,
      error: 'ホストに接続できません。URLを確認してください。',
    });
  });
});
```

### Unit Tests (Zustand Stores)

Store tests import the store directly and test initial state and actions:

```typescript
// src/stores/settingsStore.test.ts
import { describe, it, expect } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('useSettingsStore', () => {
  it('initializes with isConfigured: false', () => {
    const state = useSettingsStore.getState();
    expect(state.isConfigured).toBe(false);
  });

  it('initializes with connectionStatus: idle', () => {
    const state = useSettingsStore.getState();
    expect(state.connectionStatus).toBe('idle');
  });

  it('updateSettings merges without mutating original (immutability)', () => {
    const store = useSettingsStore.getState();
    const originalSettings = store.settings;

    store.updateSettings({ hostUrl: 'new.backlog.com' });

    const updatedSettings = useSettingsStore.getState().settings;
    expect(updatedSettings).not.toBe(originalSettings); // new object reference
    expect(updatedSettings.hostUrl).toBe('new.backlog.com');
  });

  it('setConnectionStatus with error sets connectionError', () => {
    const store = useSettingsStore.getState();
    store.setConnectionStatus('error', 'APIキーが無効です');

    const state = useSettingsStore.getState();
    expect(state.connectionStatus).toBe('error');
    expect(state.connectionError).toBe('APIキーが無効です');
  });
});
```

### Component / Integration Tests (React Testing Library)

Component tests render in jsdom and test user-visible behavior — not implementation details:

```typescript
// src/components/SettingsForm/SettingsForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  it('shows connection test button disabled when host or API key is empty', () => {
    render(<SettingsForm />);

    const testButton = screen.getByRole('button', { name: '接続テスト' });
    expect(testButton).toBeDisabled();
  });

  it('enables connection test button when both host and API key are filled', () => {
    render(<SettingsForm />);

    fireEvent.change(screen.getByLabelText('ホストURL'), {
      target: { value: 'space.backlog.com' },
    });
    fireEvent.change(screen.getByLabelText('APIキー'), {
      target: { value: 'my-api-key' },
    });

    expect(screen.getByRole('button', { name: '接続テスト' })).toBeEnabled();
  });

  it('shows success message after successful connection test', async () => {
    // mock testConnection to return success ...
    render(<SettingsForm />);
    // fill fields, click button
    await waitFor(() => {
      expect(screen.getByText('接続に成功しました')).toBeInTheDocument();
    });
  });
});
```

---

## Mocking Strategy

### Global Plugin Mocks (tests/setup.ts)

All Tauri plugins are mocked globally so no test has access to real Tauri APIs:

```typescript
// tests/setup.ts
import { vi } from 'vitest';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-store', () => ({
  load: vi.fn(),
}));
```

This runs before every test file via `setupFiles` in `vitest.config.ts`.

### Per-Test Mock Control

Use `vi.mocked()` to get typed mock references, and `beforeEach(() => vi.clearAllMocks())` to reset between tests:

```typescript
import { fetch } from '@tauri-apps/plugin-http';
const mockFetch = vi.mocked(fetch);

beforeEach(() => {
  vi.clearAllMocks();
});

it('...', () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
  // test body
});
```

### Store Isolation Between Tests

Zustand stores share global state across tests in the same run. Reset store state in `beforeEach` when testing stores:

```typescript
import { useSettingsStore } from './settingsStore';

beforeEach(() => {
  useSettingsStore.setState({
    settings: { hostUrl: '', apiKey: '', projectId: null, projectKey: '', milestonePrefix: '' },
    isConfigured: false,
    connectionStatus: 'idle',
    connectionError: null,
    projects: [],
    isLoadingProjects: false,
  });
});
```

### Tauri IPC Mocking (tauriBridge)

For component tests that trigger board operations, mock the `tauriBridge` module:

```typescript
vi.mock('../../api/tauriBridge', () => ({
  tauriBridge: {
    getSettings: vi.fn().mockResolvedValue(null),
    getMilestones: vi.fn().mockResolvedValue([]),
    updateIssueMilestone: vi.fn().mockResolvedValue({}),
  },
}));
```

### CSS Modules in Tests

jsdom does not process CSS Modules. Vitest handles them transparently via its Vite integration — class names may appear as `undefined` in test assertions. Test for behavior (element visibility, text content, ARIA attributes) rather than CSS class names.

---

## Coverage Requirements

### Minimum: 80%

Run coverage with:

```bash
npx vitest run --coverage
```

Coverage must reach 80% across:
- **Statements**
- **Branches** (especially error paths)
- **Functions**
- **Lines**

### What to Prioritize

| Priority | Area | Reason |
|----------|------|--------|
| CRITICAL | `src/services/backlogApi.ts` | Security boundary — API key handling, all error paths |
| CRITICAL | `src/services/settingsStorage.ts` | Data persistence — test all load/save paths |
| HIGH | `src/stores/settingsStore.ts` | State correctness — test initial state and all actions |
| HIGH | `src/stores/boardStore.ts` | Optimistic update + rollback logic |
| HIGH | `src/components/SettingsForm/` | Core user flow (Phase 1 deliverable) |
| MEDIUM | Other UI components | Test interactions; skip purely visual details |
| LOW | `src/api/tauriBridge.ts` | Thin wrappers — test via integration |

### Security-Sensitive Tests

These specific test assertions are contractual (from `01-01-PLAN.md` acceptance criteria):

- `grep -r "console.log" src/services/backlogApi.ts` must return **no matches**
- All 7 `backlogApi.test.ts` tests must pass (covers all error branches)
- All 9 `settingsStore.test.ts` / `settingsStorage.test.ts` tests must pass

---

## Per-Phase Test Map

From `.planning/phases/01-foundation-connection-settings/01-VALIDATION.md`:

| Task | Requirement | Test File | Run Command |
|------|-------------|-----------|-------------|
| 01-01-01 | CONN-01 (auth) | `src/services/backlogApi.test.ts` | `npx vitest run src/services/backlogApi.test.ts -t "testConnection"` |
| 01-01-02 | CONN-01 (projects) | `src/services/backlogApi.test.ts` | `npx vitest run src/services/backlogApi.test.ts -t "fetchProjects"` |
| 01-02-01 | CONN-02 (persistence) | `src/services/settingsStorage.test.ts` | `npx vitest run src/services/settingsStorage.test.ts` |
| 01-02-02 | CONN-03 (prefix) | `src/services/settingsStorage.test.ts` | `npx vitest run src/services/settingsStorage.test.ts -t "milestonePrefix"` |
| 01-03-01 | CONN-01 (UI form) | `src/components/SettingsForm/SettingsForm.test.tsx` | `npx vitest run src/components/SettingsForm/SettingsForm.test.tsx` |
| 01-03-02 | CONN-02 (routing) | `src/App.test.tsx` | `npx vitest run src/App.test.tsx -t "routing"` |

### Verification Cadence

- **After every task:** `npx vitest run --reporter=verbose` (< 10 seconds)
- **After every plan wave:** `npx vitest run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green at 80%+ coverage

---

## CI Integration

### Status

No CI configuration exists yet. The project does not have a `.github/workflows/` directory.

### Recommended CI Commands (when CI is added)

```bash
# Lint
npx eslint src --ext .ts,.tsx

# Type check
npx tsc --noEmit

# Unit tests with coverage
npx vitest run --coverage

# Rust check (backend)
cargo check --manifest-path src-tauri/Cargo.toml
```

### Manual-Only Verification

Some behaviors require a real Tauri binary and cannot be automated in jsdom:

| Behavior | Why Manual | Instructions |
|----------|-----------|--------------|
| Settings persist across app restart | Requires real Tauri build + restart cycle | Build → launch → enter settings → close → relaunch |
| Connection test against real Backlog | Requires real API key + network | Enter valid credentials → click 接続テスト → verify success |

These are documented in `.planning/phases/01-foundation-connection-settings/01-VALIDATION.md` under **Manual-Only Verifications**.

---

## Wave 0 Checklist (Pre-Implementation)

Before writing any Phase 1 source code, these test infrastructure files must exist:

- [ ] `vitest.config.ts` — Vitest configuration with jsdom environment
- [ ] `tests/setup.ts` — Global setup with `@tauri-apps/plugin-http` and `@tauri-apps/plugin-store` mocks
- [ ] Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

These are Wave 0 dependencies — plans 01-01 and 01-02 reference them via `setupFiles`.
