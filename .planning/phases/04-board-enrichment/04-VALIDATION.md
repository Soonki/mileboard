---
phase: 4
slug: board-enrichment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + @testing-library/react 16.3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/components/StatusBadge src/components/IssueCard src/components/LaneHeader src/components/MemberBreakdown src/utils` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/components/StatusBadge src/components/IssueCard src/components/LaneHeader src/components/MemberBreakdown src/utils`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | BOARD-04 | T-04-01 | StatusBadge displays background color from API | unit | `npx vitest run src/components/StatusBadge/StatusBadge.test.tsx -x` | Exists (extend) | ⬜ pending |
| 04-01-02 | 01 | 1 | BOARD-04 | — | getContrastTextColor returns white/black correctly | unit | `npx vitest run src/utils/colorContrast.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | BOARD-05 | — | LaneHeader shows issue count next to name | unit | `npx vitest run src/components/LaneHeader/LaneHeader.test.tsx -x` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | BOARD-06 | — | LaneHeader toggles member breakdown display | unit | `npx vitest run src/components/LaneHeader/LaneHeader.test.tsx -x` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 1 | BOARD-06 | — | MemberBreakdown renders sorted member list | unit | `npx vitest run src/components/MemberBreakdown/MemberBreakdown.test.tsx -x` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 1 | BOARD-06 | — | computeMemberBreakdown aggregates correctly | unit | `npx vitest run src/utils/memberBreakdown.test.ts -x` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | UX-03 | T-04-01 | IssueCard click calls openUrl with correct URL | unit | `npx vitest run src/components/IssueCard/IssueCard.test.tsx -x` | Exists (extend) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/colorContrast.test.ts` — stubs for BOARD-04 luminance calculation
- [ ] `src/components/LaneHeader/LaneHeader.test.tsx` — stubs for BOARD-05, BOARD-06
- [ ] `src/components/MemberBreakdown/MemberBreakdown.test.tsx` — stubs for BOARD-06
- [ ] `src/utils/memberBreakdown.test.ts` — stubs for BOARD-06 aggregation
- [ ] `tests/setup.ts` — add `@tauri-apps/plugin-opener` mock

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ripple animation on card click | UX-03 | Visual CSS animation timing | Click card, verify ripple visually |
| Toggle expand/collapse animation | BOARD-06 | CSS transition smoothness | Click toggle, verify smooth animation |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
