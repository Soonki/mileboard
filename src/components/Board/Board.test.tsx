import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Board } from './Board';
import type { BoardData } from '../../types/board';

const mockFetchBoard = vi.fn();

let mockStoreState: Record<string, unknown> = {};

vi.mock('../../stores/boardStore', () => ({
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockStoreState),
}));

vi.mock('../Lane/Lane', () => ({
  Lane: ({ name }: { name: string }) => (
    <div data-testid={`lane-${name}`}>{name}</div>
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
});
