import type { BacklogPriority } from '../../types/backlog';
import styles from './PriorityIndicator.module.css';

interface PriorityIndicatorProps {
  priority: BacklogPriority | null;
}

interface PriorityDisplay {
  arrows: string;
  className: string;
  label: string;
}

function getPriorityDisplay(id: number): PriorityDisplay | null {
  switch (id) {
    case 2:
      return { arrows: '\u25B2\u25B2\u25B2', className: styles.high, label: '高' };
    case 3:
      return { arrows: '\u25B2\u25B2', className: styles.medium, label: '中' };
    case 4:
      return { arrows: '\u25B2', className: styles.low, label: '低' };
    default:
      return null;
  }
}

export function PriorityIndicator({ priority }: PriorityIndicatorProps) {
  if (priority === null) {
    return null;
  }

  const display = getPriorityDisplay(priority.id);
  if (display === null) {
    return null;
  }

  return (
    <span className={`${styles.indicator} ${display.className}`} aria-label={`優先度: ${display.label}`}>
      {display.arrows}
    </span>
  );
}
