import { describe, it, expect } from 'vitest';
import { buildSnapshot } from './snapshotBuilder';
import type {
  SnapshotInput,
  SnapshotFormat,
  SnapshotEnvelope,
} from './snapshotBuilder';
import type {
  BacklogIssue,
  BacklogCategory,
  BacklogMilestone,
  BacklogStatus,
  BacklogUser,
} from '../types/backlog';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';

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

const makeIssue = (id: number, summary: string): BacklogIssue => ({
  id,
  projectId: 999,
  issueKey: 'PROJ-' + id,
  keyId: id,
  summary,
  description: 'internal',
  status: makeStatus(1, '未対応'),
  priority: { id: 3, name: '中' },
  assignee: makeAssignee(42, 'yamada'),
  milestone: [makeMilestone(10, 'v1.2')],
  category: [makeCategory(7, 'backend')],
  startDate: null,
  dueDate: '2026-05-01',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-02-01T00:00:00Z',
});

const emptyFilter = (): FilterState => ({
  statusIds: new Set<number>(),
  assigneeIds: new Set<number | null>(),
  categoryIds: new Set<number>(),
});

const makeBoardData = (): BoardData => {
  const ms = makeMilestone(10, 'v1.2');
  const msIssue = makeIssue(2, 'second');
  const unassignedIssue = makeIssue(1, 'first');
  return {
    milestones: [{ milestone: ms, issues: [msIssue] }],
    unassignedIssues: [unassignedIssue],
  };
};

const baseInput = (
  overrides: Partial<SnapshotInput> = {},
): SnapshotInput => ({
  boardData: makeBoardData(),
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
});

// ----- buildSnapshot (dispatcher) -----------------------------------------

describe('buildSnapshot (dispatcher)', () => {
  it('Test 1: json format returns valid JSON string with schemaVersion="1.0"', () => {
    const out = buildSnapshot(baseInput(), 'json');
    expect(typeof out).toBe('string');
    const parsed = JSON.parse(out) as SnapshotEnvelope;
    expect(parsed.schemaVersion).toBe('1.0');
  });

  it('Test 2: markdown format starts with "# mileboard snapshot"', () => {
    const out = buildSnapshot(baseInput(), 'markdown');
    expect(out.startsWith('# mileboard snapshot')).toBe(true);
  });

  it('Test 3: csv format starts with UTF-8 BOM', () => {
    const out = buildSnapshot(baseInput(), 'csv');
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it('Test 4: all three formats reflect the same underlying composed view', () => {
    const input = baseInput();
    const jsonOut = buildSnapshot(input, 'json');
    const mdOut = buildSnapshot(input, 'markdown');
    const csvOut = buildSnapshot(input, 'csv');

    // Each format should see both lanes: the unassigned "first" issue and the
    // milestone-10 "second" issue. Verify by issueKey presence.
    expect(jsonOut).toContain('PROJ-1');
    expect(jsonOut).toContain('PROJ-2');
    expect(mdOut).toContain('| PROJ-1 |');
    expect(mdOut).toContain('| PROJ-2 |');
    expect(csvOut).toContain('PROJ-1');
    expect(csvOut).toContain('PROJ-2');
  });

  it('Test 5: SnapshotInput is shared across json/markdown/csv calls without type errors', () => {
    // Compile-time check: a single SnapshotInput value should be usable for all three formats.
    const input: SnapshotInput = baseInput();
    const formats: SnapshotFormat[] = ['json', 'markdown', 'csv'];
    for (const format of formats) {
      const out = buildSnapshot(input, format);
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it('Test 6: unknown format throws Error via exhaustive never check', () => {
    expect(() =>
      buildSnapshot(baseInput(), 'xml' as unknown as SnapshotFormat),
    ).toThrow(/Unknown snapshot format/);
  });

  it('Test 7: SnapshotInput has required fields (compile-time + runtime value presence)', () => {
    const input = baseInput();
    // Runtime property existence as a proxy for the type contract.
    expect(input.boardData).toBeDefined();
    expect(input.boardRevision).toBeDefined();
    expect(input.filter).toBeDefined();
    expect(input.sortField).toBeDefined();
    expect(input.sortDirection).toBeDefined();
    expect(input.orderMap).toBeDefined();
    expect(input.groups).toBeDefined();
    expect(input.uiMode).toBeDefined();
    expect(input.milestonePrefix).toBeDefined();
    expect(input.projectKey).toBeDefined();
    // `now` is optional, but present in our fixture.
    expect(input.now).toBeInstanceOf(Date);
  });
});
