import type { BacklogIssue } from '../types/backlog';

/**
 * カスタム並び順を適用する純粋関数。
 * - savedIds が空の場合: keyId 昇順で返す（D-02）
 * - savedIds にないが issues にある課題は末尾に keyId 昇順で追加（D-04）
 * - savedIds にあるが issues にない課題は除外（削除済み）
 * - 入力配列を変更しない（immutable）
 */
export function applyCustomOrder(
  issues: ReadonlyArray<BacklogIssue>,
  savedIds: number[],
): BacklogIssue[] {
  if (savedIds.length === 0) {
    return [...issues].sort((a, b) => a.keyId - b.keyId);
  }

  const issueMap = new Map(issues.map((i) => [i.id, i]));

  // savedIds 順に並べる（存在しないIDはスキップ）
  const ordered = savedIds.flatMap((id) => {
    const issue = issueMap.get(id);
    return issue ? [issue] : [];
  });

  // savedIds にない新規課題を keyId 昇順で末尾に追加
  const savedSet = new Set(savedIds);
  const newIssues = [...issues]
    .filter((i) => !savedSet.has(i.id))
    .sort((a, b) => a.keyId - b.keyId);

  return [...ordered, ...newIssues];
}
