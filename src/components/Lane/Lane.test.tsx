import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Lane } from './Lane';
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

describe('Lane', () => {
  it('renders lane header with milestone name', () => {
    render(
      <Lane
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        issues={[]}
      />,
    );
    expect(screen.getByText('Sprint 2504')).toBeInTheDocument();
  });

  it('renders date range in header', () => {
    render(
      <Lane
        name="Sprint 2504"
        startDate="2025-04-01"
        releaseDueDate="2025-04-30"
        issues={[]}
      />,
    );
    expect(screen.getByText('4/1~4/30')).toBeInTheDocument();
  });

  it('renders issue cards for each issue', () => {
    const issues = [
      createMockIssue({ id: 1, issueKey: 'TEST-1' }),
      createMockIssue({ id: 2, issueKey: 'TEST-2' }),
    ];
    render(
      <Lane
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        issues={issues}
      />,
    );
    expect(screen.getByText('TEST-1')).toBeInTheDocument();
    expect(screen.getByText('TEST-2')).toBeInTheDocument();
  });

  it('renders empty lane when no issues', () => {
    render(
      <Lane
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        issues={[]}
      />,
    );
    expect(screen.getByText('課題なし')).toBeInTheDocument();
  });

  it('has aria-label with lane name', () => {
    render(
      <Lane
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        issues={[]}
      />,
    );
    expect(screen.getByRole('region', { name: 'Sprint 2504' })).toBeInTheDocument();
  });
});
