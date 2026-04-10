import { describe, it, expect } from 'vitest';
import { applySortToIssues } from './sortUtils';
import type { BacklogIssue } from '../types/backlog';

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

function makeUser(name: string, id: number) {
  return { id, userId: `u${id}`, name, roleType: 1, mailAddress: `${id}@test.com` };
}

// --- applySortToIssues ---

describe('applySortToIssues', () => {
  describe('field=none', () => {
    it('returns issues sorted by keyId ascending', () => {
      const issues = [
        createIssue({ keyId: 30 }),
        createIssue({ keyId: 10 }),
        createIssue({ keyId: 20 }),
      ];
      const result = applySortToIssues(issues, 'none', 'asc');
      expect(result.map((i) => i.keyId)).toEqual([10, 20, 30]);
    });
  });

  describe('field=assignee', () => {
    it('sorts by assignee.name localeCompare ja ascending', () => {
      const issues = [
        createIssue({ assignee: makeUser('田中花子', 2) }),
        createIssue({ assignee: makeUser('山田太郎', 1) }),
        createIssue({ assignee: makeUser('伊藤次郎', 3) }),
      ];
      const result = applySortToIssues(issues, 'assignee', 'asc');
      const names = result.map((i) => i.assignee!.name);
      // Japanese locale sort: 伊藤 < 田中 < 山田
      expect(names).toEqual(
        [...names].sort((a, b) => a.localeCompare(b, 'ja')),
      );
    });

    it('sorts by assignee.name descending', () => {
      const issues = [
        createIssue({ assignee: makeUser('田中花子', 2) }),
        createIssue({ assignee: makeUser('山田太郎', 1) }),
        createIssue({ assignee: makeUser('伊藤次郎', 3) }),
      ];
      const result = applySortToIssues(issues, 'assignee', 'desc');
      const names = result.map((i) => i.assignee!.name);
      expect(names).toEqual(
        [...names].sort((a, b) => b.localeCompare(a, 'ja')),
      );
    });

    it('places assignee=null issues at END regardless of direction asc', () => {
      const issues = [
        createIssue({ assignee: null, keyId: 5 }),
        createIssue({ assignee: makeUser('山田太郎', 1), keyId: 3 }),
        createIssue({ assignee: null, keyId: 2 }),
      ];
      const result = applySortToIssues(issues, 'assignee', 'asc');
      // First item should have assignee, last two should be null
      expect(result[0].assignee).not.toBeNull();
      expect(result[1].assignee).toBeNull();
      expect(result[2].assignee).toBeNull();
    });

    it('places assignee=null issues at END regardless of direction desc', () => {
      const issues = [
        createIssue({ assignee: null, keyId: 5 }),
        createIssue({ assignee: makeUser('山田太郎', 1), keyId: 3 }),
        createIssue({ assignee: null, keyId: 2 }),
      ];
      const result = applySortToIssues(issues, 'assignee', 'desc');
      expect(result[0].assignee).not.toBeNull();
      expect(result[1].assignee).toBeNull();
      expect(result[2].assignee).toBeNull();
    });
  });

  describe('field=dueDate', () => {
    it('sorts by dueDate ascending (early to late)', () => {
      const issues = [
        createIssue({ dueDate: '2026-06-15' }),
        createIssue({ dueDate: '2026-04-01' }),
        createIssue({ dueDate: '2026-05-10' }),
      ];
      const result = applySortToIssues(issues, 'dueDate', 'asc');
      expect(result.map((i) => i.dueDate)).toEqual([
        '2026-04-01',
        '2026-05-10',
        '2026-06-15',
      ]);
    });

    it('sorts by dueDate descending (late to early)', () => {
      const issues = [
        createIssue({ dueDate: '2026-06-15' }),
        createIssue({ dueDate: '2026-04-01' }),
        createIssue({ dueDate: '2026-05-10' }),
      ];
      const result = applySortToIssues(issues, 'dueDate', 'desc');
      expect(result.map((i) => i.dueDate)).toEqual([
        '2026-06-15',
        '2026-05-10',
        '2026-04-01',
      ]);
    });

    it('places dueDate=null issues at END regardless of direction asc', () => {
      const issues = [
        createIssue({ dueDate: null, keyId: 5 }),
        createIssue({ dueDate: '2026-04-01', keyId: 3 }),
        createIssue({ dueDate: null, keyId: 2 }),
      ];
      const result = applySortToIssues(issues, 'dueDate', 'asc');
      expect(result[0].dueDate).not.toBeNull();
      expect(result[1].dueDate).toBeNull();
      expect(result[2].dueDate).toBeNull();
    });

    it('places dueDate=null issues at END regardless of direction desc', () => {
      const issues = [
        createIssue({ dueDate: null, keyId: 5 }),
        createIssue({ dueDate: '2026-04-01', keyId: 3 }),
        createIssue({ dueDate: null, keyId: 2 }),
      ];
      const result = applySortToIssues(issues, 'dueDate', 'desc');
      expect(result[0].dueDate).not.toBeNull();
      expect(result[1].dueDate).toBeNull();
      expect(result[2].dueDate).toBeNull();
    });
  });

  describe('null secondary sort', () => {
    it('sorts null-value issues by keyId ascending as secondary sort', () => {
      const issues = [
        createIssue({ assignee: null, keyId: 30 }),
        createIssue({ assignee: null, keyId: 10 }),
        createIssue({ assignee: null, keyId: 20 }),
        createIssue({ assignee: makeUser('山田太郎', 1), keyId: 5 }),
      ];
      const result = applySortToIssues(issues, 'assignee', 'asc');
      // Non-null first, then nulls sorted by keyId
      expect(result[0].keyId).toBe(5);
      expect(result[1].keyId).toBe(10);
      expect(result[2].keyId).toBe(20);
      expect(result[3].keyId).toBe(30);
    });
  });

  describe('immutability', () => {
    it('does NOT mutate the input array', () => {
      const issues = [
        createIssue({ keyId: 30 }),
        createIssue({ keyId: 10 }),
        createIssue({ keyId: 20 }),
      ];
      const originalOrder = issues.map((i) => i.keyId);
      applySortToIssues(issues, 'none', 'asc');
      expect(issues.map((i) => i.keyId)).toEqual(originalOrder);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty input', () => {
      const result = applySortToIssues([], 'none', 'asc');
      expect(result).toEqual([]);
    });
  });
});
