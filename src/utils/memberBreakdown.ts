import type { BacklogIssue } from '../types/backlog';

export interface MemberCount {
  name: string;
  count: number;
}

/**
 * 課題配列からメンバー別の課題数を集計する。
 * - assignee別にカウントし、count降順でソート
 * - 未割当(assignee === null)は末尾に「未割当」ラベルで追加
 */
export function computeMemberBreakdown(issues: ReadonlyArray<BacklogIssue>): MemberCount[] {
  const counts = new Map<string, number>();
  let unassignedCount = 0;

  for (const issue of issues) {
    if (issue.assignee !== null) {
      const name = issue.assignee.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    } else {
      unassignedCount += 1;
    }
  }

  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (unassignedCount > 0) {
    sorted.push({ name: '未割当', count: unassignedCount });
  }

  return sorted;
}
