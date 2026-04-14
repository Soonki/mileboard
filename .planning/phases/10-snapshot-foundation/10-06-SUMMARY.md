---
phase: 10
plan: 06
subsystem: services
tags: [tdd, plugin-dialog, plugin-fs, discriminated-union, d-06, snapshot]
requires:
  - Phase 10 CONTEXT D-06 (saveSnapshot service contract locked)
  - Plan 10-00 (snapshotFile.test.ts skeleton with 9 it.todo)
  - Plan 10-02 (SnapshotFormat type compatible)
  - Plan 10-05 (plugin-dialog + plugin-fs installed in 4 places)
provides:
  - src/services/snapshotFile.ts (saveSnapshot wrapper service)
  - SnapshotFormat type ('json' | 'markdown' | 'csv')
  - SaveSnapshotResult discriminated union (success | cancelled | error)
  - makeDefaultPath helper (filename template + path injection defense)
affects:
  - Plan 10-07 (ExportButton imports saveSnapshot for menu-driven export)
  - Plan 10-08 (Board.tsx Ctrl+Shift+E handler imports saveSnapshot for JSON direct save)
tech-stack:
  added: []
  patterns:
    - Discriminated union service result (CLAUDE.md service layer convention)
    - Pitfall 2 guard (path === null check, not !path)
    - Injectable Date for deterministic timestamp tests
    - Path sanitization at trust boundary (T-10-06-01 mitigation)
key-files:
  created:
    - src/services/snapshotFile.ts
  modified:
    - src/services/snapshotFile.test.ts
decisions:
  - Cancellation path returns {success:false, reason:'cancelled'} (NOT {success:true, data:null})
  - Filter label is fixed string 'スナップショット' for all 3 formats (per planner D-06)
  - Dialog title is 'スナップショットをエクスポート' (per planner D-06)
  - makeDefaultPath exposes a `now: Date = new Date()` parameter for test determinism
  - Empty projectKey falls back to 'mileboard' (not throw or empty filename)
  - Non-Error throws are stringified via String(e), never silently dropped
  - REFACTOR step skipped — implementation is already minimal (2 functions, 4 constants)
metrics:
  duration: ~6m
  completed: 2026-04-14
requirements:
  - SNAP-01
  - SNAP-04
---

# Phase 10 Plan 06: saveSnapshot Service Layer Summary

`@tauri-apps/plugin-dialog` の Save As ダイアログと `@tauri-apps/plugin-fs` の
`writeTextFile` を 1 つの discriminated-union API に集約するサービス層
`saveSnapshot` を TDD で実装した。Plan 07 (ExportButton) と Plan 08 (Ctrl+Shift+E)
の共通依存先となる単一の境界を確立した。

## Task Commits

1. **Task 10-06-01 RED:** `984654a` — `test(10-06): add failing tests for saveSnapshot service (RED)` — 9 it.todo を 22 個の実テストに昇格 (17 saveSnapshot + 5 makeDefaultPath)
2. **Task 10-06-01 GREEN:** `eeb3038` — `feat(10-06): implement saveSnapshot service (GREEN)` — `src/services/snapshotFile.ts` を新規作成、22/22 tests pass

REFACTOR は実装が既に最小 (関数 2 つ / 定数 4 つ / 型 2 つ) のため省略。

## Files Created/Modified

- **Created:** `src/services/snapshotFile.ts` — 110 行
  - `export type SnapshotFormat = 'json' | 'markdown' | 'csv'`
  - `export type SaveSnapshotResult` (3 ブランチ discriminated union)
  - `export function makeDefaultPath(projectKey, format, now?)` — filename template + sanitization
  - `export async function saveSnapshot(content, format, projectKey)` — dialog → write → result
- **Modified:** `src/services/snapshotFile.test.ts` — 14 行 → 263 行 (9 it.todo → 22 it)

## Verification

- `npx vitest run src/services/snapshotFile.test.ts` — **22/22 pass** (約 7ms)
- `npx vitest run` (full suite) — **49 files pass | 1 skipped, 681 pass | 19 todo (Plan 10-07/08 skeleton)**, 0 failures, 約 6.5s
- 受入基準 grep 検証:
  - `export async function saveSnapshot(` — line 82
  - `export type SnapshotFormat` — line 9
  - `export type SaveSnapshotResult` — line 19
  - `export function makeDefaultPath(` — line 49
  - `from '@tauri-apps/plugin-dialog'` — line 1
  - `from '@tauri-apps/plugin-fs'` — line 2
  - `'スナップショットをエクスポート'` — line 31
  - `'スナップショット'` (filter label) — line 30
  - `[^\w-]` regex (path sanitization) — line 55
  - `path === null` (Pitfall 2 guard) — line 99
  - `e instanceof Error` (error narrowing) — line 106
  - 17 個以上の `it(` ケース — 22 個 ✓
  - `mockResolvedValueOnce(null)` cancel test — lines 126, 134 ✓
  - `mockRejectedValueOnce(new Error('Disk full'))` test — line 159 ✓

## Test Cases (22 total)

### saveSnapshot (17 ケース)

| # | 検証内容 |
|---|----------|
| 1 | happy path: `{success:true, path}` 返却 + writeTextFile が path/content で呼ばれる |
| 2 | 呼び出し順序: `dialog.save → writeTextFile` (call order trace) |
| 3 | `dialog.save` options.title = `'スナップショットをエクスポート'` |
| 4 | json format で `defaultPath` が `mileboard-snapshot-MILEBOARD-yyyy-MM-dd-HHmm.json` 正規表現に match |
| 5 | markdown format で `defaultPath` 末尾 `.md` |
| 6 | csv format で `defaultPath` 末尾 `.csv` |
| 7 | json format で `filters = [{name:'スナップショット', extensions:['json']}]` |
| 8 | markdown format で extensions = `['md']` |
| 9 | csv format で extensions = `['csv']` |
| 10a | dialog.save が `null` を返したとき `{success:false, reason:'cancelled'}` |
| 10b | キャンセル時に `writeTextFile` が呼ばれない |
| 11 | `writeTextFile` が `Error` throw → `{success:false, reason:'error', error}` |
| 12 | `Error('Disk full')` → `result.error.includes('Disk full')` |
| 13 | non-Error 値 (`'string error'`) → `result.error === 'string error'` |
| 14 | `dialog.save` 自体が throw → 同じ error ブランチで catch、`writeTextFile` は呼ばれない |
| 15 | `'MY/PROJECT'` projectKey → `defaultPath` の該当部分が `MY_PROJECT` (path injection 防御) |
| 16 | 空 projectKey → `defaultPath` の該当部分が `mileboard` (フォールバック) |

### makeDefaultPath (5 ケース)

| # | 検証内容 |
|---|----------|
| 17 | injected `new Date(2026, 3, 14, 7, 55, 12)` → `mileboard-snapshot-MILEBOARD-2026-04-14-0755.json` |
| 17b | 単桁 month/day/hour/minute の zero-pad: Jan 5 03:07 → `2026-01-05-0307.md` |
| 17c | csv extension: Dec 31 23:59 → `mileboard-snapshot-PROJ-2026-12-31-2359.csv` |
| 17d | サニタイズ: `'MY/PROJ@2024'` → `MY_PROJ_2024` (`/` と `@` が `_` に置換、`-` と数字は保持) |
| 17e | 空 projectKey → `mileboard` フォールバック |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test fixture bug] Test 17b で `makeDefaultPath('KEY', 'md', ...)` は型エラー**

- **発見タイミング:** GREEN フェーズの初回テスト実行時 (1/22 fail)
- **Issue:** Plan 10-06-PLAN.md `<behavior>` の Test 17 仕様は `'md'` を makeDefaultPath の format 引数として渡していたが、これは `SnapshotFormat = 'json'|'markdown'|'csv'` には属さない。format 引数の意図は format 名であり、拡張子マッピングは内部の `EXTENSIONS` テーブル責務。
- **修正:** Test 17b の `makeDefaultPath('KEY', 'md', fixedNow)` を `makeDefaultPath('KEY', 'markdown', fixedNow)` に修正。期待値 `2026-01-05-0307.md` は不変 (内部の EXTENSIONS テーブルが正しくマッピング)。
- **Files modified:** `src/services/snapshotFile.test.ts:236`
- **Commit:** `eeb3038` (GREEN コミットに統合)

このバグは PLAN.md の test 仕様列挙の typo であり、CONTEXT D-06 と RESEARCH §"Full combined flow" の両方が `SnapshotFormat` だけを引数として想定している (両方とも `EXTENSIONS[format]` で拡張子を導出)。

### 環境セットアップ

worktree のリセット直後 `node_modules/` が空であったため、`npm install` を実行 (129 packages) してから RED → GREEN を進めた。`package-lock.json` と Plan 05 で導入した `@tauri-apps/plugin-dialog@2.7.0` / `@tauri-apps/plugin-fs@2.5.0` は正しくインストールされた。

## Known Stubs

なし — `saveSnapshot` の 3 ブランチすべて完全実装、ハードコード placeholder なし。Plan 07 / 08 の skeleton (it.todo 19 個) はこの Plan のスコープ外。

## Threat Model Compliance

PLAN.md `<threat_model>` の 5 つの STRIDE 項目:

| Threat ID | Disposition | 対応状況 |
|-----------|-------------|----------|
| T-10-06-01 (Tampering: projectKey path injection) | mitigate | ✓ `makeDefaultPath` で `[^\w-]` を `_` 置換、Test 15 + 17d で検証 |
| T-10-06-02 (Tampering: dialog.save 由来 path の scope 外) | accept | ✓ Plan 05 の 4 alias scope でカバー、scope 外は writeTextFile throw → error ブランチで catch (Test 11) |
| T-10-06-03 (Information Disclosure: stack trace 漏洩) | mitigate | ✓ `e instanceof Error ? e.message : String(e)` で message のみ、stack は捨てる |
| T-10-06-04 (DoS: 同名連打上書き) | accept | OS の Save As ダイアログが上書き確認を出す |
| T-10-06-05 (Repudiation: silent cancel 誤認) | mitigate | ✓ ネイティブダイアログの閉鎖が視覚 feedback (Plan 10-UI-SPEC で UI 層対応) |

すべての mitigate 項目は本実装で対応済み。

## Self-Check: PASSED

- ✓ `src/services/snapshotFile.ts` exists (110 行)
- ✓ `src/services/snapshotFile.test.ts` modified (263 行, 22 it())
- ✓ Commit `984654a` (RED) exists in git log
- ✓ Commit `eeb3038` (GREEN) exists in git log
- ✓ `npx vitest run src/services/snapshotFile.test.ts` → 22/22 pass
- ✓ `npx vitest run` (full) → 681 pass / 19 todo / 0 fail
- ✓ Worktree-internal writes only — no main repo leak

## Next Phase Readiness

- **Plan 10-07 (ExportButton):** `import { saveSnapshot, type SnapshotFormat } from '../../services/snapshotFile'` でメニュー駆動 export が即座に組める
- **Plan 10-08 (Ctrl+Shift+E handler):** Board.tsx で同じ import を使い JSON 直接保存
- **UI toast 判定パターン:** `if (result.success) { /* silent */ } else if (result.reason === 'error') { toast.error(...) }` — 2 行で済む

---
*Phase: 10-snapshot-foundation*
*Completed: 2026-04-14*
