import { useState } from 'react';
import type { MemberCount } from '../../utils/memberBreakdown';
import { MemberBreakdown } from '../MemberBreakdown/MemberBreakdown';
import styles from './LaneHeader.module.css';

interface LaneHeaderProps {
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
  issueCount: number;
  memberBreakdown: MemberCount[];
}

function formatDateRange(
  startDate: string | null,
  releaseDueDate: string | null,
): string | null {
  if (startDate === null && releaseDueDate === null) {
    return null;
  }

  const formatDate = (dateStr: string): string => {
    const parts = dateStr.split('-');
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  };

  if (startDate !== null && releaseDueDate !== null) {
    return `${formatDate(startDate)}~${formatDate(releaseDueDate)}`;
  }
  if (startDate !== null) {
    return `${formatDate(startDate)}~`;
  }
  return `~${formatDate(releaseDueDate!)}`;
}

export function LaneHeader({
  name,
  startDate,
  releaseDueDate,
  issueCount,
  memberBreakdown,
}: LaneHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dateRange = formatDateRange(startDate, releaseDueDate);

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <div className={styles.name}>
          {name} ({issueCount})
        </div>
        {memberBreakdown.length > 0 && (
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? '内訳を閉じる' : '内訳を開く'}
          >
            {isExpanded ? '\u25B2' : '\u25BC'}
          </button>
        )}
      </div>
      {dateRange !== null && (
        <div className={styles.dateRange}>{dateRange}</div>
      )}
      {memberBreakdown.length > 0 && (
        <div
          className={`${styles.breakdownContainer} ${isExpanded ? styles.expanded : ''}`}
          aria-hidden={!isExpanded}
        >
          <MemberBreakdown members={memberBreakdown} />
        </div>
      )}
    </div>
  );
}
