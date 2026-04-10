import styles from './FilterChip.module.css';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    // Ignore Enter/Delete events that bubbled up from the inner button.
    // The button natively fires onClick on Enter/Space, so handling it
    // again here would cause onRemove to be called twice.
    if (e.target !== e.currentTarget) return;
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
