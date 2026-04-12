import type { BacklogIssue } from '../types/backlog';
import type { ReorderEntry } from '../types/reorder';

/**
 * カスタム並び順を適用する純粋関数。
 * - savedEntries が空の場合: keyId 昇順で返す（D-02）
 * - savedEntries にない issues は末尾に keyId 昇順で追加（D-04）
 * - savedEntries にあるが issues にない課題は除外（削除済み）
 * - `group:${id}` エントリは Wave 0 では skip（Wave 1 で GroupSlot 展開が追加される、D-15）
 * - 入力配列を変更しない（immutable）
 */
export function applyCustomOrder(
  issues: ReadonlyArray<BacklogIssue>,
  savedEntries: ReorderEntry[],
): BacklogIssue[] {
  if (savedEntries.length === 0) {
    return [...issues].sort((a, b) => a.keyId - b.keyId);
  }

  const issueMap = new Map(issues.map((i) => [i.id, i]));

  // number エントリのみを処理。group:${id} は Wave 1 で applyGroupExpansion が別途処理する
  const ordered = savedEntries.flatMap((entry) => {
    if (typeof entry === 'number') {
      const issue = issueMap.get(entry);
      return issue ? [issue] : [];
    }
    return []; // group:${id} はここではスキップ
  });

  // savedEntries に含まれない issues を keyId 昇順で末尾に追加
  const savedIdSet = new Set(
    savedEntries.filter((e): e is number => typeof e === 'number'),
  );
  const newIssues = [...issues]
    .filter((i) => !savedIdSet.has(i.id))
    .sort((a, b) => a.keyId - b.keyId);

  return [...ordered, ...newIssues];
}
