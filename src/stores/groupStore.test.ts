import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useGroupStore,
  generateGroupId,
  insertMemberSorted,
} from './groupStore';
import { loadGroupConfig, saveGroupConfig } from '../services/groupStorage';
import type { BacklogIssue } from '../types/backlog';
import type { GroupMap } from '../types/group';

vi.mock('../services/groupStorage', () => ({
  loadGroupConfig: vi.fn(),
  saveGroupConfig: vi.fn().mockResolvedValue(undefined),
}));

function makeIssue(id: number, keyId: number): BacklogIssue {
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
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useGroupStore.setState({ groups: {} });
});

describe('generateGroupId', () => {
  it('returns id matching `group:{timestamp}-{6char}` shape', () => {
    const id = generateGroupId();
    expect(id).toMatch(/^group:\d+-[a-z0-9]{1,6}$/);
  });

  it('produces unique ids on repeated calls within same millisecond', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      ids.add(generateGroupId());
    }
    expect(ids.size).toBe(50);
  });
});

describe('insertMemberSorted', () => {
  it('inserts new member sorted by keyId', () => {
    const allIssues = [makeIssue(1, 10), makeIssue(2, 20), makeIssue(3, 5)];
    const result = insertMemberSorted([1, 2], 3, allIssues);
    expect(result).toEqual([3, 1, 2]);
  });

  it('returns same reference when issueId already present (no-op)', () => {
    const memberIds = [1, 2];
    const allIssues = [makeIssue(1, 10), makeIssue(2, 20)];
    const result = insertMemberSorted(memberIds, 1, allIssues);
    expect(result).toBe(memberIds);
  });

  it('returns same reference when issueId not found in allIssues', () => {
    const memberIds = [1, 2];
    const allIssues = [makeIssue(1, 10), makeIssue(2, 20)];
    const result = insertMemberSorted(memberIds, 99, allIssues);
    expect(result).toBe(memberIds);
  });

  it('appends new member to the end if its keyId is greatest', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const result = insertMemberSorted([1, 2], 3, allIssues);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('groupStore.createGroup', () => {
  it('creates a new group with keyId-sorted memberIds', () => {
    const allIssues = [makeIssue(1, 50), makeIssue(2, 10)];

    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);

    expect(id).toMatch(/^group:/);
    const group = id ? useGroupStore.getState().groups[id] : null;
    expect(group).toEqual({
      id,
      memberIds: [2, 1], // keyId 10 (id=2) before keyId 50 (id=1)
      laneId: 'lane-1',
    });
  });

  it('returns null when both ids are the same issue', () => {
    const allIssues = [makeIssue(1, 10)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 1], 'lane-1', allIssues);
    expect(id).toBeNull();
  });

  it('returns null when one of the ids is missing from allIssues', () => {
    const allIssues = [makeIssue(1, 10)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 99], 'lane-1', allIssues);
    expect(id).toBeNull();
  });

  it('persists via saveGroupConfig (fire-and-forget)', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    useGroupStore.getState().createGroup([1, 2], 'lane-1', allIssues);
    expect(saveGroupConfig).toHaveBeenCalledOnce();
  });
});

describe('groupStore.addMember', () => {
  it('adds a 3rd member, keeping memberIds keyId-sorted', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().addMember(id, 3, allIssues);

    expect(useGroupStore.getState().groups[id]?.memberIds).toEqual([1, 2, 3]);
  });

  it('inserts new member at the correct sorted position by keyId', () => {
    const allIssues = [makeIssue(1, 10), makeIssue(2, 30), makeIssue(3, 20)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().addMember(id, 3, allIssues);

    expect(useGroupStore.getState().groups[id]?.memberIds).toEqual([1, 3, 2]);
  });

  it('is a no-op for an unknown groupId', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    useGroupStore.getState().addMember('group:does-not-exist', 1, allIssues);
    expect(useGroupStore.getState().groups).toEqual({});
  });

  it('is a no-op when issueId already member', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    vi.mocked(saveGroupConfig).mockClear();
    useGroupStore.getState().addMember(id, 1, allIssues);

    expect(useGroupStore.getState().groups[id]?.memberIds).toEqual([1, 2]);
    expect(saveGroupConfig).not.toHaveBeenCalled();
  });
});

describe('groupStore.removeMember', () => {
  it('removes a member when group still has >= 2 members', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');
    useGroupStore.getState().addMember(id, 3, allIssues);

    useGroupStore.getState().removeMember(id, 2);

    expect(useGroupStore.getState().groups[id]?.memberIds).toEqual([1, 3]);
  });

  it('auto-dissolves the group when memberIds.length < 2 (GRP-06)', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().removeMember(id, 1);

    expect(useGroupStore.getState().groups[id]).toBeUndefined();
  });

  it('is a no-op for an unknown groupId', () => {
    useGroupStore.getState().removeMember('group:nope', 1);
    expect(useGroupStore.getState().groups).toEqual({});
  });
});

describe('groupStore.dissolveGroup', () => {
  it('removes the group from groups', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().dissolveGroup(id);

    expect(useGroupStore.getState().groups[id]).toBeUndefined();
  });

  it('preserves other groups when dissolving one', () => {
    const allIssues = [
      makeIssue(1, 1),
      makeIssue(2, 2),
      makeIssue(3, 3),
      makeIssue(4, 4),
    ];
    const id1 = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    const id2 = useGroupStore
      .getState()
      .createGroup([3, 4], 'lane-1', allIssues);
    if (!id1 || !id2) throw new Error('createGroup failed');

    useGroupStore.getState().dissolveGroup(id1);

    expect(useGroupStore.getState().groups[id1]).toBeUndefined();
    expect(useGroupStore.getState().groups[id2]).toBeDefined();
  });
});

describe('groupStore.moveGroup', () => {
  it('updates the laneId and keeps memberIds unchanged', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().moveGroup(id, 'lane-2');

    const group = useGroupStore.getState().groups[id];
    expect(group?.laneId).toBe('lane-2');
    expect(group?.memberIds).toEqual([1, 2]);
  });

  it('is a no-op for an unknown groupId', () => {
    useGroupStore.getState().moveGroup('group:nope', 'lane-2');
    expect(useGroupStore.getState().groups).toEqual({});
  });
});

describe('groupStore.loadFromStorage', () => {
  it('restores groups from plugin-store', async () => {
    const stored: GroupMap = {
      'group:abc': {
        id: 'group:abc',
        memberIds: [1, 2, 3],
        laneId: 'lane-1',
      },
    };
    vi.mocked(loadGroupConfig).mockResolvedValue(stored);

    await useGroupStore.getState().loadFromStorage();

    expect(useGroupStore.getState().groups).toEqual(stored);
  });

  it('keeps groups as {} when storage returns null', async () => {
    vi.mocked(loadGroupConfig).mockResolvedValue(null);

    await useGroupStore.getState().loadFromStorage();

    expect(useGroupStore.getState().groups).toEqual({});
  });
});

describe('groupStore.reset', () => {
  it('clears all groups', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    useGroupStore.getState().createGroup([1, 2], 'lane-1', allIssues);

    useGroupStore.getState().reset();

    expect(useGroupStore.getState().groups).toEqual({});
  });
});

describe('groupStore immutability', () => {
  it('produces a new groups object reference on createGroup', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2)];
    const before = useGroupStore.getState().groups;

    useGroupStore.getState().createGroup([1, 2], 'lane-1', allIssues);

    const after = useGroupStore.getState().groups;
    expect(after).not.toBe(before);
  });

  it('produces a new groups object reference on addMember', () => {
    const allIssues = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    const before = useGroupStore.getState().groups;
    useGroupStore.getState().addMember(id, 3, allIssues);
    const after = useGroupStore.getState().groups;

    expect(after).not.toBe(before);
  });

  it('all mutating actions invoke saveGroupConfig (fire-and-forget)', () => {
    const allIssues = [
      makeIssue(1, 1),
      makeIssue(2, 2),
      makeIssue(3, 3),
      makeIssue(4, 4),
    ];

    const id = useGroupStore
      .getState()
      .createGroup([1, 2], 'lane-1', allIssues);
    if (!id) throw new Error('createGroup failed');

    useGroupStore.getState().addMember(id, 3, allIssues);
    useGroupStore.getState().moveGroup(id, 'lane-2');
    useGroupStore.getState().removeMember(id, 3);
    useGroupStore.getState().dissolveGroup(id);

    expect(saveGroupConfig).toHaveBeenCalled();
    expect(vi.mocked(saveGroupConfig).mock.calls.length).toBeGreaterThanOrEqual(
      4,
    );
  });
});
