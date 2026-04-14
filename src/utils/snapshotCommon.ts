import type { BacklogIssue } from '../types/backlog';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';
import type { GroupSlot } from '../types/group';

/**
 * D-07: issue トリム後の shape (allowlist)。
 * description / created / updated / projectId / status.color / roleType 等の
 * 内部フィールドを含まないことを explicit allowlist で強制する。
 */
export interface TrimmedIssue {
  id: number;
  issueKey: string;
  keyId: number;
  summary: string;
  status: { id: number; name: string };
  assignee: { id: number; name: string } | null;
  priority: { id: number; name: string } | null;
  dueDate: string | null;
  startDate: string | null;
  category: Array<{ id: number; name: string }>;
  milestone: Array<{ id: number; name: string }>;
}

/**
 * D-08: lane items 配列に inline される型。通常カードか、グループの snapshot 表現かの
 * discriminated union。
 */
export type SnapshotLaneItem =
  | TrimmedIssue
  | {
      kind: 'group';
      groupId: string;
      memberIds: number[];
      members: TrimmedIssue[];
    };

/**
 * D-09: hydrated filter state — ID + name のハイブリッド。
 * assigneeIds のみ null を許容する (未割当フィルタ)。
 */
export interface HydratedFilterState {
  statusIds: Array<{ id: number; name: string }>;
  assigneeIds: Array<{ id: number | null; name: string }>;
  categoryIds: Array<{ id: number; name: string }>;
}

/**
 * BacklogIssue から snapshot 用の TrimmedIssue を生成する。
 *
 * **Explicit allowlist 実装 (T-10-01-01 mitigation):**
 * spread 構文ではなく named property copy で、許可された 11 フィールドのみを出力する。
 * これにより description / created / updated / projectId / status.color 等の
 * 内部フィールドが誤って snapshot に漏洩することを型と構造の二重で防ぐ。
 */
export function trimIssue(issue: BacklogIssue): TrimmedIssue {
  return {
    id: issue.id,
    issueKey: issue.issueKey,
    keyId: issue.keyId,
    summary: issue.summary,
    status: { id: issue.status.id, name: issue.status.name },
    assignee: issue.assignee
      ? { id: issue.assignee.id, name: issue.assignee.name }
      : null,
    priority: issue.priority
      ? { id: issue.priority.id, name: issue.priority.name }
      : null,
    dueDate: issue.dueDate ?? null,
    startDate: issue.startDate ?? null,
    category: (issue.category ?? []).map((c) => ({ id: c.id, name: c.name })),
    milestone: (issue.milestone ?? []).map((m) => ({ id: m.id, name: m.name })),
  };
}

/**
 * boardData 全体から {id → name} の lookup テーブルを構築する。
 * status / assignee / category の 3 軸を 1 回のループで集約する。
 */
function buildLookupTables(boardData: BoardData): {
  statuses: Map<number, string>;
  assignees: Map<number, string>;
  categories: Map<number, string>;
} {
  const statuses = new Map<number, string>();
  const assignees = new Map<number, string>();
  const categories = new Map<number, string>();

  const allIssues: BacklogIssue[] = [
    ...boardData.unassignedIssues,
    ...boardData.milestones.flatMap((m) => m.issues),
  ];

  for (const issue of allIssues) {
    if (issue.status) statuses.set(issue.status.id, issue.status.name);
    if (issue.assignee) assignees.set(issue.assignee.id, issue.assignee.name);
    for (const c of issue.category ?? []) categories.set(c.id, c.name);
  }

  return { statuses, assignees, categories };
}

/**
 * FilterState (Set<number>) を HydratedFilterState ({id, name}[]) に変換する。
 *
 * D-09:
 *  - 出力順は Set の iteration 順 (insertion order) を保つ
 *  - assigneeIds の null (未割当フィルタ) は `{id: null, name: '(未割当)'}` として扱う
 *  - lookup 失敗時は `{id, name: '(不明)'}` でフォールバック
 */
export function hydrateFilterState(
  filter: FilterState,
  boardData: BoardData,
): HydratedFilterState {
  const { statuses, assignees, categories } = buildLookupTables(boardData);

  const statusIds = Array.from(filter.statusIds).map((id) => ({
    id,
    name: statuses.get(id) ?? '(不明)',
  }));

  const assigneeIds = Array.from(filter.assigneeIds).map((id) => {
    if (id === null) return { id: null, name: '(未割当)' };
    return { id, name: assignees.get(id) ?? '(不明)' };
  });

  const categoryIds = Array.from(filter.categoryIds).map((id) => ({
    id,
    name: categories.get(id) ?? '(不明)',
  }));

  return { statusIds, assigneeIds, categoryIds };
}

/**
 * 既存 GroupSlot (UI shape) を snapshot 用 SnapshotLaneItem (group variant) に変換する。
 *
 * **T-10-01-04 mitigation:** representativeIssue / totalMembers / badgeText の
 * UI 専用フィールドは出力に含めない (explicit allowlist)。
 * memberIds は slot.group.memberIds の浅いコピーを持つ (immutability)。
 * members は visibleMembers.map(trimIssue) で snapshot shape に変換する。
 */
export function groupSlotToSnapshot(slot: GroupSlot): SnapshotLaneItem {
  return {
    kind: 'group',
    groupId: slot.group.id,
    memberIds: [...slot.group.memberIds],
    members: slot.visibleMembers.map(trimIssue),
  };
}
