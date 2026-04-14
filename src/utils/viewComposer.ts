import type { BacklogIssue, BacklogMilestone } from '../types/backlog';
import type { BoardData } from '../types/board';
import type { FilterState } from '../types/filter';
import type { SortField, SortDirection } from '../types/sort';
import type { ReorderMap } from '../types/reorder';
import type { GroupMap, GroupSlot, GroupId } from '../types/group';
import { applyFilters } from './filterUtils';
import { applySortToIssues } from './sortUtils';
import { applyCustomOrder } from './reorderUtils';
import { applyGroupExpansion } from './groupUtils';

/**
 * D-16: Board.tsx の `filteredAndSortedView` useMemo を pure function として抽出した共有 composer。
 *
 * Phase 10 以降の snapshotBuilder と Board.tsx の両方が同じ helper を呼ぶことで、
 * 「画面と snapshot で異なる view が出る」バグを構造的に不可能にする。
 *
 * stores に依存しない。呼び出し側が各 store から `.getState()` で値を集めて渡す。
 */

/** 1 マイルストーン分の view。Lane コンポーネントが直接消費できる shape。 */
export interface ComposedLane {
  milestone: BacklogMilestone;
  items: Array<BacklogIssue | GroupSlot>;
  hiddenCount: number;
}

/** 未割り当てレーンの view。 */
export interface ComposedUnassigned {
  items: Array<BacklogIssue | GroupSlot>;
  hiddenCount: number;
}

/** composeView の戻り値。Board.tsx の filteredAndSortedView useMemo と構造的に等価。 */
export interface ComposedView {
  milestones: ComposedLane[];
  unassigned: ComposedUnassigned;
}

/** composeView の入力。各 store から集めた値の束。 */
export interface ComposeViewInput {
  boardData: BoardData;
  filter: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  orderMap: ReorderMap;
  groups: GroupMap;
}

/**
 * フィルタ → ソート → カスタム並び替え → グループ展開の 4 段パイプラインを
 * 各レーンに適用して ComposedView を返す。
 *
 * Board.tsx L493-L565 の filteredAndSortedView useMemo と構造的に同一の出力を保証する。
 * 呼び出し側は戻り値をそのまま Lane / Card / GroupCard に props として渡せる。
 */
export function composeView(input: ComposeViewInput): ComposedView {
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
      const laneId = `milestone-${mwi.milestone.id}`;
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

/**
 * ComposedView 内の全レーン (unassigned + 全 milestone) を走査し、
 * 指定された groupId に一致する GroupSlot を返す。見つからなければ null。
 *
 * 参照同一性を保つ: 戻り値は view 内に存在する GroupSlot の参照そのもの。
 */
export function findGroupSlotInView(
  view: ComposedView,
  groupId: GroupId,
): GroupSlot | null {
  const allLanes: Array<Array<BacklogIssue | GroupSlot>> = [
    view.unassigned.items,
    ...view.milestones.map((m) => m.items),
  ];
  for (const items of allLanes) {
    for (const item of items) {
      if ('kind' in item && item.kind === 'group' && item.group.id === groupId) {
        return item;
      }
    }
  }
  return null;
}
