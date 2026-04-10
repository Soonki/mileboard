import { useState, useRef, useEffect, useCallback } from 'react';
import type { FilterOption } from '../../types/filter';
import styles from './FilterDropdown.module.css';

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedIds: Set<number | null>;
  onToggle: (id: number | null) => void;
}

export function FilterDropdown({
  label,
  options,
  selectedIds,
  onToggle,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Auto-focus the panel when opened
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.focus();
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    setIsOpen((prev) => !prev);
    setFocusedIndex(-1);
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    // Disable keyboard navigation when there are no options
    // (avoids NaN from (prev + 1) % 0 and invalid -1 focusedIndex state).
    if (options.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % options.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev <= 0 ? options.length - 1 : prev - 1,
      );
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < options.length) {
        onToggle(options[focusedIndex].id);
      }
    }
  };

  const hasSelections = selectedIds.size > 0;
  const triggerClassName = `${styles.trigger} ${hasSelections ? styles.active : styles.inactive}`;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}フィルタ`}
      >
        <span>{label}</span>
        <span className={styles.arrow}>{'\u25BE'}</span>
      </button>
      {isOpen && (
        <div
          ref={listRef}
          className={styles.panel}
          role="listbox"
          aria-multiselectable="true"
          onKeyDown={handlePanelKeyDown}
          tabIndex={-1}
        >
          {options.length === 0 ? (
            <div className={styles.emptyMessage}>選択肢なし</div>
          ) : (
            options.map((option, index) => {
              const checked = selectedIds.has(option.id);
              const isFocused = index === focusedIndex;
              return (
                <div
                  key={option.id === null ? 'null' : option.id}
                  role="option"
                  aria-selected={checked}
                  className={`${styles.option} ${isFocused ? styles.optionFocused : ''}`}
                  onClick={() => onToggle(option.id)}
                >
                  <div
                    className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ''}`}
                  >
                    {checked ? '\u2713' : ''}
                  </div>
                  <span className={styles.optionLabel}>{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
