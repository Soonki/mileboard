import { describe, it, expect } from 'vitest';
import {
  trimIssue,
  hydrateFilterState,
  groupSlotToSnapshot,
} from './snapshotCommon';
import type { TrimmedIssue, SnapshotLaneItem } from './snapshotCommon';
import type {
  BacklogIssue,
  BacklogCategory,
  BacklogMilestone,
  BacklogStatus,
  BacklogUser,
} from '../types/backlog';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';
import type { Group, GroupId, GroupSlot } from '../types/group';

// ----- fixture factories ---------------------------------------------------

const makeStatus = (id: number, name: string): BacklogStatus => ({
  id,
  projectId: 1,
  name,
  color: '#abcdef',
  displayOrder: id,
});

const makeAssignee = (id: number, name: string): BacklogUser => ({
  id,
  userId: 'u' + id,
  name,
  roleType: 2,
  mailAddress: name + '@example.com',
});

const makeCategory = (id: number, name: string): BacklogCategory => ({
  id,
  name,
  displayOrder: id,
});

const makeMilestone = (id: number, name: string): BacklogMilestone => ({
  id,
  projectId: 1,
  name,
  description: null,
  startDate: null,
  releaseDueDate: null,
  archived: false,
  displayOrder: id,
});

interface IssueOverrides {
  id?: number;
  keyId?: number;
  summary?: string;
  status?: BacklogStatus;
  assignee?: BacklogUser | null;
  priority?: { id: number; name: string } | null;
  category?: BacklogCategory[];
  milestone?: BacklogMilestone[];
  dueDate?: string | null;
  startDate?: string | null;
}

const makeIssue = (o: IssueOverrides = {}): BacklogIssue => ({
  id: o.id ?? 100,
  projectId: 999,
  issueKey: 'PROJ-' + (o.id ?? 100),
  keyId: o.keyId ?? o.id ?? 100,
  summary: o.summary ?? ('issue ' + (o.id ?? 100)),
  description: '内部説明テキスト',
  status: o.status ?? makeStatus(1, '未対応'),
  priority: o.priority === undefined ? { id: 3, name: '中' } : o.priority,
  assignee: o.assignee === undefined ? makeAssignee(42, 'yamada') : o.assignee,
  milestone: o.milestone ?? [makeMilestone(10, 'v1.2')],
  category: o.category ?? [makeCategory(7, 'backend')],
  startDate: o.startDate ?? null,
  dueDate: o.dueDate ?? '2026-05-01',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-02-01T00:00:00Z',
});

const makeBoardData = (issues: BacklogIssue[]): BoardData => ({
  milestones: [],
  unassignedIssues: issues,
});

// ----- trimIssue -----------------------------------------------------------

describe('trimIssue', () => {
  it('includes id, issueKey, keyId, summary', () => {
    const issue = makeIssue({ id: 100, keyId: 100, summary: 'Add login page' });
    const trimmed = trimIssue(issue);
    expect(trimmed.id).toBe(100);
    expect(trimmed.issueKey).toBe('PROJ-100');
    expect(trimmed.keyId).toBe(100);
    expect(trimmed.summary).toBe('Add login page');
  });

  it('includes status.name (and no status.color), assignee.name, priority.name', () => {
    const issue = makeIssue({
      id: 101,
      status: makeStatus(1, '未対応'),
      assignee: makeAssignee(42, 'yamada'),
      priority: { id: 3, name: '中' },
    });
    const trimmed = trimIssue(issue);
    expect(trimmed.status).toEqual({ id: 1, name: '未対応' });
    expect(trimmed.status).not.toHaveProperty('color');
    expect(trimmed.assignee).toEqual({ id: 42, name: 'yamada' });
    expect(trimmed.priority).toEqual({ id: 3, name: '中' });
  });

  it('includes dueDate and startDate', () => {
    const issue = makeIssue({
      id: 102,
      startDate: '2026-04-01',
      dueDate: '2026-05-01',
    });
    const trimmed = trimIssue(issue);
    expect(trimmed.startDate).toBe('2026-04-01');
    expect(trimmed.dueDate).toBe('2026-05-01');
  });

  it('includes category[].name (multiple entries)', () => {
    const issue = makeIssue({
      id: 103,
      category: [makeCategory(7, 'backend'), makeCategory(8, 'frontend')],
    });
    const trimmed = trimIssue(issue);
    expect(trimmed.category).toEqual([
      { id: 7, name: 'backend' },
      { id: 8, name: 'frontend' },
    ]);
  });

  it('includes milestone[].name (multiple entries)', () => {
    const issue = makeIssue({
      id: 104,
      milestone: [makeMilestone(10, 'v1.2'), makeMilestone(11, 'v1.3')],
    });
    const trimmed = trimIssue(issue);
    expect(trimmed.milestone).toEqual([
      { id: 10, name: 'v1.2' },
      { id: 11, name: 'v1.3' },
    ]);
  });

  it('excludes description, created, updated, projectId and status.color (T-10-01-01)', () => {
    const issue = makeIssue({ id: 105 });
    const trimmed = trimIssue(issue);
    const keys = Object.keys(trimmed);
    expect(keys).not.toContain('description');
    expect(keys).not.toContain('created');
    expect(keys).not.toContain('updated');
    expect(keys).not.toContain('projectId');
    // allowlist shape check: only the exact set of D-07 fields is present
    expect(new Set(keys)).toEqual(
      new Set([
        'id',
        'issueKey',
        'keyId',
        'summary',
        'status',
        'assignee',
        'priority',
        'dueDate',
        'startDate',
        'category',
        'milestone',
      ]),
    );
  });

  it('handles assignee = null as { assignee: null }', () => {
    const issue = makeIssue({ id: 106, assignee: null });
    const trimmed = trimIssue(issue);
    expect(trimmed.assignee).toBeNull();
  });

  it('handles priority = null as { priority: null }', () => {
    const issue = makeIssue({ id: 107, priority: null });
    const trimmed = trimIssue(issue);
    expect(trimmed.priority).toBeNull();
  });

  it('handles category = [] as empty array', () => {
    const issue = makeIssue({ id: 108, category: [] });
    const trimmed = trimIssue(issue);
    expect(trimmed.category).toEqual([]);
  });
});

// ----- hydrateFilterState --------------------------------------------------

describe('hydrateFilterState', () => {
  it('resolves statusIds to [{id, name}] using boardData lookup', () => {
    const boardData = makeBoardData([
      makeIssue({ id: 1, status: makeStatus(1, '未対応') }),
      makeIssue({ id: 2, status: makeStatus(2, '処理中') }),
    ]);
    const filter: FilterState = {
      statusIds: new Set([1, 2]),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };

    const hydrated = hydrateFilterState(filter, boardData);
    expect(hydrated.statusIds).toEqual([
      { id: 1, name: '未対応' },
      { id: 2, name: '処理中' },
    ]);
  });

  it('resolves assigneeIds including null as {id:null, name:"(未割当)"}', () => {
    const boardData = makeBoardData([
      makeIssue({ id: 1, assignee: makeAssignee(42, 'yamada') }),
    ]);
    const filter: FilterState = {
      statusIds: new Set(),
      assigneeIds: new Set<number | null>([42, null]),
      categoryIds: new Set(),
    };

    const hydrated = hydrateFilterState(filter, boardData);
    expect(hydrated.assigneeIds).toEqual([
      { id: 42, name: 'yamada' },
      { id: null, name: '(未割当)' },
    ]);
  });

  it('resolves categoryIds to [{id, name}]', () => {
    const boardData = makeBoardData([
      makeIssue({ id: 1, category: [makeCategory(7, 'backend')] }),
    ]);
    const filter: FilterState = {
      statusIds: new Set(),
      assigneeIds: new Set(),
      categoryIds: new Set([7]),
    };

    const hydrated = hydrateFilterState(filter, boardData);
    expect(hydrated.categoryIds).toEqual([{ id: 7, name: 'backend' }]);
  });

  it('falls back to {id, name:"(不明)"} when lookup fails for any axis', () => {
    const boardData = makeBoardData([
      makeIssue({
        id: 1,
        status: makeStatus(1, '未対応'),
        assignee: makeAssignee(42, 'yamada'),
        category: [makeCategory(7, 'backend')],
      }),
    ]);
    const filter: FilterState = {
      statusIds: new Set([99]),
      assigneeIds: new Set<number | null>([123]),
      categoryIds: new Set([55]),
    };

    const hydrated = hydrateFilterState(filter, boardData);
    expect(hydrated.statusIds).toEqual([{ id: 99, name: '(不明)' }]);
    expect(hydrated.assigneeIds).toEqual([{ id: 123, name: '(不明)' }]);
    expect(hydrated.categoryIds).toEqual([{ id: 55, name: '(不明)' }]);
  });

  it('preserves Set insertion order in output', () => {
    const boardData = makeBoardData([
      makeIssue({ id: 1, status: makeStatus(1, '未対応') }),
      makeIssue({ id: 2, status: makeStatus(2, '処理中') }),
      makeIssue({ id: 3, status: makeStatus(3, '完了') }),
    ]);
    const filter: FilterState = {
      statusIds: new Set([3, 1, 2]),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };

    const hydrated = hydrateFilterState(filter, boardData);
    expect(hydrated.statusIds.map((s) => s.id)).toEqual([3, 1, 2]);
  });
});

// ----- groupSlotToSnapshot -------------------------------------------------

describe('groupSlotToSnapshot', () => {
  const makeGroupSlot = (): GroupSlot => {
    const groupId: GroupId = 'group:abc-123';
    const group: Group = {
      id: groupId,
      memberIds: [201, 202, 203],
      laneId: 'milestone-10',
    };
    const m1 = makeIssue({ id: 201, summary: 'member 1' });
    const m2 = makeIssue({ id: 202, summary: 'member 2' });
    // visibleMembers intentionally excludes 203 to show subset handling
    return {
      kind: 'group',
      group,
      representativeIssue: m1,
      visibleMembers: [m1, m2],
      totalMembers: 3,
      badgeText: '2/3',
    };
  };

  it('converts GroupSlot to {kind, groupId, memberIds, members} (T-10-01-04)', () => {
    const slot = makeGroupSlot();
    const out = groupSlotToSnapshot(slot);

    // narrow to the group variant of the discriminated union
    if (Array.isArray((out as { memberIds?: unknown }).memberIds) === false) {
      throw new Error('expected group snapshot variant');
    }
    const groupOut = out as Extract<SnapshotLaneItem, { kind: 'group' }>;
    expect(groupOut.kind).toBe('group');
    expect(groupOut.groupId).toBe('group:abc-123');
    expect(groupOut.memberIds).toEqual([201, 202, 203]);
  });

  it('maps visibleMembers via trimIssue (each member is a TrimmedIssue)', () => {
    const slot = makeGroupSlot();
    const out = groupSlotToSnapshot(slot) as Extract<
      SnapshotLaneItem,
      { kind: 'group' }
    >;

    expect(out.members).toHaveLength(2);
    const first = out.members[0] as TrimmedIssue;
    expect(first.id).toBe(201);
    expect(first.issueKey).toBe('PROJ-201');
    expect(first).not.toHaveProperty('description');
    expect(first).not.toHaveProperty('created');
    expect(first).not.toHaveProperty('updated');
    expect(first).not.toHaveProperty('projectId');
  });

  it('omits representativeIssue, totalMembers, badgeText from the snapshot output', () => {
    const slot = makeGroupSlot();
    const out = groupSlotToSnapshot(slot) as Extract<
      SnapshotLaneItem,
      { kind: 'group' }
    >;
    const keys = Object.keys(out);
    expect(keys).not.toContain('representativeIssue');
    expect(keys).not.toContain('totalMembers');
    expect(keys).not.toContain('badgeText');
    // allowlist shape: only the 4 D-08 fields
    expect(new Set(keys)).toEqual(
      new Set(['kind', 'groupId', 'memberIds', 'members']),
    );
  });

  it('produces a new memberIds array (does not reuse group.memberIds reference)', () => {
    const slot = makeGroupSlot();
    const out = groupSlotToSnapshot(slot) as Extract<
      SnapshotLaneItem,
      { kind: 'group' }
    >;
    expect(out.memberIds).toEqual(slot.group.memberIds);
    expect(out.memberIds).not.toBe(slot.group.memberIds);
  });
});
