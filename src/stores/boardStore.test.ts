import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import type { BoardData } from '../types/board';
import type { BacklogIssue, BacklogMilestone } from '../types/backlog';

vi.mock('../services/tauriBridge');
vi.mock('./settingsStore');

import {
  useBoardStore,
  parseMilestoneIdFromLaneId,
  findIssueInBoardData,
  applyMoveIssue,
} from './boardStore';
import { fetchBoardData, updateIssueMilestone } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';

const mockFetchBoardData = vi.mocked(fetchBoardData);
const mockUpdateIssueMilestone = vi.mocked(updateIssueMilestone);
const mockUseSettingsStore = vi.mocked(useSettingsStore);
const mockToastError = vi.mocked(toast.error);

// --- Test data factories ---

function makeMilestone(
  id: number,
  name: string,
  overrides?: Partial<BacklogMilestone>,
): BacklogMilestone {
  return {
    id,
    projectId: 1,
    name,
    description: null,
    startDate: '2026-04-01',
    releaseDueDate: '2026-04-30',
    archived: false,
    displayOrder: 0,
    ...overrides,
  };
}

function makeIssue(
  id: number,
  issueKey: string,
  overrides?: Partial<BacklogIssue>,
): BacklogIssue {
  return {
    id,
    projectId: 1,
    issueKey,
    keyId: id,
    summary: `Issue ${issueKey}`,
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '未対応',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: { id: 3, name: '中' },
    assignee: null,
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2026-04-01T00:00:00Z',
    updated: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeBoardData(): BoardData {
  return {
    milestones: [
      {
        milestone: makeMilestone(10, 'Sprint 2604'),
        issues: [makeIssue(100, 'TEST-1'), makeIssue(101, 'TEST-2')],
      },
      {
        milestone: makeMilestone(20, 'Sprint 2605'),
        issues: [makeIssue(200, 'TEST-3')],
      },
    ],
    unassignedIssues: [makeIssue(300, 'TEST-4'), makeIssue(301, 'TEST-5')],
  };
}

const mockBoardData: BoardData = {
  milestones: [
    {
      milestone: {
        id: 1,
        projectId: 1,
        name: 'Sprint 2504',
        description: '',
        startDate: '2025-04-01',
        releaseDueDate: '2025-04-30',
        archived: false,
        displayOrder: 0,
      },
      issues: [
        {
          id: 100,
          projectId: 1,
          issueKey: 'TEST-1',
          keyId: 1,
          summary: 'Test issue',
          description: null,
          status: {
            id: 1,
            projectId: 1,
            name: '未対応',
            color: '#ed8077',
            displayOrder: 1000,
          },
          priority: { id: 3, name: '中' },
          assignee: {
            id: 1,
            userId: 'user1',
            name: '山田太郎',
            roleType: 1,
            mailAddress: 'test@test.com',
          },
          milestone: [],
          category: [],
          startDate: null,
          dueDate: null,
          created: '2025-04-01T00:00:00Z',
          updated: '2025-04-01T00:00:00Z',
        },
      ],
    },
  ],
  unassignedIssues: [],
};

const mockSettings = {
  hostUrl: 'test.backlog.com',
  apiKey: 'test-key',
  projectId: 42,
  projectKey: 'TEST',
  milestonePrefix: 'Sprint',
};

describe('boardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({
      status: 'idle',
      data: null,
      error: null,
      isReloading: false,
    });
    vi.clearAllMocks();

    mockUseSettingsStore.getState.mockReturnValue({
      settings: mockSettings,
    } as ReturnType<typeof useSettingsStore.getState>);
  });

  // --- Existing fetchBoard tests ---

  it('initial state is idle with null data and error', () => {
    const state = useBoardStore.getState();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from idle sets loading then loaded with data', async () => {
    mockFetchBoardData.mockResolvedValue(mockBoardData);

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('loaded');
    expect(state.data).toEqual(mockBoardData);
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from idle with error sets error status', async () => {
    mockFetchBoardData.mockRejectedValue('APIエラー');

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('APIエラー');
    expect(state.data).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from loaded (reload) preserves loaded status and sets isReloading', async () => {
    const updatedBoardData: BoardData = {
      ...mockBoardData,
      unassignedIssues: [
        {
          id: 200,
          projectId: 1,
          issueKey: 'TEST-2',
          keyId: 2,
          summary: 'New unassigned',
          description: null,
          status: {
            id: 1,
            projectId: 1,
            name: '未対応',
            color: '#ed8077',
            displayOrder: 1000,
          },
          priority: { id: 3, name: '中' },
          assignee: null,
          milestone: [],
          category: [],
          startDate: null,
          dueDate: null,
          created: '2025-04-02T00:00:00Z',
          updated: '2025-04-02T00:00:00Z',
        },
      ],
    };

    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    mockFetchBoardData.mockResolvedValue(updatedBoardData);

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('loaded');
    expect(state.data).toEqual(updatedBoardData);
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from loaded with error transitions to error', async () => {
    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    mockFetchBoardData.mockRejectedValue('サーバーエラー');

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.isReloading).toBe(false);
    expect(state.data).toBeNull();
  });

  it('fetchBoard passes settings from settingsStore', async () => {
    mockFetchBoardData.mockResolvedValue(mockBoardData);

    await useBoardStore.getState().fetchBoard();

    expect(mockFetchBoardData).toHaveBeenCalledWith(
      'test.backlog.com',
      'test-key',
      42,
      'TEST',
      'Sprint',
    );
  });

  it('reset returns to idle state', () => {
    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    useBoardStore.getState().reset();

    const state = useBoardStore.getState();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('non-string error uses Japanese fallback message', async () => {
    mockFetchBoardData.mockRejectedValue(new Error('network'));

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('データの取得に失敗しました');
  });
});

// --- Helper function unit tests ---

describe('parseMilestoneIdFromLaneId', () => {
  it('returns null for "unassigned"', () => {
    expect(parseMilestoneIdFromLaneId('unassigned')).toBeNull();
  });

  it('returns milestone id for "milestone-42"', () => {
    expect(parseMilestoneIdFromLaneId('milestone-42')).toBe(42);
  });

  it('returns null for invalid format', () => {
    expect(parseMilestoneIdFromLaneId('invalid')).toBeNull();
    expect(parseMilestoneIdFromLaneId('milestone-')).toBeNull();
    expect(parseMilestoneIdFromLaneId('milestone-abc')).toBeNull();
  });

  it('parses large milestone IDs', () => {
    expect(parseMilestoneIdFromLaneId('milestone-999999')).toBe(999999);
  });
});

describe('findIssueInBoardData', () => {
  it('finds issue in unassigned lane', () => {
    const data = makeBoardData();
    const found = findIssueInBoardData(data, 300);
    expect(found).not.toBeNull();
    expect(found!.issueKey).toBe('TEST-4');
  });

  it('finds issue in milestone lane', () => {
    const data = makeBoardData();
    const found = findIssueInBoardData(data, 100);
    expect(found).not.toBeNull();
    expect(found!.issueKey).toBe('TEST-1');
  });

  it('finds issue in second milestone lane', () => {
    const data = makeBoardData();
    const found = findIssueInBoardData(data, 200);
    expect(found).not.toBeNull();
    expect(found!.issueKey).toBe('TEST-3');
  });

  it('returns null for non-existent issue', () => {
    const data = makeBoardData();
    expect(findIssueInBoardData(data, 999)).toBeNull();
  });
});

describe('applyMoveIssue', () => {
  it('moves issue between two milestone lanes', () => {
    const data = makeBoardData();
    const result = applyMoveIssue(data, 100, 'milestone-10', 'milestone-20');

    // Issue 100 removed from milestone-10
    const srcLane = result.milestones.find((m) => m.milestone.id === 10);
    expect(srcLane!.issues.find((i) => i.id === 100)).toBeUndefined();

    // Issue 100 added to milestone-20
    const dstLane = result.milestones.find((m) => m.milestone.id === 20);
    expect(dstLane!.issues.find((i) => i.id === 100)).toBeDefined();
  });

  it('moves issue from unassigned to milestone lane', () => {
    const data = makeBoardData();
    const result = applyMoveIssue(data, 300, 'unassigned', 'milestone-10');

    // Issue 300 removed from unassigned
    expect(result.unassignedIssues.find((i) => i.id === 300)).toBeUndefined();

    // Issue 300 added to milestone-10
    const dstLane = result.milestones.find((m) => m.milestone.id === 10);
    expect(dstLane!.issues.find((i) => i.id === 300)).toBeDefined();
  });

  it('moves issue from milestone lane to unassigned', () => {
    const data = makeBoardData();
    const result = applyMoveIssue(data, 100, 'milestone-10', 'unassigned');

    // Issue 100 removed from milestone-10
    const srcLane = result.milestones.find((m) => m.milestone.id === 10);
    expect(srcLane!.issues.find((i) => i.id === 100)).toBeUndefined();

    // Issue 100 added to unassigned
    expect(result.unassignedIssues.find((i) => i.id === 100)).toBeDefined();
  });

  it('returns original data when issue not found', () => {
    const data = makeBoardData();
    const result = applyMoveIssue(data, 999, 'milestone-10', 'milestone-20');
    expect(result).toBe(data);
  });

  it('does not mutate original data', () => {
    const data = makeBoardData();
    const originalIssueCount = data.milestones[0].issues.length;
    applyMoveIssue(data, 100, 'milestone-10', 'milestone-20');
    expect(data.milestones[0].issues.length).toBe(originalIssueCount);
  });
});

// --- moveIssue store action tests ---

describe('moveIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettingsStore.getState.mockReturnValue({
      settings: mockSettings,
    } as ReturnType<typeof useSettingsStore.getState>);
  });

  it('optimistically moves issue from source lane to target lane', () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockReturnValue(new Promise(() => {})); // never resolves

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'milestone-20');

    const state = useBoardStore.getState();
    const srcLane = state.data!.milestones.find((m) => m.milestone.id === 10);
    expect(srcLane!.issues.find((i) => i.id === 100)).toBeUndefined();
    const dstLane = state.data!.milestones.find((m) => m.milestone.id === 20);
    expect(dstLane!.issues.find((i) => i.id === 100)).toBeDefined();
  });

  it('rolls back to snapshot when API call rejects', async () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockRejectedValue('API error');

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'milestone-20');

    // Wait for the promise rejection to be handled
    await vi.waitFor(() => {
      const state = useBoardStore.getState();
      // After rollback, issue 100 should be back in milestone-10
      const srcLane = state.data!.milestones.find(
        (m) => m.milestone.id === 10,
      );
      expect(srcLane!.issues.find((i) => i.id === 100)).toBeDefined();
    });
  });

  it('calls toast.error with Japanese message on API failure', async () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockRejectedValue('サーバーエラー');

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'milestone-20');

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'マイルストーンの変更に失敗しました: サーバーエラー',
      );
    });
  });

  it('passes newMilestoneId=null when moving to unassigned', () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockResolvedValue(undefined);

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'unassigned');

    expect(mockUpdateIssueMilestone).toHaveBeenCalledWith(
      'test.backlog.com',
      'test-key',
      'TEST-1',
      null,
      'Sprint',
    );
  });

  it('passes correct milestoneId when moving from unassigned to milestone', () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockResolvedValue(undefined);

    useBoardStore.getState().moveIssue(300, 'unassigned', 'milestone-20');

    expect(mockUpdateIssueMilestone).toHaveBeenCalledWith(
      'test.backlog.com',
      'test-key',
      'TEST-4',
      20,
      'Sprint',
    );
  });

  it('does nothing when data is null', () => {
    useBoardStore.setState({ status: 'idle', data: null });

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'milestone-20');

    expect(mockUpdateIssueMilestone).not.toHaveBeenCalled();
  });

  it('does nothing when issue not found', () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });

    useBoardStore.getState().moveIssue(999, 'milestone-10', 'milestone-20');

    expect(mockUpdateIssueMilestone).not.toHaveBeenCalled();
  });

  it('uses fallback message for non-string error', async () => {
    const boardData = makeBoardData();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    mockUpdateIssueMilestone.mockRejectedValue(new Error('network'));

    useBoardStore.getState().moveIssue(100, 'milestone-10', 'milestone-20');

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        'マイルストーンの変更に失敗しました',
      );
    });
  });
});
