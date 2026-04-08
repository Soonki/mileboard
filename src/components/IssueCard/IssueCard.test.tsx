import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IssueCard } from './IssueCard';
import type { BacklogIssue } from '../../types/backlog';

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
});
