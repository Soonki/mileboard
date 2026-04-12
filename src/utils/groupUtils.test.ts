import { describe, it, expect } from 'vitest';
import {
  resolveRepresentativeCard,
  applyGroupExpansion,
  pruneStaleMembers,
  rejectMultiMilestoneMember,
} from './groupUtils';
import type { BacklogIssue } from '../types/backlog';
import type { Group, GroupMap, GroupSlot } from '../types/group';
import type { ReorderEntry } from '../types/reorder';

function makeIssue(
  id: number,
  keyId: number,
  milestones: string[] = [],
): BacklogIssue {
  return {
    id,
    projectId: 1,
    issueKey: `TEST-${id}`,
    keyId,
    summary: `Issue ${id}`,
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '未対応',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: null,
    assignee: null,
    milestone: milestones.map((name, i) => ({
      id: i + 100,
      projectId: 1,
      name,
      description: null,
      startDate: null,
      releaseDueDate: null,
      archived: false,
      displayOrder: 0,
    })),
    category: [],
    startDate: null,
    dueDate: null,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  };
}

function makeGroup(
  shortId: string,
  memberIds: number[],
  laneId: string,
): Group {
  return { id: `group:${shortId}`, memberIds, laneId };
}

describe('resolveRepresentativeCard', () => {
  it('returns the visible member with the smallest keyId', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const visible = [makeIssue(1, 50), makeIssue(2, 10), makeIssue(3, 30)];

    const result = resolveRepresentativeCard(group, visible);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(2);
  });

  it('returns null when none of the members are visible', () => {
    const group = makeGroup('a', [1, 2], 'lane-1');
    const visible = [makeIssue(99, 1)];

    const result = resolveRepresentativeCard(group, visible);

    expect(result).toBeNull();
  });

  it('Q2 fallback — picks visible member with smallest keyId even if global min is hidden', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    // id=1 (keyId 5) is the global min, but it's hidden by the filter
    const visible = [makeIssue(2, 10), makeIssue(3, 20)];

    const result = resolveRepresentativeCard(group, visible);

    expect(result?.id).toBe(2);
  });

  it('returns the only visible member when only one survives the filter', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const visible = [makeIssue(3, 100)];

    const result = resolveRepresentativeCard(group, visible);

    expect(result?.id).toBe(3);
  });
});

describe('rejectMultiMilestoneMember', () => {
  it('returns false when no milestones match the prefix', () => {
    const issue = makeIssue(1, 1, ['Other-1', 'Other-2']);
    expect(rejectMultiMilestoneMember(issue, 'v1.')).toBe(false);
  });

  it('returns false when exactly one milestone matches the prefix', () => {
    const issue = makeIssue(1, 1, ['v1.0', 'Other']);
    expect(rejectMultiMilestoneMember(issue, 'v1.')).toBe(false);
  });

  it('returns true when two or more milestones match the prefix', () => {
    const issue = makeIssue(1, 1, ['v1.0', 'v1.1', 'Other']);
    expect(rejectMultiMilestoneMember(issue, 'v1.')).toBe(true);
  });

  it('does not count milestones that do not start with the prefix', () => {
    const issue = makeIssue(1, 1, ['v2.0', 'v2.1']);
    expect(rejectMultiMilestoneMember(issue, 'v1.')).toBe(false);
  });
});

describe('pruneStaleMembers', () => {
  it('removes member ids that are not present in allIssues', () => {
    const groups: GroupMap = {
      'group:a': {
        id: 'group:a',
        memberIds: [1, 2, 99], // 99 was deleted upstream
        laneId: 'lane-1',
      },
    };
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];

    const result = pruneStaleMembers(groups, allIssues);

    expect(result['group:a']?.memberIds).toEqual([1, 2]);
  });

  it('removes the entire group when memberIds drops below 2', () => {
    const groups: GroupMap = {
      'group:a': {
        id: 'group:a',
        memberIds: [1, 99],
        laneId: 'lane-1',
      },
    };
    const allIssues = [makeIssue(1, 1)];

    const result = pruneStaleMembers(groups, allIssues);

    expect(result['group:a']).toBeUndefined();
  });

  it('returns same group reference when no members are stale (optimization)', () => {
    const groups: GroupMap = {
      'group:a': {
        id: 'group:a',
        memberIds: [1, 2],
        laneId: 'lane-1',
      },
    };
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];

    const result = pruneStaleMembers(groups, allIssues);

    expect(result['group:a']).toBe(groups['group:a']);
  });

  it('does not mutate the input GroupMap', () => {
    const groups: GroupMap = {
      'group:a': {
        id: 'group:a',
        memberIds: [1, 2, 99],
        laneId: 'lane-1',
      },
    };
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];

    pruneStaleMembers(groups, allIssues);

    expect(groups['group:a']?.memberIds).toEqual([1, 2, 99]);
  });

  it('preserves intact groups while pruning others', () => {
    const groups: GroupMap = {
      'group:a': {
        id: 'group:a',
        memberIds: [1, 2],
        laneId: 'lane-1',
      },
      'group:b': {
        id: 'group:b',
        memberIds: [3, 99],
        laneId: 'lane-1',
      },
      'group:c': {
        id: 'group:c',
        memberIds: [3, 4, 99],
        laneId: 'lane-2',
      },
    };
    const allIssues = [
      makeIssue(1, 1),
      makeIssue(2, 2),
      makeIssue(3, 3),
      makeIssue(4, 4),
    ];

    const result = pruneStaleMembers(groups, allIssues);

    expect(result['group:a']).toBe(groups['group:a']); // intact
    expect(result['group:b']).toBeUndefined(); // dropped to 1 → dissolved
    expect(result['group:c']?.memberIds).toEqual([3, 4]); // pruned but kept
  });
});

describe('applyGroupExpansion', () => {
  it('produces N badge when all members are visible', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const savedEntries: ReorderEntry[] = ['group:a'];

    const { items, hiddenGroupCount } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(hiddenGroupCount).toBe(0);
    expect(items).toHaveLength(1);
    const slot = items[0] as GroupSlot;
    expect(slot.kind).toBe('group');
    expect(slot.badgeText).toBe('3');
    expect(slot.totalMembers).toBe(3);
    expect(slot.visibleMembers).toHaveLength(3);
  });

  it('produces V/T badge when some members are filtered out', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const raw = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const filtered = [makeIssue(2, 2)];
    const savedEntries: ReorderEntry[] = ['group:a'];

    const { items, hiddenGroupCount } = applyGroupExpansion(
      filtered,
      raw,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(hiddenGroupCount).toBe(0);
    const slot = items[0] as GroupSlot;
    expect(slot.badgeText).toBe('1/3');
    expect(slot.visibleMembers.map((m) => m.id)).toEqual([2]);
  });

  it('drops the group entirely and increments hiddenGroupCount when all members are filtered out', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const raw = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const filtered: BacklogIssue[] = [];
    const savedEntries: ReorderEntry[] = ['group:a'];

    const { items, hiddenGroupCount } = applyGroupExpansion(
      filtered,
      raw,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(items).toHaveLength(0);
    expect(hiddenGroupCount).toBe(1);
  });

  it('ignores groups belonging to other lanes', () => {
    const groupOther = makeGroup('a', [1, 2], 'lane-OTHER');
    const groups: GroupMap = { 'group:a': groupOther };
    const issues = [makeIssue(1, 1), makeIssue(2, 2)];

    const { items, hiddenGroupCount } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      [1, 2],
    );

    expect(hiddenGroupCount).toBe(0);
    // Both issues should be rendered as plain BacklogIssues (no group slot)
    expect(items).toHaveLength(2);
    expect(items.every((i) => !('kind' in i))).toBe(true);
  });

  it('replaces a number entry with a GroupSlot when the issue belongs to a group, with no duplicate top-level rendering', () => {
    const group = makeGroup('a', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    // Saved entries reference issue 1 directly (legacy Phase 8 data)
    const savedEntries: ReorderEntry[] = [1, 2, 3];

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    // Expect: GroupSlot (replacing the first encountered group member),
    // then issue 3. Issue 2 must NOT appear at the top level.
    expect(items).toHaveLength(2);
    expect((items[0] as GroupSlot).kind).toBe('group');
    expect((items[1] as BacklogIssue).id).toBe(3);
  });

  it('appends new (un-saved) issues at the end sorted by keyId, excluding group members', () => {
    const group = makeGroup('a', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [
      makeIssue(1, 1),
      makeIssue(2, 2),
      makeIssue(4, 40),
      makeIssue(3, 30),
    ];
    const savedEntries: ReorderEntry[] = ['group:a']; // 3 and 4 are new

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(items).toHaveLength(3);
    expect((items[0] as GroupSlot).kind).toBe('group');
    expect((items[1] as BacklogIssue).id).toBe(3); // keyId 30
    expect((items[2] as BacklogIssue).id).toBe(4); // keyId 40
  });

  it('appends new (un-saved) GroupSlots to the end', () => {
    const group = makeGroup('newone', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:newone': group };
    const issues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const savedEntries: ReorderEntry[] = [3]; // group is brand new, not in savedEntries

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(items).toHaveLength(2);
    expect((items[0] as BacklogIssue).id).toBe(3);
    expect((items[1] as GroupSlot).kind).toBe('group');
  });

  it('supports multiple groups co-existing in one lane (GRP-05)', () => {
    const groupA = makeGroup('a', [1, 2], 'lane-1');
    const groupB = makeGroup('b', [3, 4], 'lane-1');
    const groups: GroupMap = { 'group:a': groupA, 'group:b': groupB };
    const issues = [
      makeIssue(1, 1),
      makeIssue(2, 2),
      makeIssue(3, 3),
      makeIssue(4, 4),
      makeIssue(5, 5),
    ];
    const savedEntries: ReorderEntry[] = ['group:a', 5, 'group:b'];

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    expect(items).toHaveLength(3);
    expect((items[0] as GroupSlot).group.id).toBe('group:a');
    expect((items[1] as BacklogIssue).id).toBe(5);
    expect((items[2] as GroupSlot).group.id).toBe('group:b');
  });

  it('produces visibleMembers sorted by keyId (popover ordering contract)', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [makeIssue(1, 30), makeIssue(2, 10), makeIssue(3, 20)];
    const savedEntries: ReorderEntry[] = ['group:a'];

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    const slot = items[0] as GroupSlot;
    expect(slot.visibleMembers.map((m) => m.id)).toEqual([2, 3, 1]); // by keyId 10, 20, 30
  });

  it('uses representativeIssue equal to keyId-min visible member', () => {
    const group = makeGroup('a', [1, 2, 3], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const raw = [makeIssue(1, 5), makeIssue(2, 10), makeIssue(3, 15)];
    // id=1 (keyId 5, the global min) is hidden by filter
    const filtered = [makeIssue(2, 10), makeIssue(3, 15)];
    const savedEntries: ReorderEntry[] = ['group:a'];

    const { items } = applyGroupExpansion(
      filtered,
      raw,
      groups,
      'lane-1',
      savedEntries,
    );

    const slot = items[0] as GroupSlot;
    expect(slot.representativeIssue.id).toBe(2);
    expect(slot.badgeText).toBe('2/3'); // 2 visible / 3 total
  });

  it('skips a group when its raw lane membership drops below 2 (e.g. cross-lane move)', () => {
    // Group says memberIds [1, 2] but only id=1 is in this lane's raw issues now
    const group = makeGroup('a', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const rawLane = [makeIssue(1, 1)];
    const filtered = [makeIssue(1, 1)];

    const { items, hiddenGroupCount } = applyGroupExpansion(
      filtered,
      rawLane,
      groups,
      'lane-1',
      ['group:a', 1],
    );

    // Group should be skipped (totalMembers < 2). Issue 1 still rendered.
    expect(hiddenGroupCount).toBe(0);
    expect(items).toHaveLength(1);
    expect((items[0] as BacklogIssue).id).toBe(1);
  });

  it('handles empty savedEntries by appending all groups and remaining issues', () => {
    const group = makeGroup('a', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      [],
    );

    expect(items).toHaveLength(2);
    // remaining issues come first (sorted), then unused group slots
    expect((items[0] as BacklogIssue).id).toBe(3);
    expect((items[1] as GroupSlot).kind).toBe('group');
  });

  it('does not duplicate group slots when savedEntries references both group:id and a member id', () => {
    const group = makeGroup('a', [1, 2], 'lane-1');
    const groups: GroupMap = { 'group:a': group };
    const issues = [makeIssue(1, 1), makeIssue(2, 2)];
    const savedEntries: ReorderEntry[] = ['group:a', 1, 2];

    const { items } = applyGroupExpansion(
      issues,
      issues,
      groups,
      'lane-1',
      savedEntries,
    );

    // group:a is rendered once; member entries 1/2 must not produce duplicate slots
    expect(items).toHaveLength(1);
    expect((items[0] as GroupSlot).kind).toBe('group');
  });
});
