import styles from './FilterChip.module.css';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Delete') {
      e.preventDefault();
      onRemove();
    }
  };

  return (
    <span
      className={styles.chip}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        aria-label={`${label}のフィルタを解除`}
      >
        {'\u00D7'}
      </button>
    </span>
  );
}
