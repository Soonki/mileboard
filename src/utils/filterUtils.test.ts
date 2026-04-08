import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  extractStatusOptions,
  extractAssigneeOptions,
  extractCategoryOptions,
} from './filterUtils';
import type { BacklogIssue } from '../types/backlog';
import type { FilterState } from '../types/filter';

// --- Test data helpers ---

let idCounter = 0;

function createIssue(overrides?: Partial<BacklogIssue>): BacklogIssue {
  idCounter += 1;
  return {
    id: idCounter,
    projectId: 1,
    issueKey: `TEST-${idCounter}`,
    keyId: idCounter,
    summary: `Issue ${idCounter}`,
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
    created: '2026-04-01T00:00:00Z',
    updated: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function emptyFilters(): FilterState {
  return {
    statusIds: new Set(),
    assigneeIds: new Set(),
    categoryIds: new Set(),
  };
}

// --- applyFilters ---

describe('applyFilters', () => {
  it('returns all issues when all filter Sets are empty', () => {
    const issues = [createIssue(), createIssue()];
    const result = applyFilters(issues, emptyFilters());
    expect(result).toHaveLength(2);
  });

  it('filters by statusIds (single)', () => {
    const issues = [
      createIssue({
        status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
      }),
      createIssue({
        status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      statusIds: new Set([1]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].status.id).toBe(1);
  });

  it('filters by assigneeIds with null (unassigned)', () => {
    const issues = [
      createIssue({ assignee: null }),
      createIssue({
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      assigneeIds: new Set([null]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].assignee).toBeNull();
  });

  it('filters by assigneeIds with specific id', () => {
    const issues = [
      createIssue({ assignee: null }),
      createIssue({
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      assigneeIds: new Set([5]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].assignee?.id).toBe(5);
  });

  it('filters by categoryIds (matches any category in array)', () => {
    const issues = [
      createIssue({
        category: [
          { id: 10, name: 'Bug', displayOrder: 1 },
          { id: 20, name: 'Feature', displayOrder: 2 },
        ],
      }),
      createIssue({
        category: [{ id: 30, name: 'Task', displayOrder: 3 }],
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      categoryIds: new Set([10]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].category.some((c) => c.id === 10)).toBe(true);
  });

  it('hides issues with empty category array when categoryIds filter is active', () => {
    const issues = [
      createIssue({ category: [] }),
      createIssue({
        category: [{ id: 10, name: 'Bug', displayOrder: 1 }],
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      categoryIds: new Set([10]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].category).toHaveLength(1);
  });

  it('applies AND between axes (statusIds AND assigneeIds)', () => {
    const issues = [
      createIssue({
        status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
      createIssue({
        status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
        assignee: { id: 6, userId: 'u6', name: '田中花子', roleType: 1, mailAddress: 'b@c.com' },
      }),
      createIssue({
        status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
    ];
    const filters: FilterState = {
      statusIds: new Set([1]),
      assigneeIds: new Set([5]),
      categoryIds: new Set(),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(1);
    expect(result[0].status.id).toBe(1);
    expect(result[0].assignee?.id).toBe(5);
  });

  it('applies OR within same axis (statusIds={1,2})', () => {
    const issues = [
      createIssue({
        status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
      }),
      createIssue({
        status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
      }),
      createIssue({
        status: { id: 3, projectId: 1, name: '完了', color: '#5eb5a6', displayOrder: 3000 },
      }),
    ];
    const filters: FilterState = {
      ...emptyFilters(),
      statusIds: new Set([1, 2]),
    };
    const result = applyFilters(issues, filters);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.status.id).sort()).toEqual([1, 2]);
  });
});

// --- extractStatusOptions ---

describe('extractStatusOptions', () => {
  it('extracts unique statuses sorted by displayOrder ascending', () => {
    const issues = [
      createIssue({
        status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
      }),
      createIssue({
        status: { id: 1, projectId: 1, name: '未対応', color: '#ed8077', displayOrder: 1000 },
      }),
      createIssue({
        status: { id: 2, projectId: 1, name: '処理中', color: '#4488c5', displayOrder: 2000 },
      }),
    ];
    const options = extractStatusOptions(issues);
    expect(options).toEqual([
      { id: 1, label: '未対応', sortOrder: 1000 },
      { id: 2, label: '処理中', sortOrder: 2000 },
    ]);
  });

  it('returns empty array for no issues', () => {
    expect(extractStatusOptions([])).toEqual([]);
  });
});

// --- extractAssigneeOptions ---

describe('extractAssigneeOptions', () => {
  it('extracts unique assignees sorted by name ascending with unassigned last', () => {
    const issues = [
      createIssue({
        assignee: { id: 6, userId: 'u6', name: '田中花子', roleType: 1, mailAddress: 'b@c.com' },
      }),
      createIssue({ assignee: null }),
      createIssue({
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
      createIssue({
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
    ];
    const options = extractAssigneeOptions(issues);
    expect(options).toHaveLength(3);
    // Name ascending order
    expect(options[0].label).toBe('山田太郎');
    expect(options[1].label).toBe('田中花子');
    // Unassigned always last
    expect(options[2]).toEqual({
      id: null,
      label: '未割り当て',
      sortOrder: Number.MAX_SAFE_INTEGER,
    });
  });

  it('returns empty array for no issues', () => {
    expect(extractAssigneeOptions([])).toEqual([]);
  });

  it('does not include unassigned option when no issues have null assignee', () => {
    const issues = [
      createIssue({
        assignee: { id: 5, userId: 'u5', name: '山田太郎', roleType: 1, mailAddress: 'a@b.com' },
      }),
    ];
    const options = extractAssigneeOptions(issues);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe(5);
  });
});

// --- extractCategoryOptions ---

describe('extractCategoryOptions', () => {
  it('extracts unique categories sorted by displayOrder, then name', () => {
    const issues = [
      createIssue({
        category: [
          { id: 20, name: 'Feature', displayOrder: 2 },
          { id: 10, name: 'Bug', displayOrder: 1 },
        ],
      }),
      createIssue({
        category: [{ id: 30, name: 'Task', displayOrder: null }],
      }),
      createIssue({
        category: [{ id: 10, name: 'Bug', displayOrder: 1 }],
      }),
    ];
    const options = extractCategoryOptions(issues);
    expect(options).toHaveLength(3);
    // displayOrder null treated as 0, then by name
    expect(options[0]).toEqual({ id: 30, label: 'Task', sortOrder: 0 });
    expect(options[1]).toEqual({ id: 10, label: 'Bug', sortOrder: 1 });
    expect(options[2]).toEqual({ id: 20, label: 'Feature', sortOrder: 2 });
  });

  it('returns empty array for no issues', () => {
    expect(extractCategoryOptions([])).toEqual([]);
  });

  it('returns empty array when issues have no categories', () => {
    const issues = [createIssue({ category: [] })];
    expect(extractCategoryOptions(issues)).toEqual([]);
  });
});
