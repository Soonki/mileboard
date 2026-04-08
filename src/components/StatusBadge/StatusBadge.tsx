import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  name: string;
}

export function StatusBadge({ name }: StatusBadgeProps) {
  return (
    <span className={styles.badge} aria-label={name}>
      {name}
    </span>
  );
}
