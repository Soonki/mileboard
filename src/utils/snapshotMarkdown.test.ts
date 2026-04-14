import { describe, it, expect } from 'vitest';
import {
  buildMarkdownSnapshot,
  mdTableEscape,
} from './snapshotMarkdown';
import type { SnapshotMarkdownInput } from './snapshotMarkdown';
import type { ComposedView } from './viewComposer';
import type {
  BacklogIssue,
  BacklogCategory,
  BacklogMilestone,
  BacklogStatus,
  BacklogUser,
} from '../types/backlog';
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
  dueDate?: string | null;
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
  assignee: o.assignee === undefined ? makeAssignee(42, '山田') : o.assignee,
  milestone: [makeMilestone(10, 'v1.2')],
  category: o.category ?? [makeCategory(7, 'backend')],
  startDate: null,
  dueDate: o.dueDate === undefined ? '2026-05-01' : o.dueDate,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-02-01T00:00:00Z',
});

const emptyFilter = (): FilterState => ({
  statusIds: new Set<number>(),
  assigneeIds: new Set<number | null>(),
  categoryIds: new Set<number>(),
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
  overrides: Partial<SnapshotMarkdownInput> = {},
): SnapshotMarkdownInput => {
  const issue = makeIssue({ id: 1, summary: 'first' });
  const composedView = makeComposedView([issue]);
  return {
    composedView,
    boardRevision: 42,
    filter: emptyFilter(),
    sortField: 'none',
    sortDirection: 'asc',
    groups: {},
    uiMode: 'sort',
    projectKey: 'MILEBOARD',
    now: new Date('2026-04-14T07:55:12+09:00'),
    ...overrides,
  };
};

// ----- mdTableEscape -------------------------------------------------------

describe('mdTableEscape', () => {
  it('Test 11: escapes pipe as \\|', () => {
    expect(mdTableEscape('a|b')).toBe('a\\|b');
  });

  it('Test 12: escapes LF as <br>', () => {
    expect(mdTableEscape('line1\nline2')).toBe('line1<br>line2');
  });

  it('Test 13: escapes CRLF as <br>', () => {
    expect(mdTableEscape('line1\r\nline2')).toBe('line1<br>line2');
  });

  it('Test 14: escapes backslash first (say \\ hi)', () => {
    // '\\' -> '\\\\' happens first, so the final pipe escape '|' is '\\|'
    expect(mdTableEscape('say \\ hi')).toBe('say \\\\ hi');
  });
});

// ----- buildMarkdownSnapshot -----------------------------------------------

describe('buildMarkdownSnapshot', () => {
  it('Test 1: starts with H1 "# mileboard snapshot"', () => {
    const out = buildMarkdownSnapshot(baseInput());
    expect(out.startsWith('# mileboard snapshot\n')).toBe(true);
  });

  it('Test 2: contains **Project:** {projectKey}', () => {
    const out = buildMarkdownSnapshot(baseInput({ projectKey: 'ACME' }));
    expect(out).toContain('**Project:** ACME');
  });

  it('Test 3: contains **Generated:** {ISO timestamp}', () => {
    const out = buildMarkdownSnapshot(baseInput());
    expect(out).toMatch(
      /\*\*Generated:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}/,
    );
  });

  it('Test 4: contains **View:** filter/sort/mode/groups summary', () => {
    const filter: FilterState = {
      statusIds: new Set([1, 2]),
      assigneeIds: new Set<number | null>([42]),
      categoryIds: new Set([7]),
    };
    const out = buildMarkdownSnapshot(
      baseInput({
        filter,
        sortField: 'dueDate',
        sortDirection: 'asc',
        uiMode: 'group',
        groups: {},
      }),
    );
    expect(out).toContain(
      '**View:** filter=4 criteria sort=dueDate asc mode=group groups=0',
    );
  });

  it('Test 5: contains **Revision:** {boardRevision}', () => {
    const out = buildMarkdownSnapshot(baseInput({ boardRevision: 77 }));
    expect(out).toContain('**Revision:** 77');
  });

  it('Test 6: renders H2 per lane with visible/hidden count', () => {
    const ms = makeMilestone(10, 'v1.2');
    const issue = makeIssue({ id: 1 });
    const composedView = makeComposedView(
      [],
      [{ milestone: ms, items: [issue], hiddenCount: 3 }],
    );
    const out = buildMarkdownSnapshot(baseInput({ composedView }));
    expect(out).toContain('## v1.2 (1 件, 3 件非表示)');
  });

  it('Test 7: renders GFM table header row', () => {
    const out = buildMarkdownSnapshot(baseInput());
    expect(out).toContain(
      '| Key | Summary | Status | Assignee | Priority | Due | Group |',
    );
  });

  it('Test 8: renders GFM table separator row', () => {
    const out = buildMarkdownSnapshot(baseInput());
    expect(out).toContain('| --- | --- | --- | --- | --- | --- | --- |');
  });

  it('Test 9: normal issue row has "-" in Group column', () => {
    const issue = makeIssue({
      id: 1,
      summary: 'summary text',
      assignee: makeAssignee(42, '山田'),
      priority: { id: 3, name: '中' },
      dueDate: '2026-05-01',
    });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain(
      '| PROJ-1 | summary text | 未対応 | 山田 | 中 | 2026-05-01 | - |',
    );
  });

  it('Test 10: group member row has k/n format in Group column', () => {
    const m1 = makeIssue({ id: 11, summary: 'mem-1' });
    const m2 = makeIssue({ id: 12, summary: 'mem-2' });
    const slot = makeSlot('group:xxx-yyy' as GroupId, 'unassigned', [m1, m2]);
    const composedView = makeComposedView([slot]);
    const out = buildMarkdownSnapshot(baseInput({ composedView }));
    expect(out).toContain('group:xxx-yyy (1/2)');
    expect(out).toContain('group:xxx-yyy (2/2)');
  });

  it('Test 15: dueDate=null renders empty cell', () => {
    const issue = makeIssue({ id: 1, dueDate: null });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    // Expected row: | PROJ-1 | ... | 山田 | 中 |  | - |  (empty between pipes)
    expect(out).toMatch(/\| 中 \|\s*\| -/);
  });

  it('Test 16: assignee=null renders empty cell', () => {
    const issue = makeIssue({ id: 1, assignee: null });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toMatch(/未対応 \|\s*\| 中 /);
  });

  it('Test 17: empty category renders empty cell (N/A — no category column in MD table, covered by trimIssue)', () => {
    // Markdown table has no `Category` column (D-11 列順: Key/Summary/Status/Assignee/Priority/Due/Group)
    // This test asserts that an issue with empty category still produces a valid row without any
    // stray "category" artifact in the Markdown output.
    const issue = makeIssue({ id: 1, category: [] });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain('| PROJ-1 |');
    expect(out).not.toContain('backend');
  });

  it('Test 18: multiple categories — N/A for Markdown (no category column), asserted no leakage', () => {
    const issue = makeIssue({
      id: 1,
      category: [makeCategory(7, 'backend'), makeCategory(8, 'db')],
    });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain('| PROJ-1 |');
    // category should NOT appear in the MD table body since there is no Category column.
    expect(out.split('\n').find((l) => l.startsWith('| PROJ-1 |'))).not.toMatch(
      /backend|db/,
    );
  });

  it('Test 19: unassigned lane renders H2 "## 未割り当て (..)"', () => {
    const issue = makeIssue({ id: 1 });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue], [], 2) }),
    );
    expect(out).toContain('## 未割り当て (1 件, 2 件非表示)');
  });

  it('Test A: escapes pipe in summary via mdTableEscape', () => {
    const issue = makeIssue({ id: 1, summary: 'a|b' });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain('| a\\|b |');
  });

  it('Test B: escapes newline in summary as <br>', () => {
    const issue = makeIssue({ id: 1, summary: 'line1\nline2' });
    const out = buildMarkdownSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain('line1<br>line2');
  });
});
