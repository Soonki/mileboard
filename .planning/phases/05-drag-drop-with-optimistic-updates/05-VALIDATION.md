---
phase: 5
slug: drag-drop-with-optimistic-updates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + React Testing Library 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/path` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/path`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | DND-01 | — | N/A | unit | `npx vitest run src/stores` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | DND-02 | — | N/A | unit | `npx vitest run src/stores` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | DND-01 | — | N/A | unit | `npx vitest run src/components` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | DND-03 | — | N/A | unit | `npx vitest run src/components` | ❌ W0 | ⬜ pending |
| 05-03-01 | 03 | 2 | UX-02 | — | N/A | unit | `npx vitest run src/components` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for DnD store actions (moveIssue, rollback)
- [ ] Test stubs for multi-milestone detection logic
- [ ] Vitest infrastructure already exists from Phase 1

*Existing infrastructure covers framework setup. New test files needed for DnD-specific logic.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Card visually lifts on drag with scale+shadow | DND-01 | CSS visual behavior | Drag a card and verify 1.05 scale + drop shadow |
| Drop target lane highlights on hover | DND-01 | CSS visual behavior | Drag over a lane and verify background color change |
| Card snaps back on API failure | DND-02 | Requires real API failure | Mock API error, verify card returns to original lane |
| Error toast appears on failure | UX-02 | Requires sonner integration | Trigger API error, verify toast at bottom-right |
| Multi-milestone ⚠ badge display | DND-03 | Visual badge + tooltip | Load issue with 2+ milestones, verify badge and hover tooltip |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
