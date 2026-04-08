import type { BacklogIssue } from '../../types/backlog';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { PriorityIndicator } from '../PriorityIndicator/PriorityIndicator';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: BacklogIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.line1}>
        <span className={styles.issueKey}>{issue.issueKey}</span>
        <StatusBadge name={issue.status.name} />
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
