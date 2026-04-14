---
phase: 10
plan: 08
subsystem: integration
tags: [integration, keyboard-shortcut, board-header, ctrl-shift-e, snapshot, d-01, d-04, d-06]
requires:
  - Phase 10 CONTEXT D-01 (Export ボタン配置 — UI-SPEC で locked)
  - Phase 10 CONTEXT D-04 (Ctrl+Shift+E JSON 直保存 — locked)
  - Phase 10 CONTEXT D-06 (error-only toast, silent success / cancel)
  - Plan 10-02 (buildSnapshot dispatcher + SnapshotInput / SnapshotFormat)
  - Plan 10-03 (boardStore.revision monotonic counter)
  - Plan 10-04 (composeView refactor)
  - Plan 10-05 (tauri-plugin-dialog + tauri-plugin-fs 4-alias scope)
  - Plan 10-06 (saveSnapshot service + SaveSnapshotResult discriminated union)
  - Plan 10-07 (ExportButton self-contained component with dropdown + roving focus)
  - 10-UI-SPEC §Layout (Export position between ModeToggle and reloadButton)
  - 10-UI-SPEC §Keyboard shortcut Ctrl+Shift+E (silent no-op when disabled)
provides:
  - BoardHeader mount point for ExportButton
  - Board.tsx window-level keydown listener that invokes buildSnapshot → saveSnapshot
  - 8 integration tests for Ctrl+Shift+E shortcut behaviour
affects:
  - Phase 10 success criteria (all exit-gates for v1.2 Snapshot Foundation)
  - Human-verify checkpoint (Task 10-08-03 — Tauri end-to-end smoke test)
tech-stack:
  added: []
  patterns:
    - Window keydown handler via useEffect (parallel to existing Ctrl+Shift+M)
    - "*.getState() snapshot pattern for event handlers with empty deps array"
    - async keydown handler (window.addEventListener ignores Promise return)
    - discriminated-union result narrowing (success first, then reason === 'error')
    - vi.mock extension with Object.assign to add getState to hook-style selector mocks
key-files:
  created:
    - .planning/phases/10-snapshot-foundation/10-08-SUMMARY.md
  modified:
    - src/components/BoardHeader/BoardHeader.tsx
    - src/components/Board/Board.tsx
    - src/components/Board/Board.test.tsx
decisions:
  - Ctrl+Shift+E handler is a *separate* useEffect from Ctrl+Shift+M (T-10-08-02)
  - handler uses useBoardStore.getState() / useSettingsStore.getState() / etc. inside
    the listener (not React hook selectors) so deps === [] and it always reads the
    freshest state at keypress time
  - disabled semantics reuse ExportButton's (data === null || status === 'loading');
    isReloading === true stays enabled to match ExportButton (stale-view export allowed)
  - error toast uses the same "スナップショットの保存に失敗しました: {error}" template
    as ExportButton → identical UX regardless of entry path (menu vs shortcut)
  - test file extends settingsStore / filterStore / sortStore / uiModeStore mocks with
    getState() accessors — uiModeStore was previously not mocked at all (the real
    zustand store worked for hook calls), so Plan 08 was forced to add the mock to
    make the handler's getState() path testable under vi.mock
  - buildSnapshot and saveSnapshot are module-level vi.mock'd so the integration test
    asserts the dispatcher path and payload shape without running the real pure builder
  - test uses a local flushPromises() (two Promise.resolve ticks) rather than jest's
    flush pattern — jsdom doesn't need microtask runners and two ticks cover the
    `await saveSnapshot()` + the subsequent if-branch
metrics:
  duration: ~18m
  completed: 2026-04-14
requirements:
  - SNAP-01
  - SNAP-04
---

# Phase 10 Plan 08: Board Integration + Ctrl+Shift+E Summary

Phase 10 の最終統合 plan。Plan 07 で完成させた self-contained な `ExportButton`
を `BoardHeader` に取り付け、Plan 02 の `buildSnapshot` と Plan 06 の `saveSnapshot`
を Board.tsx の window-level keydown listener から直接呼び出す Ctrl+Shift+E ショート
カットを追加した。これにより Phase 10 の全 piece (Plan 01-07) が UI 導線で連結され、
v1.2 Snapshot Foundation の automation gate が全て green になる (human-verify
checkpoint 10-08-03 を残すのみ)。

## Task Commits

1. **Task 10-08-01:** `bb68f79` — `feat(10-08): insert ExportButton into BoardHeader (UI-SPEC layout)` — BoardHeader.tsx の actions div に `<ExportButton />` を `<ModeToggle />` と reloadButton の間に挿入 (2 行変更、import + JSX)
2. **Task 10-08-02:** `1b1c737` — `feat(10-08): add Ctrl+Shift+E useEffect for JSON direct save + integration tests` — Board.tsx に useEffect + Board.test.tsx に 8 integration test 追加 (379 insertions / 9 deletions)
3. **Task 10-08-03:** (human-verify checkpoint) — Tauri 実機で 14 項目の end-to-end 検証。この executor 経路では実行不可 (jsdom では plugin-dialog / plugin-fs の実 I/O が動かず、OS ネイティブ dialog と Tauri WebView 上のキーボード処理を jsdom はシミュレートできない)。

## Files Created/Modified

### Modified: `src/components/BoardHeader/BoardHeader.tsx` (+2 行, 40 → 42 行)

```diff
 import { useBoardStore } from '../../stores/boardStore';
 import { ModeToggle } from '../ModeToggle/ModeToggle';
+import { ExportButton } from '../ExportButton/ExportButton';
 import styles from './BoardHeader.module.css';
```

```diff
       <div className={styles.actions}>
         <ModeToggle />
+        <ExportButton />
         <button
           className={styles.reloadButton}
```

### Modified: `src/components/Board/Board.tsx` (+71 行, 688 → 749 行 — Ctrl+Shift+M は 12 行、新 useEffect は 65 行 + import 3 行)

- **Imports (L17, L32-33):**
  - `import { Toaster, toast } from 'sonner'` (以前は `Toaster` のみ)
  - `import { buildSnapshot } from '../../utils/snapshotBuilder'`
  - `import { saveSnapshot } from '../../services/snapshotFile'`
- **New `useEffect` (L550-615, empty deps):**
  - async window keydown listener
  - early-return unless `(ctrl || meta) + shift + (E || e)`
  - `e.preventDefault()`
  - disabled check via `useBoardStore.getState()` (silent no-op)
  - 7 stores の `.getState()` を使って snapshot input を組み立て (deps 空配列を維持)
  - `buildSnapshot(input, 'json')` → `saveSnapshot(content, 'json', projectKey)`
  - `!result.success && result.reason === 'error'` → `toast.error(...)`
  - cleanup で `removeEventListener('keydown', handler)`

### Modified: `src/components/Board/Board.test.tsx` (+308 行, 1043 → 1352 行)

- **New imports:** `fireEvent` from RTL, `toast` from sonner, `buildSnapshot` / `saveSnapshot` from mocked modules
- **Mock extensions:**
  - `useSettingsStore` → `Object.assign` で `getState()` 追加 (projectKey='MILEBOARD', milestonePrefix='Sprint' を含む)
  - `useFilterStore` → 同様に `getState()` 追加
  - `useSortStore` → 同様に `getState()` 追加
  - `useUiModeStore` → **新規** `vi.mock` (以前は未 mock、zustand real store が動いていた)
  - `../../utils/snapshotBuilder` → `buildSnapshot: vi.fn(() => 'mock-snapshot-content')`
  - `../../services/snapshotFile` → `saveSnapshot: vi.fn()`
- **New `describe('Ctrl+Shift+E shortcut')`**: 8 integration test

## Test Cases (8 new integration tests)

| # | 検証内容 |
|---|----------|
| 1 | Ctrl+Shift+E with loaded data → `saveSnapshot(content, 'json', 'MILEBOARD')` が 1 回呼ばれる + `buildSnapshot` が `boardData / boardRevision=3 / milestonePrefix / projectKey / uiMode` を含む input で呼ばれる |
| 2 | `data === null` → `saveSnapshot` も `buildSnapshot` も呼ばれない + `toast.error` も呼ばれない (silent no-op) |
| 3 | `status === 'loading'` → 同様に silent no-op |
| 4 | Cmd+Shift+E on Mac (`metaKey: true`) → 正しく発火 (Mac 互換性) |
| 5 | `key: 'e'` lowercase → 発火 (Research §Pitfall 8, `'E' || 'e'` の両チェック) |
| 6 | `saveSnapshot` が `{success:false, reason:'error', error:'Disk full'}` を返す → `toast.error` が `'スナップショットの保存に失敗しました'` と `'Disk full'` の両 substring を含む呼び出しで発火 |
| 7 | `saveSnapshot` が `{success:false, reason:'cancelled'}` → `toast.error` は未呼び出し (silent cancel, D-06) |
| 8 | `Ctrl+E` (shift なし) → 発火せず (shift gate 検証) |

## Verification

- `npx vitest run src/components/BoardHeader/` — **4/4 pass** (Task 10-08-01 後)
- `npx vitest run src/components/Board/Board.test.tsx` — **58/58 pass** (Task 10-08-02 後: 既存 50 + 新規 8)
- `npx vitest run` (full suite) — **50 files / 714 tests all pass**, 0 failures, 約 6.6s

### Acceptance criteria grep verification

Task 10-08-01 (BoardHeader):
- `src/components/BoardHeader/BoardHeader.tsx` に `import { ExportButton } from '../ExportButton/ExportButton'` — L3 ✓
- `<ExportButton />` — L22 ✓
- `<ModeToggle />` (L21) → `<ExportButton />` (L22) → `<button className={styles.reloadButton}` (L23) の line order ✓
- reloadButton / settingsButton 既存 JSX 破壊なし ✓
- `npx vitest run src/components/BoardHeader/` → exit 0 ✓

Task 10-08-02 (Board.tsx + Board.test.tsx):
- `Board.tsx` L559 に `e.key === 'E' || e.key === 'e'` (Pitfall 8) ✓
- `Board.tsx` L32 に `import { buildSnapshot } from '../../utils/snapshotBuilder'` ✓
- `Board.tsx` L33 に `import { saveSnapshot } from '../../services/snapshotFile'` ✓
- `Board.tsx` L602 に `toast.error(` ✓
- `Board.tsx` L543 に既存 `e.key === 'M' || e.key === 'm'` が残存 (Ctrl+Shift+M 並存) ✓
- Ctrl+Shift+E handler が `useBoardStore.getState()` を呼ぶ (L568) ✓
- Ctrl+Shift+E handler が `data === null` / `status === 'loading'` 両方を check (L569) ✓
- Ctrl+Shift+E handler が `buildSnapshot(..., 'json')` (L579 / L596) と `saveSnapshot(..., 'json', ...)` (L599) を呼ぶ ✓
- `Board.test.tsx` L1105 に `describe('Ctrl+Shift+E shortcut'` ✓
- test に `metaKey: true` (L1241) と `key: 'e'` lowercase (L1264) ✓
- `npx vitest run src/components/Board/Board.test.tsx` → exit 0 ✓
- `npx vitest run` → exit 0 ✓

## Deviations from Plan

### 環境セットアップ (Rule 3 - blocking)

worktree リセット後 `node_modules/` が空だったため `npm install` を実行 (129 packages)。Plan 06 / 07 と同じ環境 (vitest 4.1 / RTL 16 / sonner 2 / Tauri plugins 2.7/2.5) で RED → GREEN を進められた。

### Auto-fixed Issues

**1. [Rule 3 - blocking] `useUiModeStore` が Board.test.tsx で vi.mock されていない**

- **発見タイミング:** Ctrl+Shift+E handler の設計段階で grep 確認
- **Issue:** Board.tsx は `useUiModeStore((s) => s.mode)` を呼んでおり、既存テストでは zustand の real store が動作していた (jsdom 環境で問題なし)。しかし新 handler は `useUiModeStore.getState()` を呼ぶため、real store の getState API が動くかどうかは保証されず、また「test 専用の deterministic な `mode: 'sort'`」を返したかった。
- **Fix:** `Object.assign` pattern で mock 追加:
  ```typescript
  const mockUiModeState = { mode: 'sort' as const, toggleMode: vi.fn() };
  vi.mock('../../stores/uiModeStore', () => ({
    useUiModeStore: Object.assign(
      (selector) => selector(mockUiModeState),
      { getState: () => mockUiModeState },
    ),
  }));
  ```
  既存テストは `useUiModeStore((s) => s.mode)` を経由するだけで `mode === 'sort'` を読み取るため regression なし (既存 collision-detection factory テストでも `'sort'` / `'group'` を直接渡しているので影響ゼロ)。
- **Files modified:** `src/components/Board/Board.test.tsx`
- **Commit:** `1b1c737` (Task 10-08-02 GREEN コミットに統合)

**2. [Rule 2 - missing critical functionality] `useSettingsStore` / `useFilterStore` / `useSortStore` に `getState()` が無い**

- **発見タイミング:** 同上、handler 設計時の grep
- **Issue:** Plan は handler が `useSettingsStore.getState().settings` を呼ぶと書いているが、既存 mock は selector 形式だけで `getState` property を持たない。そのまま Ctrl+Shift+E test を走らせると `TypeError: useSettingsStore.getState is not a function`。
- **Fix:** 3 つの mock を `Object.assign((selector) => ..., { getState: () => ... })` pattern に昇格。既存 `useReorderStore` / `useGroupStore` / `useBoardStore` と同じ shape に統一されて一貫性も向上。
- **Files modified:** `src/components/Board/Board.test.tsx`
- **Commit:** `1b1c737`

### 補足 (軽微な追加)

- **Test 8 "Ctrl+E without shift"**: Plan の `<behavior>` には明記なかったが、shortcut の shift gate を明示的に検証するため 1 ケース追加した。これは Rule 1 の追加ではなく、threat T-10-08-01 (key combination bypass) の回帰防止として有効。既存の 7 ケースと合わせて 8 ケースに拡張。
- **`flushPromises` helper**: Plan では `await flushPromises()` を test 内で使っていたが外部定義は無かった。`Promise.resolve` 2 ticks の local helper として describe ブロック冒頭に追加 (`async function flushPromises()`)。async handler の `await saveSnapshot()` → `if` branch を完全に drain できる。
- **`mockStoreState` への `revision` フィールド追加**: Plan は `useBoardStore.setState(...)` を使っていたが、既存テスト infrastructure は `mockStoreState = { ... }` の reassignment を使うので、それに合わせた (`mockStoreState = { ...mockStoreState, status: 'loaded', data: loadedBoardData, revision: 3 }` のような形)。`useBoardStore.getState()` の mock が `mockStoreState` を spread するため `revision` は自動的に handler に流れる。

### Unrelated pre-existing diff (scoped out)

`src/utils/__snapshots__/snapshotJson.test.ts.snap` の LF/CRLF 差分 (Plan 10-02 の snapshot と worktree の改行正規化の不整合)。Plan 10-07 と同じく commit 対象から除外。`deferred-items.md` への記録も不要 (worktree 側の改行設定が main repo と異なるだけの再現的 warning)。

## Known Stubs

なし。Ctrl+Shift+E handler は完全実装で、全ての実 store と real services (モック境界の外) に繋がっている。ExportButton の handleExport と同じコードパスを共有する (snapshot input 組み立て → buildSnapshot → saveSnapshot → error branching)。

Plan 08 のスコープは「統合 + shortcut + test」までなので、**Task 10-08-03 human-verify** (実 Tauri runtime での 14 項目手動検証) はここでは実行しない。これは jsdom + Vitest では原理的にカバーできない領域:
- OS native Save As dialog (plugin-dialog は tests/setup.ts でグローバル mock されている)
- Unicode glyph rendering in Tauri WebView (↧ が tofu にならないかの実機確認)
- Excel での日本語 BOM 互換性 (CSV BOM 付き UTF-8)
- Tauri 2.10 WebView 上の実キーボード (jsdom の KeyboardEvent は DOM layer のみ)
- BoardHeader / DnD / filter / sort / group の実機 regression

## Threat Model Compliance

PLAN.md `<threat_model>` の 6 項目:

| Threat ID | Disposition | 対応状況 |
|-----------|-------------|----------|
| T-10-08-01 (Elevation: Ctrl+Shift+E が disabled 条件を bypass) | mitigate | ✓ handler 内で `boardState.data === null \|\| boardState.status === 'loading'` を明示 check、Test 2/3 で検証 |
| T-10-08-02 (Tampering: Ctrl+Shift+E と Ctrl+Shift+M が同 useEffect に混在して deps stale) | mitigate | ✓ 別 useEffect に分離、acceptance criteria で Ctrl+Shift+M useEffect 残存を確認、Ctrl+Shift+E は `deps: []` で getState() snapshot pattern |
| T-10-08-03 (DoS: Ctrl+Shift+E と ExportButton が同時に dialog を開く) | accept | OS modal が単一化、Plan 07 T-10-07-01 と同じ mitigation |
| T-10-08-04 (Tampering: Tauri WebView DevTools との競合) | mitigate | Ctrl+Shift+M がすでに同パターンで動作 (v1.1 実績、Research Q4)、最終確認は Task 10-08-03 human-verify |
| T-10-08-05 (Info Disclosure: 誤爆 snapshot) | accept | OS Save As dialog 経由のため明示的 "保存" 押下が必須、単独書き込み不可 |
| T-10-08-06 (Tampering: IME 経由 lowercase 'e' で発火しない) | mitigate | ✓ `e.key === 'E' || e.key === 'e'` 両チェック、Test 5 で lowercase 検証 |

全 mitigate 項目は本実装 (+ test) で対応済み。T-10-08-04 のみ human-verify checkpoint での最終確認待ち。

## Self-Check: PASSED

- ✓ `src/components/BoardHeader/BoardHeader.tsx` に `import { ExportButton }` + `<ExportButton />` 挿入済
- ✓ `src/components/Board/Board.tsx` に Ctrl+Shift+E useEffect 追加、既存 Ctrl+Shift+M は残存
- ✓ `src/components/Board/Board.test.tsx` に `describe('Ctrl+Shift+E shortcut')` + 8 tests
- ✓ Commit `bb68f79` (Task 10-08-01) exists in git log
- ✓ Commit `1b1c737` (Task 10-08-02) exists in git log
- ✓ `npx vitest run src/components/BoardHeader/` → 4/4 pass
- ✓ `npx vitest run src/components/Board/Board.test.tsx` → 58/58 pass (既存 50 + 新規 8)
- ✓ `npx vitest run` (full) → 50 files / 714 tests / 0 fail / 0 todo
- ✓ Worktree-internal writes only — main repo leak なし
- ✓ Plan 10-07 の ExportButton と Plan 10-06 の saveSnapshot の契約を守っている (既存 ExportButton tests 25/25 pass 維持)

## Next Phase Readiness

- **Task 10-08-03 (human-verify checkpoint):** `npm run tauri dev` で mileboard を起動し、`.planning/phases/10-snapshot-foundation/10-08-PLAN.md` の 14 項目の手動検証を実行:
  1. Export ボタンが ModeToggle と reload の間に表示
  2. `↧` アイコンが tofu にならず正しく描画 (tofu なら `⬇` U+2B07 にフォールバック)
  3. クリックで dropdown 開く (3 項目)
  4. JSON 保存: filename が `mileboard-snapshot-{projectKey}-{yyyy-MM-dd-HHmm}.json`、テキストエディタで `schemaVersion: "1.0"` / `snapshotAt` / `boardRevision` / `meta.viewState` / `lanes[]` を確認
  5. Markdown 保存: `.md`、`# mileboard snapshot` ヘッダ、GFM table で preview
  6. CSV 保存: `.csv`、Excel / Numbers で日本語 mojibake なし (BOM 付き UTF-8)、列順 `lane,issueKey,summary,status,assignee,priority,dueDate,startDate,category,groupId`
  7. `Ctrl+Shift+E` (Windows) / `Cmd+Shift+E` (Mac): dropdown 非表示で直接 Save As 起動 → JSON 書き出し
  8. Disabled 状態: data 無しで Export 無効、tooltip `データ読み込み後に利用できます` 表示、Ctrl+Shift+E が silent no-op
  9. Cancel 挙動: Save As で ESC → 何も起きない (toast 無し)
  10. Error toast: 書き込み不可 path で `スナップショットの保存に失敗しました: ...` (可能なら)
  11. BoardHeader 回帰: reload / settings ボタンが既存通り
  12. Board 機能回帰: DnD / filter / sort / group の全機能
- **Phase 10 exit gate:** human-verify 完了 + Phase 10 `ROADMAP.md` / `STATE.md` 更新 (執行者のスコープ外、親オーケストレータが担当)

---
*Phase: 10-snapshot-foundation*
*Completed (automation): 2026-04-14*
*Awaiting: human-verify checkpoint (Task 10-08-03)*
