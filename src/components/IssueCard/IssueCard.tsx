import { openUrl } from '@tauri-apps/plugin-opener';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { BacklogIssue } from '../../types/backlog';
import { useSettingsStore } from '../../stores/settingsStore';
import { useSortStore } from '../../stores/sortStore';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { PriorityIndicator } from '../PriorityIndicator/PriorityIndicator';
import { WarningBadge } from '../WarningBadge/WarningBadge';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: BacklogIssue;
  laneId: string;
  milestonePrefix: string;
}

export function IssueCard({ issue, laneId, milestonePrefix }: IssueCardProps) {
  // Multi-milestone detection: prefix-matching milestones >= 2
  const prefixMilestones = issue.milestone.filter((m) =>
    m.name.startsWith(milestonePrefix),
  );
  const isMultiMilestone = prefixMilestones.length > 1;
  const isSortActive = useSortStore((s) => s.field !== 'none');

  // Other milestone names (excluding current lane's milestone, for WarningBadge tooltip)
  const otherMilestoneNames = issue.milestone
    .filter((m) => `milestone-${m.id}` !== laneId)
    .map((m) => m.name);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    disabled: isMultiMilestone || isSortActive,
  });

  // Phase 9 (D-01, D-02): card-to-card drop target enables creating a group by
  // dropping one card onto another. Multi-milestone cards cannot be drop targets
  // (D-16, Q4 — they cannot be group members), and a card being dragged should
  // not be its own drop target (would create self-self drop).
  const droppable = useDroppable({
    id: `card-target-${issue.id}`,
    disabled: isDragging || isMultiMilestone,
  });

  const setRefs = (el: HTMLElement | null): void => {
    setNodeRef(el);
    droppable.setNodeRef(el);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hostUrl = useSettingsStore((s) => s.settings.hostUrl);

  const handleClick = async () => {
    const host = hostUrl.replace(/^https?:\/\//, '');
    const url = `https://${host}/view/${issue.issueKey}`;
    try {
      await openUrl(url);
    } catch {
      // opener failure is non-critical -- silently ignore
    }
  };

  return (
    <div
      ref={setRefs}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${isMultiMilestone || isSortActive ? styles.cardDragDisabled : ''} ${droppable.isOver ? styles.dropTargetCard : ''}`}
      onClick={handleClick}
      role="link"
      aria-label={`${issue.issueKey}をBacklogで開く`}
    >
      <div className={styles.line1}>
        <span className={styles.issueKey}>{issue.issueKey}</span>
        {isMultiMilestone && (
          <WarningBadge otherMilestones={otherMilestoneNames} />
        )}
        <StatusBadge name={issue.status.name} color={issue.status.color} />
      </div>
      <div className={styles.summary}>{issue.summary}</div>
      <div className={styles.line3}>
        {issue.assignee !== null ? (
          <span className={styles.assignee}>{issue.assignee.name}</span>
        ) : (
          <span className={styles.noAssignee}>---</span>
        )}
        <PriorityIndicator priority={issue.priority} />
      </div>
    </div>
  );
}
