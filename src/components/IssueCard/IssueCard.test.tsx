import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { IssueCard } from './IssueCard';
import type { BacklogIssue } from '../../types/backlog';
import { openUrl } from '@tauri-apps/plugin-opener';

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

describe('IssueCard', () => {
  it('renders issue key', () => {
    render(<IssueCard issue={createMockIssue()} />);
    expect(screen.getByText('TEST-1')).toBeInTheDocument();
  });

  it('renders summary text', () => {
    render(<IssueCard issue={createMockIssue()} />);
    expect(screen.getByText('テスト課題のサマリー')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<IssueCard issue={createMockIssue()} />);
    expect(screen.getByText('未対応')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<IssueCard issue={createMockIssue()} />);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
  });

  it('renders --- when assignee is null', () => {
    render(<IssueCard issue={createMockIssue({ assignee: null })} />);
    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('renders priority indicator', () => {
    render(<IssueCard issue={createMockIssue()} />);
    expect(screen.getByText('▲▲')).toBeInTheDocument();
  });

  it('renders no priority indicator when priority is null', () => {
    render(<IssueCard issue={createMockIssue({ priority: null })} />);
    expect(screen.queryByText('▲')).not.toBeInTheDocument();
  });

  it('calls openUrl with correct Backlog URL on click', async () => {
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('strips https:// from hostUrl before URL construction', async () => {
    vi.mocked(useSettingsStore).mockImplementation(
      (selector: (s: { settings: { hostUrl: string } }) => string) =>
        selector({ settings: { hostUrl: 'https://example.backlog.com' } }),
    );
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('strips http:// from hostUrl before URL construction', async () => {
    vi.mocked(useSettingsStore).mockImplementation(
      (selector: (s: { settings: { hostUrl: string } }) => string) =>
        selector({ settings: { hostUrl: 'http://example.backlog.com' } }),
    );
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} />);
    await user.click(screen.getByRole('link'));
    expect(openUrl).toHaveBeenCalledWith('https://example.backlog.com/view/TEST-1');
  });

  it('does not throw when openUrl fails', async () => {
    vi.mocked(openUrl).mockRejectedValueOnce(new Error('opener failed'));
    const user = userEvent.setup();
    render(<IssueCard issue={createMockIssue()} />);
    await expect(user.click(screen.getByRole('link'))).resolves.not.toThrow();
  });

  it('has role="link" and aria-label with issue key', () => {
    render(<IssueCard issue={createMockIssue()} />);
    const link = screen.getByRole('link', { name: 'TEST-1をBacklogで開く' });
    expect(link).toBeInTheDocument();
  });

  it('passes status color to StatusBadge', () => {
    render(<IssueCard issue={createMockIssue()} />);
    const badge = screen.getByLabelText('未対応');
    // StatusBadge with color="#ed8077" applies inline backgroundColor
    expect(badge.style.backgroundColor).toBe('rgb(237, 128, 119)');
  });
});
