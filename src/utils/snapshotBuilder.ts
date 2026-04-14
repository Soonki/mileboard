import { composeView } from './viewComposer';
import { buildJsonSnapshot } from './snapshotJson';
import { buildMarkdownSnapshot } from './snapshotMarkdown';
import { buildCsvSnapshot } from './snapshotCsv';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';
import type { SortField, SortDirection } from '../types/sort';
import type { ReorderMap } from '../types/reorder';
import type { GroupMap } from '../types/group';
import type { UiMode } from '../stores/uiModeStore';

/**
 * D-15 locked: snapshot format union。`buildSnapshot` の第 2 引数 + MCP
 * `get_snapshot({ format })` の共通契約として Plan 04 以降の consumers で再利用される。
 */
export type SnapshotFormat = 'json' | 'markdown' | 'csv';

/**
 * D-15 locked: snapshot builder の pure function 入力。stores に依存せず、
 * 呼び出し側 (Export ボタン / MCP `get_snapshot`) が各 store の state を集めて渡す。
 *
 * composeView は dispatcher 内部で 1 回だけ呼ばれ、その結果を JSON / Markdown / CSV
 * の全フォーマットで共有する (single source of truth)。
 */
export interface SnapshotInput {
  boardData: BoardData;
  boardRevision: number;
  filter: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  orderMap: ReorderMap;
  groups: GroupMap;
  uiMode: UiMode;
  milestonePrefix: string;
  projectKey: string;
  /** Injection point for deterministic tests. Default: `new Date()` */
  now?: Date;
}

/**
 * D-15 locked: snapshot dispatcher。指定 format に対応する pure renderer に
 * 入力を転送する。composeView は 1 回だけ呼び出され、全フォーマットで共有される。
 *
 * 不正な format は exhaustive `never` check で runtime Error を throw する。
 */
export function buildSnapshot(
  input: SnapshotInput,
  format: SnapshotFormat,
): string {
  // Single compose pass — shared across all formats.
  const composedView = composeView({
    boardData: input.boardData,
    filter: input.filter,
    sortField: input.sortField,
    sortDirection: input.sortDirection,
    orderMap: input.orderMap,
    groups: input.groups,
  });

  switch (format) {
    case 'json':
      return buildJsonSnapshot({
        boardData: input.boardData,
        composedView,
        boardRevision: input.boardRevision,
        filter: input.filter,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
        orderMap: input.orderMap,
        groups: input.groups,
        uiMode: input.uiMode,
        milestonePrefix: input.milestonePrefix,
        projectKey: input.projectKey,
        now: input.now,
      });
    case 'markdown':
      return buildMarkdownSnapshot({
        composedView,
        boardRevision: input.boardRevision,
        filter: input.filter,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
        groups: input.groups,
        uiMode: input.uiMode,
        projectKey: input.projectKey,
        now: input.now,
      });
    case 'csv':
      return buildCsvSnapshot({ composedView });
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown snapshot format: ${String(exhaustive)}`);
    }
  }
}

// Re-export shared types for consumers (Plan 04 Export button, Phase 12 MCP).
export type { SnapshotEnvelope, SnapshotLane } from './snapshotJson';
