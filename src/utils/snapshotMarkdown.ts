import type { ComposedView } from './viewComposer';
import type { TrimmedIssue } from './snapshotCommon';
import { trimIssue, groupSlotToSnapshot } from './snapshotCommon';
import { isGroupSlotItem } from '../types/group';
import { toIsoLocal } from './snapshotJson';
import type { FilterState } from '../types/filter';
import type { SortField, SortDirection } from '../types/sort';
import type { GroupMap } from '../types/group';
import type { UiMode } from '../stores/uiModeStore';

/**
 * D-11: human-readable Markdown snapshot 入力。
 * composeView の結果を呼び出し側で組み立てて渡すことで、JSON / CSV と同じ
 * view から異なる format を生成できることを保証する。
 */
export interface SnapshotMarkdownInput {
  composedView: ComposedView;
  boardRevision: number;
  filter: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  groups: GroupMap;
  uiMode: UiMode;
  projectKey: string;
  /** Injection point for deterministic tests. Default: `new Date()` */
  now?: Date;
}

/**
 * GFM table セル向けエスケープ。
 * - `\` を `\\` に変換 (最初に実行、後続のエスケープを壊さないため)
 * - `|` を `\|` に変換 (table 区切りと衝突するため)
 * - 改行 (`\r\n` / `\r` / `\n`) を `<br>` に変換 (行内で改行を許さないため)
 *
 * T-10-02-02 mitigation: 4 変換を順序付きで適用し、table 構造の破壊を防ぐ。
 */
export function mdTableEscape(field: string): string {
  return field
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r\n|\r|\n/g, '<br>');
}

/**
 * filter を人間可読な "N criteria" 形式に要約する。
 * D-11 の **View:** 行に埋め込まれる。
 */
function summarizeFilter(filter: FilterState): string {
  const count =
    filter.statusIds.size + filter.assigneeIds.size + filter.categoryIds.size;
  return `${count} criteria`;
}

/**
 * 1 行分の table row を生成する。全セルに mdTableEscape を適用する。
 */
function mdRow(cells: string[]): string {
  return '| ' + cells.map(mdTableEscape).join(' | ') + ' |';
}

/**
 * D-11: buildMarkdownSnapshot pure function。
 * H1 / metadata / H2 per lane / GFM table を生成する。
 *
 * 出力形状 (CONTEXT.md §D-11):
 * ```markdown
 * # mileboard snapshot
 *
 * **Project:** ACME
 * **Generated:** 2026-04-14T07:55:12+09:00
 * **View:** filter=3 criteria sort=dueDate asc mode=sort groups=2
 * **Revision:** 42
 *
 * ## 未割り当て (5 件, 2 件非表示)
 *
 * | Key | Summary | Status | Assignee | Priority | Due | Group |
 * | --- | --- | --- | --- | --- | --- | --- |
 * | ...
 * ```
 */
export function buildMarkdownSnapshot(input: SnapshotMarkdownInput): string {
  const now = input.now ?? new Date();
  const lines: string[] = [];

  // Header metadata
  lines.push('# mileboard snapshot');
  lines.push('');
  lines.push(`**Project:** ${input.projectKey}`);
  lines.push(`**Generated:** ${toIsoLocal(now)}`);
  const groupCount = Object.keys(input.groups).length;
  lines.push(
    `**View:** filter=${summarizeFilter(input.filter)} sort=${input.sortField} ${input.sortDirection} mode=${input.uiMode} groups=${groupCount}`,
  );
  lines.push(`**Revision:** ${input.boardRevision}`);
  lines.push('');

  // Build lane blocks: unassigned first, then milestone lanes in composer order.
  const laneBlocks: Array<{
    name: string;
    items: ComposedView['unassigned']['items'];
    hidden: number;
  }> = [
    {
      name: '未割り当て',
      items: input.composedView.unassigned.items,
      hidden: input.composedView.unassigned.hiddenCount,
    },
    ...input.composedView.milestones.map((lane) => ({
      name: lane.milestone.name,
      items: lane.items,
      hidden: lane.hiddenCount,
    })),
  ];

  for (const lane of laneBlocks) {
    // Count visible cards, expanding group slots into their member counts.
    let visible = 0;
    for (const item of lane.items) {
      if (isGroupSlotItem(item)) {
        visible += item.visibleMembers.length;
      } else {
        visible += 1;
      }
    }

    lines.push(`## ${lane.name} (${visible} 件, ${lane.hidden} 件非表示)`);
    lines.push('');
    lines.push(
      mdRow(['Key', 'Summary', 'Status', 'Assignee', 'Priority', 'Due', 'Group']),
    );
    lines.push(mdRow(['---', '---', '---', '---', '---', '---', '---']));

    for (const item of lane.items) {
      if (isGroupSlotItem(item)) {
        const snap = groupSlotToSnapshot(item);
        if ('kind' in snap && snap.kind === 'group') {
          const total = snap.members.length;
          snap.members.forEach((m: TrimmedIssue, i: number) => {
            const groupCell = `${snap.groupId} (${i + 1}/${total})`;
            lines.push(
              mdRow([
                m.issueKey,
                m.summary,
                m.status.name,
                m.assignee?.name ?? '',
                m.priority?.name ?? '',
                m.dueDate ?? '',
                groupCell,
              ]),
            );
          });
        }
      } else {
        const t = trimIssue(item);
        lines.push(
          mdRow([
            t.issueKey,
            t.summary,
            t.status.name,
            t.assignee?.name ?? '',
            t.priority?.name ?? '',
            t.dueDate ?? '',
            '-',
          ]),
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}
