/**
 * レーン内の並び順エントリ。
 * - number: issueId（単体カード）
 * - `group:${string}`: groupId（グループスロット、Phase 9 D-15）
 */
export type ReorderEntry = number | `group:${string}`;

/** レーンIDから並び順エントリ配列へのマッピング。カスタム並び順を表す。 */
export type ReorderMap = Record<string, ReorderEntry[]>;

/** ReorderEntry がグループエントリかを判別する型ガード */
export function isGroupEntry(
  entry: ReorderEntry,
): entry is `group:${string}` {
  return typeof entry === 'string' && entry.startsWith('group:');
}
