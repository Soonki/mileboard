import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  CollisionDetection,
} from '@dnd-kit/core';
import { Toaster } from 'sonner';
import { useBoardStore, findIssueInBoardData } from '../../stores/boardStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useFilterStore } from '../../stores/filterStore';
import { useSortStore } from '../../stores/sortStore';
import { useReorderStore } from '../../stores/reorderStore';
import { useGroupStore } from '../../stores/groupStore';
import { applyFilters } from '../../utils/filterUtils';
import { applySortToIssues } from '../../utils/sortUtils';
import { applyCustomOrder } from '../../utils/reorderUtils';
import {
  applyGroupExpansion,
  rejectMultiMilestoneMember,
} from '../../utils/groupUtils';
import type { BacklogIssue } from '../../types/backlog';
import type { BoardData } from '../../types/board';
import type { FilterState } from '../../types/filter';
import type { ReorderEntry, ReorderMap } from '../../types/reorder';
import type { GroupId, GroupSlot } from '../../types/group';
import { Lane } from '../Lane/Lane';
import { DragOverlayCard } from '../DragOverlayCard/DragOverlayCard';
import { BoardSkeleton } from '../BoardSkeleton/BoardSkeleton';
import { BoardError } from '../BoardError/BoardError';
import styles from './Board.module.css';

/**
 * Find which lane contains an item by its ID.
 */
function findLaneContaining(
  data: BoardData,
  itemId: number | string,
): string | null {
  const id = typeof itemId === 'string' ? Number(itemId) : itemId;
  if (data.unassignedIssues.some((i) => i.id === id)) return 'unassigned';
  for (const mwi of data.milestones) {
    if (mwi.issues.some((i) => i.id === id))
      return `milestone-${mwi.milestone.id}`;
  }
  return null;
}

/**
 * Resolve over.id to a lane ID.
 * If overId is itself a lane ID, return it directly.
 * If overId is an item ID, find the lane containing it.
 */
function resolveOverLaneId(
  data: BoardData,
  overId: number | string,
): string | null {
  const overStr = String(overId);
  if (overStr === 'unassigned' || overStr.startsWith('milestone-'))
    return overStr;
  return findLaneContaining(data, overId);
}

/**
 * Custom collision detection for kanban board.
 * pointerWithin for accurate lane boundary detection,
 * rectIntersection fallback when pointer is in the gap between lanes.
 */
const kanbanCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

/** 全レーン + unassigned の issue を 1 配列に集める（groupStore に渡す用） */
function collectAllIssues(data: BoardData): BacklogIssue[] {
  return [
    ...data.unassignedIssues,
    ...data.milestones.flatMap((m) => m.issues),
  ];
}

/** items 配列要素が GroupSlot かを判別する型ガード（narrowing helper） */
function isGroupSlotItem(
  item: BacklogIssue | GroupSlot,
): item is GroupSlot {
  return 'kind' in item && item.kind === 'group';
}

/**
 * orderMap の現在の順序から、id1 と id2 をまとめてグループスロットに置き換える。
 * id1/id2 のうち先に出現する位置に group:${newGroupId} を挿入し、
 * もう一方の id は除去する。
 *
 * orderMap にどちらの id も含まれていない場合（初期状態 = 空）は末尾に追加。
 */
export function replaceWithGroupSlot(
  currentOrder: ReadonlyArray<ReorderEntry>,
  id1: number,
  id2: number,
  newGroupId: GroupId,
): ReorderEntry[] {
  const firstIdx = currentOrder.findIndex((e) => e === id1 || e === id2);
  if (firstIdx === -1) {
    return [
      ...currentOrder.filter((e) => e !== id1 && e !== id2),
      newGroupId,
    ];
  }
  return currentOrder.flatMap<ReorderEntry>((e, i) => {
    if (i === firstIdx) return [newGroupId];
    if (e === id1 || e === id2) return [];
    return [e];
  });
}

interface BuildHandleDragEndParams {
  data: BoardData;
  orderMap: ReorderMap;
  milestonePrefix: string;
  setActiveIssue: (issue: BacklogIssue | null) => void;
  setOverLaneId: (laneId: string | null) => void;
  sortField: string;
  moveIssue: (issueId: number, fromLaneId: string, toLaneId: string) => void;
  reorder: (laneId: string, activeId: number, overId: number) => void;
  updateOnCrossLaneMove: (
    issueId: number,
    fromLaneId: string,
    toLaneId: string,
  ) => void;
  getLaneItems: (laneId: string) => Array<BacklogIssue | GroupSlot>;
}

/**
 * Phase 9 (D-01, D-02, D-16): handleDragEnd factory.
 * Drag-Over Hierarchy:
 *   1. card-target-${id} → card-on-card → create group
 *   2. group-target-${id} → card-on-group → add member to group
 *   3. lane id (unassigned / milestone-${id}) → cross-lane move or intra-lane reorder
 *
 * Exported as a factory so tests can call the inner handler directly with
 * synthesized DragEndEvent objects (DndContext mock in tests/setup.ts is a
 * pass-through and does not exercise drag events).
 */
export function buildHandleDragEnd(
  params: BuildHandleDragEndParams,
): (event: DragEndEvent) => void {
  return (event) => {
    const {
      data,
      orderMap,
      milestonePrefix,
      setActiveIssue,
      setOverLaneId,
      sortField,
      moveIssue,
      reorder,
      updateOnCrossLaneMove,
      getLaneItems,
    } = params;

    setActiveIssue(null);
    setOverLaneId(null);
    if (!data || !event.over) return;

    const overId = event.over.id;
    const activeId = event.active.id;

    // Phase 9 branch 1: card-target-${id} → create group from card-to-card drop
    if (typeof overId === 'string' && overId.startsWith('card-target-')) {
      const targetIssueId = Number(overId.replace('card-target-', ''));
      const sourceIssueId = Number(activeId);
      if (targetIssueId === sourceIssueId) return; // self-drop guard
      const sourceIssue = findIssueInBoardData(data, sourceIssueId);
      const targetIssue = findIssueInBoardData(data, targetIssueId);
      if (!sourceIssue || !targetIssue) return;
      // D-16 / Q4: multi-milestone cards cannot become group members
      if (rejectMultiMilestoneMember(sourceIssue, milestonePrefix)) return;
      if (rejectMultiMilestoneMember(targetIssue, milestonePrefix)) return;
      const targetLaneId = findLaneContaining(data, targetIssueId);
      if (!targetLaneId) return;
      const allIssues = collectAllIssues(data);
      const newGroupId = useGroupStore
        .getState()
        .createGroup([sourceIssueId, targetIssueId], targetLaneId, allIssues);
      if (newGroupId) {
        // orderMap 更新: source/target を group:${newGroupId} に置換
        const currentOrder: ReorderEntry[] =
          orderMap[targetLaneId] ??
          getLaneItems(targetLaneId).map((item) =>
            isGroupSlotItem(item) ? item.group.id : item.id,
          );
        const newOrder = replaceWithGroupSlot(
          currentOrder,
          sourceIssueId,
          targetIssueId,
          newGroupId,
        );
        useReorderStore.getState().setLaneOrder(targetLaneId, newOrder);
      }
      return;
    }

    // Phase 9 branch 2: group-target-${id} → add member to existing group
    if (typeof overId === 'string' && overId.startsWith('group-target-')) {
      const targetGroupId = overId.replace('group-target-', '') as GroupId;
      const sourceIssueId = Number(activeId);
      const sourceIssue = findIssueInBoardData(data, sourceIssueId);
      if (!sourceIssue) return;
      // D-16 / Q4 guard
      if (rejectMultiMilestoneMember(sourceIssue, milestonePrefix)) return;
      const allIssues = collectAllIssues(data);
      useGroupStore
        .getState()
        .addMember(targetGroupId, sourceIssueId, allIssues);
      // orderMap 更新: source を orderMap から削除（group は既にスロットがある想定）
      const targetGroup = useGroupStore.getState().groups[targetGroupId];
      if (targetGroup) {
        const currentOrder = orderMap[targetGroup.laneId] ?? [];
        const newOrder = currentOrder.filter((entry) => entry !== sourceIssueId);
        useReorderStore.getState().setLaneOrder(targetGroup.laneId, newOrder);
      }
      return;
    }

    // Phase 9 branch 3: existing lane drop logic (cross-lane move / intra-lane reorder)
    const fromLaneId = findLaneContaining(data, activeId as number);
    const toLaneId = resolveOverLaneId(data, overId);

    if (!fromLaneId || !toLaneId) return;

    if (fromLaneId === toLaneId) {
      // レーン内並べ替え（REORD-01）
      // ソートモード中は何もしない
      if (sortField !== 'none') return;
      const activeIdNum = activeId as number;
      const overIdNum = overId as number;
      if (activeIdNum !== overIdNum) {
        // orderMap に laneId がない場合、現在の表示順から初期 orderMap を構築
        const currentOrderMap = orderMap[fromLaneId];
        if (!currentOrderMap || currentOrderMap.length === 0) {
          const laneItems = getLaneItems(fromLaneId);
          const entryIds: ReorderEntry[] = laneItems.map((item) =>
            isGroupSlotItem(item) ? item.group.id : item.id,
          );
          useReorderStore.getState().setLaneOrder(fromLaneId, entryIds);
        }
        reorder(fromLaneId, activeIdNum, overIdNum);
      }
    } else {
      // レーン間移動（既存ロジック）
      moveIssue(activeId as number, fromLaneId, toLaneId);
      updateOnCrossLaneMove(activeId as number, fromLaneId, toLaneId);
    }
  };
}

export function Board() {
  const [activeIssue, setActiveIssue] = useState<BacklogIssue | null>(null);
  const [overLaneId, setOverLaneId] = useState<string | null>(null);
  // Phase 9: 展開中のグループ id（Plan 04 で GroupPopover 表示時に利用）
  const [expandedGroupId, setExpandedGroupId] = useState<GroupId | null>(null);
  const status = useBoardStore((s) => s.status);
  const data = useBoardStore((s) => s.data);
  const error = useBoardStore((s) => s.error);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const moveIssue = useBoardStore((s) => s.moveIssue);
  const milestonePrefix = useSettingsStore((s) => s.settings.milestonePrefix);

  const statusIds = useFilterStore((s) => s.statusIds);
  const assigneeIds = useFilterStore((s) => s.assigneeIds);
  const categoryIds = useFilterStore((s) => s.categoryIds);

  const sortField = useSortStore((s) => s.field);
  const sortDirection = useSortStore((s) => s.direction);

  const orderMap = useReorderStore((s) => s.orderMap);
  const reorder = useReorderStore((s) => s.reorder);
  const updateOnCrossLaneMove = useReorderStore((s) => s.updateOnCrossLaneMove);

  // Phase 9: subscribe to groupStore so view re-computes when groups change
  const groupMap = useGroupStore((s) => s.groups);

  // D-09: dataはraw unfiltered、ビュー層でのみフィルタ・ソート・グループ展開を適用
  const filteredAndSortedView = useMemo(() => {
    if (!data) return null;
    const filters: FilterState = { statusIds, assigneeIds, categoryIds };
    const hasFilters =
      statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0;

    const unassignedFiltered = hasFilters
      ? applyFilters(data.unassignedIssues, filters)
      : data.unassignedIssues;
    const unassignedSorted = applySortToIssues(
      unassignedFiltered,
      sortField,
      sortDirection,
    );
    const unassignedOrdered =
      sortField === 'none'
        ? applyCustomOrder(unassignedSorted, orderMap['unassigned'] ?? [])
        : unassignedSorted;
    // Phase 9: applyGroupExpansion を unassigned パイプラインの末尾に追加
    const unassignedExpansion = applyGroupExpansion(
      unassignedOrdered,
      data.unassignedIssues,
      groupMap,
      'unassigned',
      orderMap['unassigned'] ?? [],
    );

    return {
      milestones: data.milestones.map((mwi) => {
        const filtered = hasFilters
          ? applyFilters(mwi.issues, filters)
          : mwi.issues;
        const sorted = applySortToIssues(filtered, sortField, sortDirection);
        const laneId = `milestone-${mwi.milestone.id}`;
        const ordered =
          sortField === 'none'
            ? applyCustomOrder(sorted, orderMap[laneId] ?? [])
            : sorted;
        // Phase 9: applyGroupExpansion をミルストンパイプラインの末尾に追加
        const expansion = applyGroupExpansion(
          ordered,
          mwi.issues,
          groupMap,
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
            ? data.unassignedIssues.length - unassignedFiltered.length
            : 0) + unassignedExpansion.hiddenGroupCount,
      },
    };
  }, [
    data,
    statusIds,
    assigneeIds,
    categoryIds,
    sortField,
    sortDirection,
    orderMap,
    groupMap,
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!data) return;
    const rawId = event.active.id;
    // Phase 9: グループ id (`group:...`) は plain issue ではないので skip
    if (typeof rawId === 'string') return;
    const issueId = rawId as number;
    const found = findIssueInBoardData(data, issueId);
    setActiveIssue(found);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!data || !event.over) {
      setOverLaneId(null);
      return;
    }
    setOverLaneId(resolveOverLaneId(data, event.over.id));
  };

  /** filteredAndSortedView から指定レーンの items（混在）を取得する */
  const getLaneItems = (
    laneId: string,
  ): Array<BacklogIssue | GroupSlot> => {
    if (!filteredAndSortedView) return [];
    if (laneId === 'unassigned')
      return filteredAndSortedView.unassigned.items;
    const ms = filteredAndSortedView.milestones.find(
      (m) => `milestone-${m.milestone.id}` === laneId,
    );
    return ms?.items ?? [];
  };

  const handleDragEnd = data
    ? buildHandleDragEnd({
        data,
        orderMap,
        milestonePrefix,
        setActiveIssue,
        setOverLaneId,
        sortField,
        moveIssue,
        reorder,
        updateOnCrossLaneMove,
        getLaneItems,
      })
    : () => {};

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  if (status === 'idle' || status === 'loading') {
    return <BoardSkeleton />;
  }

  if (status === 'error') {
    return (
      <BoardError
        message={error ?? 'エラーが発生しました'}
        onRetry={fetchBoard}
      />
    );
  }

  if (status === 'loaded' && data !== null) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={kanbanCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className={styles.board}
          role="region"
          aria-label="カンバンボード"
        >
          {filteredAndSortedView && (
            <>
              <Lane
                laneId="unassigned"
                name="未割り当て"
                startDate={null}
                releaseDueDate={null}
                items={filteredAndSortedView.unassigned.items}
                hiddenCount={filteredAndSortedView.unassigned.hiddenCount}
                milestonePrefix={milestonePrefix}
                isDropTarget={overLaneId === 'unassigned'}
                onExpand={(groupId) => setExpandedGroupId(groupId)}
                expandedGroupId={expandedGroupId}
              />
              {filteredAndSortedView.milestones.map(
                ({ milestone, items, hiddenCount }) => (
                  <Lane
                    key={milestone.id}
                    laneId={`milestone-${milestone.id}`}
                    name={milestone.name}
                    startDate={milestone.startDate}
                    releaseDueDate={milestone.releaseDueDate}
                    items={items}
                    hiddenCount={hiddenCount}
                    milestonePrefix={milestonePrefix}
                    isDropTarget={overLaneId === `milestone-${milestone.id}`}
                    onExpand={(groupId) => setExpandedGroupId(groupId)}
                    expandedGroupId={expandedGroupId}
                  />
                ),
              )}
            </>
          )}
        </div>
        <DragOverlay>
          {activeIssue ? <DragOverlayCard issue={activeIssue} /> : null}
        </DragOverlay>
        <Toaster
          position="bottom-right"
          duration={5000}
          closeButton
          toastOptions={{ style: { maxWidth: '400px' } }}
        />
      </DndContext>
    );
  }

  return null;
}
