import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import {
  Board,
  prioritiseCardOrGroupCollisions,
  filterOutCardOrGroupCollisions,
  buildKanbanCollisionDetection,
} from './Board';
import { buildSnapshot } from '../../utils/snapshotBuilder';
import { saveSnapshot } from '../../services/snapshotFile';
import type { BoardData } from '../../types/board';
import type { BacklogIssue } from '../../types/backlog';

const mockFetchBoard = vi.fn();
const mockMoveIssue = vi.fn();
const mockBulkMoveGroup = vi.fn().mockResolvedValue(undefined);

let mockStoreState: Record<string, unknown> = {};

interface MockFilterState {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;
}

let mockFilterState: MockFilterState = {
  statusIds: new Set(),
  assigneeIds: new Set(),
  categoryIds: new Set(),
};

vi.mock('../../stores/boardStore', () => ({
  useBoardStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector(mockStoreState),
    {
      getState: () => ({
        ...mockStoreState,
        bulkMoveGroup: mockBulkMoveGroup,
      }),
    },
  ),
  findIssueInBoardData: vi.fn(() => null),
}));

// Phase 10 Plan 08: settings は shortcut handler でも getState() 経由で参照されるため
// milestonePrefix 以外に projectKey も含めた shape を返す必要がある。
const mockSettingsState = {
  settings: {
    hostUrl: 'https://example.backlog.com',
    apiKey: 'test-key',
    projectKey: 'MILEBOARD',
    milestonePrefix: 'Sprint',
  },
};

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: (s: typeof mockSettingsState) => unknown) =>
      selector(mockSettingsState),
    {
      getState: () => mockSettingsState,
    },
  ),
}));

vi.mock('../../stores/filterStore', () => ({
  useFilterStore: Object.assign(
    (selector: (s: MockFilterState) => unknown) => selector(mockFilterState),
    {
      getState: () => mockFilterState,
    },
  ),
}));

const mockSortState: { field: string; direction: string; setField: ReturnType<typeof vi.fn>; toggleDirection: ReturnType<typeof vi.fn>; loadFromStorage: ReturnType<typeof vi.fn> } = {
  field: 'none',
  direction: 'asc',
  setField: vi.fn(),
  toggleDirection: vi.fn(),
  loadFromStorage: vi.fn(),
};

vi.mock('../../stores/sortStore', () => ({
  useSortStore: Object.assign(
    (selector: (s: typeof mockSortState) => unknown) => selector(mockSortState),
    {
      getState: () => mockSortState,
    },
  ),
}));

vi.mock('../../utils/sortUtils', () => ({
  applySortToIssues: vi.fn((issues: unknown[]) => issues),
}));

const mockReorderState = {
  orderMap: {} as Record<string, number[]>,
  reorder: vi.fn(),
  updateOnCrossLaneMove: vi.fn(),
  setLaneOrder: vi.fn(),
  removeLaneOrder: vi.fn(),
  loadFromStorage: vi.fn(),
};

vi.mock('../../stores/reorderStore', () => ({
  useReorderStore: Object.assign(
    (selector: (s: typeof mockReorderState) => unknown) =>
      selector(mockReorderState),
    {
      getState: () => mockReorderState,
    },
  ),
}));

vi.mock('../../utils/reorderUtils', () => ({
  applyCustomOrder: vi.fn((issues: unknown[]) => issues),
}));

// Phase 9: groupStore + groupUtils mocks
type CreateGroupFn = (
  ids: [number, number],
  laneId: string,
  allIssues: unknown,
) => `group:${string}` | null;
const mockGroupStoreState = {
  groups: {} as Record<string, unknown>,
  createGroup: vi.fn<CreateGroupFn>(() => null),
  addMember: vi.fn(),
  moveGroup: vi.fn(),
  removeMember: vi.fn(),
  setGroups: vi.fn(),
  loadFromStorage: vi.fn(),
};
vi.mock('../../stores/groupStore', () => ({
  useGroupStore: Object.assign(
    (selector: (s: typeof mockGroupStoreState) => unknown) =>
      selector(mockGroupStoreState),
    {
      getState: () => mockGroupStoreState,
    },
  ),
}));

vi.mock('../../utils/groupUtils', () => ({
  applyGroupExpansion: vi.fn(
    (filtered: unknown[]) => ({ items: filtered, hiddenGroupCount: 0 }),
  ),
  rejectMultiMilestoneMember: vi.fn(() => false),
  pruneStaleMembers: vi.fn((g: unknown) => g),
}));

// Phase 10 Plan 08: uiModeStore は shortcut handler で getState() 経由で参照される
const mockUiModeState = {
  mode: 'sort' as const,
  toggleMode: vi.fn(),
};

vi.mock('../../stores/uiModeStore', () => ({
  useUiModeStore: Object.assign(
    (selector: (s: typeof mockUiModeState) => unknown) => selector(mockUiModeState),
    {
      getState: () => mockUiModeState,
    },
  ),
}));

// Phase 10 Plan 08: buildSnapshot / saveSnapshot を mock (Ctrl+Shift+E 統合テストで使用)
vi.mock('../../utils/snapshotBuilder', () => ({
  buildSnapshot: vi.fn(() => 'mock-snapshot-content'),
}));

vi.mock('../../services/snapshotFile', () => ({
  saveSnapshot: vi.fn(),
}));

vi.mock('../Lane/Lane', () => ({
  Lane: ({
    name,
    laneId,
    items,
    hiddenCount,
  }: {
    name: string;
    laneId: string;
    items: unknown[];
    hiddenCount?: number;
  }) => (
    <div
      data-testid={`lane-${name}`}
      data-lane-id={laneId}
      data-issue-count={items.length}
      data-hidden-count={hiddenCount ?? 0}
    >
      {name}
    </div>
  ),
}));

vi.mock('../BoardSkeleton/BoardSkeleton', () => ({
  BoardSkeleton: () => <div data-testid="board-skeleton">skeleton</div>,
}));

vi.mock('../BoardError/BoardError', () => ({
  BoardError: ({ message }: { message: string }) => (
    <div data-testid="board-error">{message}</div>
  ),
}));

vi.mock('../DragOverlayCard/DragOverlayCard', () => ({
  DragOverlayCard: () => <div data-testid="drag-overlay-card" />,
}));

// Phase 9 Plan 04: GroupPopover mock — keeps Board tests focused on integration logic.
vi.mock('../GroupPopover/GroupPopover', () => ({
  GroupPopover: ({
    slot,
  }: {
    slot: { group: { id: string }; totalMembers: number };
  }) => (
    <div
      data-testid="group-popover"
      data-group-id={slot.group.id}
      data-total-members={slot.totalMembers}
    >
      popover
    </div>
  ),
}));

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
      issues: [],
    },
  ],
  unassignedIssues: [],
};

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      status: 'idle',
      data: null,
      error: null,
      fetchBoard: mockFetchBoard,
      moveIssue: mockMoveIssue,
    };
    mockFilterState = {
      statusIds: new Set(),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };
    mockSortState.field = 'none';
    mockSortState.direction = 'asc';
    mockReorderState.orderMap = {};
    mockReorderState.reorder.mockClear();
    mockReorderState.updateOnCrossLaneMove.mockClear();
    mockReorderState.setLaneOrder.mockClear();
  });

  it('renders skeleton when loading', () => {
    mockStoreState = { ...mockStoreState, status: 'loading' };
    render(<Board />);
    expect(screen.getByTestId('board-skeleton')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockStoreState = {
      ...mockStoreState,
      status: 'error',
      error: 'テストエラー',
    };
    render(<Board />);
    expect(screen.getByTestId('board-error')).toBeInTheDocument();
    expect(screen.getByText('テストエラー')).toBeInTheDocument();
  });

  it('renders lanes when loaded', () => {
    mockStoreState = {
      ...mockStoreState,
      status: 'loaded',
      data: mockBoardData,
    };
    render(<Board />);
    expect(screen.getByTestId('lane-未割り当て')).toBeInTheDocument();
    expect(screen.getByTestId('lane-Sprint 2504')).toBeInTheDocument();
  });

  it('triggers fetchBoard on mount', () => {
    render(<Board />);
    expect(mockFetchBoard).toHaveBeenCalledTimes(1);
  });

  it('passes laneId="unassigned" to unassigned lane', () => {
    mockStoreState = {
      ...mockStoreState,
      status: 'loaded',
      data: mockBoardData,
    };
    render(<Board />);
    const unassignedLane = screen.getByTestId('lane-未割り当て');
    expect(unassignedLane).toHaveAttribute('data-lane-id', 'unassigned');
  });

  it('passes laneId with milestone id to milestone lanes', () => {
    mockStoreState = {
      ...mockStoreState,
      status: 'loaded',
      data: mockBoardData,
    };
    render(<Board />);
    const msLane = screen.getByTestId('lane-Sprint 2504');
    expect(msLane).toHaveAttribute('data-lane-id', 'milestone-1');
  });

  it('renders board with aria-label when loaded', () => {
    mockStoreState = {
      ...mockStoreState,
      status: 'loaded',
      data: mockBoardData,
    };
    render(<Board />);
    expect(
      screen.getByRole('region', { name: 'カンバンボード' }),
    ).toBeInTheDocument();
  });

  describe('filter integration (D-09 compliance)', () => {
    const issueInMilestone: BacklogIssue = {
      id: 100,
      projectId: 1,
      issueKey: 'TEST-100',
      keyId: 100,
      summary: 'Issue in milestone',
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
      created: '2025-04-01T00:00:00Z',
      updated: '2025-04-01T00:00:00Z',
    };

    const boardDataWithIssue: BoardData = {
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
          issues: [issueInMilestone],
        },
      ],
      unassignedIssues: [],
    };

    it('passes hiddenCount=1 to Lane when status filter matches nothing', () => {
      // Filter for a status id that does not exist in the issue
      mockFilterState = {
        statusIds: new Set([999]),
        assigneeIds: new Set(),
        categoryIds: new Set(),
      };
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: boardDataWithIssue,
      };
      render(<Board />);
      const lane = screen.getByTestId('lane-Sprint 2504');
      expect(lane).toHaveAttribute('data-hidden-count', '1');
      expect(lane).toHaveAttribute('data-issue-count', '0');
    });

    it('passes hiddenCount=0 to Lane when no filters are active', () => {
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: boardDataWithIssue,
      };
      render(<Board />);
      const lane = screen.getByTestId('lane-Sprint 2504');
      expect(lane).toHaveAttribute('data-hidden-count', '0');
      expect(lane).toHaveAttribute('data-issue-count', '1');
    });

    it('passes filtered issues to Lane when status filter matches', () => {
      mockFilterState = {
        statusIds: new Set([1]), // matches issueInMilestone.status.id
        assigneeIds: new Set(),
        categoryIds: new Set(),
      };
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: boardDataWithIssue,
      };
      render(<Board />);
      const lane = screen.getByTestId('lane-Sprint 2504');
      expect(lane).toHaveAttribute('data-hidden-count', '0');
      expect(lane).toHaveAttribute('data-issue-count', '1');
    });
  });

  describe('sort integration', () => {
    it('calls applySortToIssues when board data is loaded', async () => {
      const { applySortToIssues } = await import('../../utils/sortUtils');
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: mockBoardData,
      };
      render(<Board />);
      // applySortToIssues should be called for unassigned + each milestone
      expect(applySortToIssues).toHaveBeenCalled();
    });
  });

  describe('reorder integration', () => {
    it('calls applyCustomOrder when sortField is none', async () => {
      const { applyCustomOrder } = await import('../../utils/reorderUtils');
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: mockBoardData,
      };
      mockSortState.field = 'none';
      render(<Board />);
      expect(applyCustomOrder).toHaveBeenCalled();
    });

    it('does not call applyCustomOrder when sortField is not none', async () => {
      const { applyCustomOrder } = await import('../../utils/reorderUtils');
      vi.mocked(applyCustomOrder).mockClear();
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: mockBoardData,
      };
      mockSortState.field = 'assignee';
      render(<Board />);
      expect(applyCustomOrder).not.toHaveBeenCalled();
    });
  });

  // Phase 9 (09-02): grouping integration
  describe('Phase 9: grouping integration', () => {
    it('calls applyGroupExpansion when board data is loaded', async () => {
      const { applyGroupExpansion } = await import('../../utils/groupUtils');
      vi.mocked(applyGroupExpansion).mockClear();
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: mockBoardData,
      };
      render(<Board />);
      expect(applyGroupExpansion).toHaveBeenCalled();
    });

    it('passes items prop to Lane (renamed from issues)', () => {
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: mockBoardData,
      };
      render(<Board />);
      const lane = screen.getByTestId('lane-Sprint 2504');
      // The mock reads 'items' prop now and exposes data-issue-count
      expect(lane).toHaveAttribute('data-issue-count', '0');
    });

    it('exports buildHandleDragEnd factory for tests', async () => {
      const mod = await import('./Board');
      expect(typeof mod.buildHandleDragEnd).toBe('function');
    });

    describe('buildHandleDragEnd (factory-tested logic)', () => {
      let buildHandleDragEnd: typeof import('./Board').buildHandleDragEnd;

      beforeEach(async () => {
        const mod = await import('./Board');
        buildHandleDragEnd = mod.buildHandleDragEnd;
        mockGroupStoreState.createGroup.mockReset();
        mockGroupStoreState.addMember.mockReset();
        mockReorderState.setLaneOrder.mockClear();
        // findIssueInBoardData は default で null を返すモックなので、
        // buildHandleDragEnd テスト用に id ベースで実 issue を返すよう差し替える
        const { findIssueInBoardData } = await import('../../stores/boardStore');
        vi.mocked(findIssueInBoardData).mockImplementation((data, id) => {
          for (const mwi of data.milestones) {
            const found = mwi.issues.find((i) => i.id === id);
            if (found) return found;
          }
          for (const i of data.unassignedIssues) {
            if (i.id === id) return i;
          }
          return null;
        });
      });

      const sourceIssue: BacklogIssue = {
        id: 99,
        projectId: 1,
        issueKey: 'TEST-99',
        keyId: 99,
        summary: 'Source',
        description: null,
        status: { id: 1, projectId: 1, name: '未対応', color: '#000', displayOrder: 0 },
        priority: { id: 3, name: '中' },
        assignee: null,
        milestone: [],
        category: [],
        startDate: null,
        dueDate: null,
        created: '2026-04-01T00:00:00Z',
        updated: '2026-04-01T00:00:00Z',
      };
      const targetIssue: BacklogIssue = {
        ...sourceIssue,
        id: 100,
        issueKey: 'TEST-100',
        keyId: 100,
        summary: 'Target',
      };
      const dataWithBothIssues: BoardData = {
        unassignedIssues: [],
        milestones: [
          {
            milestone: {
              id: 1,
              projectId: 1,
              name: 'Sprint 2504',
              description: '',
              startDate: null,
              releaseDueDate: null,
              archived: false,
              displayOrder: 0,
            },
            issues: [sourceIssue, targetIssue],
          },
        ],
      };

      function makeParams() {
        return {
          data: dataWithBothIssues,
          orderMap: {} as Record<string, (number | `group:${string}`)[]>,
          milestonePrefix: 'Sprint',
          setActiveIssue: vi.fn(),
          setOverLaneId: vi.fn(),
          sortField: 'none',
          moveIssue: vi.fn(),
          reorder: vi.fn(),
          updateOnCrossLaneMove: vi.fn(),
          getLaneItems: () => [sourceIssue, targetIssue],
        };
      }

      it('card-target-* branch calls useGroupStore.getState().createGroup', () => {
        mockGroupStoreState.createGroup.mockReturnValue('group:created-id');
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'card-target-100' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.createGroup).toHaveBeenCalledWith(
          [99, 100],
          'milestone-1',
          expect.any(Array),
        );
      });

      it('group-target-* branch calls useGroupStore.getState().addMember', () => {
        mockGroupStoreState.groups = {
          'group:abc': { id: 'group:abc', memberIds: [200, 201], laneId: 'milestone-1' },
        };
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'group-target-group:abc' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.addMember).toHaveBeenCalledWith(
          'group:abc',
          99,
          expect.any(Array),
        );
        // Reset for other tests
        mockGroupStoreState.groups = {};
      });

      it('card-target-* branch is blocked when source issue is multi-milestone', async () => {
        const { rejectMultiMilestoneMember } = await import(
          '../../utils/groupUtils'
        );
        vi.mocked(rejectMultiMilestoneMember).mockReturnValueOnce(true);
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'card-target-100' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.createGroup).not.toHaveBeenCalled();
        vi.mocked(rejectMultiMilestoneMember).mockReturnValue(false);
      });

      it('self-drop on card-target-* is rejected (sourceId === targetId)', () => {
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'card-target-99' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.createGroup).not.toHaveBeenCalled();
      });

      it('lane drop fallback still works (existing reorder behavior)', () => {
        const params = makeParams();
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 'milestone-1' },
        } as unknown as Parameters<typeof handler>[0]);
        // No grouping should occur for lane drops
        expect(mockGroupStoreState.createGroup).not.toHaveBeenCalled();
        expect(mockGroupStoreState.addMember).not.toHaveBeenCalled();
      });

      // --- Phase 9 mode-based behaviour ---

      it('group mode: intra-lane numeric reorder is a no-op', () => {
        const reorderSpy = vi.fn();
        const params = { ...makeParams(), reorder: reorderSpy, uiMode: 'group' as const };
        const handler = buildHandleDragEnd(params);
        // Drop card 99 onto card 100 within the same lane, but as a numeric
        // collision (lane id, not card-target). In group mode, this should NOT
        // reorder.
        handler({
          active: { id: 99 },
          over: { id: 100 },
        } as unknown as Parameters<typeof handler>[0]);
        expect(reorderSpy).not.toHaveBeenCalled();
      });

      it('sort mode: intra-lane numeric reorder still fires (default)', () => {
        const reorderSpy = vi.fn();
        const params = { ...makeParams(), reorder: reorderSpy, uiMode: 'sort' as const };
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 100 },
        } as unknown as Parameters<typeof handler>[0]);
        expect(reorderSpy).toHaveBeenCalledWith('milestone-1', 99, 100);
      });

      it('group mode: cross-lane move still works', () => {
        const moveIssueSpy = vi.fn();
        const params = {
          ...makeParams(),
          moveIssue: moveIssueSpy,
          uiMode: 'group' as const,
        };
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 'unassigned' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(moveIssueSpy).toHaveBeenCalledWith(99, 'milestone-1', 'unassigned');
      });

      it('group mode: card-target branch still creates groups', () => {
        mockGroupStoreState.createGroup.mockReturnValue('group:created-id');
        const params = { ...makeParams(), uiMode: 'group' as const };
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 'card-target-100' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.createGroup).toHaveBeenCalled();
      });

      it('uiMode defaults to sort when not specified (backward compat)', () => {
        const reorderSpy = vi.fn();
        const params = { ...makeParams(), reorder: reorderSpy };
        // Note: no uiMode field in params
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 100 },
        } as unknown as Parameters<typeof handler>[0]);
        // Sort behavior (reorder fires) is the default
        expect(reorderSpy).toHaveBeenCalled();
      });

      // --- Regression: popover-drag-to-card/group double-assignment fix ---

      it('card-target: popover member dropped on a plain card removes from origin group before createGroup', () => {
        // Source 99 is in group A; target 100 is a plain card.
        mockGroupStoreState.groups = {
          'group:A': {
            id: 'group:A',
            memberIds: [99, 200],
            laneId: 'milestone-1',
          },
        };
        mockGroupStoreState.createGroup.mockReturnValue('group:new-id');
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'card-target-100' },
        } as unknown as Parameters<typeof handler>[0]);
        // 元グループから remove されていること
        expect(mockGroupStoreState.removeMember).toHaveBeenCalledWith('group:A', 99);
        // その上で新規グループ作成
        expect(mockGroupStoreState.createGroup).toHaveBeenCalledWith(
          [99, 100],
          'milestone-1',
          expect.any(Array),
        );
        mockGroupStoreState.groups = {};
      });

      it('card-target: source and target in same group is a no-op (intra-group self-drop)', () => {
        mockGroupStoreState.groups = {
          'group:same': {
            id: 'group:same',
            memberIds: [99, 100],
            laneId: 'milestone-1',
          },
        };
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'card-target-100' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.removeMember).not.toHaveBeenCalled();
        expect(mockGroupStoreState.createGroup).not.toHaveBeenCalled();
        mockGroupStoreState.groups = {};
      });

      it('group-target: popover member dropped on another group removes from origin group before addMember', () => {
        // Source 99 is in group A; target is group B.
        mockGroupStoreState.groups = {
          'group:A': {
            id: 'group:A',
            memberIds: [99, 200],
            laneId: 'milestone-1',
          },
          'group:B': {
            id: 'group:B',
            memberIds: [300, 400],
            laneId: 'milestone-1',
          },
        };
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'group-target-group:B' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.removeMember).toHaveBeenCalledWith('group:A', 99);
        expect(mockGroupStoreState.addMember).toHaveBeenCalledWith(
          'group:B',
          99,
          expect.any(Array),
        );
        mockGroupStoreState.groups = {};
      });

      it('group-target: dropping a member on its own group is a no-op', () => {
        mockGroupStoreState.groups = {
          'group:A': {
            id: 'group:A',
            memberIds: [99, 200],
            laneId: 'milestone-1',
          },
        };
        const handler = buildHandleDragEnd(makeParams());
        handler({
          active: { id: 99 },
          over: { id: 'group-target-group:A' },
        } as unknown as Parameters<typeof handler>[0]);
        expect(mockGroupStoreState.removeMember).not.toHaveBeenCalled();
        expect(mockGroupStoreState.addMember).not.toHaveBeenCalled();
        mockGroupStoreState.groups = {};
      });

      // --- Plan 04: group→lane bulk move + popover member drag-out ---

      it('group→lane branch: drops a group on a different lane and calls bulkMoveGroup', () => {
        mockGroupStoreState.groups = {
          'group:bulk-1': {
            id: 'group:bulk-1',
            memberIds: [99, 100],
            laneId: 'milestone-1',
          },
        };
        mockBulkMoveGroup.mockClear();

        const params = makeParams();
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 'group:bulk-1' },
          over: { id: 'unassigned' },
        } as unknown as Parameters<typeof handler>[0]);

        expect(mockBulkMoveGroup).toHaveBeenCalledWith(
          'group:bulk-1',
          'milestone-1',
          'unassigned',
        );
        mockGroupStoreState.groups = {};
      });

      it('group→lane branch: does NOT bulk move when target lane equals group.laneId', () => {
        mockGroupStoreState.groups = {
          'group:same-lane': {
            id: 'group:same-lane',
            memberIds: [99, 100],
            laneId: 'milestone-1',
          },
        };
        mockBulkMoveGroup.mockClear();

        const params = makeParams();
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 'group:same-lane' },
          over: { id: 'milestone-1' },
        } as unknown as Parameters<typeof handler>[0]);

        expect(mockBulkMoveGroup).not.toHaveBeenCalled();
        mockGroupStoreState.groups = {};
      });

      it('popover member drag-out: removes member from group and moves issue to new lane', () => {
        mockGroupStoreState.groups = {
          'group:dragout': {
            id: 'group:dragout',
            memberIds: [99, 100, 200],
            laneId: 'milestone-1',
          },
        };
        mockGroupStoreState.removeMember.mockClear();
        const moveIssueSpy = vi.fn();
        const updateOnCrossLaneMoveSpy = vi.fn();

        const params = {
          ...makeParams(),
          moveIssue: moveIssueSpy,
          updateOnCrossLaneMove: updateOnCrossLaneMoveSpy,
        };
        const handler = buildHandleDragEnd(params);
        handler({
          active: { id: 99 },
          over: { id: 'unassigned' },
        } as unknown as Parameters<typeof handler>[0]);

        expect(mockGroupStoreState.removeMember).toHaveBeenCalledWith(
          'group:dragout',
          99,
        );
        expect(moveIssueSpy).toHaveBeenCalledWith(
          99,
          'milestone-1',
          'unassigned',
        );
        expect(updateOnCrossLaneMoveSpy).toHaveBeenCalledWith(
          99,
          'milestone-1',
          'unassigned',
        );
        mockGroupStoreState.groups = {};
      });

      it('non-grouped issue cross-lane move falls through to existing moveIssue (regression)', () => {
        // No groups configured -- containingGroup will be undefined.
        mockGroupStoreState.groups = {};
        const moveIssueSpy = vi.fn();
        const params = { ...makeParams(), moveIssue: moveIssueSpy };
        const handler = buildHandleDragEnd(params);

        // For this regression test, we need findIssueInBoardData to return non-null
        // (already configured above) and the dataWithBothIssues to have issue 99
        // in milestone-1 — this triggers the lane-drop fallback, not popover dragout.
        handler({
          active: { id: 99 },
          over: { id: 'unassigned' },
        } as unknown as Parameters<typeof handler>[0]);

        expect(mockGroupStoreState.removeMember).not.toHaveBeenCalled();
        // moveIssue from existing lane fallback should run
        expect(moveIssueSpy).toHaveBeenCalled();
      });
    });

    // --- Plan 04: GroupPopover render integration ---

    describe('GroupPopover render integration', () => {
      it('does NOT render GroupPopover when expandedGroupId is null (initial state)', () => {
        mockStoreState = {
          ...mockStoreState,
          status: 'loaded',
          data: mockBoardData,
        };
        render(<Board />);
        expect(screen.queryByTestId('group-popover')).toBeNull();
      });
    });
  });

  // --- Phase 9 regression: prioritiseCardOrGroupCollisions ---
  describe('prioritiseCardOrGroupCollisions (Phase 9 drop-target prioritisation)', () => {
    /**
     * Regression guard: when a card is dropped on another card, pointerWithin
     * returns both the card-target droppable AND the lane droppable. Without
     * prioritisation, @dnd-kit picks the lane first and triggers a lane-level
     * reorder instead of the group-creation flow — this was the reported
     * "グルーピング機能がありません" bug.
     */
    const makeCollision = (id: string | number) => ({ id });

    it('prefers card-target-* over lane collisions', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('card-target-100'),
      ];
      const result = prioritiseCardOrGroupCollisions(input);
      expect(result).toEqual([makeCollision('card-target-100')]);
    });

    it('prefers group-target-* over lane collisions', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('group-target-group:abc'),
      ];
      const result = prioritiseCardOrGroupCollisions(input);
      expect(result).toEqual([makeCollision('group-target-group:abc')]);
    });

    it('keeps all card/group targets when multiple are present', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('card-target-100'),
        makeCollision('group-target-group:abc'),
      ];
      const result = prioritiseCardOrGroupCollisions(input);
      expect(result).toEqual([
        makeCollision('card-target-100'),
        makeCollision('group-target-group:abc'),
      ]);
    });

    it('returns original collisions when no card/group targets are present', () => {
      const input = [makeCollision('milestone-1'), makeCollision('milestone-2')];
      const result = prioritiseCardOrGroupCollisions(input);
      expect(result).toEqual(input);
    });

    it('handles empty array', () => {
      expect(prioritiseCardOrGroupCollisions([])).toEqual([]);
    });

    it('handles numeric ids (lane collisions with numeric id)', () => {
      const input = [makeCollision(42), makeCollision('card-target-100')];
      const result = prioritiseCardOrGroupCollisions(input);
      expect(result).toEqual([makeCollision('card-target-100')]);
    });
  });

  // --- Phase 9 mode-based collision detection ---
  describe('filterOutCardOrGroupCollisions (sort mode helper)', () => {
    const makeCollision = (id: string | number) => ({ id });

    it('removes card-target-* collisions', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('card-target-100'),
      ];
      expect(filterOutCardOrGroupCollisions(input)).toEqual([
        makeCollision('milestone-1'),
      ]);
    });

    it('removes group-target-* collisions', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('group-target-group:abc'),
      ];
      expect(filterOutCardOrGroupCollisions(input)).toEqual([
        makeCollision('milestone-1'),
      ]);
    });

    it('removes both card-target and group-target', () => {
      const input = [
        makeCollision('milestone-1'),
        makeCollision('card-target-100'),
        makeCollision('group-target-group:abc'),
        makeCollision(42),
      ];
      expect(filterOutCardOrGroupCollisions(input)).toEqual([
        makeCollision('milestone-1'),
        makeCollision(42),
      ]);
    });

    it('keeps everything when no card/group targets present', () => {
      const input = [makeCollision('milestone-1'), makeCollision(42)];
      expect(filterOutCardOrGroupCollisions(input)).toEqual(input);
    });

    it('handles empty input', () => {
      expect(filterOutCardOrGroupCollisions([])).toEqual([]);
    });
  });

  describe('buildKanbanCollisionDetection (mode-based factory)', () => {
    /**
     * In sort mode, card-target / group-target collisions are filtered out
     * so the user's drag is interpreted as a lane-level reorder/move.
     * In group mode, card-target / group-target are prioritised for
     * grouping operations.
     */
    function makeArgs(droppables: Array<{ id: string | number }>) {
      // Minimal CollisionDetectionArgs stub — we mock pointerWithin via the
      // module's internal call. Since we cannot easily mock pointerWithin
      // without spying on @dnd-kit, we instead test the factory by feeding
      // pre-baked collisions through the pure helpers it composes.
      // (Wave 1 tests already cover prioritiseCardOrGroupCollisions and
      // filterOutCardOrGroupCollisions individually.)
      return droppables;
    }

    it('sort mode factory produces a function', () => {
      const fn = buildKanbanCollisionDetection('sort');
      expect(typeof fn).toBe('function');
    });

    it('group mode factory produces a function', () => {
      const fn = buildKanbanCollisionDetection('group');
      expect(typeof fn).toBe('function');
    });

    it('sort mode + filter helper drops card/group targets entirely', () => {
      // Equivalent to what the sort-mode factory does internally with
      // its pointerWithin output.
      const collisions = makeArgs([
        { id: 'milestone-1' },
        { id: 'card-target-100' },
      ]);
      expect(filterOutCardOrGroupCollisions(collisions)).toEqual([
        { id: 'milestone-1' },
      ]);
    });

    it('group mode + prioritise helper keeps card/group targets only', () => {
      const collisions = makeArgs([
        { id: 'milestone-1' },
        { id: 'card-target-100' },
      ]);
      expect(prioritiseCardOrGroupCollisions(collisions)).toEqual([
        { id: 'card-target-100' },
      ]);
    });
  });

  /**
   * Phase 10 Plan 08: Ctrl+Shift+E / Cmd+Shift+E で JSON 直保存が起動する
   * integration test。ExportButton の dropdown を経由せず、Board.tsx の
   * useEffect 内の window keydown listener から直接 buildSnapshot →
   * saveSnapshot が呼ばれる経路を検証する。
   *
   * - data === null / status === 'loading' は silent no-op
   * - Windows (ctrlKey) / Mac (metaKey) 両対応
   * - uppercase 'E' / lowercase 'e' 両対応 (Research Pitfall 8)
   * - error 時は toast.error が和訳メッセージで呼ばれる
   * - cancelled 時は toast.error 未呼び出し (silent)
   */
  describe('Ctrl+Shift+E shortcut', () => {
    const loadedBoardData: BoardData = {
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
          issues: [],
        },
      ],
      unassignedIssues: [],
    };

    // Let microtasks drain so the async keydown handler's `await saveSnapshot()`
    // resolves before the assertion. Two ticks cover `await` + `.then` chains.
    async function flushPromises(): Promise<void> {
      await Promise.resolve();
      await Promise.resolve();
    }

    beforeEach(() => {
      vi.mocked(saveSnapshot).mockReset();
      vi.mocked(buildSnapshot).mockClear();
      vi.mocked(buildSnapshot).mockReturnValue('mock-snapshot-content');
      vi.mocked(toast.error).mockClear();
    });

    it('calls saveSnapshot with format=json when Ctrl+Shift+E is pressed (data loaded)', async () => {
      vi.mocked(saveSnapshot).mockResolvedValueOnce({
        success: true,
        path: '/mock/path/snapshot.json',
      });
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 3,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(saveSnapshot).toHaveBeenCalledTimes(1);
      expect(saveSnapshot).toHaveBeenCalledWith(
        'mock-snapshot-content',
        'json',
        'MILEBOARD',
      );
      expect(buildSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          boardData: loadedBoardData,
          boardRevision: 3,
          milestonePrefix: 'Sprint',
          projectKey: 'MILEBOARD',
          uiMode: 'sort',
        }),
        'json',
      );
    });

    it('is silent no-op when data === null (disabled state)', async () => {
      mockStoreState = {
        ...mockStoreState,
        status: 'idle',
        data: null,
        revision: 0,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(saveSnapshot).not.toHaveBeenCalled();
      expect(buildSnapshot).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('is silent no-op when status === loading (disabled state)', async () => {
      mockStoreState = {
        ...mockStoreState,
        status: 'loading',
        data: null,
        revision: 0,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(saveSnapshot).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('responds to Cmd+Shift+E on Mac (metaKey)', async () => {
      vi.mocked(saveSnapshot).mockResolvedValueOnce({
        success: true,
        path: '/mock/path/snapshot.json',
      });
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 1,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        metaKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(saveSnapshot).toHaveBeenCalledTimes(1);
    });

    it("accepts lowercase 'e' as well as uppercase 'E' (Pitfall 8)", async () => {
      vi.mocked(saveSnapshot).mockResolvedValueOnce({
        success: true,
        path: '/mock/path/snapshot.json',
      });
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 1,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'e',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(saveSnapshot).toHaveBeenCalledTimes(1);
    });

    it('shows error toast when saveSnapshot returns error', async () => {
      vi.mocked(saveSnapshot).mockResolvedValueOnce({
        success: false,
        reason: 'error',
        error: 'Disk full',
      });
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 1,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('スナップショットの保存に失敗しました'),
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Disk full'),
      );
    });

    it('does NOT call toast.error when saveSnapshot returns cancelled (silent)', async () => {
      vi.mocked(saveSnapshot).mockResolvedValueOnce({
        success: false,
        reason: 'cancelled',
      });
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 1,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: true,
      });
      await flushPromises();

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('does NOT trigger on Ctrl+E alone (without Shift)', async () => {
      mockStoreState = {
        ...mockStoreState,
        status: 'loaded',
        data: loadedBoardData,
        revision: 1,
      };

      render(<Board />);

      fireEvent.keyDown(window, {
        key: 'E',
        code: 'KeyE',
        ctrlKey: true,
        shiftKey: false,
      });
      await flushPromises();

      expect(saveSnapshot).not.toHaveBeenCalled();
    });
  });
});
