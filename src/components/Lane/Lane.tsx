import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { BacklogIssue } from '../../types/backlog';
import { computeMemberBreakdown } from '../../utils/memberBreakdown';
import { LaneHeader } from '../LaneHeader/LaneHeader';
import { IssueCard } from '../IssueCard/IssueCard';
import { EmptyLane } from '../EmptyLane/EmptyLane';
import styles from './Lane.module.css';

interface LaneProps {
  laneId: string;
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
  issues: BacklogIssue[];
  milestonePrefix: string;
  isDropTarget?: boolean;
}

export function Lane({
  laneId,
  name,
  startDate,
  releaseDueDate,
  issues,
  milestonePrefix,
  isDropTarget = false,
}: LaneProps) {
  const { setNodeRef } = useDroppable({ id: laneId });
  const issueCount = issues.length;
  const memberBreakdown = computeMemberBreakdown(issues);
  const issueIds = issues.map((i) => i.id);

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
      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        <div className={styles.cardList}>
          {issues.length === 0 ? (
            <EmptyLane />
          ) : (
            issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                laneId={laneId}
                milestonePrefix={milestonePrefix}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
