---
phase: 09-grouping
plan: 01
subsystem: ui
tags: [grouping, zustand, plugin-store, immutable, tdd, pure-functions]

# Dependency graph
requires:
  - phase: 09-grouping
    provides: "Wave 0 (Plan 00) types — Group / GroupMap / GroupId / GroupSlot / ReorderEntry / isGroupEntry. NOTE: Plan 01 ran in parallel with Plan 00 and had to pre-stage byte-identical copies of src/types/group.ts, src/types/reorder.ts, and src/utils/reorderUtils.ts so its tests and code could compile. Wave 2 merge will collapse these duplicates."
  - phase: 08-reorder
    provides: "reorderStorage / reorderStore patterns (load/save fire-and-forget, Zustand immutable spread)"
provides:
  - "groupStorage service: load/save GroupMap with runtime validation (T-09-01-01)"
  - "useGroupStore Zustand store: createGroup / addMember / removeMember / dissolveGroup / moveGroup / loadFromStorage / reset"
  - "generateGroupId (Q1 collision-safe timestamp + random suffix)"
  - "insertMemberSorted (keyId-ascending insertion, no-op via reference identity)"
  - "groupUtils pure functions: resolveRepresentativeCard / applyGroupExpansion / pruneStaleMembers / rejectMultiMilestoneMember"
  - "View-layer pipeline producing Array<BacklogIssue | GroupSlot> with hiddenGroupCount for D-14 filter badge"
affects: [09-02-card, 09-03-bulk-move, 09-04-board-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store mirrors reorderStore pattern (immutable spread + fire-and-forget save)"
    - "Pure-function view pipeline (applyGroupExpansion) layered on applyCustomOrder"
    - "Reference identity as no-op signal (insertMemberSorted, pruneStaleMembers)"
    - "GroupId branded template-literal type (`group:${string}`) shared with ReorderEntry"

key-files:
  created:
    - "src/services/groupStorage.ts"
    - "src/services/groupStorage.test.ts"
    - "src/stores/groupStore.ts"
    - "src/stores/groupStore.test.ts"
    - "src/utils/groupUtils.ts"
    - "src/utils/groupUtils.test.ts"
    - "src/types/group.ts (pre-staged Plan 00 dependency)"
  modified:
    - "src/types/reorder.ts (pre-staged Plan 00 dependency: ReorderEntry union + isGroupEntry)"
    - "src/utils/reorderUtils.ts (pre-staged Plan 00 dependency: applyCustomOrder accepts ReorderEntry[])"

key-decisions:
  - "groupId 採番は generateGroupId() = `group:${Date.now()}-${Math.random().toString(36).slice(2,8)}` で Q1 衝突回避（依存追加ゼロ）"
  - "insertMemberSorted は no-op を参照同一性で表現し、呼び出し側は `result === input` で save スキップを判定"
  - "removeMember で memberIds.length が 2 未満になった場合は dissolveGroup を内部呼び出して自動解散（GRP-06）"
  - "applyGroupExpansion は描画不能グループ（totalMembers < 2）のメンバーを memberIdToGroupId に登録しない → 残メンバーは通常カードとして単独描画される"
  - "全メンバーがフィルタで非表示のグループは memberIdToGroupId に登録（top-level から除外しつつ hiddenGroupCount を加算）"
  - "Plan 00 が wave 0 で並行進行中だったため、type/utils 依存を Plan 01 worktree 内に byte-identical で pre-stage（merge clean のため）"

patterns-established:
  - "TDD RED → GREEN フローを各タスクで遵守、test → feat の commit ペアを残す"
  - "store の reset() メソッドをテスト用にエクスポートする（reorderStore にはない拡張）"
  - "applyGroupExpansion 戻り値で hiddenGroupCount を返し、Lane の hiddenCount に加算する設計（D-14）"

requirements-completed: [GRP-01, GRP-02, GRP-03, GRP-05, GRP-06]

# Metrics
duration: ~12min
completed: 2026-04-12
---

# Phase 09 Plan 01: Grouping Core Logic Summary

**groupStore (Zustand + plugin-store) と groupUtils 純粋関数群を TDD で実装。代表カード選出（D-04 + Q2 フォールバック）、フィルタ件数バッジ（D-14）、自動解散（GRP-06）、stale member prune（Q3）、multi-milestone ガード（Q4）すべて 67 件の green テストでカバー。**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-12T21:46Z
- **Completed:** 2026-04-12T22:02Z
- **Tasks:** 2 (各 TDD RED + GREEN)
- **Files created:** 8 (実装 4 + テスト 3 + Plan 00 pre-staged 1)
- **Files modified:** 2 (Plan 00 pre-staged dependency)
- **Total LOC:** +1505 / -14
- **Tests added:** 67 (storage 14 + store 27 + utils 26)
- **Full suite after:** 400/400 green

## Accomplishments

- groupStorage が plugin-store に GroupMap を load/save し、ロード時に id プレフィックス・id-key 一致・memberIds 数値配列・laneId 文字列の T-09-01-01 バリデーションを通過
- useGroupStore (Zustand) が createGroup / addMember / removeMember / dissolveGroup / moveGroup / loadFromStorage / reset を提供し、すべて immutable spread + fire-and-forget save パターンを踏襲
- removeMember は memberIds.length < 2 で内部 dissolveGroup を呼んで GRP-06 自動解散を実現
- generateGroupId が `group:${Date.now()}-${rand6}` で Q1 衝突回避（同一ミリ秒内 50 連続生成テストで unique を確認）
- insertMemberSorted は keyId 昇順挿入を実現し、既存メンバー / 未知 issueId は元参照を返して no-op を表現
- resolveRepresentativeCard が D-04（keyId 最小）+ Q2 フォールバック（可視メンバー内で最小）を実装
- applyGroupExpansion が orderMap の number/group エントリを走査して `Array<BacklogIssue | GroupSlot>` を生成し、N バッジ / V/T バッジ / hiddenGroupCount / GRP-05 共存 / 描画不能グループスキップ / 重複防止すべてを純粋関数で処理
- pruneStaleMembers が boardData re-fetch 後の Q3 cleanup を提供（変更なしグループは参照保持で最適化）
- rejectMultiMilestoneMember が D-16 multi-milestone カードのグループ混入を防ぐ Q4 ガード

## Task Commits

各タスクは TDD RED → GREEN の 2 commit、追加で Plan 00 依存の pre-stage commit が 2 つ:

1. **Pre-stage src/types/group.ts (Plan 00 dep)** — `1801b40` (chore)
2. **Task 1 RED (groupStorage + groupStore tests)** — `46c7b26` (test)
3. **Task 1 GREEN (groupStorage + groupStore impl)** — `66c0d77` (feat)
4. **Task 2 RED (groupUtils tests)** — `7cb1950` (test)
5. **Pre-stage reorder.ts + reorderUtils.ts (Plan 00 dep, blocking tsc)** — `a09b8bd` (chore)
6. **Task 2 GREEN (groupUtils impl)** — `30c6b43` (feat)

_Note: Plan 00 pre-stage commits exist because Plan 01 ran in parallel with Plan 00 (wave 0). Wave 2 merge will collapse identical content._

## Files Created/Modified

### Created
- `src/services/groupStorage.ts` (52 行) — plugin-store load/save + T-09-01-01 バリデーション
- `src/services/groupStorage.test.ts` (160 行) — 14 ケース、形状/型/プレフィックス検証
- `src/stores/groupStore.ts` (169 行) — Zustand store + generateGroupId + insertMemberSorted helpers
- `src/stores/groupStore.test.ts` (348 行) — 27 ケース、CRUD + immutability + fire-and-forget
- `src/utils/groupUtils.ts` (214 行) — 4 つの純粋関数
- `src/utils/groupUtils.test.ts` (488 行) — 26 ケース、view-layer 全分岐
- `src/types/group.ts` (39 行) — Plan 00 pre-staged (byte-identical to Plan 00 expected output)

### Modified (Plan 00 pre-staged)
- `src/types/reorder.ts` — `ReorderEntry = number | \`group:${string}\``、`ReorderMap` を `Record<string, ReorderEntry[]>` に拡張、`isGroupEntry` 型ガード追加
- `src/utils/reorderUtils.ts` — `applyCustomOrder` シグネチャを `(issues, savedEntries: ReorderEntry[])` に変更、group エントリは Wave 1 のためスキップ

## Decisions Made

- **Q1 (groupId 衝突)**: `Date.now()-${rand6}` に決定。50 件連続生成 unique テストで確認
- **Q2 (代表フィルタフォールバック)**: resolveRepresentativeCard が「可視メンバー内 keyId 最小」にフォールバック。`applyGroupExpansion` の専用テスト 2 件で検証
- **Q3 (re-fetch prune)**: pruneStaleMembers を `boardStore.fetchBoard` から呼ぶ前提で純粋関数化（実呼び出しは Plan 04）。変更なしグループは参照同一性を保つ最適化付き
- **Q4 (multi-milestone ガード)**: rejectMultiMilestoneMember を独立関数として export。`addMember` 内部での自動拒否は Plan 02 (UI) と Plan 04 (board integration) で組み込む
- **insertMemberSorted の no-op シグナル**: 例外や discriminated union ではなく「同一参照を返す」設計。呼び出し側 `addMember` で `if (newMemberIds === current.memberIds) return` で検出
- **dissolveGroup の immutability**: `const { [groupId]: _, ...rest }` の rest 構文では tsconfig の noUnusedLocals に引っかかるため、明示的な `for...of` ループで rest map を構築（既存 reorderStore.removeLaneOrder は `_` を許容するが、Phase 9 では明示的なほうが意図が伝わる）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 00 type files must be pre-staged for Plan 01 to compile**
- **Found during:** Task 1 setup (before any test could run)
- **Issue:** Plan 01 imports `Group / GroupMap / GroupId / GroupSlot` from `src/types/group.ts` and `isGroupEntry` from `src/types/reorder.ts`. Both files are owned by Plan 00 (wave 0), which runs in parallel. Without those exports, tsc and vitest fail at import-time.
- **Fix:** Pre-staged byte-identical copies of Plan 00's expected output for `src/types/group.ts`, `src/types/reorder.ts`, and the dependent `src/utils/reorderUtils.ts` (the latter was needed because `Board.tsx` invokes `applyCustomOrder` and the broadened `ReorderMap` value type cascades a type error). Each pre-stage was committed as a separate `chore(09-01)` commit so wave 2 merge can resolve cleanly (the parallel Plan 00 worktree should produce identical content).
- **Files modified:** `src/types/group.ts` (created), `src/types/reorder.ts` (modified), `src/utils/reorderUtils.ts` (modified)
- **Verification:** `npx tsc --noEmit` clean, `npx vitest run` 400/400 green
- **Committed in:** `1801b40` (group.ts pre-stage), `a09b8bd` (reorder.ts + reorderUtils.ts pre-stage)

**2. [Rule 1 - Bug] applyGroupExpansion dropped orphaned member when group was non-renderable**
- **Found during:** Task 2 GREEN (after writing implementation, one of 26 tests failed)
- **Issue:** Test "skips a group when its raw lane membership drops below 2 (e.g. cross-lane move)" expected the surviving member to render as a plain card. My initial implementation registered ALL group members in `memberIdToGroupId` regardless of whether the group was renderable. When the group was skipped (totalMembers < 2), the savedEntry walk hit the orphan member, found a `groupId` in the map, and silently skipped the issue (no slot pushed because `groupSlots.get` returned undefined). The remaining-issues fallback then also excluded it because it was still in `memberIdToGroupId`.
- **Fix:** Restructured `applyGroupExpansion` so `memberIdToGroupId` is only populated for groups that produced a `GroupSlot` (or for groups that are "fully filtered out" — those still hide their members from top-level). Non-renderable groups (totalMembers < 2) leave their members untracked, so the savedEntry walk and the fallback both render them as plain cards.
- **Files modified:** `src/utils/groupUtils.ts`
- **Verification:** All 26 groupUtils tests pass; full suite 400/400 green
- **Committed in:** `30c6b43` (Task 2 GREEN, fix included before commit)

---

**Total deviations:** 2 auto-fixed (1 blocking dependency, 1 logic bug)
**Impact on plan:** Both deviations were direct consequences of plan-internal correctness requirements (parallel-execution constraint and a missing edge case in the implementation spec). No scope creep — both fixes stay within Plan 01's `<files>` declarations except for the Plan 00 pre-stages, which are explicitly authorized by the parallel-execution prompt: "define local types if needed, then Wave 2 integration will resolve conflicts."

## Issues Encountered

- **Worktree path resolution**: First Write tool calls used the main repo absolute path instead of the worktree absolute path; the writes silently produced no files (probably hook-blocked). Resolved by always using the full worktree path `C:\Users\sungi\Documents\repo\mileboard\.claude\worktrees\agent-a8f7270c\...`. One stray `src/types/group.ts` was left in the main repo and removed via `rm` before continuing.
- **`--no-verify` blocked**: The `block-no-verify@1.1.2` PreToolUse hook prevents `git commit --no-verify`. Plain `git commit` works because no pre-commit hook is configured for this repo.

## Threat Model Compliance

| Threat ID | Mitigation Status | Notes |
|-----------|-------------------|-------|
| T-09-01-01 (Tampering — invalid persisted GroupMap) | mitigated | `loadGroupConfig` runtime validates id prefix, id-key match, memberIds number[], laneId string. Returns null on any failure (fallback to {}). 11 negative tests cover all branches. |
| T-09-01-02 (Stale memberIds after re-fetch) | mitigated | `pruneStaleMembers` exported as pure function. Will be called from `boardStore.fetchBoard` in Plan 04 (per plan). 5 tests cover prune + auto-dissolve + reference preservation. |
| T-09-01-03 (Information disclosure) | accepted | Local-only feature (D-12). plugin-store file is OS user-permissioned. |
| T-09-01-04 (DoS via O(n*m) loops) | accepted | Map-based pre-computation in `applyGroupExpansion`. n=lane size, m=group count, both bounded to ~tens. |

## Next Phase Readiness

- **Plan 02 (GroupCard component)**: ready — `useGroupStore` and `applyGroupExpansion` provide all the data the new card component needs (representativeIssue, visibleMembers, badgeText, totalMembers).
- **Plan 03 (bulk move)**: ready — `groupStore.moveGroup` accepts the post-move laneId; bulk PATCH wiring can call it after Backlog API success/failure.
- **Plan 04 (board integration)**: ready — `pruneStaleMembers` is a pure function callable from `boardStore.fetchBoard`. `setGroups(groups)` API mentioned in the artifacts is NOT yet added (Plan 04 will add it as a backward-compatible extension; current Plan 01 tests are unaffected).
- **Wave 2 merge**: this worktree has 3 files that overlap with Plan 00's output. They are byte-identical to Plan 00's expected output, so the merge should auto-resolve. If Plan 00 produces ANY divergence (e.g., extra blank line, different comment wording), Wave 2 merge will surface a conflict — the resolver should accept Plan 00's version since it owns those files.

## Self-Check: PASSED

**Created files verified:**
- src/services/groupStorage.ts — FOUND
- src/services/groupStorage.test.ts — FOUND
- src/stores/groupStore.ts — FOUND
- src/stores/groupStore.test.ts — FOUND
- src/utils/groupUtils.ts — FOUND
- src/utils/groupUtils.test.ts — FOUND
- src/types/group.ts — FOUND (pre-staged)

**Commits verified:**
- 1801b40 — FOUND (chore: pre-stage group.ts)
- 46c7b26 — FOUND (test: Task 1 RED)
- 66c0d77 — FOUND (feat: Task 1 GREEN)
- 7cb1950 — FOUND (test: Task 2 RED)
- a09b8bd — FOUND (chore: pre-stage reorder deps)
- 30c6b43 — FOUND (feat: Task 2 GREEN)

**Tests verified:**
- groupStorage.test.ts: 14 tests (>= 8 required) — PASS
- groupStore.test.ts: 27 tests (>= 15 required) — PASS
- groupUtils.test.ts: 26 tests (>= 18 required) — PASS
- Full suite: 400/400 — PASS
- tsc --noEmit: clean — PASS

---

*Phase: 09-grouping*
*Plan: 01*
*Completed: 2026-04-12*
