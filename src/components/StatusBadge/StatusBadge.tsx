import { getContrastTextColor } from '../../utils/colorContrast';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  name: string;
  color?: string;
}

export function StatusBadge({ name, color }: StatusBadgeProps) {
  const badgeStyle = color
    ? { backgroundColor: color, color: getContrastTextColor(color), borderColor: 'transparent' }
    : undefined;

  return (
    <span className={styles.badge} style={badgeStyle} aria-label={name}>
      {name}
    </span>
  );
}
