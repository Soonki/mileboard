---
phase: 1
slug: foundation-connection-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (Wave 0 — needs creation) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | CONN-01 | T-1-01 | API key never logged | unit | `npx vitest run src/services/backlogApi.test.ts -t "testConnection"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | CONN-01 | — | N/A | unit | `npx vitest run src/services/backlogApi.test.ts -t "fetchProjects"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | CONN-02 | T-1-04 | Store file in app data dir | unit | `npx vitest run src/services/settingsStorage.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | CONN-03 | — | N/A | unit | `npx vitest run src/services/settingsStorage.test.ts -t "milestonePrefix"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | CONN-01 | T-1-03 | React JSX auto-escapes API data | integration | `npx vitest run src/components/SettingsForm/SettingsForm.test.tsx` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 2 | CONN-02 | — | N/A | integration | `npx vitest run src/App.test.tsx -t "routing"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with jsdom environment
- [ ] `tests/setup.ts` — Global test setup with Tauri plugin mocks
- [ ] `src/services/backlogApi.test.ts` — Backlog API client tests (CONN-01)
- [ ] `src/services/settingsStorage.test.ts` — Storage wrapper tests (CONN-02, CONN-03)
- [ ] `src/components/SettingsForm/SettingsForm.test.tsx` — Form integration tests (CONN-01, CONN-03)
- [ ] `src/App.test.tsx` — App routing tests (CONN-02)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings persist across app restart | CONN-02 | Requires actual Tauri build + restart cycle | 1. Build with `npm run tauri build` 2. Launch app 3. Enter settings and save 4. Close app 5. Relaunch — settings should be pre-filled |
| Connection test against real Backlog instance | CONN-01 | Requires real API key and network | 1. Enter valid Backlog host URL 2. Enter valid API key 3. Click "接続テスト" 4. Verify success message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
