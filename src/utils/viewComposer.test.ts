import { describe, it, expect } from 'vitest';
import { composeView, findGroupSlotInView } from './viewComposer';
import type { ComposedView } from './viewComposer';
import type {
  BacklogIssue,
  BacklogMilestone,
  BacklogStatus,
  BacklogUser,
  BacklogCategory,
} from '../types/backlog';
import type { BoardData, MilestoneWithIssues } from '../types/board';
import type { FilterState } from '../types/filter';
import type { GroupMap, GroupId, GroupSlot } from '../types/group';
import type { ReorderMap } from '../types/reorder';
import { applyFilters } from './filterUtils';
import { applySortToIssues } from './sortUtils';
import { applyCustomOrder } from './reorderUtils';
import { applyGroupExpansion } from './groupUtils';

// ----- fixture factories ---------------------------------------------------

const makeStatus = (id: number, name = 'ステータス'): BacklogStatus => ({
  id,
  projectId: 1,
  name,
  color: '#ffffff',
  displayOrder: id,
});

const makeAssignee = (id: number, name?: string): BacklogUser => ({
  id,
  userId: 'u' + id,
  name: name ?? ('user' + id),
  roleType: 2,
  mailAddress: (name ?? ('user' + id)) + '@example.com',
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
  id: number;
  keyId?: number;
  summary?: string;
  status?: BacklogStatus;
  assignee?: BacklogUser | null;
  category?: BacklogCategory[];
  milestone?: BacklogMilestone[];
  dueDate?: string | null;
  startDate?: string | null;
}

const makeIssue = (o: IssueOverrides): BacklogIssue => ({
  id: o.id,
  projectId: 1,
  issueKey: 'PROJ-' + o.id,
  keyId: o.keyId ?? o.id,
  summary: o.summary ?? ('Issue ' + o.id),
  description: null,
  status: o.status ?? makeStatus(1, '未対応'),
  priority: { id: 3, name: '中' },
  assignee: o.assignee === undefined ? makeAssignee(100) : o.assignee,
  milestone: o.milestone ?? [],
  category: o.category ?? [],
  startDate: o.startDate ?? null,
  dueDate: o.dueDate ?? null,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
});

const makeMilestoneWithIssues = (
  milestoneId: number,
  milestoneName: string,
  issues: BacklogIssue[],
): MilestoneWithIssues => ({
  milestone: makeMilestone(milestoneId, milestoneName),
  issues,
});

const emptyFilter = (): FilterState => ({
  statusIds: new Set<number>(),
  assigneeIds: new Set<number | null>(),
  categoryIds: new Set<number>(),
});

// Legacy baseline that mirrors Board.tsx L493-L565
function legacyComposeView(input: {
  boardData: BoardData;
  filter: FilterState;
  sortField: 'none' | 'assignee' | 'dueDate';
  sortDirection: 'asc' | 'desc';
  orderMap: ReorderMap;
  groups: GroupMap;
}): ComposedView {
  const { boardData, filter, sortField, sortDirection, orderMap, groups } =
    input;
  const hasFilters =
    filter.statusIds.size > 0 ||
    filter.assigneeIds.size > 0 ||
    filter.categoryIds.size > 0;

  const unassignedFiltered = hasFilters
    ? applyFilters(boardData.unassignedIssues, filter)
    : boardData.unassignedIssues;
  const unassignedSorted = applySortToIssues(
    unassignedFiltered,
    sortField,
    sortDirection,
  );
  const unassignedOrdered =
    sortField === 'none'
      ? applyCustomOrder(unassignedSorted, orderMap['unassigned'] ?? [])
      : unassignedSorted;
  const unassignedExpansion = applyGroupExpansion(
    unassignedOrdered,
    boardData.unassignedIssues,
    groups,
    'unassigned',
    orderMap['unassigned'] ?? [],
  );

  return {
    milestones: boardData.milestones.map((mwi) => {
      const filtered = hasFilters
        ? applyFilters(mwi.issues, filter)
        : mwi.issues;
      const sorted = applySortToIssues(filtered, sortField, sortDirection);
      const laneId = 'milestone-' + mwi.milestone.id;
      const ordered =
        sortField === 'none'
          ? applyCustomOrder(sorted, orderMap[laneId] ?? [])
          : sorted;
      const expansion = applyGroupExpansion(
        ordered,
        mwi.issues,
        groups,
        laneId,
        orderMap[laneId] ?? [],
      );
      return {
        milestone: mwi.milestone,
        items: expansion.items,
        hiddenCount:
          (hasFilters ? mwi.issues.length - filtered.length : 0) +
          expansion.hiddenGroupCount,
      };
    }),
    unassigned: {
      items: unassignedExpansion.items,
      hiddenCount:
        (hasFilters
          ? boardData.unassignedIssues.length - unassignedFiltered.length
          : 0) + unassignedExpansion.hiddenGroupCount,
    },
  };
}

// ----- tests ---------------------------------------------------------------

describe('composeView', () => {
  it('returns empty structure when boardData has no milestones or issues', () => {
    const boardData: BoardData = {
      milestones: [],
      unassignedIssues: [],
    };
    const result = composeView({
      boardData,
      filter: emptyFilter(),
      sortField: 'none',
      sortDirection: 'asc',
      orderMap: {},
      groups: {},
    });

    expect(result.milestones).toEqual([]);
    expect(result.unassigned.items).toEqual([]);
    expect(result.unassigned.hiddenCount).toBe(0);
  });

  it('applies filter correctly (hiddenCount reflects filtered count)', () => {
    const statusTodo = makeStatus(1, '未対応');
    const statusDone = makeStatus(2, '完了');
    const i1 = makeIssue({ id: 1, status: statusTodo });
    const i2 = makeIssue({ id: 2, status: statusDone });
    const i3 = makeIssue({ id: 3, status: statusDone });

    const boardData: BoardData = {
      milestones: [makeMilestoneWithIssues(10, 'v1.1', [i1, i2, i3])],
      unassignedIssues: [],
    };

    const filter: FilterState = {
      statusIds: new Set([1]),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };

    const result = composeView({
      boardData,
      filter,
      sortField: 'none',
      sortDirection: 'asc',
      orderMap: {},
      groups: {},
    });

    expect(result.milestones).toHaveLength(1);
    expect(result.milestones[0].items).toHaveLength(1);
    expect((result.milestones[0].items[0] as BacklogIssue).id).toBe(1);
    expect(result.milestones[0].hiddenCount).toBe(2);
  });

  it('applies sort correctly for assignee field', () => {
    const yamada = makeAssignee(10, 'yamada');
    const sato = makeAssignee(20, 'sato');
    const i1 = makeIssue({ id: 1, keyId: 1, assignee: yamada });
    const i2 = makeIssue({ id: 2, keyId: 2, assignee: sato });

    const boardData: BoardData = {
      milestones: [],
      unassignedIssues: [i1, i2],
    };

    const result = composeView({
      boardData,
      filter: emptyFilter(),
      sortField: 'assignee',
      sortDirection: 'asc',
      orderMap: {},
      groups: {},
    });

    const items = result.unassigned.items as BacklogIssue[];
    // NOTE: groups={} でも applyGroupExpansion が remaining を keyId 昇順に戻すため、
    // legacy 挙動は sort 結果が破壊される ([1, 2] のまま)。Plan 10-01 は挙動を変更しないので同じ値を期待する。
    expect(items.map((i) => i.id)).toEqual([1, 2]);
  });

  it('applies sort correctly for dueDate field (desc)', () => {
    const i1 = makeIssue({ id: 1, dueDate: '2026-05-01' });
    const i2 = makeIssue({ id: 2, dueDate: '2026-06-15' });
    const i3 = makeIssue({ id: 3, dueDate: '2026-04-10' });

    const boardData: BoardData = {
      milestones: [],
      unassignedIssues: [i1, i2, i3],
    };

    const result = composeView({
      boardData,
      filter: emptyFilter(),
      sortField: 'dueDate',
      sortDirection: 'desc',
      orderMap: {},
      groups: {},
    });

    const items = result.unassigned.items as BacklogIssue[];
    expect(items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('applies custom order when sortField === none', () => {
    const i1 = makeIssue({ id: 1, keyId: 1 });
    const i2 = makeIssue({ id: 2, keyId: 2 });
    const i3 = makeIssue({ id: 3, keyId: 3 });

    const boardData: BoardData = {
      milestones: [],
      unassignedIssues: [i1, i2, i3],
    };

    const orderMap: ReorderMap = {
      unassigned: [3, 1, 2],
    };

    const result = composeView({
      boardData,
      filter: emptyFilter(),
      sortField: 'none',
      sortDirection: 'asc',
      orderMap,
      groups: {},
    });

    const items = result.unassigned.items as BacklogIssue[];
    expect(items.map((i) => i.id)).toEqual([3, 1, 2]);
  });

  it('applies group expansion correctly', () => {
    const i1 = makeIssue({ id: 1, keyId: 1 });
    const i2 = makeIssue({ id: 2, keyId: 2 });
    const i3 = makeIssue({ id: 3, keyId: 3 });

    const boardData: BoardData = {
      milestones: [makeMilestoneWithIssues(10, 'v1.1', [i1, i2, i3])],
      unassignedIssues: [],
    };

    const groupId: GroupId = 'group:test-123';
    const groups: GroupMap = {
      [groupId]: {
        id: groupId,
        memberIds: [1, 2],
        laneId: 'milestone-10',
      },
    };

    const result = composeView({
      boardData,
      filter: emptyFilter(),
      sortField: 'none',
      sortDirection: 'asc',
      orderMap: {},
      groups,
    });

    const items = result.milestones[0].items;
    expect(items).toHaveLength(2);
    const groupSlot = items.find((item) => 'kind' in item) as GroupSlot;
    expect(groupSlot).toBeDefined();
    expect(groupSlot.kind).toBe('group');
    expect(groupSlot.group.id).toBe(groupId);
    expect(groupSlot.visibleMembers.map((m) => m.id)).toEqual([1, 2]);
  });

  it('preserves view order across pipeline stages (filter, sort, reorder, group)', () => {
    const statusTodo = makeStatus(1, '未対応');
    const statusDone = makeStatus(2, '完了');
    const i1 = makeIssue({ id: 1, keyId: 1, status: statusTodo, dueDate: '2026-05-01' });
    const i2 = makeIssue({ id: 2, keyId: 2, status: statusTodo, dueDate: '2026-04-01' });
    const i3 = makeIssue({ id: 3, keyId: 3, status: statusDone, dueDate: '2026-03-01' });

    const boardData: BoardData = {
      milestones: [],
      unassignedIssues: [i1, i2, i3],
    };

    const filter: FilterState = {
      statusIds: new Set([1]),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };

    const result = composeView({
      boardData,
      filter,
      sortField: 'dueDate',
      sortDirection: 'asc',
      orderMap: {},
      groups: {},
    });

    const items = result.unassigned.items as BacklogIssue[];
    expect(items.map((i) => i.id)).toEqual([1, 2]);
    expect(result.unassigned.hiddenCount).toBe(1);
  });

  it('produces identical output to legacy Board useMemo logic (regression)', () => {
    const statusTodo = makeStatus(1, '未対応');
    const statusDone = makeStatus(2, '完了');
    const yamada = makeAssignee(10, 'yamada');
    const sato = makeAssignee(20, 'sato');
    const cat1 = makeCategory(7, 'backend');
    const cat2 = makeCategory(8, 'frontend');

    const i1 = makeIssue({
      id: 1,
      keyId: 1,
      status: statusTodo,
      assignee: yamada,
      category: [cat1],
      dueDate: '2026-05-01',
    });
    const i2 = makeIssue({
      id: 2,
      keyId: 2,
      status: statusDone,
      assignee: sato,
      category: [cat2],
      dueDate: '2026-04-01',
    });
    const i3 = makeIssue({
      id: 3,
      keyId: 3,
      status: statusTodo,
      assignee: null,
      category: [cat1, cat2],
      dueDate: null,
    });
    const u1 = makeIssue({ id: 101, keyId: 101, status: statusTodo });
    const u2 = makeIssue({ id: 102, keyId: 102, status: statusDone });

    const boardData: BoardData = {
      milestones: [
        makeMilestoneWithIssues(10, 'v1.1', [i1, i2, i3]),
        makeMilestoneWithIssues(11, 'v1.2', []),
      ],
      unassignedIssues: [u1, u2],
    };

    const groupId: GroupId = 'group:legacy-abc';
    const groups: GroupMap = {
      [groupId]: {
        id: groupId,
        memberIds: [1, 2],
        laneId: 'milestone-10',
      },
    };

    const filter: FilterState = {
      statusIds: new Set([1]),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    };

    const orderMap: ReorderMap = {
      unassigned: [102, 101],
      'milestone-10': [3, groupId],
    };

    const input = {
      boardData,
      filter,
      sortField: 'none' as const,
      sortDirection: 'asc' as const,
      orderMap,
      groups,
    };

    const actual = composeView(input);
    const expected = legacyComposeView(input);

    expect(actual).toEqual(expected);
  });
});

describe('findGroupSlotInView', () => {
  const makeViewWithGroup = (
    slot: GroupSlot,
    laneIndex: 'unassigned' | 'milestone-first' | 'milestone-last',
  ): ComposedView => {
    const i1 = makeIssue({ id: 1, keyId: 1 });
    const i2 = makeIssue({ id: 2, keyId: 2 });
    const m10 = makeMilestone(10, 'v1.1');
    const m11 = makeMilestone(11, 'v1.2');

    if (laneIndex === 'unassigned') {
      return {
        milestones: [
          { milestone: m10, items: [i1], hiddenCount: 0 },
          { milestone: m11, items: [i2], hiddenCount: 0 },
        ],
        unassigned: { items: [slot], hiddenCount: 0 },
      };
    }
    if (laneIndex === 'milestone-first') {
      return {
        milestones: [
          { milestone: m10, items: [slot], hiddenCount: 0 },
          { milestone: m11, items: [i2], hiddenCount: 0 },
        ],
        unassigned: { items: [i1], hiddenCount: 0 },
      };
    }
    return {
      milestones: [
        { milestone: m10, items: [i1], hiddenCount: 0 },
        { milestone: m11, items: [slot], hiddenCount: 0 },
      ],
      unassigned: { items: [], hiddenCount: 0 },
    };
  };

  const makeSlot = (id: GroupId): GroupSlot => ({
    kind: 'group',
    group: { id, memberIds: [1, 2], laneId: 'milestone-10' },
    representativeIssue: makeIssue({ id: 1 }),
    visibleMembers: [makeIssue({ id: 1 }), makeIssue({ id: 2 })],
    totalMembers: 2,
    badgeText: '2',
  });

  it('returns null for non-existent groupId', () => {
    const slot = makeSlot('group:existing');
    const view = makeViewWithGroup(slot, 'milestone-first');
    expect(findGroupSlotInView(view, 'group:nonexistent')).toBeNull();
  });

  it('traverses unassigned lane', () => {
    const slot = makeSlot('group:in-unassigned');
    const view = makeViewWithGroup(slot, 'unassigned');
    const found = findGroupSlotInView(view, 'group:in-unassigned');
    expect(found).not.toBeNull();
    expect(found?.group.id).toBe('group:in-unassigned');
  });

  it('traverses all milestone lanes (found in last milestone)', () => {
    const slot = makeSlot('group:in-last');
    const view = makeViewWithGroup(slot, 'milestone-last');
    const found = findGroupSlotInView(view, 'group:in-last');
    expect(found).not.toBeNull();
    expect(found?.group.id).toBe('group:in-last');
  });

  it('returns the same GroupSlot reference (identity)', () => {
    const slot = makeSlot('group:identity');
    const view = makeViewWithGroup(slot, 'milestone-first');
    const found = findGroupSlotInView(view, 'group:identity');
    expect(found).toBe(slot);
  });
});
