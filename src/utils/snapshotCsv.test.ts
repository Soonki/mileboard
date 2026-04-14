import { describe, it, expect } from 'vitest';
import { buildCsvSnapshot, csvEscape, CSV_BOM } from './snapshotCsv';
import type { SnapshotCsvInput } from './snapshotCsv';
import type { ComposedView } from './viewComposer';
import type {
  BacklogIssue,
  BacklogCategory,
  BacklogMilestone,
  BacklogStatus,
  BacklogUser,
} from '../types/backlog';
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
  milestone: [makeMilestone(10, 'v1.2')],
  category: o.category ?? [makeCategory(7, 'backend')],
  startDate: o.startDate === undefined ? null : o.startDate,
  dueDate: o.dueDate === undefined ? '2026-05-01' : o.dueDate,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-02-01T00:00:00Z',
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
): ComposedView => ({
  milestones: milestoneLanes.map((l) => ({
    milestone: l.milestone,
    items: l.items,
    hiddenCount: l.hiddenCount ?? 0,
  })),
  unassigned: {
    items: unassignedItems,
    hiddenCount: 0,
  },
});

const baseInput = (
  overrides: Partial<SnapshotCsvInput> = {},
): SnapshotCsvInput => {
  const issue = makeIssue({ id: 1, summary: 'first' });
  const composedView = makeComposedView([issue]);
  return { composedView, ...overrides };
};

// ----- csvEscape ----------------------------------------------------------

describe('csvEscape', () => {
  it('Test 1: returns raw field when no special chars', () => {
    expect(csvEscape('hello world')).toBe('hello world');
  });

  it('Test 2: wraps in quotes when containing comma', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('Test 3: escapes internal quotes by doubling', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('Test 4: wraps in quotes when containing LF', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('Test 5: wraps in quotes when containing CRLF', () => {
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"');
  });

  it('Test 6: handles empty string', () => {
    expect(csvEscape('')).toBe('');
  });

  it('Test 7: preserves Japanese characters unchanged', () => {
    expect(csvEscape('未対応')).toBe('未対応');
  });

  it('Test 8: preserves fullwidth comma as-is (no escaping)', () => {
    expect(csvEscape('未対応、処理中')).toBe('未対応、処理中');
  });

  it('Test 9: escapes halfwidth comma', () => {
    expect(csvEscape('todo, doing')).toBe('"todo, doing"');
  });
});

// ----- buildCsvSnapshot ---------------------------------------------------

describe('buildCsvSnapshot', () => {
  it('Test 10: output starts with UTF-8 BOM \\uFEFF', () => {
    const out = buildCsvSnapshot(baseInput());
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out.startsWith('\uFEFF')).toBe(true);
  });

  it('Test 11: uses CRLF as row separator (RFC 4180)', () => {
    const out = buildCsvSnapshot(baseInput());
    expect(out).toContain('\r\n');
  });

  it('Test 12: header row is lane,issueKey,summary,status,assignee,priority,dueDate,startDate,category,groupId', () => {
    const out = buildCsvSnapshot(baseInput());
    const withoutBom = out.slice(1); // strip BOM
    const firstLine = withoutBom.split('\r\n')[0];
    expect(firstLine).toBe(
      'lane,issueKey,summary,status,assignee,priority,dueDate,startDate,category,groupId',
    );
  });

  it('Test 13: each issue row has 10 columns', () => {
    const issue = makeIssue({ id: 1 });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    const lines = out.slice(1).split('\r\n');
    const dataRow = lines[1]; // after header
    expect(dataRow.split(',')).toHaveLength(10);
  });

  it('Test 14: multiple categories join with semicolon in single cell', () => {
    const issue = makeIssue({
      id: 1,
      category: [makeCategory(7, 'a'), makeCategory(8, 'b')],
    });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    expect(out).toContain('a; b');
  });

  it('Test 15: category with comma is quoted + internal escape', () => {
    const issue = makeIssue({
      id: 1,
      category: [
        makeCategory(7, 'a,b'),
        makeCategory(8, 'c'),
      ],
    });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    // "a,b; c" has a comma -> entire cell is quoted
    expect(out).toContain('"a,b; c"');
  });

  it('Test 16: dueDate=null renders empty cell', () => {
    const issue = makeIssue({ id: 1, dueDate: null });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    const lines = out.slice(1).split('\r\n');
    const cols = lines[1].split(',');
    // dueDate is index 6 (lane,issueKey,summary,status,assignee,priority,dueDate,...)
    expect(cols[6]).toBe('');
  });

  it('Test 17: assignee=null renders empty cell', () => {
    const issue = makeIssue({ id: 1, assignee: null });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    const lines = out.slice(1).split('\r\n');
    const cols = lines[1].split(',');
    // assignee is index 4
    expect(cols[4]).toBe('');
  });

  it('Test 18: non-group card has empty groupId column', () => {
    const issue = makeIssue({ id: 1 });
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([issue]) }),
    );
    const lines = out.slice(1).split('\r\n');
    const cols = lines[1].split(',');
    // groupId is the last (index 9) column
    expect(cols[9]).toBe('');
  });

  it('Test 19: group member rows carry groupId in column 9', () => {
    const m1 = makeIssue({ id: 11 });
    const m2 = makeIssue({ id: 12 });
    const slot = makeSlot('group:xxx' as GroupId, 'unassigned', [m1, m2]);
    const out = buildCsvSnapshot(
      baseInput({ composedView: makeComposedView([slot]) }),
    );
    const lines = out.slice(1).split('\r\n');
    // Header(1) + 2 member rows
    expect(lines[1].split(',')[9]).toBe('group:xxx');
    expect(lines[2].split(',')[9]).toBe('group:xxx');
  });

  it('Test 20: lane column is 未割り当て for unassigned, milestone.name for milestone lane', () => {
    const ms = makeMilestone(10, 'v1.2');
    const unassignedIssue = makeIssue({ id: 1 });
    const msIssue = makeIssue({ id: 2 });
    const composedView = makeComposedView(
      [unassignedIssue],
      [{ milestone: ms, items: [msIssue] }],
    );
    const out = buildCsvSnapshot({ composedView });
    const lines = out.slice(1).split('\r\n');
    // Row 1: unassigned
    expect(lines[1].split(',')[0]).toBe('未割り当て');
    // Row 2: milestone
    expect(lines[2].split(',')[0]).toBe('v1.2');
  });

  it('Test 21: BOM prefix is emitted exactly once (pitfall 6 regression)', () => {
    const out = buildCsvSnapshot(baseInput());
    expect(out.indexOf('\uFEFF')).toBe(0);
    expect(out.indexOf('\uFEFF', 1)).toBe(-1);
  });

  it('CSV_BOM constant equals \\uFEFF', () => {
    expect(CSV_BOM).toBe('\uFEFF');
    expect(CSV_BOM.length).toBe(1);
  });
});
