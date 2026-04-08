import styles from './WarningBadge.module.css';

interface WarningBadgeProps {
  otherMilestones: string[];
}

export function WarningBadge({ otherMilestones }: WarningBadgeProps) {
  const tooltipText = `他のマイルストーン: ${otherMilestones.join(', ')}`;
  return (
    <span
      className={styles.badge}
      data-tooltip={tooltipText}
      aria-label={tooltipText}
    >
      {'\u26A0'}
    </span>
  );
}
