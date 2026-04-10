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

vi.mock('../Lane/Lane', () => ({
  Lane: ({
    name,
    laneId,
    issues,
    hiddenCount,
  }: {
    name: string;
    laneId: string;
    issues: BacklogIssue[];
    hiddenCount?: number;
  }) => (
    <div
      data-testid={`lane-${name}`}
      data-lane-id={laneId}
      data-issue-count={issues.length}
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
});
