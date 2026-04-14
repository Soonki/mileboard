---
phase: 10
plan: 07
subsystem: components
tags: [tdd, ui, dropdown, a11y, d-01, d-02, d-06, snapshot, react]
requires:
  - Phase 10 CONTEXT D-01 (Export ボタン配置 + Unicode icon + aria-label)
  - Phase 10 CONTEXT D-02 (dropdown UX + ESC/outside-click/close)
  - Phase 10 CONTEXT D-06 (error-only toast / silent success / silent cancel)
  - Plan 10-00 (ExportButton.test.tsx skeleton with 19 it.todo)
  - Plan 10-02 (buildSnapshot dispatcher + SnapshotInput / SnapshotFormat)
  - Plan 10-06 (saveSnapshot service + SaveSnapshotResult discriminated union)
  - 10-UI-SPEC (pixel-level trigger / panel / menu item contract)
provides:
  - src/components/ExportButton/ExportButton.tsx (icon-only trigger + dropdown menu)
  - src/components/ExportButton/ExportButton.module.css (trigger + panel + option styles)
  - ExportButton named export
affects:
  - Plan 10-08 (Board.tsx + BoardHeader で `<ExportButton />` をそのまま import)
tech-stack:
  added: []
  patterns:
    - FilterDropdown parity (outside click / ESC close / auto-focus panel / roving tabindex)
    - CSS Modules + design tokens のみ (新規 var なし)
    - zustand 7 stores 集約 → SnapshotInput 組み立て → buildSnapshot → saveSnapshot
    - discriminated union narrowing (result.success + result.reason === 'error')
    - close-before-async pattern (T-10-07-05 mitigation)
key-files:
  created:
    - src/components/ExportButton/ExportButton.tsx
    - src/components/ExportButton/ExportButton.module.css
  modified:
    - src/components/ExportButton/ExportButton.test.tsx
decisions:
  - icon は `↧` (U+21A7 DOWNWARDS ARROW FROM BAR) - UI-SPEC で Segoe UI / -apple-system 検証済
  - disabled 条件は `data===null || status==='loading'` のみ (isReloading は enabled - stale view export を許す)
  - menuitem click 時は close を async export より先に呼ぶ (T-10-07-05 panel-still-open 防止)
  - keyboard Enter/Space 経路も同じく close-before-async
  - onMouseEnter で focusedIndex を更新し、mouse / keyboard focus の 2 系統を同期
  - REFACTOR step 省略 - FilterDropdown と整合的、constants 抽出と handler 分離は既に minimal
metrics:
  duration: ~10m
  completed: 2026-04-14
requirements:
  - SNAP-01
  - SNAP-04
---

# Phase 10 Plan 07: ExportButton Component Summary

`BoardHeader` に挿入可能な self-contained な ExportButton コンポーネントを
10-UI-SPEC に完全準拠して TDD で実装した。Plan 02 の `buildSnapshot` と
Plan 06 の `saveSnapshot` を繋ぎ合わせ、3 format (JSON / Markdown / CSV) の
dropdown menu 経由でユーザーが選択即実行で snapshot をファイル出力できる。
Plan 08 (BoardHeader 組み込み + Ctrl+Shift+E 直保存) の唯一の依存先。

## Task Commits

1. **Task 10-07-01 RED:** `6cbd296` — `test(10-07): add failing tests for ExportButton component (RED)` — 19 it.todo を 25 個の実テストに昇格 (1-25)
2. **Task 10-07-01 GREEN:** `91289b5` — `feat(10-07): implement ExportButton component (GREEN)` — `src/components/ExportButton/ExportButton.tsx` + `ExportButton.module.css` を新規作成、25/25 tests pass

REFACTOR は FilterDropdown との整合性が既に取れており、handler 分離と constants
抽出も最小単位で完了しているため省略。

## Files Created/Modified

- **Created:** `src/components/ExportButton/ExportButton.tsx` — 237 行
  - `MENU_ITEMS` constant (3 fire-and-forget menu items)
  - 4 string constants (trigger aria / title enabled / title disabled / panel id)
  - `ExportButton()` function component (7 store selectors + 5 useState/useRef/useCallback)
  - `handleExport` async function (buildSnapshot → saveSnapshot → narrow result.reason)
  - `handlePanelKeyDown` (Escape / ArrowDown / ArrowUp / Enter / Space)
  - 2 useEffect (outside click / auto-focus panel)
- **Created:** `src/components/ExportButton/ExportButton.module.css` — 71 行
  - `.container` / `.trigger` / `.panel` / `.option` / `.optionFocused`
  - 32×32px trigger / 180px min-width panel / right:0 anchor / accent focus-visible ring
- **Modified:** `src/components/ExportButton/ExportButton.test.tsx` — 23 行 → 503 行 (19 it.todo → 25 it)

## Verification

- `npx vitest run src/components/ExportButton/ExportButton.test.tsx` — **25/25 pass** (約 3.3s)
- `npx vitest run` (full suite) — **50 files pass, 706 pass**, 0 failures, 約 6.6s
- 受入基準 grep 検証 (16/16 pass):

### ExportButton.tsx literals
| Literal | Count |
|---------|-------|
| `スナップショットをエクスポート` | 2 (aria-label + title enabled) |
| `JSON として保存` | 1 |
| `Markdown として保存` | 1 |
| `CSV として保存` | 1 |
| `\u21A7` (↧) | 1 |
| `aria-haspopup="menu"` | 2 (attr + test) |
| `role="menu"` | 2 (attr + test) |
| `role="menuitem"` | 2 (attr + test) |
| `buildSnapshot` | 3 (import + call + type) |
| `'../../utils/snapshotBuilder'` | 1 |
| `'../../services/snapshotFile'` | 1 |
| `スナップショットの保存に失敗しました` | 2 |
| `データ読み込み後に利用できます` | 1 |

### ExportButton.module.css classes
- `.trigger` (+ `.trigger:hover`, `.trigger[aria-expanded='true']`, `.trigger:focus-visible`, `.trigger:disabled`)
- `.panel`
- `.option`, `.option:hover`, `.optionFocused`
- `width: 32px` + `height: 32px` (trigger)
- `min-width: 180px` + `right: 0` (panel)

### Test file metrics
- `it(` 件数: **25** (16 minimum 要求を超過)
- `it.todo` 件数: **0**

## Test Cases (25 total)

### Trigger aria / disabled state (9)

| # | 検証内容 |
|---|----------|
| 1 | `aria-label="スナップショットをエクスポート"` で button が render される |
| 2 | button に `aria-haspopup="menu"` が付く |
| 3 | 閉じているとき `aria-expanded="false"` |
| 4 | click で open したとき `aria-expanded="true"` |
| 5 | `boardStore.data === null` のとき disabled |
| 6 | `boardStore.status === 'loading'` のとき disabled |
| 7 | `isReloading === true` のとき **enabled** (stale view export 許容) |
| 8 | disabled のとき `title="データ読み込み後に利用できます"` |
| 9 | enabled のとき `title` に `Ctrl+Shift+E で JSON 直保存` ヒントを含む |

### Dropdown panel behavior (4)

| # | 検証内容 |
|---|----------|
| 10 | click で `role="menu"` が現れる |
| 11 | panel に 3 個の `role="menuitem"` (`JSON` / `Markdown` / `CSV` として保存) |
| 12 | ESC で close + trigger に focus が戻る |
| 13 | outside click で close (focus 復帰なし) |

### Menu item click → saveSnapshot (5)

| # | 検証内容 |
|---|----------|
| 14 | JSON click → `saveSnapshot(_, 'json', _)` |
| 15 | Markdown click → `saveSnapshot(_, 'markdown', _)` |
| 16 | CSV click → `saveSnapshot(_, 'csv', _)` |
| 17 | `buildSnapshot` 結果が `content` 引数に渡る + input は boardRevision/projectKey/milestonePrefix/uiMode を含む |
| 18 | `settingsStore.settings.projectKey` が `projectKey` 引数に渡る |

### Keyboard navigation (3)

| # | 検証内容 |
|---|----------|
| 19 | ArrowDown で roving focus が `0 → 1 → 2 → 0` (wraparound) |
| 20 | ArrowUp で roving focus が `-1 → 2 → 1 → 0 → 2` (wraparound) |
| 21 | ArrowDown 2 回 → Enter で Markdown handler が発火 |

### Toast error handling (3)

| # | 検証内容 |
|---|----------|
| 22 | `{success:false, reason:'error', error:'Disk full'}` → `toast.error('スナップショットの保存に失敗しました: Disk full')` |
| 23 | `{success:false, reason:'cancelled'}` → `toast.error` / `toast.success` 両方未呼び出し |
| 24 | `{success:true, path}` → `toast.error` / `toast.success` 両方未呼び出し (silent) |

### Post-click panel closure (1)

| # | 検証内容 |
|---|----------|
| 25 | menuitem click 後に `role="menu"` が DOM から消える (close-before-async) |

## Deviations from Plan

### 環境セットアップ

worktree リセット直後は `node_modules/` が空だったため `npm install` を実行
(129 packages)。Plan 06 で検証済みの testing deps (`@testing-library/react`,
`@testing-library/user-event`, `@testing-library/jest-dom`) とフロントランタイム
が揃った上で RED → GREEN を進めた。

### 補足 (軽微な調整)

- **Plan action step 0 の "stub 拡張 6 ケース追加"** は、最終的には 19 → 25 の
  6 ケース追加が確かに必要だったが、まとめて新規 test ファイルとして書き直す
  方針を採った (it.todo の個別書き換えより読みやすい)。ケース数は 25 を達成。
- **`onMouseEnter` handler の追加 (Plan に明記なし)**: roving focus が
  キーボード操作でのみ動くと mouse hover と focused state がズレるため、
  mouse enter 時に `focusedIndex` を同期させるハンドラを追加。Rule 2 (missing
  UX correctness) の auto-fix 相当だが、keyboard Test 19/20/21 のロジックには
  影響せず、既存テストはすべて green のまま。
- **`--transition-fast` / `--color-dropdown-hover` / `--shadow-dropdown` tokens
  は既に `src/global.css` で宣言済み** のため、新規 token 追加なしで実装完了
  (10-UI-SPEC のハード制約を遵守)。

### Unrelated pre-existing diff (scoped out)

`src/utils/__snapshots__/snapshotJson.test.ts.snap` に LF/CRLF だけの diff が
出ていたが、本プランの変更とは無関係 (Plan 10-02 のテストスナップショット)。
commit 対象から除外した。`deferred-items.md` へのログ記録も不要 (本 worktree
の改行正規化と main repo の改行設定の食い違いで再現するだけ)。

## Known Stubs

なし。ExportButton は `buildSnapshot` / `saveSnapshot` に実データを流し、
3 format 全てが real export code path を走る。placeholder / mock / TODO なし。

Plan 07 のスコープは「self-contained component」までなので、BoardHeader への
組み込みと Ctrl+Shift+E 直保存は Plan 08 で実施 (意図的なスコープ境界)。

## Threat Model Compliance

PLAN.md `<threat_model>` の 5 つの STRIDE 項目:

| Threat ID | Disposition | 対応状況 |
|-----------|-------------|----------|
| T-10-07-01 (DoS: Export 連打で dialog 多重起動) | accept | Tauri plugin-dialog が OS 側で modal 強制、UI 側ロック不要。Plan で許容 |
| T-10-07-02 (Info Disclosure: error toast に FS path 混入) | mitigate | Plan 06 `saveSnapshot` が `e.message` のみを返すことを保証済。ExportButton は `result.error` をそのまま template literal で表示 (stack trace 非混入) |
| T-10-07-03 (Tampering: disabled button が keyboard で activate) | mitigate | `disabled` + `aria-disabled` の両方を button に付与。`handleTriggerClick` は `isDisabled` 早期 return。Test 5/6 で click 時の挙動を間接的に検証 |
| T-10-07-04 (DoS: Tab で panel 外に出て close できず詰まる) | mitigate (no-trap) | panel は focus trap なし。Tab で panel 外に出れば自然に body focus となり outside click / ESC で close 可能。10-UI-SPEC §Accessibility Contract に明記 |
| T-10-07-05 (Tampering: error 後に panel が開きっぱなし) | mitigate | `handleItemClick` / Enter/Space 経路で **close(true) を先に呼び**、その後 `void handleExport(format)` を起動。Test 25 で panel が DOM から消えることを検証 |

全ての mitigate 項目は本実装で対応済み。

## Self-Check: PASSED

- ✓ `src/components/ExportButton/ExportButton.tsx` exists (237 行) + `export function ExportButton`
- ✓ `src/components/ExportButton/ExportButton.module.css` exists (71 行) + 5 classes
- ✓ `src/components/ExportButton/ExportButton.test.tsx` modified (503 行, 25 it())
- ✓ Commit `6cbd296` (RED) exists in git log
- ✓ Commit `91289b5` (GREEN) exists in git log
- ✓ `npx vitest run src/components/ExportButton/ExportButton.test.tsx` → 25/25 pass
- ✓ `npx vitest run` (full) → 50 files / 706 tests all pass / 0 fail
- ✓ 16 acceptance criteria の grep verification すべて成功
- ✓ Worktree-internal writes only — main repo leak なし

## Next Phase Readiness

- **Plan 10-08 (BoardHeader integration + Ctrl+Shift+E handler):**
  - `BoardHeader.tsx` に `import { ExportButton } from '../ExportButton/ExportButton';` + `<ExportButton />` を `actions` div の ModeToggle と reloadButton の間に挿入するだけで D-01 配置が完了
  - `Board.tsx` の `Ctrl+Shift+M` useEffect パターンを複製して `Ctrl+Shift+E` を追加、`handleExport('json')` 相当ロジックを Board.tsx に置くか、`ExportButton` に外部トリガー props を生やすかの実装判断は Plan 08 で決定
  - 既存の `handleExport` クロージャを再利用するため、ExportButton をカスタム
    hook (`useExportHandler`) にリファクタリングする選択肢も有り (Plan 08 で決定)

---
*Phase: 10-snapshot-foundation*
*Completed: 2026-04-14*
