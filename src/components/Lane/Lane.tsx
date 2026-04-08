import type { BacklogIssue } from '../../types/backlog';
import { computeMemberBreakdown } from '../../utils/memberBreakdown';
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
  const issueCount = issues.length;
  const memberBreakdown = computeMemberBreakdown(issues);

  return (
    <div className={styles.lane} role="region" aria-label={name}>
      <LaneHeader
        name={name}
        startDate={startDate}
        releaseDueDate={releaseDueDate}
        issueCount={issueCount}
        memberBreakdown={memberBreakdown}
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
