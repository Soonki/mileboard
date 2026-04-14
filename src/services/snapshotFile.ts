import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

/**
 * Snapshot output format. Drives both the file extension on disk and the
 * dialog filter shown to the user. The Backlog snapshot data itself is
 * format-agnostic — it is converted upstream by `snapshotBuilder`.
 */
export type SnapshotFormat = 'json' | 'markdown' | 'csv';

/**
 * Result of `saveSnapshot()`. A discriminated union — UI layer narrows on
 * `success` first, then on `reason` for the error subset.
 *
 * - `success: true` → user confirmed and `writeTextFile` succeeded
 * - `reason: 'cancelled'` → user dismissed the Save As dialog (silent in UI)
 * - `reason: 'error'` → either dialog or write threw (UI shows `toast.error`)
 */
export type SaveSnapshotResult =
  | { success: true; path: string }
  | { success: false; reason: 'cancelled' }
  | { success: false; reason: 'error'; error: string };

const EXTENSIONS: Record<SnapshotFormat, string> = {
  json: 'json',
  markdown: 'md',
  csv: 'csv',
};

const FILTER_LABEL = 'スナップショット';
const DIALOG_TITLE = 'スナップショットをエクスポート';
const DEFAULT_PROJECT_KEY = 'mileboard';

/**
 * Build a filesystem-safe default path for the Save As dialog.
 *
 * Template: `mileboard-snapshot-{projectKey}-{yyyy-MM-dd-HHmm}.{ext}`
 * - `projectKey` is sanitized: characters outside `[\w-]` become `_`
 *   (Path injection defense — see CONTEXT D-03 / threat T-10-06-01.)
 * - Empty `projectKey` falls back to `mileboard`.
 * - Timestamp uses local time (user expectation: filename matches wall clock).
 * - Returned value is a bare filename — Tauri's dialog uses it as the suggested
 *   name and defaults the directory to the OS-managed last-used location.
 *
 * @param projectKey - Backlog project key; may be empty or contain unsafe chars
 * @param format - Snapshot format dictating the file extension
 * @param now - Injection point for deterministic tests (defaults to `new Date()`)
 */
export function makeDefaultPath(
  projectKey: string,
  format: SnapshotFormat,
  now: Date = new Date(),
): string {
  const ext = EXTENSIONS[format];
  const safeKey = (projectKey || DEFAULT_PROJECT_KEY).replace(/[^\w-]/g, '_');
  const pad = (n: number): string => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `mileboard-snapshot-${safeKey}-${stamp}.${ext}`;
}

/**
 * Present a Save As dialog to the user, then write `content` to the chosen path.
 *
 * Flow: `dialog.save(...)` → if path is `null` (user cancelled) return early,
 * otherwise `writeTextFile(path, content)` and return success. Any throw from
 * either plugin call is caught and surfaced as `{success:false, reason:'error'}`.
 *
 * Pitfall 2 guard: cancellation is detected via `path === null` (not `!path`)
 * because Tauri v2 `dialog.save()` is documented as `Promise<string | null>`.
 *
 * The UI layer should:
 * - silent success (no toast) on `success: true`
 * - silent no-op on `reason: 'cancelled'`
 * - `toast.error('スナップショットの保存に失敗しました: ...')` on `reason: 'error'`
 *
 * @param content - Snapshot content (already formatted by `snapshotBuilder`)
 * @param format - Controls the file extension and filter label
 * @param projectKey - Used in the default filename (sanitized internally)
 */
export async function saveSnapshot(
  content: string,
  format: SnapshotFormat,
  projectKey: string,
): Promise<SaveSnapshotResult> {
  try {
    const path = await save({
      title: DIALOG_TITLE,
      defaultPath: makeDefaultPath(projectKey, format),
      filters: [
        {
          name: FILTER_LABEL,
          extensions: [EXTENSIONS[format]],
        },
      ],
    });

    if (path === null) {
      return { success: false, reason: 'cancelled' };
    }

    await writeTextFile(path, content);
    return { success: true, path };
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return { success: false, reason: 'error', error };
  }
}
