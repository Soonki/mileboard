import type { ComposedView } from './viewComposer';
import type { TrimmedIssue } from './snapshotCommon';
import { trimIssue, groupSlotToSnapshot } from './snapshotCommon';
import { isGroupSlotItem } from '../types/group';

/**
 * D-12: CSV snapshot 入力。CSV は view state を埋めず、issue を flat row に展開する形式。
 * lanes は一様に 1 つの table に flatten される (Excel / スプレッドシート優先)。
 */
export interface SnapshotCsvInput {
  composedView: ComposedView;
}

/**
 * UTF-8 BOM。日本語 Excel での mojibake を避けるため output の先頭に 1 回だけ付与する。
 * Pitfall 6 対策: 付与箇所をこの 1 定数に集約し、連結や二重 prefix を型レベルで防ぐ。
 */
export const CSV_BOM = '\uFEFF';

/** RFC 4180 準拠の行区切り。LF ではなく CRLF を使う。 */
const CSV_NEWLINE = '\r\n';

/**
 * RFC 4180 準拠の CSV セルエスケープ。
 *  - `,` / `"` / `\n` / `\r` のいずれかを含むセルは `"..."` で囲む
 *  - 内部の `"` は `""` (ダブル) にエスケープ
 *  - 日本語 (全角コンマ含む) はそのまま保持する
 *  - 空文字列はそのまま空文字を返す
 */
export function csvEscape(field: string): string {
  if (
    field.includes(',') ||
    field.includes('"') ||
    field.includes('\n') ||
    field.includes('\r')
  ) {
    const escaped = field.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return field;
}

/** 1 行分の CSV row を csvEscape で変換してカンマ結合する。 */
function csvRow(cells: string[]): string {
  return cells.map(csvEscape).join(',');
}

/**
 * TrimmedIssue を CSV 10 列の配列に変換する。
 * 列順 (D-12): lane,issueKey,summary,status,assignee,priority,dueDate,startDate,category,groupId
 */
function issueToRow(
  laneName: string,
  issue: TrimmedIssue,
  groupId: string,
): string[] {
  const categoryCell = issue.category.map((c) => c.name).join('; ');
  return [
    laneName,
    issue.issueKey,
    issue.summary,
    issue.status.name,
    issue.assignee?.name ?? '',
    issue.priority?.name ?? '',
    issue.dueDate ?? '',
    issue.startDate ?? '',
    categoryCell,
    groupId,
  ];
}

/**
 * D-12: CSV snapshot を 1 個の CSV 文字列として返す。
 * - 先頭 1 回だけ UTF-8 BOM (`\uFEFF`) を prefix
 * - 行区切りは CRLF (RFC 4180)
 * - lane 列は unassigned なら "未割り当て"、milestone lane なら milestone.name
 * - グループスロットはメンバーを順に展開し、各行の `groupId` 列に slot.group.id を書き込む
 */
export function buildCsvSnapshot(input: SnapshotCsvInput): string {
  const rows: string[][] = [];

  // Header row (10 columns — must match D-12 exactly).
  rows.push([
    'lane',
    'issueKey',
    'summary',
    'status',
    'assignee',
    'priority',
    'dueDate',
    'startDate',
    'category',
    'groupId',
  ]);

  // Unassigned lane
  for (const item of input.composedView.unassigned.items) {
    if (isGroupSlotItem(item)) {
      const snap = groupSlotToSnapshot(item);
      if ('kind' in snap && snap.kind === 'group') {
        for (const m of snap.members) {
          rows.push(issueToRow('未割り当て', m, snap.groupId));
        }
      }
    } else {
      rows.push(issueToRow('未割り当て', trimIssue(item), ''));
    }
  }

  // Milestone lanes
  for (const lane of input.composedView.milestones) {
    for (const item of lane.items) {
      if (isGroupSlotItem(item)) {
        const snap = groupSlotToSnapshot(item);
        if ('kind' in snap && snap.kind === 'group') {
          for (const m of snap.members) {
            rows.push(issueToRow(lane.milestone.name, m, snap.groupId));
          }
        }
      } else {
        rows.push(issueToRow(lane.milestone.name, trimIssue(item), ''));
      }
    }
  }

  const csvContent = rows.map(csvRow).join(CSV_NEWLINE);
  return CSV_BOM + csvContent;
}
