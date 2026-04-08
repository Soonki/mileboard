import { describe, it, expect } from 'vitest';
import { computeMemberBreakdown } from './memberBreakdown';
import type { BacklogIssue } from '../types/backlog';

function createMockIssue(
  assignee: { name: string } | null,
): BacklogIssue {
  return {
    id: Math.random(),
    projectId: 1,
    issueKey: 'TEST-1',
    keyId: 1,
    summary: 'テスト課題',
    description: null,
    status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
    priority: { id: 3, name: '中' },
    assignee: assignee
      ? { id: 1, userId: 'u1', name: assignee.name, roleType: 1, mailAddress: 'a@b.com' }
      : null,
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2025-04-01T00:00:00Z',
    updated: '2025-04-01T00:00:00Z',
  };
}

describe('computeMemberBreakdown', () => {
  it('returns empty array for empty issues', () => {
    expect(computeMemberBreakdown([])).toEqual([]);
  });

  it('aggregates 2 issues assigned to the same person', () => {
    const issues = [
      createMockIssue({ name: '山田太郎' }),
      createMockIssue({ name: '山田太郎' }),
    ];
    expect(computeMemberBreakdown(issues)).toEqual([
      { name: '山田太郎', count: 2 },
    ]);
  });

  it('sorts by count descending for multiple people', () => {
    const issues = [
      createMockIssue({ name: '田中花子' }),
      createMockIssue({ name: '山田太郎' }),
      createMockIssue({ name: '山田太郎' }),
    ];
    const result = computeMemberBreakdown(issues);
    expect(result).toEqual([
      { name: '山田太郎', count: 2 },
      { name: '田中花子', count: 1 },
    ]);
  });

  it('places unassigned issues at the end with label "未割当"', () => {
    const issues = [createMockIssue(null)];
    expect(computeMemberBreakdown(issues)).toEqual([
      { name: '未割当', count: 1 },
    ]);
  });

  it('places "未割当" last regardless of count', () => {
    const issues = [
      createMockIssue(null),
      createMockIssue(null),
      createMockIssue(null),
      createMockIssue({ name: '田中花子' }),
    ];
    const result = computeMemberBreakdown(issues);
    expect(result).toEqual([
      { name: '田中花子', count: 1 },
      { name: '未割当', count: 3 },
    ]);
  });
});
