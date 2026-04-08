import { openUrl } from '@tauri-apps/plugin-opener';
import type { BacklogIssue } from '../../types/backlog';
import { useSettingsStore } from '../../stores/settingsStore';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { PriorityIndicator } from '../PriorityIndicator/PriorityIndicator';
import styles from './IssueCard.module.css';

interface IssueCardProps {
  issue: BacklogIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
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
      className={styles.card}
      onClick={handleClick}
      role="link"
      aria-label={`${issue.issueKey}をBacklogで開く`}
    >
      <div className={styles.line1}>
        <span className={styles.issueKey}>{issue.issueKey}</span>
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
