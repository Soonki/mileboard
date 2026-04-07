---
phase: 2
slug: backlog-data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Frontend)** | Vitest 4.1.x + RTL 16.x |
| **Framework (Rust)** | Built-in `#[test]` + `#[tokio::test]` |
| **Config file** | `vitest.config.ts` / `src-tauri/Cargo.toml` |
| **Quick run command** | `npx vitest run src/services/boardApi.test.ts` |
| **Full suite command** | `npx vitest run && cd src-tauri && cargo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run && cd src-tauri && cargo test`
- **After every plan wave:** Run full suite (both frameworks)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | SC-1 | T-02-01 | API key never logged | unit (Rust) | `cd src-tauri && cargo test -- test_milestone_filter` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | SC-2 | — | N/A | unit (Rust) | `cd src-tauri && cargo test -- test_pagination` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | SC-3 | — | N/A | unit (Rust) | `cd src-tauri && cargo test -- test_unassigned_filter` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | SC-4 | T-02-03 | Rate limit prevents 429 | unit (Rust) | `cd src-tauri && cargo test -- test_rate_limit` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | SC-1 | T-02-02 | Host URL validated | unit (TS) | `npx vitest run src/services/boardApi.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | — | — | N/A | unit (TS) | `npx vitest run src/services/tauriBridge.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/src/backlog/` — entire module tree is new, stubs needed
- [ ] `src/services/boardApi.test.ts` — tauriBridge board data tests
- [ ] `src/types/board.ts` — TypeScript type definitions for board data
- [ ] `tests/setup.ts` — needs `@tauri-apps/api/core` invoke mock addition
- [ ] `thiserror` + `chrono` dependencies in Cargo.toml

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limit header throttling under real API load | SC-4 | Requires actual Backlog API with real rate limits | 1. Configure valid connection 2. Fetch board with 100+ issues 3. Verify no 429 errors in Tauri console |
| Unassigned issues filter correctness | SC-3 | Backlog API has no "no milestone" param; workaround needs real data | 1. Create issues with/without milestones in Backlog 2. Verify unassigned lane shows only milestone-less, non-closed issues |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
