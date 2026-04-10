import { describe, it, expect } from 'vitest';
import { applyCustomOrder } from './reorderUtils';
import type { BacklogIssue } from '../types/backlog';

// --- Test data helpers ---

function makeIssue(id: number, keyId: number): BacklogIssue {
  return {
    id,
    projectId: 1,
    issueKey: `TEST-${keyId}`,
    keyId,
    summary: `Issue ${keyId}`,
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '\u672A\u5BFE\u5FDC',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: { id: 3, name: '\u4E2D' },
    assignee: null,
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2026-04-01T00:00:00Z',
    updated: '2026-04-01T00:00:00Z',
  };
}

describe('applyCustomOrder', () => {
  it('returns empty array for empty inputs', () => {
    const result = applyCustomOrder([], []);
    expect(result).toEqual([]);
  });

  it('returns keyId ascending when savedIds is empty (D-02)', () => {
    const issues = [makeIssue(3, 30), makeIssue(1, 10), makeIssue(2, 20)];
    const result = applyCustomOrder(issues, []);
    expect(result.map((i) => i.keyId)).toEqual([10, 20, 30]);
  });

  it('applies custom order from savedIds', () => {
    const issues = [makeIssue(3, 30), makeIssue(1, 10), makeIssue(2, 20)];
    const result = applyCustomOrder(issues, [2, 3, 1]);
    expect(result.map((i) => i.id)).toEqual([2, 3, 1]);
  });

  it('appends new issues not in savedIds in keyId ascending order (D-04)', () => {
    const issues = [makeIssue(1, 10), makeIssue(2, 20), makeIssue(3, 30)];
    const result = applyCustomOrder(issues, [3, 1]);
    expect(result.map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it('excludes deleted issues that are in savedIds but not in issues', () => {
    const issues = [makeIssue(1, 10), makeIssue(3, 30)];
    const result = applyCustomOrder(issues, [3, 2, 1]);
    expect(result.map((i) => i.id)).toEqual([3, 1]);
  });

  it('does NOT mutate input array (immutability)', () => {
    const issues = [makeIssue(3, 30), makeIssue(1, 10), makeIssue(2, 20)];
    const originalIds = issues.map((i) => i.id);
    applyCustomOrder(issues, [2, 3, 1]);
    expect(issues.map((i) => i.id)).toEqual(originalIds);
  });

  it('appends multiple new issues in keyId ascending order (D-04)', () => {
    const issues = [
      makeIssue(1, 10),
      makeIssue(2, 20),
      makeIssue(3, 30),
      makeIssue(4, 5),
      makeIssue(5, 25),
    ];
    const result = applyCustomOrder(issues, [1]);
    // id=1 first, then new issues sorted by keyId: id=4(5), id=2(20), id=5(25), id=3(30)
    expect(result.map((i) => i.id)).toEqual([1, 4, 2, 5, 3]);
  });

  it('returns all issues in keyId ascending when savedIds has only deleted ids', () => {
    const issues = [makeIssue(1, 10), makeIssue(2, 20)];
    const result = applyCustomOrder(issues, [99, 100]);
    // All savedIds are deleted, so all issues are "new" -> keyId ascending
    expect(result.map((i) => i.keyId)).toEqual([10, 20]);
  });
});
