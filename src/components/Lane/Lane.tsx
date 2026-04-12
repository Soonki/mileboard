import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { BacklogIssue } from '../../types/backlog';
import type { GroupSlot, GroupId } from '../../types/group';
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
  /** Phase 9: GroupCard クリック時に呼ばれる（Plan 04 で GroupPopover を開く） */
  onExpand?: (groupId: GroupId) => void;
  /** Phase 9: 現在展開中のグループ id（aria-expanded 用） */
  expandedGroupId?: GroupId | null;
}

function isGroupSlot(item: BacklogIssue | GroupSlot): item is GroupSlot {
  return 'kind' in item && item.kind === 'group';
}

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
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
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
