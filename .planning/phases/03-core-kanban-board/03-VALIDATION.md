---
phase: 3
slug: core-kanban-board
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.3 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.ts` (jsdom environment, tests/setup.ts) |
| **Quick run command** | `npx vitest run src/{target} -x` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/{changed} -x`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | BOARD-01 | — | N/A | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | BOARD-02 | — | N/A | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | BOARD-03 | — | N/A | unit | `npx vitest run src/components/IssueCard/IssueCard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | UX-01 | — | N/A | unit | `npx vitest run src/components/Board/Board.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-S-01 | 01 | 1 | STORE-01 | — | N/A | unit | `npx vitest run src/stores/boardStore.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-S-02 | 01 | 1 | STORE-02 | — | N/A | unit | `npx vitest run src/stores/boardStore.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-UI-01 | 02 | 2 | UI-HEADER | — | N/A | unit | `npx vitest run src/components/BoardHeader/BoardHeader.test.tsx -x` | ❌ W0 | ⬜ pending |
| 03-UI-02 | 02 | 2 | UI-ERROR | — | N/A | unit | `npx vitest run src/components/BoardError/BoardError.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/boardStore.test.ts` — boardStoreの状態遷移テスト
- [ ] `src/components/Board/Board.test.tsx` — Board状態分岐テスト（loading/loaded/error）
- [ ] `src/components/IssueCard/IssueCard.test.tsx` — カードフィールド表示テスト
- [ ] `src/components/BoardHeader/BoardHeader.test.tsx` — リロードボタンテスト
- [ ] `src/components/BoardError/BoardError.test.tsx` — エラー表示 + リトライテスト
- [ ] `src/components/Lane/Lane.test.tsx` — レーン描画テスト
- [ ] `src/components/StatusBadge/StatusBadge.test.tsx` — バッジ表示テスト
- [ ] `src/components/PriorityIndicator/PriorityIndicator.test.tsx` — 優先度マッピングテスト

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 横スクロールが8+レーンで正常動作 | BOARD-01 | レスポンシブレイアウトの実機確認 | Tauri devで8マイルストーン表示し横スクロール |
| スケルトンアニメーションが自然 | UX-01 | CSS animationの見た目確認 | ローディング中の表示を目視 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
