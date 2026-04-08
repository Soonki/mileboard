---
phase: 6
slug: filtering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/utils/filterUtils.test.ts src/stores/filterStore.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/utils/filterUtils.test.ts src/stores/filterStore.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | FILT-01 | — | N/A | unit | `npx vitest run src/types/filter.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | FILT-01 | — | N/A | unit | `npx vitest run src/utils/filterUtils.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | FILT-01 | — | N/A | unit | `npx vitest run src/stores/filterStore.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | FILT-02 | — | N/A | unit | `npx vitest run src/components/FilterDropdown/FilterDropdown.test.tsx` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | FILT-03 | — | N/A | unit | `npx vitest run src/components/FilterBar/FilterBar.test.tsx` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | FILT-04 | — | N/A | integration | `npx vitest run src/components/Board/Board.test.tsx` | ✅ | ⬜ pending |
| 06-03-02 | 03 | 3 | FILT-05 | — | N/A | integration | `npx vitest run src/components/Board/Board.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/filterUtils.test.ts` — stubs for FILT-01 (applyFilters, extractOptions)
- [ ] `src/stores/filterStore.test.ts` — stubs for FILT-01 (store toggle/clear actions)
- [ ] `src/components/FilterDropdown/FilterDropdown.test.tsx` — stubs for FILT-02
- [ ] `src/components/FilterBar/FilterBar.test.tsx` — stubs for FILT-03

*Existing infrastructure (vitest + RTL) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DnD works with filters active | FILT-05 | DnD interaction requires real pointer events | 1. Apply status filter 2. Drag card between lanes 3. Verify move completes 4. Verify card still visible if matches filter |
| FilterBar layout responsive | FILT-03 | Visual layout verification | 1. Resize window 2. Verify chips wrap correctly 3. Verify dropdowns don't overflow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
