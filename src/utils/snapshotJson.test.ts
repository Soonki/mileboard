import { describe, it, expect } from 'vitest';
import { buildJsonSnapshot, toIsoLocal } from './snapshotJson';
import type { SnapshotJsonInput } from './snapshotJson';
import type { ComposedView } from './viewComposer';
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
  summary: o.summary ?? 'issue ' + (o.id ?? 100),
  description: 'internal description',
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

const emptyFilter = (): FilterState => ({
  statusIds: new Set<number>(),
  assigneeIds: new Set<number | null>(),
  categoryIds: new Set<number>(),
});

const makeBoardData = (
  unassigned: BacklogIssue[],
  milestones: Array<{ milestone: BacklogMilestone; issues: BacklogIssue[] }> = [],
): BoardData => ({
  milestones,
  unassignedIssues: unassigned,
});

const makeSlot = (
  groupId: GroupId,
  laneId: string,
  members: BacklogIssue[],
): GroupSlot => {
  const group: Group = {
    id: groupId,
    memberIds: members.map((m) => m.id),
    laneId,
  };
  return {
    kind: 'group',
    group,
    representativeIssue: members[0],
    visibleMembers: members,
    totalMembers: members.length,
    badgeText: String(members.length),
  };
};

const makeComposedView = (
  unassignedItems: ComposedView['unassigned']['items'],
  milestoneLanes: Array<{
    milestone: BacklogMilestone;
    items: ComposedView['milestones'][number]['items'];
    hiddenCount?: number;
  }> = [],
  unassignedHidden = 0,
): ComposedView => ({
  milestones: milestoneLanes.map((l) => ({
    milestone: l.milestone,
    items: l.items,
    hiddenCount: l.hiddenCount ?? 0,
  })),
  unassigned: {
    items: unassignedItems,
    hiddenCount: unassignedHidden,
  },
});

const baseInput = (
  overrides: Partial<SnapshotJsonInput> = {},
): SnapshotJsonInput => {
  const issue = makeIssue({ id: 1, summary: 'first' });
  const boardData = makeBoardData([issue]);
  const composedView = makeComposedView([issue]);
  return {
    boardData,
    composedView,
    boardRevision: 42,
    filter: emptyFilter(),
    sortField: 'none',
    sortDirection: 'asc',
    orderMap: {},
    groups: {},
    uiMode: 'sort',
    milestonePrefix: 'v1.',
    projectKey: 'MILEBOARD',
    now: new Date('2026-04-14T07:55:12+09:00'),
    ...overrides,
  };
};

// ----- toIsoLocal ----------------------------------------------------------

describe('toIsoLocal', () => {
  it('matches YYYY-MM-DDTHH:mm:ss[+-]HH:mm pattern', () => {
    const s = toIsoLocal(new Date('2026-04-14T07:55:12+09:00'));
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});

// ----- buildJsonSnapshot ---------------------------------------------------

describe('buildJsonSnapshot', () => {
  it('Test 1: includes schemaVersion "1.0" as string', () => {
    const out = buildJsonSnapshot(baseInput());
    expect(out).toContain('"schemaVersion": "1.0"');
    const parsed = JSON.parse(out) as { schemaVersion: string };
    expect(parsed.schemaVersion).toBe('1.0');
  });

  it('Test 2: snapshotAt is ISO-8601 local with offset', () => {
    const out = buildJsonSnapshot(baseInput());
    const parsed = JSON.parse(out) as { snapshotAt: string };
    expect(parsed.snapshotAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    );
  });

  it('Test 3: boardRevision matches input', () => {
    const out = buildJsonSnapshot(baseInput({ boardRevision: 77 }));
    const parsed = JSON.parse(out) as { boardRevision: number };
    expect(parsed.boardRevision).toBe(77);
  });

  it('Test 4: meta.projectKey matches input', () => {
    const out = buildJsonSnapshot(baseInput({ projectKey: 'ACME' }));
    const parsed = JSON.parse(out) as { meta: { projectKey: string } };
    expect(parsed.meta.projectKey).toBe('ACME');
  });

  it('Test 5: meta.milestonePrefix matches input', () => {
    const out = buildJsonSnapshot(baseInput({ milestonePrefix: 'rel-' }));
    const parsed = JSON.parse(out) as { meta: { milestonePrefix: string } };
    expect(parsed.meta.milestonePrefix).toBe('rel-');
  });

  it('Test 6: meta.viewState.filter is HydratedFilterState shape', () => {
    const issue = makeIssue({
      id: 1,
      status: makeStatus(1, '未対応'),
      assignee: makeAssignee(42, 'yamada'),
      category: [makeCategory(7, 'backend')],
    });
    const filter: FilterState = {
      statusIds: new Set([1]),
      assigneeIds: new Set<number | null>([42]),
      categoryIds: new Set([7]),
    };
    const input = baseInput({
      boardData: makeBoardData([issue]),
      composedView: makeComposedView([issue]),
      filter,
    });
    const out = buildJsonSnapshot(input);
    const parsed = JSON.parse(out) as {
      meta: {
        viewState: {
          filter: {
            statusIds: Array<{ id: number; name: string }>;
            assigneeIds: Array<{ id: number | null; name: string }>;
            categoryIds: Array<{ id: number; name: string }>;
          };
        };
      };
    };
    expect(parsed.meta.viewState.filter.statusIds).toEqual([
      { id: 1, name: '未対応' },
    ]);
    expect(parsed.meta.viewState.filter.assigneeIds).toEqual([
      { id: 42, name: 'yamada' },
    ]);
    expect(parsed.meta.viewState.filter.categoryIds).toEqual([
      { id: 7, name: 'backend' },
    ]);
  });

  it('Test 7: meta.viewState.sort preserves field + direction', () => {
    const out = buildJsonSnapshot(
      baseInput({ sortField: 'dueDate', sortDirection: 'desc' }),
    );
    const parsed = JSON.parse(out) as {
      meta: { viewState: { sort: { field: string; direction: string } } };
    };
    expect(parsed.meta.viewState.sort).toEqual({
      field: 'dueDate',
      direction: 'desc',
    });
  });

  it('Test 8: meta.viewState.reorder is structurally equal to input.orderMap', () => {
    const out = buildJsonSnapshot(
      baseInput({ orderMap: { 'milestone-10': [1, 2, 3] } }),
    );
    const parsed = JSON.parse(out) as {
      meta: { viewState: { reorder: Record<string, number[]> } };
    };
    expect(parsed.meta.viewState.reorder['milestone-10']).toEqual([1, 2, 3]);
  });

  it('Test 9: meta.viewState.groups contains the full GroupMap (D-08)', () => {
    const groups = {
      'group:abc-123': {
        id: 'group:abc-123' as GroupId,
        memberIds: [1, 2],
        laneId: 'milestone-10',
      },
    };
    const out = buildJsonSnapshot(baseInput({ groups }));
    const parsed = JSON.parse(out) as {
      meta: {
        viewState: {
          groups: Record<
            string,
            { id: string; memberIds: number[]; laneId: string }
          >;
        };
      };
    };
    expect(parsed.meta.viewState.groups['group:abc-123']).toEqual({
      id: 'group:abc-123',
      memberIds: [1, 2],
      laneId: 'milestone-10',
    });
  });

  it('Test 10: meta.viewState.uiMode is sort or group', () => {
    const outGroup = buildJsonSnapshot(baseInput({ uiMode: 'group' }));
    const parsedGroup = JSON.parse(outGroup) as {
      meta: { viewState: { uiMode: string } };
    };
    expect(parsedGroup.meta.viewState.uiMode).toBe('group');

    const outSort = buildJsonSnapshot(baseInput({ uiMode: 'sort' }));
    const parsedSort = JSON.parse(outSort) as {
      meta: { viewState: { uiMode: string } };
    };
    expect(parsedSort.meta.viewState.uiMode).toBe('sort');
  });

  it('Test 11: lanes[] has unassigned lane with laneId/name/visible/hidden/items', () => {
    const issue = makeIssue({ id: 1 });
    const composedView = makeComposedView([issue], [], 2);
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData([issue]),
        composedView,
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{
        laneId: string;
        name: string;
        visible: number;
        hidden: number;
        items: unknown[];
      }>;
    };
    const unassigned = parsed.lanes.find((l) => l.laneId === 'unassigned');
    expect(unassigned).toBeDefined();
    expect(unassigned?.name).toBe('未割り当て');
    expect(unassigned?.visible).toBe(1);
    expect(unassigned?.hidden).toBe(2);
    expect(Array.isArray(unassigned?.items)).toBe(true);
  });

  it('Test 12: milestone lane uses laneId "milestone-{id}" and milestone.name', () => {
    const ms = makeMilestone(10, 'v1.2');
    const issue = makeIssue({ id: 1 });
    const composedView = makeComposedView(
      [],
      [{ milestone: ms, items: [issue] }],
    );
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData([], [{ milestone: ms, issues: [issue] }]),
        composedView,
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{ laneId: string; name: string }>;
    };
    const ms10 = parsed.lanes.find((l) => l.laneId === 'milestone-10');
    expect(ms10).toBeDefined();
    expect(ms10?.name).toBe('v1.2');
  });

  it('Test 13: lane.visible counts non-group items + group member counts', () => {
    const members = [
      makeIssue({ id: 11 }),
      makeIssue({ id: 12 }),
      makeIssue({ id: 13 }),
    ];
    const slot = makeSlot('group:abc' as GroupId, 'milestone-10', members);
    const singleton = makeIssue({ id: 20 });
    const ms = makeMilestone(10, 'v1.2');
    const composedView = makeComposedView(
      [],
      [{ milestone: ms, items: [slot, singleton] }],
    );
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData(
          [],
          [{ milestone: ms, issues: [...members, singleton] }],
        ),
        composedView,
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{ laneId: string; visible: number }>;
    };
    const ms10 = parsed.lanes.find((l) => l.laneId === 'milestone-10');
    expect(ms10?.visible).toBe(4);
  });

  it('Test 14: lane.hidden equals ComposedLane.hiddenCount', () => {
    const issue = makeIssue({ id: 1 });
    const ms = makeMilestone(10, 'v1.2');
    const composedView = makeComposedView(
      [],
      [{ milestone: ms, items: [issue], hiddenCount: 5 }],
    );
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData([], [{ milestone: ms, issues: [issue] }]),
        composedView,
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{ laneId: string; hidden: number }>;
    };
    expect(parsed.lanes.find((l) => l.laneId === 'milestone-10')?.hidden).toBe(
      5,
    );
  });

  it('Test 15: items contain trimmed issues without description', () => {
    const issue = makeIssue({ id: 1, summary: 'visible' });
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData([issue]),
        composedView: makeComposedView([issue]),
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{
        laneId: string;
        items: Array<Record<string, unknown>>;
      }>;
    };
    const item = parsed.lanes.find((l) => l.laneId === 'unassigned')?.items[0];
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('description');
    expect(item).not.toHaveProperty('created');
    expect(item).toHaveProperty('issueKey');
    expect(item).toHaveProperty('summary', 'visible');
  });

  it('Test 16: group items have kind/groupId/memberIds/members shape (D-08)', () => {
    const m1 = makeIssue({ id: 11, summary: 'm1' });
    const m2 = makeIssue({ id: 12, summary: 'm2' });
    const slot = makeSlot('group:xyz' as GroupId, 'unassigned', [m1, m2]);
    const composedView = makeComposedView([slot]);
    const out = buildJsonSnapshot(
      baseInput({
        boardData: makeBoardData([m1, m2]),
        composedView,
      }),
    );
    const parsed = JSON.parse(out) as {
      lanes: Array<{
        laneId: string;
        items: Array<{
          kind?: string;
          groupId?: string;
          memberIds?: number[];
          members?: Array<{ summary: string }>;
        }>;
      }>;
    };
    const item = parsed.lanes.find((l) => l.laneId === 'unassigned')?.items[0];
    expect(item?.kind).toBe('group');
    expect(item?.groupId).toBe('group:xyz');
    expect(item?.memberIds).toEqual([11, 12]);
    expect(item?.members).toHaveLength(2);
    expect(item?.members?.[0].summary).toBe('m1');
  });

  it('Test 17: fixed fixture matches golden snapshot', () => {
    const ms = makeMilestone(10, 'v1.2');
    const issue1 = makeIssue({ id: 1, summary: 'first', keyId: 1 });
    const issue2 = makeIssue({ id: 2, summary: 'second', keyId: 2 });
    const member1 = makeIssue({ id: 11, summary: 'member-1', keyId: 11 });
    const member2 = makeIssue({ id: 12, summary: 'member-2', keyId: 12 });
    const slot = makeSlot('group:fixed-abc' as GroupId, 'milestone-10', [
      member1,
      member2,
    ]);
    const composedView = makeComposedView(
      [issue1],
      [{ milestone: ms, items: [issue2, slot], hiddenCount: 1 }],
      0,
    );
    const input: SnapshotJsonInput = {
      boardData: makeBoardData(
        [issue1],
        [{ milestone: ms, issues: [issue2, member1, member2] }],
      ),
      composedView,
      boardRevision: 42,
      filter: emptyFilter(),
      sortField: 'none',
      sortDirection: 'asc',
      orderMap: {},
      groups: {
        'group:fixed-abc': {
          id: 'group:fixed-abc' as GroupId,
          memberIds: [11, 12],
          laneId: 'milestone-10',
        },
      },
      uiMode: 'sort',
      milestonePrefix: 'v1.',
      projectKey: 'MILEBOARD',
      now: new Date('2026-04-14T07:55:12+09:00'),
    };
    const out = buildJsonSnapshot(input);
    expect(out).toMatchSnapshot();
  });

  it('Test 18: output is valid JSON', () => {
    const out = buildJsonSnapshot(baseInput());
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('Test 19: output is indented with 2 spaces', () => {
    const out = buildJsonSnapshot(baseInput());
    expect(out).toMatch(/^\{\n {2}"schemaVersion"/);
  });
});
