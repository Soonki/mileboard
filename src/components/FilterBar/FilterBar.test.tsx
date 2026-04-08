import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock filterStore state
const mockFilterState: {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;
  toggleStatus: ReturnType<typeof vi.fn>;
  toggleAssignee: ReturnType<typeof vi.fn>;
  toggleCategory: ReturnType<typeof vi.fn>;
  removeFilter: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
  hasActiveFilters: ReturnType<typeof vi.fn>;
} = {
  statusIds: new Set(),
  assigneeIds: new Set(),
  categoryIds: new Set(),
  toggleStatus: vi.fn(),
  toggleAssignee: vi.fn(),
  toggleCategory: vi.fn(),
  removeFilter: vi.fn(),
  clearAll: vi.fn(),
  hasActiveFilters: vi.fn(() => false),
};

vi.mock('../../stores/filterStore', () => ({
  useFilterStore: (selector: (s: typeof mockFilterState) => unknown) =>
    selector(mockFilterState),
}));

// Mock board data
const createMockBoardData = () => ({
  milestones: [
    {
      milestone: {
        id: 100,
        projectId: 1,
        name: 'Sprint-2504',
        description: null,
        startDate: '2025-04-01',
        releaseDueDate: '2025-04-30',
        archived: false,
        displayOrder: 0,
      },
      issues: [
        {
          id: 1,
          projectId: 1,
          issueKey: 'TEST-1',
          keyId: 1,
          summary: 'Issue 1',
          description: null,
          status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
          priority: { id: 3, name: '中' },
          assignee: { id: 10, userId: 'user1', name: '山田太郎', roleType: 1, mailAddress: 'test@test.com' },
          milestone: [],
          category: [{ id: 50, name: 'バグ', displayOrder: 0 }],
          startDate: null,
          dueDate: null,
          created: '2025-04-01T00:00:00Z',
          updated: '2025-04-01T00:00:00Z',
        },
        {
          id: 2,
          projectId: 1,
          issueKey: 'TEST-2',
          keyId: 2,
          summary: 'Issue 2',
          description: null,
          status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
          priority: { id: 3, name: '中' },
          assignee: null,
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
  unassignedIssues: [
    {
      id: 3,
      projectId: 1,
      issueKey: 'TEST-3',
      keyId: 3,
      summary: 'Issue 3',
      description: null,
      status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
      priority: { id: 3, name: '中' },
      assignee: { id: 20, userId: 'user2', name: '佐藤花子', roleType: 1, mailAddress: 'test2@test.com' },
      milestone: [],
      category: [{ id: 51, name: '機能追加', displayOrder: 1 }],
      startDate: null,
      dueDate: null,
      created: '2025-04-01T00:00:00Z',
      updated: '2025-04-01T00:00:00Z',
    },
  ],
});

let mockBoardData: ReturnType<typeof createMockBoardData> | null = createMockBoardData();

vi.mock('../../stores/boardStore', () => ({
  useBoardStore: (selector: (s: { data: typeof mockBoardData }) => unknown) =>
    selector({ data: mockBoardData }),
}));

import { FilterBar } from './FilterBar';

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBoardData = createMockBoardData();
    mockFilterState.statusIds = new Set();
    mockFilterState.assigneeIds = new Set();
    mockFilterState.categoryIds = new Set();
    mockFilterState.hasActiveFilters.mockReturnValue(false);
    mockFilterState.toggleStatus = vi.fn();
    mockFilterState.toggleAssignee = vi.fn();
    mockFilterState.toggleCategory = vi.fn();
    mockFilterState.removeFilter = vi.fn();
    mockFilterState.clearAll = vi.fn();
  });

  describe('rendering', () => {
    it('renders with role="toolbar" and aria-label', () => {
      render(<FilterBar />);
      expect(screen.getByRole('toolbar', { name: 'フィルタ' })).toBeInTheDocument();
    });

    it('renders 3 filter dropdown triggers', () => {
      render(<FilterBar />);
      expect(screen.getByRole('button', { name: 'ステータスフィルタ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '担当者フィルタ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'カテゴリフィルタ' })).toBeInTheDocument();
    });

    it('returns null when board data is null', () => {
      mockBoardData = null;
      const { container } = render(<FilterBar />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('dropdown options', () => {
    it('extracts status options from board data', async () => {
      const user = userEvent.setup();
      render(<FilterBar />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByText('未対応')).toBeInTheDocument();
      expect(screen.getByText('処理中')).toBeInTheDocument();
    });

    it('extracts assignee options from board data', async () => {
      const user = userEvent.setup();
      render(<FilterBar />);
      await user.click(screen.getByRole('button', { name: '担当者フィルタ' }));
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
      expect(screen.getByText('未割り当て')).toBeInTheDocument();
    });

    it('extracts category options from board data', async () => {
      const user = userEvent.setup();
      render(<FilterBar />);
      await user.click(screen.getByRole('button', { name: 'カテゴリフィルタ' }));
      expect(screen.getByText('バグ')).toBeInTheDocument();
      expect(screen.getByText('機能追加')).toBeInTheDocument();
    });
  });

  describe('filter chips', () => {
    it('renders chips for selected status filters', () => {
      mockFilterState.statusIds = new Set([1]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      render(<FilterBar />);
      expect(screen.getByText('未対応')).toBeInTheDocument();
    });

    it('renders chips for selected assignee filters', () => {
      mockFilterState.assigneeIds = new Set<number | null>([10]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      render(<FilterBar />);
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
    });

    it('renders chips for selected category filters', () => {
      mockFilterState.categoryIds = new Set([50]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      render(<FilterBar />);
      expect(screen.getByText('バグ')).toBeInTheDocument();
    });
  });

  describe('clear all button', () => {
    it('does not show clear all when no filters active', () => {
      mockFilterState.hasActiveFilters.mockReturnValue(false);
      render(<FilterBar />);
      expect(screen.queryByText('すべてクリア')).not.toBeInTheDocument();
    });

    it('shows clear all when filters are active', () => {
      mockFilterState.statusIds = new Set([1]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      render(<FilterBar />);
      expect(screen.getByText('すべてクリア')).toBeInTheDocument();
    });

    it('calls clearAll when clear all button is clicked', async () => {
      mockFilterState.statusIds = new Set([1]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      const user = userEvent.setup();
      render(<FilterBar />);
      await user.click(screen.getByText('すべてクリア'));
      expect(mockFilterState.clearAll).toHaveBeenCalledOnce();
    });

    it('has correct aria-label on clear all button', () => {
      mockFilterState.statusIds = new Set([1]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      render(<FilterBar />);
      expect(screen.getByRole('button', { name: 'すべてのフィルタをクリア' })).toBeInTheDocument();
    });
  });

  describe('chip removal', () => {
    it('calls removeFilter with correct params when chip is removed', async () => {
      mockFilterState.statusIds = new Set([1]);
      mockFilterState.hasActiveFilters.mockReturnValue(true);
      const user = userEvent.setup();
      render(<FilterBar />);
      await user.click(screen.getByRole('button', { name: '未対応のフィルタを解除' }));
      expect(mockFilterState.removeFilter).toHaveBeenCalledWith('status', 1);
    });
  });
});
