import type { BacklogIssue } from '../types/backlog';
import type { SortField, SortDirection } from '../types/sort';

/**
 * 課題リストをソート条件に従って並び替える純粋関数。
 * - field='none': keyId昇順
 * - field='assignee': assignee.nameのlocaleCompare('ja')でソート
 * - field='dueDate': dueDate文字列比較（ISO 8601）でソート
 * - null値は常に末尾に配置（direction無関係）
 * - null同士の二次ソートはkeyId昇順
 * - 入力配列は変更しない（immutable）
 */
export function applySortToIssues(
  issues: ReadonlyArray<BacklogIssue>,
  field: SortField,
  direction: SortDirection,
): BacklogIssue[] {
  if (field === 'none') {
    return [...issues].sort((a, b) => a.keyId - b.keyId);
  }

  if (field === 'assignee') {
    const withValue = issues.filter((i) => i.assignee !== null);
    const withNull = issues.filter((i) => i.assignee === null);

    const dirMultiplier = direction === 'desc' ? -1 : 1;
    const sortedWithValue = [...withValue].sort((a, b) => {
      const cmp = a.assignee!.name.localeCompare(b.assignee!.name, 'ja');
      return cmp * dirMultiplier;
    });
    const sortedWithNull = [...withNull].sort((a, b) => a.keyId - b.keyId);

    return [...sortedWithValue, ...sortedWithNull];
  }

  // field === 'dueDate'
  const withValue = issues.filter((i) => i.dueDate !== null);
  const withNull = issues.filter((i) => i.dueDate === null);

  const dirMultiplier = direction === 'desc' ? -1 : 1;
  const sortedWithValue = [...withValue].sort((a, b) => {
    const cmp = a.dueDate!.localeCompare(b.dueDate!);
    return cmp * dirMultiplier;
  });
  const sortedWithNull = [...withNull].sort((a, b) => a.keyId - b.keyId);

  return [...sortedWithValue, ...sortedWithNull];
}
