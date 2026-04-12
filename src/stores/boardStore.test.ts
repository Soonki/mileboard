import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import type { BoardData } from '../types/board';
import type { BacklogIssue, BacklogMilestone } from '../types/backlog';
import type { Group, GroupId } from '../types/group';

vi.mock('../services/tauriBridge');
vi.mock('./settingsStore');
vi.mock('../utils/bulkMoveUtils', () => ({
  bulkMoveIssues: vi.fn(),
}));
vi.mock('./groupStore', () => {
  const mockMoveGroup = vi.fn();
  const mockRemoveMember = vi.fn();
  const mockGroups: Record<string, Group> = {};
  return {
    useGroupStore: {
      getState: () => ({
        groups: mockGroups,
        moveGroup: mockMoveGroup,
        removeMember: mockRemoveMember,
      }),
    },
    __mockGroups: mockGroups,
    __mockMoveGroup: mockMoveGroup,
    __mockRemoveMember: mockRemoveMember,
  };
});

import {
  useBoardStore,
  parseMilestoneIdFromLaneId,
  findIssueInBoardData,
  applyMoveIssue,
} from './boardStore';
import { fetchBoardData, updateIssueMilestone } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';
import { bulkMoveIssues } from '../utils/bulkMoveUtils';
import * as groupStoreModule from './groupStore';

const mockFetchBoardData = vi.mocked(fetchBoardData);
const mockUpdateIssueMilestone = vi.mocked(updateIssueMilestone);
const mockUseSettingsStore = vi.mocked(useSettingsStore);
const mockToastError = vi.mocked(toast.error);
const mockToastLoading = vi.mocked(toast.loading);
const mockToastSuccess = vi.mocked(toast.success);
const mockBulkMoveIssues = vi.mocked(bulkMoveIssues);

// Access internal mocks via the mocked module (they are exported alongside useGroupStore)
const mockedGroupModule = groupStoreModule as unknown as {
  __mockGroups: Record<string, Group>;
  __mockMoveGroup: ReturnType<typeof vi.fn>;
  __mockRemoveMember: ReturnType<typeof vi.fn>;
};
const mockGroups = mockedGroupModule.__mockGroups;
const mockMoveGroup = mockedGroupModule.__mockMoveGroup;
const mockRemoveMember = mockedGroupModule.__mockRemoveMember;

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

// --- bulkMoveGroup store action tests ---

/**
 * makeBoardDataForBulk:
 *   milestone-10: issues 100, 101, 102 (group members)
 *   milestone-20: empty
 *   unassigned: empty
 */
function makeBoardDataForBulk(): BoardData {
  return {
    milestones: [
      {
        milestone: makeMilestone(10, 'Sprint 2604'),
        issues: [
          makeIssue(100, 'TEST-100'),
          makeIssue(101, 'TEST-101'),
          makeIssue(102, 'TEST-102'),
        ],
      },
      {
        milestone: makeMilestone(20, 'Sprint 2605'),
        issues: [],
      },
    ],
    unassignedIssues: [],
  };
}

const TEST_GROUP_ID = 'group:test-1' as GroupId;

function setupGroup(memberIds: number[], laneId: string): Group {
  const group: Group = {
    id: TEST_GROUP_ID,
    memberIds,
    laneId,
  };
  // Replace the contents of the shared mockGroups object (preserves the
  // module-level reference that the mocked useGroupStore.getState closes over)
  for (const key of Object.keys(mockGroups)) delete mockGroups[key];
  mockGroups[TEST_GROUP_ID] = group;
  return group;
}

describe('bulkMoveGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettingsStore.getState.mockReturnValue({
      settings: mockSettings,
    } as ReturnType<typeof useSettingsStore.getState>);
    // Reset shared mock group registry
    for (const key of Object.keys(mockGroups)) delete mockGroups[key];
  });

  it('returns early when data is null', async () => {
    useBoardStore.setState({ status: 'idle', data: null });
    setupGroup([100, 101, 102], 'milestone-10');

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockBulkMoveIssues).not.toHaveBeenCalled();
    expect(mockToastLoading).not.toHaveBeenCalled();
  });

  it('returns early when group does not exist', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    // No groups registered

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockBulkMoveIssues).not.toHaveBeenCalled();
    expect(mockToastLoading).not.toHaveBeenCalled();
  });

  it('returns early when memberIssues is empty', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    // group references issues that don't exist in board data
    setupGroup([9001, 9002, 9003], 'milestone-10');

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockBulkMoveIssues).not.toHaveBeenCalled();
    expect(mockToastLoading).not.toHaveBeenCalled();
  });

  it('applies optimistic updates for all members to toLane', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    // bulkMoveIssues never resolves so we can inspect optimistic state
    mockBulkMoveIssues.mockReturnValue(new Promise(() => {}));

    void useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    // Allow microtasks to flush
    await Promise.resolve();

    const state = useBoardStore.getState();
    const srcLane = state.data!.milestones.find((m) => m.milestone.id === 10);
    const dstLane = state.data!.milestones.find((m) => m.milestone.id === 20);
    expect(srcLane!.issues).toHaveLength(0);
    expect(dstLane!.issues.map((i) => i.id).sort()).toEqual([100, 101, 102]);
  });

  it('calls useGroupStore.moveGroup(groupId, toLaneId) immediately after optimistic update', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockReturnValue(new Promise(() => {}));

    void useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    await Promise.resolve();

    expect(mockMoveGroup).toHaveBeenCalledWith(TEST_GROUP_ID, 'milestone-20');
  });

  it('calls toast.loading with initial N件を移動中... message', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [
        makeIssue(100, 'TEST-100'),
        makeIssue(101, 'TEST-101'),
        makeIssue(102, 'TEST-102'),
      ],
      failed: [],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockToastLoading).toHaveBeenCalledWith('3件を移動中...');
  });

  it('updates toast.loading with progress M/N 完了... (skipping completion)', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');

    // Capture and invoke the onProgress callback before resolving
    mockBulkMoveIssues.mockImplementation(async (params) => {
      params.onProgress?.(1, 3);
      params.onProgress?.(2, 3);
      params.onProgress?.(3, 3); // completion -- should NOT trigger loading update
      return {
        succeeded: [
          makeIssue(100, 'TEST-100'),
          makeIssue(101, 'TEST-101'),
          makeIssue(102, 'TEST-102'),
        ],
        failed: [],
      };
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    // Initial loading + 1/3 + 2/3 = 3 loading calls (NOT 4 — 3/3 must be skipped)
    expect(mockToastLoading).toHaveBeenCalledWith('3件を移動中...');
    expect(mockToastLoading).toHaveBeenCalledWith('1/3 完了...', {
      id: 'mock-toast-id',
    });
    expect(mockToastLoading).toHaveBeenCalledWith('2/3 完了...', {
      id: 'mock-toast-id',
    });
    expect(mockToastLoading).not.toHaveBeenCalledWith(
      '3/3 完了...',
      expect.anything(),
    );
  });

  it('shows toast.success on all success', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [
        makeIssue(100, 'TEST-100'),
        makeIssue(101, 'TEST-101'),
        makeIssue(102, 'TEST-102'),
      ],
      failed: [],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockToastSuccess).toHaveBeenCalledWith('3件を移動しました', {
      id: 'mock-toast-id',
    });
    // Optimistic state should remain (toLane)
    const state = useBoardStore.getState();
    const dstLane = state.data!.milestones.find((m) => m.milestone.id === 20);
    expect(dstLane!.issues).toHaveLength(3);
  });

  it('rolls back all and shows toast.error on all failure', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [],
      failed: [
        { issue: makeIssue(100, 'TEST-100'), error: new Error('e1') },
        { issue: makeIssue(101, 'TEST-101'), error: new Error('e2') },
        { issue: makeIssue(102, 'TEST-102'), error: new Error('e3') },
      ],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    // data restored to snapshot (all members back in milestone-10)
    const state = useBoardStore.getState();
    const srcLane = state.data!.milestones.find((m) => m.milestone.id === 10);
    const dstLane = state.data!.milestones.find((m) => m.milestone.id === 20);
    expect(srcLane!.issues.map((i) => i.id).sort()).toEqual([100, 101, 102]);
    expect(dstLane!.issues).toHaveLength(0);

    // group laneId reverted
    expect(mockMoveGroup).toHaveBeenCalledWith(TEST_GROUP_ID, 'milestone-20');
    expect(mockMoveGroup).toHaveBeenCalledWith(TEST_GROUP_ID, 'milestone-10');

    // error toast with id
    expect(mockToastError).toHaveBeenCalledWith(
      '移動に失敗しました。再度お試しください',
      { id: 'mock-toast-id' },
    );
  });

  it('rolls back only failed in partial failure (D-19)', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [makeIssue(100, 'TEST-100'), makeIssue(102, 'TEST-102')],
      failed: [{ issue: makeIssue(101, 'TEST-101'), error: new Error('e2') }],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    const state = useBoardStore.getState();
    const srcLane = state.data!.milestones.find((m) => m.milestone.id === 10);
    const dstLane = state.data!.milestones.find((m) => m.milestone.id === 20);

    // Failed member back in fromLane
    expect(srcLane!.issues.map((i) => i.id)).toEqual([101]);
    // Succeeded members stay in toLane
    expect(dstLane!.issues.map((i) => i.id).sort()).toEqual([100, 102]);

    // groupStore.removeMember called only for failed member
    expect(mockRemoveMember).toHaveBeenCalledTimes(1);
    expect(mockRemoveMember).toHaveBeenCalledWith(TEST_GROUP_ID, 101);
    expect(mockRemoveMember).not.toHaveBeenCalledWith(TEST_GROUP_ID, 100);
    expect(mockRemoveMember).not.toHaveBeenCalledWith(TEST_GROUP_ID, 102);
  });

  it('partial failure uses toast.error not toast.warning (D-18)', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [makeIssue(100, 'TEST-100'), makeIssue(102, 'TEST-102')],
      failed: [{ issue: makeIssue(101, 'TEST-101'), error: new Error('e2') }],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockToastError).toHaveBeenCalledWith(
      '3件中1件の移動に失敗しました',
      { id: 'mock-toast-id' },
    );
    // sonner mock doesn't expose warning at all (D-18 regression guard)
    expect((toast as unknown as { warning?: unknown }).warning).toBeUndefined();
  });

  it('passes correct settings and toLaneId to bulkMoveIssues', async () => {
    const boardData = makeBoardDataForBulk();
    useBoardStore.setState({ status: 'loaded', data: boardData });
    setupGroup([100, 101, 102], 'milestone-10');
    mockBulkMoveIssues.mockResolvedValue({
      succeeded: [
        makeIssue(100, 'TEST-100'),
        makeIssue(101, 'TEST-101'),
        makeIssue(102, 'TEST-102'),
      ],
      failed: [],
    });

    await useBoardStore
      .getState()
      .bulkMoveGroup(TEST_GROUP_ID, 'milestone-10', 'milestone-20');

    expect(mockBulkMoveIssues).toHaveBeenCalledTimes(1);
    const callArg = mockBulkMoveIssues.mock.calls[0][0];
    expect(callArg.toLaneId).toBe('milestone-20');
    expect(callArg.hostUrl).toBe('test.backlog.com');
    expect(callArg.apiKey).toBe('test-key');
    expect(callArg.milestonePrefix).toBe('Sprint');
    expect(callArg.members.map((i) => i.id)).toEqual([100, 101, 102]);
    expect(typeof callArg.onProgress).toBe('function');
  });
});
