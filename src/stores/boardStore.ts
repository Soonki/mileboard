import { create } from 'zustand';
import { toast } from 'sonner';
import type { BoardData } from '../types/board';
import type { BacklogIssue } from '../types/backlog';
import type { GroupId } from '../types/group';
import { fetchBoardData, updateIssueMilestone } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';
import { useGroupStore } from './groupStore';
import { bulkMoveIssues } from '../utils/bulkMoveUtils';
import { pruneStaleMembers } from '../utils/groupUtils';

type BoardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface BoardStoreState {
  status: BoardStatus;
  data: BoardData | null;
  error: string | null;
  isReloading: boolean;

  fetchBoard: () => Promise<void>;
  moveIssue: (issueId: number, fromLaneId: string, toLaneId: string) => void;
  /**
   * グループの全メンバーを 1 つの toLane へ一括移動する（GRP-04, GRP-07）。
   *
   * - 楽観的更新: 全メンバーを即時 toLane へ移動（D-20）
   * - 進捗 toast: sonner.loading で N件を移動中... → M/N 完了... → success/error
   *   （D-18, 同一 toastId で in-place 更新）
   * - 部分失敗: 失敗メンバーのみ fromLane へ rollback + groupStore.removeMember
   *   で外す（D-19）
   * - 全失敗: 全メンバーを snapshot へ rollback + groupStore.moveGroup を逆方向
   *   で巻き戻し
   */
  bulkMoveGroup: (
    groupId: GroupId,
    fromLaneId: string,
    toLaneId: string,
  ) => Promise<void>;
  reset: () => void;
}

/**
 * Parse a laneId string to extract the milestone ID.
 * "unassigned" -> null, "milestone-42" -> 42
 */
export function parseMilestoneIdFromLaneId(laneId: string): number | null {
  if (laneId === 'unassigned') return null;
  const match = laneId.match(/^milestone-(\d+)$/);
  return match ? Number(match[1]) : null;
}

/**
 * Find an issue by ID across all lanes in BoardData.
 */
export function findIssueInBoardData(
  data: BoardData,
  issueId: number,
): BacklogIssue | null {
  const inUnassigned = data.unassignedIssues.find((i) => i.id === issueId);
  if (inUnassigned) return inUnassigned;
  for (const mwi of data.milestones) {
    const found = mwi.issues.find((i) => i.id === issueId);
    if (found) return found;
  }
  return null;
}

/**
 * Apply an optimistic move of an issue between lanes (immutable).
 * Removes the issue from fromLane and adds it to toLane.
 */
export function applyMoveIssue(
  data: BoardData,
  issueId: number,
  fromLaneId: string,
  toLaneId: string,
): BoardData {
  let movedIssue: BacklogIssue | null = null;

  // Remove from source lane
  const removeFromUnassigned = fromLaneId === 'unassigned';
  const newUnassigned = removeFromUnassigned
    ? data.unassignedIssues.filter((i) => {
        if (i.id === issueId) {
          movedIssue = i;
          return false;
        }
        return true;
      })
    : [...data.unassignedIssues];

  const newMilestones = data.milestones.map((mwi) => {
    const msLaneId = `milestone-${mwi.milestone.id}`;
    if (msLaneId === fromLaneId) {
      return {
        ...mwi,
        issues: mwi.issues.filter((i) => {
          if (i.id === issueId) {
            movedIssue = i;
            return false;
          }
          return true;
        }),
      };
    }
    return mwi;
  });

  if (!movedIssue) return data;

  // Add to target lane
  if (toLaneId === 'unassigned') {
    return {
      milestones: newMilestones,
      unassignedIssues: [...newUnassigned, movedIssue],
    };
  }

  return {
    milestones: newMilestones.map((mwi) => {
      const msLaneId = `milestone-${mwi.milestone.id}`;
      if (msLaneId === toLaneId) {
        return { ...mwi, issues: [...mwi.issues, movedIssue!] };
      }
      return mwi;
    }),
    unassignedIssues: newUnassigned,
  };
}

export const useBoardStore = create<BoardStoreState>()((set, get) => ({
  status: 'idle',
  data: null,
  error: null,
  isReloading: false,

  fetchBoard: async () => {
    const { settings } = useSettingsStore.getState();

    if (get().status === 'loaded') {
      set({ isReloading: true, error: null });
    } else {
      set({ status: 'loading', error: null, isReloading: false });
    }

    try {
      const data = await fetchBoardData(
        settings.hostUrl,
        settings.apiKey,
        settings.projectId!,
        settings.projectKey,
        settings.milestonePrefix,
      );
      set({ status: 'loaded', data, error: null, isReloading: false });

      // Phase 9 Plan 04 (Q3): pruneStaleMembers ハウスキーピング。
      // 直前の fetch 結果から消えた issue をグループから除去する。
      // pruneStaleMembers は変更がなければ同一参照を返すので、その場合は setGroups を呼ばない。
      const allIssues: BacklogIssue[] = [
        ...data.unassignedIssues,
        ...data.milestones.flatMap((m) => m.issues),
      ];
      const currentGroups = useGroupStore.getState().groups;
      const prunedGroups = pruneStaleMembers(currentGroups, allIssues);
      if (prunedGroups !== currentGroups) {
        useGroupStore.getState().setGroups(prunedGroups);
      }
    } catch (err: unknown) {
      const message =
        typeof err === 'string' ? err : 'データの取得に失敗しました';
      set({ status: 'error', data: null, error: message, isReloading: false });
    }
  },

  moveIssue: (issueId, fromLaneId, toLaneId) => {
    const snapshot = get().data;
    if (!snapshot) return;

    // 1. Find issue before optimistic update
    const issue = findIssueInBoardData(snapshot, issueId);
    if (!issue) return;

    // 2. Optimistic update (immutable)
    const updatedData = applyMoveIssue(snapshot, issueId, fromLaneId, toLaneId);
    set({ data: updatedData });

    // 3. API call params
    const newMilestoneId = parseMilestoneIdFromLaneId(toLaneId);
    const { settings } = useSettingsStore.getState();

    // 4. Async API call -- fire-and-forget with catch for rollback
    updateIssueMilestone(
      settings.hostUrl,
      settings.apiKey,
      issue.issueKey,
      newMilestoneId,
      settings.milestonePrefix,
    ).catch((error: unknown) => {
      // Rollback to snapshot
      set({ data: snapshot });
      const message =
        typeof error === 'string'
          ? `マイルストーンの変更に失敗しました: ${error}`
          : 'マイルストーンの変更に失敗しました';
      toast.error(message);
    });
  },

  bulkMoveGroup: async (groupId, fromLaneId, toLaneId) => {
    // 1. Snapshot guard
    const snapshot = get().data;
    if (!snapshot) return;

    // 2. Group guard
    const group = useGroupStore.getState().groups[groupId];
    if (!group) return;

    // 3. Resolve member issues from snapshot (filter out missing)
    const memberIssues = group.memberIds
      .map((id) => findIssueInBoardData(snapshot, id))
      .filter((i): i is BacklogIssue => i !== null);

    if (memberIssues.length === 0) return;

    // 4. Optimistic UI update -- move all members to toLane (D-20)
    let optimisticData: BoardData = snapshot;
    for (const issue of memberIssues) {
      optimisticData = applyMoveIssue(
        optimisticData,
        issue.id,
        fromLaneId,
        toLaneId,
      );
    }
    set({ data: optimisticData });

    // 5. groupStore laneId update (immediate, before API)
    useGroupStore.getState().moveGroup(groupId, toLaneId);

    // 6. Initial progress toast (D-18 wording)
    const toastId = toast.loading(`${memberIssues.length}件を移動中...`);

    const { settings } = useSettingsStore.getState();

    // 7. Bulk API call (Task 1 -- bulkMoveIssues handles 3-parallel + rate limit)
    const result = await bulkMoveIssues({
      members: memberIssues,
      toLaneId,
      hostUrl: settings.hostUrl,
      apiKey: settings.apiKey,
      milestonePrefix: settings.milestonePrefix,
      onProgress: (completed, total) => {
        // Skip the final 100% update -- success/error replaces the toast
        if (completed < total) {
          toast.loading(`${completed}/${total} 完了...`, { id: toastId });
        }
      },
    });

    // 8. Branch on result (D-18 / D-19)
    if (result.failed.length === 0) {
      // All success
      toast.success(`${result.succeeded.length}件を移動しました`, {
        id: toastId,
      });
      return;
    }

    if (result.succeeded.length === 0) {
      // All failure: full rollback to snapshot
      set({ data: snapshot });
      useGroupStore.getState().moveGroup(groupId, fromLaneId);
      toast.error('移動に失敗しました。再度お試しください', { id: toastId });
      return;
    }

    // Partial failure: rollback only failed members (D-19)
    let rollbackData = get().data;
    if (!rollbackData) return;
    for (const { issue } of result.failed) {
      rollbackData = applyMoveIssue(rollbackData, issue.id, toLaneId, fromLaneId);
    }
    set({ data: rollbackData });

    // Remove failed members from the group (they become standalone cards in fromLane)
    for (const { issue } of result.failed) {
      useGroupStore.getState().removeMember(groupId, issue.id);
    }

    // D-18: partial failure also uses toast.error (no toast.warning)
    toast.error(
      `${memberIssues.length}件中${result.failed.length}件の移動に失敗しました`,
      { id: toastId },
    );
  },

  reset: () => {
    set({ status: 'idle', data: null, error: null, isReloading: false });
  },
}));
