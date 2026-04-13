import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable';
import type { BacklogIssue } from '../../types/backlog';
import type { GroupSlot, GroupId } from '../../types/group';
import type { UiMode } from '../../stores/uiModeStore';
import { computeMemberBreakdown } from '../../utils/memberBreakdown';
import { LaneHeader } from '../LaneHeader/LaneHeader';
import { IssueCard } from '../IssueCard/IssueCard';
import { GroupCard } from '../GroupCard/GroupCard';
import { EmptyLane } from '../EmptyLane/EmptyLane';
import styles from './Lane.module.css';

interface LaneProps {
  laneId: string;
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
  /**
   * Phase 9 (D-06): items は単体カード（BacklogIssue）と
   * グループスロット（GroupSlot）が混在する union 配列。
   * Plan 02 で `issues` から rename された。
   */
  items: Array<BacklogIssue | GroupSlot>;
  milestonePrefix: string;
  isDropTarget?: boolean;
  hiddenCount?: number;
  /**
   * Phase 9: GroupCard クリック時に呼ばれる（Plan 04 で GroupPopover を開く）。
   * Plan 04: 第 2 引数で GroupCard ルートの DOMRect を受け取り、Popover の
   * アンカー位置として Board が利用する。
   */
  onExpand?: (groupId: GroupId, rect: DOMRect) => void;
  /** Phase 9: 現在展開中のグループ id（aria-expanded 用） */
  expandedGroupId?: GroupId | null;
  /**
   * Phase 9: UI 操作モード。
   * - `'sort'`  : verticalListSortingStrategy（背景カードがシフトする並べ替えプレビュー）
   * - `'group'` : noShiftSortingStrategy（背景カードは動かない）
   * 省略時は 'sort'。
   */
  uiMode?: UiMode;
}

function isGroupSlot(item: BacklogIssue | GroupSlot): item is GroupSlot {
  return 'kind' in item && item.kind === 'group';
}

/**
 * Phase 9 UX refinement: a SortingStrategy that never shifts background
 * items during drag. The dragging card is shown via DragOverlay, so other
 * cards stay perfectly still — making it possible to precisely target a
 * card for grouping without it moving away. The actual reorder/group
 * operation is decided on drop via `kanbanCollisionDetection` and the
 * drag-end branches in Board.tsx.
 */
const noShiftSortingStrategy: SortingStrategy = () => null;

export function Lane({
  laneId,
  name,
  startDate,
  releaseDueDate,
  items,
  milestonePrefix,
  isDropTarget = false,
  hiddenCount = 0,
  onExpand,
  expandedGroupId = null,
  uiMode = 'sort',
}: LaneProps) {
  const { setNodeRef } = useDroppable({ id: laneId });

  // Phase 9: 集計はグループの visibleMembers + 単体カードで行う（D-14 と整合）
  const individualCount = items.filter((i) => !isGroupSlot(i)).length;
  const groupVisibleMemberCount = items
    .filter(isGroupSlot)
    .reduce((sum, slot) => sum + slot.visibleMembers.length, 0);
  const issueCount = individualCount + groupVisibleMemberCount;

  // memberBreakdown は表示中の issue（単体 + グループ可視メンバー）から計算
  const visibleIssuesForBreakdown: BacklogIssue[] = items.flatMap((item) =>
    isGroupSlot(item) ? item.visibleMembers : [item],
  );
  const memberBreakdown = computeMemberBreakdown(visibleIssuesForBreakdown);

  // SortableContext items: 単体カードは number id、グループは GroupId 文字列
  const sortableIds: Array<number | GroupId> = items.map((item) =>
    isGroupSlot(item) ? item.group.id : item.id,
  );

  return (
    <div
      ref={setNodeRef}
      className={`${styles.lane} ${isDropTarget ? styles.laneDropTarget : ''}`}
      role="region"
      aria-label={name}
    >
      <LaneHeader
        name={name}
        startDate={startDate}
        releaseDueDate={releaseDueDate}
        issueCount={issueCount}
        memberBreakdown={memberBreakdown}
      />
      <SortableContext
        items={sortableIds}
        strategy={
          uiMode === 'sort' ? verticalListSortingStrategy : noShiftSortingStrategy
        }
      >
        <div className={styles.cardList}>
          {items.length === 0 ? (
            hiddenCount > 0 ? (
              <div className={styles.filteredEmpty}>
                {hiddenCount}件がフィルタで非表示
              </div>
            ) : (
              <EmptyLane />
            )
          ) : (
            items.map((item) =>
              isGroupSlot(item) ? (
                <GroupCard
                  key={item.group.id}
                  slot={item}
                  laneId={laneId}
                  milestonePrefix={milestonePrefix}
                  onExpand={onExpand ?? (() => {})}
                  isExpanded={expandedGroupId === item.group.id}
                />
              ) : (
                <IssueCard
                  key={item.id}
                  issue={item}
                  laneId={laneId}
                  milestonePrefix={milestonePrefix}
                />
              ),
            )
          )}
        </div>
      </SortableContext>
    </div>
  );
}
