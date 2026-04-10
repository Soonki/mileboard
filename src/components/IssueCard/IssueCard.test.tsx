import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { IssueCard } from './IssueCard';
import type { BacklogIssue } from '../../types/backlog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSortable } from '@dnd-kit/sortable';

vi.mock('../../stores/sortStore', () => ({
  useSortStore: vi.fn((selector: (s: { field: string; direction: string }) => unknown) =>
    selector({ field: 'none', direction: 'asc' }),
  ),
}));

vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { settings: { hostUrl: string } }) => string) =>
    selector({ settings: { hostUrl: 'example.backlog.com' } }),
  ),
}));

const { useSettingsStore } = await import('../../stores/settingsStore');

function createMockIssue(overrides?: Partial<BacklogIssue>): BacklogIssue {
  return {
    id: 1,
    projectId: 1,
    issueKey: 'TEST-1',
    keyId: 1,
    summary: 'テスト課題のサマリー',
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
    ...overrides,
  };
}

const defaultProps = {
  laneId: 'milestone-100',
  milestonePrefix: 'Sprint',
};

describe('IssueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    } as unknown as ReturnType<typeof useSortable>);
  });

  it('renders issue key', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(screen.getByText('TEST-1')).toBeInTheDocument();
  });

  it('renders summary text', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(screen.getByText('テスト課題のサマリー')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(screen.getByText('未対応')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
  });

  it('renders --- when assignee is null', () => {
    render(
      <IssueCard issue={createMockIssue({ assignee: null })} {...defaultProps} />,
    );
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('renders priority indicator', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(screen.getByText('▲▲')).toBeInTheDocument();
  });

  it('renders no priority indicator when priority is null', () => {
    render(
      <IssueCard issue={createMockIssue({ priority: null })} {...defaultProps} />,
    );
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
  });

  it('calls openUrl with correct Backlog URL on click', async () => {
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('strips https:// from hostUrl before URL construction', async () => {
    vi.mocked(useSettingsStore).mockImplementation(
      ((selector: (s: { settings: { hostUrl: string } }) => string) =>
        selector({ settings: { hostUrl: 'https://example.backlog.com' } })) as typeof useSettingsStore,
    );
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('strips http:// from hostUrl before URL construction', async () => {
    vi.mocked(useSettingsStore).mockImplementation(
      ((selector: (s: { settings: { hostUrl: string } }) => string) =>
        selector({ settings: { hostUrl: 'http://example.backlog.com' } })) as typeof useSettingsStore,
    );
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('does not throw when openUrl fails', async () => {
    vi.mocked(openUrl).mockRejectedValueOnce(new Error('opener failed'));
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    await expect(user.click(screen.getByRole('link'))).resolves.not.toThrow();
  });

  it('has role="link" and aria-label with issue key', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    const link = screen.getByRole('link', { name: 'TEST-1をBacklogで開く' });
    expect(link).toBeInTheDocument();
  });

  it('passes status color to StatusBadge', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    const badge = screen.getByLabelText('未対応');
    expect(badge.style.backgroundColor).toBe('rgb(237, 128, 119)');
  });

  it('calls useSortable with issue id', () => {
    render(<IssueCard issue={createMockIssue({ id: 42 })} {...defaultProps} />);
    expect(useSortable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42 }),
    );
  });

  it('shows WarningBadge when issue has multiple prefix milestones', () => {
    const issue = createMockIssue({
      milestone: [
        {
          id: 100,
          projectId: 1,
          name: 'Sprint-2504',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
        {
          id: 200,
          projectId: 1,
          name: 'Sprint-2505',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
      ],
    });
    render(<IssueCard issue={issue} {...defaultProps} />);
    expect(screen.getByText('\u26A0')).toBeInTheDocument();
  });

  it('does not show WarningBadge for single milestone', () => {
    const issue = createMockIssue({
      milestone: [
        {
          id: 100,
          projectId: 1,
          name: 'Sprint-2504',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
      ],
    });
    render(<IssueCard issue={issue} {...defaultProps} />);
    expect(screen.queryByText('\u26A0')).not.toBeInTheDocument();
  });

  it('disables sorting for multi-milestone cards', () => {
    const issue = createMockIssue({
      milestone: [
        {
          id: 100,
          projectId: 1,
          name: 'Sprint-2504',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
        {
          id: 200,
          projectId: 1,
          name: 'Sprint-2505',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
      ],
    });
    render(<IssueCard issue={issue} {...defaultProps} />);
    expect(useSortable).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('enables sorting for non-multi-milestone cards', () => {
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(useSortable).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: false }),
    );
  });

  it('applies cardDragging class when isDragging is true', () => {
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: true,
    } as unknown as ReturnType<typeof useSortable>);
    const { container } = render(
      <IssueCard issue={createMockIssue()} {...defaultProps} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cardDragging');
  });

  it('disables sorting when sort is active', async () => {
    const { useSortStore } = await import('../../stores/sortStore');
    vi.mocked(useSortStore).mockImplementation(
      ((selector: (s: { field: string; direction: string }) => unknown) =>
        selector({ field: 'assignee', direction: 'asc' })) as typeof useSortStore,
    );
    render(<IssueCard issue={createMockIssue()} {...defaultProps} />);
    expect(useSortable).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
    );
  });

  it('applies cardDragDisabled class when sort is active', async () => {
    const { useSortStore } = await import('../../stores/sortStore');
    vi.mocked(useSortStore).mockImplementation(
      ((selector: (s: { field: string; direction: string }) => unknown) =>
        selector({ field: 'dueDate', direction: 'asc' })) as typeof useSortStore,
    );
    const { container } = render(
      <IssueCard issue={createMockIssue()} {...defaultProps} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cardDragDisabled');
  });

  it('applies cardDragDisabled class for multi-milestone cards', () => {
    const issue = createMockIssue({
      milestone: [
        {
          id: 100,
          projectId: 1,
          name: 'Sprint-2504',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
        {
          id: 200,
          projectId: 1,
          name: 'Sprint-2505',
          description: null,
          startDate: null,
          releaseDueDate: null,
          archived: false,
          displayOrder: 0,
        },
      ],
    });
    const { container } = render(
      <IssueCard issue={issue} {...defaultProps} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('cardDragDisabled');
  });
});
