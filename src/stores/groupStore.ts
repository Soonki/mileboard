import { create } from 'zustand';
import type { Group, GroupId, GroupMap } from '../types/group';
import type { BacklogIssue } from '../types/backlog';
import { loadGroupConfig, saveGroupConfig } from '../services/groupStorage';

interface GroupStoreState {
  groups: GroupMap;
  /**
   * 2 つの issue から新規グループを生成する（GRP-01, D-01, Q1）。
   * - 同一 issue を 2 回渡した場合は null を返す
   * - allIssues に存在しない id が含まれていれば null を返す
   * - 成功時は keyId 昇順の memberIds を持つ Group を groups に追加し、
   *   生成した GroupId を返す
   */
  createGroup: (
    issueIds: [number, number],
    laneId: string,
    allIssues: ReadonlyArray<BacklogIssue>,
  ) => GroupId | null;
  /**
   * 既存グループに 1 つメンバーを追加する。
   * - 既存メンバーの再追加は no-op
   * - 存在しないグループへの追加は no-op
   * - allIssues から keyId を取得して昇順位置に挿入
   */
  addMember: (
    groupId: GroupId,
    issueId: number,
    allIssues: ReadonlyArray<BacklogIssue>,
  ) => void;
  /**
   * グループから 1 つメンバーを除去する。
   * memberIds.length が 2 未満になった場合は自動 dissolveGroup（GRP-06）。
   */
  removeMember: (groupId: GroupId, issueId: number) => void;
  /** グループ自体を groups から削除する。 */
  dissolveGroup: (groupId: GroupId) => void;
  /** グループの所属レーンを変更する（バルク移動後に呼ぶ）。 */
  moveGroup: (groupId: GroupId, toLaneId: string) => void;
  /** plugin-store から GroupMap を復元する（D-11）。 */
  loadFromStorage: () => Promise<void>;
  /** テスト用：state を初期化する。 */
  reset: () => void;
}

/**
 * groupId を生成する。
 *
 * Q1（RESEARCH §Open Questions）対応:
 * `Date.now()` 単独だと「同一ミリ秒内に 2 グループ作成」のレアケースで衝突する。
 * 6 文字のランダムサフィックスを付けて衝突回避する（依存追加ゼロ）。
 */
export function generateGroupId(): GroupId {
  const random = Math.random().toString(36).slice(2, 8);
  return `group:${Date.now()}-${random}`;
}

/**
 * memberIds に issueId を keyId 昇順で挿入する純粋関数（D-04）。
 *
 * 戻り値の参照同一性で no-op を表現:
 *  - 既存に含まれていれば元の参照を返す
 *  - allIssues に対象が無ければ元の参照を返す
 * 呼び出し側はこれを `result === memberIds` で検出して set/save をスキップする。
 */
export function insertMemberSorted(
  memberIds: number[],
  issueId: number,
  allIssues: ReadonlyArray<BacklogIssue>,
): number[] {
  if (memberIds.includes(issueId)) return memberIds;
  const newIssue = allIssues.find((i) => i.id === issueId);
  if (!newIssue) return memberIds;

  const issueMap = new Map(allIssues.map((i) => [i.id, i]));
  const withNew = [...memberIds, issueId];
  return withNew.sort((a, b) => {
    const ka = issueMap.get(a)?.keyId ?? Infinity;
    const kb = issueMap.get(b)?.keyId ?? Infinity;
    return ka - kb;
  });
}

export const useGroupStore = create<GroupStoreState>()((set, get) => ({
  groups: {},

  createGroup: (issueIds, laneId, allIssues) => {
    const [a, b] = issueIds;
    if (a === b) return null;
    const issueA = allIssues.find((i) => i.id === a);
    const issueB = allIssues.find((i) => i.id === b);
    if (!issueA || !issueB) return null;

    const sortedIds = [a, b].sort((x, y) => {
      const kx = allIssues.find((i) => i.id === x)?.keyId ?? Infinity;
      const ky = allIssues.find((i) => i.id === y)?.keyId ?? Infinity;
      return kx - ky;
    });

    const id = generateGroupId();
    const group: Group = { id, memberIds: sortedIds, laneId };
    const newGroups: GroupMap = { ...get().groups, [id]: group };
    set({ groups: newGroups });
    saveGroupConfig(newGroups).catch(() => {});
    return id;
  },

  addMember: (groupId, issueId, allIssues) => {
    const current = get().groups[groupId];
    if (!current) return;
    const newMemberIds = insertMemberSorted(
      current.memberIds,
      issueId,
      allIssues,
    );
    if (newMemberIds === current.memberIds) return; // 既存 or 見つからず

    const newGroup: Group = { ...current, memberIds: newMemberIds };
    const newGroups: GroupMap = { ...get().groups, [groupId]: newGroup };
    set({ groups: newGroups });
    saveGroupConfig(newGroups).catch(() => {});
  },

  removeMember: (groupId, issueId) => {
    const current = get().groups[groupId];
    if (!current) return;
    const newMemberIds = current.memberIds.filter((m) => m !== issueId);
    if (newMemberIds.length < 2) {
      // GRP-06: メンバーが 1 人以下になったら自動解散
      get().dissolveGroup(groupId);
      return;
    }
    const newGroup: Group = { ...current, memberIds: newMemberIds };
    const newGroups: GroupMap = { ...get().groups, [groupId]: newGroup };
    set({ groups: newGroups });
    saveGroupConfig(newGroups).catch(() => {});
  },

  dissolveGroup: (groupId) => {
    const currentGroups = get().groups;
    if (!currentGroups[groupId]) return;
    const rest: GroupMap = {};
    for (const [id, group] of Object.entries(currentGroups) as Array<
      [GroupId, Group]
    >) {
      if (id !== groupId) rest[id] = group;
    }
    set({ groups: rest });
    saveGroupConfig(rest).catch(() => {});
  },

  moveGroup: (groupId, toLaneId) => {
    const current = get().groups[groupId];
    if (!current) return;
    const newGroup: Group = { ...current, laneId: toLaneId };
    const newGroups: GroupMap = { ...get().groups, [groupId]: newGroup };
    set({ groups: newGroups });
    saveGroupConfig(newGroups).catch(() => {});
  },

  loadFromStorage: async () => {
    const config = await loadGroupConfig();
    if (config) set({ groups: config });
  },

  reset: () => {
    set({ groups: {} });
  },
}));
