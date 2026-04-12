import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Board } from './Board';
import type { BoardData } from '../../types/board';
import type { BacklogIssue } from '../../types/backlog';

const mockFetchBoard = vi.fn();
const mockMoveIssue = vi.fn();

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
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockStoreState),
  findIssueInBoardData: vi.fn(() => null),
}));

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn(
    (selector: (s: { settings: { milestonePrefix: string } }) => string) =>
      selector({ settings: { milestonePrefix: 'Sprint' } }),
  ),
}));

vi.mock('../../stores/filterStore', () => ({
  useFilterStore: (selector: (s: MockFilterState) => unknown) =>
    selector(mockFilterState),
}));

const mockSortState: { field: string; direction: string; setField: ReturnType<typeof vi.fn>; toggleDirection: ReturnType<typeof vi.fn>; loadFromStorage: ReturnType<typeof vi.fn> } = {
  field: 'none',
  direction: 'asc',
  setField: vi.fn(),
  toggleDirection: vi.fn(),
  loadFromStorage: vi.fn(),
};

vi.mock('../../stores/sortStore', () => ({
  useSortStore: (selector: (s: typeof mockSortState) => unknown) =>
    selector(mockSortState),
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
const mockGroupStoreState = {
  groups: {} as Record<string, unknown>,
  createGroup: vi.fn(() => null),
  addMember: vi.fn(),
  moveGroup: vi.fn(),
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
    });
  });
});
