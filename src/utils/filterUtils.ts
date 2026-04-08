import type { BacklogIssue } from '../types/backlog';
import type { FilterState, FilterOption } from '../types/filter';

/**
 * フィルタ条件に一致する課題のみを返す。
 * - 空Setの軸はスキップ（全通過）
 * - 軸間はAND結合
 * - 同一軸内はOR結合
 */
export function applyFilters(
  issues: ReadonlyArray<BacklogIssue>,
  filters: FilterState,
): BacklogIssue[] {
  return issues.filter((issue) => {
    // Status: OR within axis
    if (filters.statusIds.size > 0 && !filters.statusIds.has(issue.status.id)) {
      return false;
    }
    // Assignee: OR within axis, null = unassigned (D-06)
    if (filters.assigneeIds.size > 0) {
      const assigneeId = issue.assignee?.id ?? null;
      if (!filters.assigneeIds.has(assigneeId)) return false;
    }
    // Category: OR within axis (issue has at least one matching category)
    if (filters.categoryIds.size > 0) {
      const hasMatch = issue.category.some((c) => filters.categoryIds.has(c.id));
      if (!hasMatch) return false;
    }
    return true;
  });
}

/**
 * 全issueからユニークなステータス一覧をdisplayOrder昇順で返す。
 * 該当issueが0件のステータスは含まれない (D-05)。
 */
export function extractStatusOptions(
  issues: ReadonlyArray<BacklogIssue>,
): FilterOption[] {
  const seen = new Map<number, { label: string; sortOrder: number }>();
  for (const issue of issues) {
    if (!seen.has(issue.status.id)) {
      seen.set(issue.status.id, {
        label: issue.status.name,
        sortOrder: issue.status.displayOrder,
      });
    }
  }
  return [...seen.entries()]
    .map(([id, { label, sortOrder }]) => ({ id, label, sortOrder }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 全issueからユニークな担当者一覧をname昇順で返す。
 * assignee === null のissueがあれば末尾に「未割り当て」(id=null)を追加 (D-06)。
 * 該当issueが0件の担当者は含まれない (D-05)。
 */
export function extractAssigneeOptions(
  issues: ReadonlyArray<BacklogIssue>,
): FilterOption[] {
  const seen = new Map<number, { label: string }>();
  let hasUnassigned = false;

  for (const issue of issues) {
    if (issue.assignee === null) {
      hasUnassigned = true;
    } else if (!seen.has(issue.assignee.id)) {
      seen.set(issue.assignee.id, { label: issue.assignee.name });
    }
  }

  const options: FilterOption[] = [...seen.entries()]
    .map(([id, { label }]) => ({ id, label, sortOrder: 0 }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'));

  if (hasUnassigned) {
    options.push({
      id: null,
      label: '未割り当て',
      sortOrder: Number.MAX_SAFE_INTEGER,
    });
  }

  return options;
}

/**
 * 全issueからユニークなカテゴリ一覧をdisplayOrder昇順で返す。
 * displayOrderがnullの場合は0として扱う。同一displayOrderならname昇順。
 * 該当issueが0件のカテゴリは含まれない (D-05)。
 */
export function extractCategoryOptions(
  issues: ReadonlyArray<BacklogIssue>,
): FilterOption[] {
  const seen = new Map<number, { label: string; sortOrder: number }>();

  for (const issue of issues) {
    for (const cat of issue.category) {
      if (!seen.has(cat.id)) {
        seen.set(cat.id, {
          label: cat.name,
          sortOrder: cat.displayOrder ?? 0,
        });
      }
    }
  }

  return [...seen.entries()]
    .map(([id, { label, sortOrder }]) => ({ id, label, sortOrder }))
    .sort((a, b) => {
      const orderDiff = a.sortOrder - b.sortOrder;
      if (orderDiff !== 0) return orderDiff;
      return a.label.localeCompare(b.label, 'ja');
    });
}
