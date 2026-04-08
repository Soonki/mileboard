import { create } from 'zustand';
import { toast } from 'sonner';
import type { BoardData } from '../types/board';
import type { BacklogIssue } from '../types/backlog';
import { fetchBoardData, updateIssueMilestone } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';

type BoardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface BoardStoreState {
  status: BoardStatus;
  data: BoardData | null;
  error: string | null;
  isReloading: boolean;

  fetchBoard: () => Promise<void>;
  moveIssue: (issueId: number, fromLaneId: string, toLaneId: string) => void;
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

  reset: () => {
    set({ status: 'idle', data: null, error: null, isReloading: false });
  },
}));
