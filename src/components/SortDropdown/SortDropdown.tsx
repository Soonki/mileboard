import { useState, useRef, useEffect, useCallback } from 'react';
import { useSortStore } from '../../stores/sortStore';
import type { SortField } from '../../types/sort';
import styles from './SortDropdown.module.css';

const SORT_OPTIONS: ReadonlyArray<{ value: SortField; label: string }> = [
  { value: 'none', label: 'ソートなし' },
  { value: 'assignee', label: '担当者順' },
  { value: 'dueDate', label: '期限日順' },
] as const;

export function SortDropdown() {
  const field = useSortStore((s) => s.field);
  const setField = useSortStore((s) => s.setField);

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const handleSelect = (value: SortField) => {
    setField(value);
    close();
    triggerRef.current?.focus();
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % SORT_OPTIONS.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev <= 0 ? SORT_OPTIONS.length - 1 : prev - 1,
      );
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < SORT_OPTIONS.length) {
        handleSelect(SORT_OPTIONS[focusedIndex].value);
      }
    }
  };

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === field)?.label ?? 'ソートなし';

  const triggerClassName = `${styles.trigger} ${field !== 'none' ? styles.active : styles.inactive}`;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="ソート基準"
      >
        <span>{currentLabel}</span>
        <span className={styles.arrow}>{'\u25BE'}</span>
      </button>
      {isOpen && (
        <div
          ref={listRef}
          className={styles.panel}
          role="listbox"
          aria-activedescendant={
            focusedIndex >= 0
              ? `sort-option-${SORT_OPTIONS[focusedIndex].value}`
              : undefined
          }
          onKeyDown={handlePanelKeyDown}
          tabIndex={-1}
        >
          {SORT_OPTIONS.map((option, index) => {
            const isSelected = option.value === field;
            const isFocused = index === focusedIndex;
            return (
              <div
                key={option.value}
                id={`sort-option-${option.value}`}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isFocused ? styles.optionFocused : ''} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <span className={styles.optionLabel}>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
