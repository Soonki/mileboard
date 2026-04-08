import type { BacklogPriority } from '../../types/backlog';
import styles from './PriorityIndicator.module.css';

interface PriorityIndicatorProps {
  priority: BacklogPriority | null;
}

interface PriorityDisplay {
  text: string;
  className: string;
}

function getPriorityDisplay(id: number): PriorityDisplay | null {
  switch (id) {
    case 2:
      return { text: '\u25B2\u25B2\u25B2', className: styles.high };
    case 3:
      return { text: '\u25B2\u25B2', className: styles.medium };
    case 4:
      return { text: '\u25B2', className: styles.low };
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
    <span className={display.className} aria-label={priority.name}>
      {display.text}
    </span>
  );
}
