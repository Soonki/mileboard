import type { BacklogIssue } from '../../types/backlog';
import { LaneHeader } from '../LaneHeader/LaneHeader';
import { IssueCard } from '../IssueCard/IssueCard';
import { EmptyLane } from '../EmptyLane/EmptyLane';
import styles from './Lane.module.css';

interface LaneProps {
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
  issues: BacklogIssue[];
}

export function Lane({ name, startDate, releaseDueDate, issues }: LaneProps) {
  return (
    <div className={styles.lane} role="region" aria-label={name}>
      <LaneHeader
        name={name}
        startDate={startDate}
        releaseDueDate={releaseDueDate}
      />
      <div className={styles.cardList}>
        {issues.length === 0 ? (
          <EmptyLane />
        ) : (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>
    </div>
  );
}
