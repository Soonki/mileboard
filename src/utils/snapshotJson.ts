import type { ComposedView } from './viewComposer';
import type {
  TrimmedIssue,
  SnapshotLaneItem,
  HydratedFilterState,
} from './snapshotCommon';
import {
  trimIssue,
  hydrateFilterState,
  groupSlotToSnapshot,
} from './snapshotCommon';
import { isGroupSlotItem } from '../types/group';
import type { BacklogIssue } from '../types/backlog';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';
import type { SortField, SortDirection } from '../types/sort';
import type { ReorderMap } from '../types/reorder';
import type { GroupMap, GroupSlot } from '../types/group';
import type { UiMode } from '../stores/uiModeStore';

/**
 * D-15: snapshotBuilder / MCP get_snapshot 用の pure function 入力。
 * composeView の結果を呼び出し側で組み立てて渡すことで、single view shared
 * across formats (JSON / Markdown / CSV) を保証する。
 */
export interface SnapshotJsonInput {
  boardData: BoardData;
  composedView: ComposedView;
  boardRevision: number;
  filter: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  orderMap: ReorderMap;
  groups: GroupMap;
  uiMode: UiMode;
  milestonePrefix: string;
  projectKey: string;
  /** Injection point for deterministic tests. Default: `new Date()` */
  now?: Date;
}

/** 1 レーンぶんの snapshot 表現 (envelope.lanes[] 要素)。 */
export interface SnapshotLane {
  laneId: string;
  name: string;
  visible: number;
  hidden: number;
  items: SnapshotLaneItem[];
}

/** JSON envelope の頂点型。Phase 12 の MCP get_snapshot もこの型を消費する。 */
export interface SnapshotEnvelope {
  schemaVersion: '1.0';
  snapshotAt: string;
  boardRevision: number;
  meta: {
    projectKey: string;
    milestonePrefix: string;
    viewState: {
      filter: HydratedFilterState;
      sort: { field: SortField; direction: SortDirection };
      reorder: ReorderMap;
      groups: GroupMap;
      uiMode: UiMode;
    };
  };
  lanes: SnapshotLane[];
}

/**
 * Date を ISO-8601 local string with offset (`YYYY-MM-DDTHH:mm:ss[+-]HH:mm`) に変換する。
 * ローカル TZ を保持するので UTC Z ではない。Phase 10 Open Question #4 で local+offset を採用。
 */
export function toIsoLocal(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const offsetMin = -d.getTimezoneOffset();
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const offsetH = pad(Math.floor(Math.abs(offsetMin) / 60));
  const offsetM = pad(Math.abs(offsetMin) % 60);
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${offsetSign}${offsetH}:${offsetM}`;
}

interface LaneItemsResult {
  snapshotItems: SnapshotLaneItem[];
  visibleCount: number;
}

/**
 * ComposedLane / ComposedUnassigned の items 配列を snapshot 用 items に変換する。
 * グループスロットは groupSlotToSnapshot で展開、visible count は members 数ぶん加算する
 * (D-14 の visible = 実際にユーザーが見ている card 数)。
 */
function itemsFromComposedLane(
  items: ReadonlyArray<BacklogIssue | GroupSlot>,
): LaneItemsResult {
  const snapshotItems: SnapshotLaneItem[] = [];
  let visibleCount = 0;
  for (const item of items) {
    if (isGroupSlotItem(item)) {
      const gs = groupSlotToSnapshot(item);
      snapshotItems.push(gs);
      if ('kind' in gs && gs.kind === 'group') {
        visibleCount += gs.members.length;
      }
    } else {
      snapshotItems.push(trimIssue(item));
      visibleCount += 1;
    }
  }
  return { snapshotItems, visibleCount };
}

/**
 * D-15 locked: pure function で JSON envelope 文字列を生成する。
 * `input.composedView` を単一 source of truth として lanes を構築し、
 * meta.viewState.filter は hydrate してから出力する。
 */
export function buildJsonSnapshot(input: SnapshotJsonInput): string {
  const now = input.now ?? new Date();

  const lanes: SnapshotLane[] = [];

  // Unassigned lane (常に先頭)
  const unassigned = itemsFromComposedLane(input.composedView.unassigned.items);
  lanes.push({
    laneId: 'unassigned',
    name: '未割り当て',
    visible: unassigned.visibleCount,
    hidden: input.composedView.unassigned.hiddenCount,
    items: unassigned.snapshotItems,
  });

  // Milestone lanes (composer が返した順序を維持)
  for (const lane of input.composedView.milestones) {
    const result = itemsFromComposedLane(lane.items);
    lanes.push({
      laneId: `milestone-${lane.milestone.id}`,
      name: lane.milestone.name,
      visible: result.visibleCount,
      hidden: lane.hiddenCount,
      items: result.snapshotItems,
    });
  }

  const envelope: SnapshotEnvelope = {
    schemaVersion: '1.0',
    snapshotAt: toIsoLocal(now),
    boardRevision: input.boardRevision,
    meta: {
      projectKey: input.projectKey,
      milestonePrefix: input.milestonePrefix,
      viewState: {
        filter: hydrateFilterState(input.filter, input.boardData),
        sort: { field: input.sortField, direction: input.sortDirection },
        reorder: input.orderMap,
        groups: input.groups,
        uiMode: input.uiMode,
      },
    },
    lanes,
  };

  return JSON.stringify(envelope, null, 2);
}

// Re-export shared types for consumers.
export type { TrimmedIssue, SnapshotLaneItem };
