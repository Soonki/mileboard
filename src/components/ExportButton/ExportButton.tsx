import { useState, useRef, useEffect, useCallback } from 'react';
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { toast } from 'sonner';
import { useBoardStore } from '../../stores/boardStore';
import { useFilterStore } from '../../stores/filterStore';
import { useSortStore } from '../../stores/sortStore';
import { useReorderStore } from '../../stores/reorderStore';
import { useGroupStore } from '../../stores/groupStore';
import { useUiModeStore } from '../../stores/uiModeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { buildSnapshot, type SnapshotFormat } from '../../utils/snapshotBuilder';
import { saveSnapshot } from '../../services/snapshotFile';
import styles from './ExportButton.module.css';

/**
 * Phase 10 Plan 07: ExportButton
 *
 * BoardHeader の actions 領域に配置する icon-only button + dropdown menu の
 * 合成コンポーネント。D-01 / D-02 / D-06 および 10-UI-SPEC に準拠する。
 *
 * - trigger: `↧` (U+21A7) icon + `aria-haspopup="menu"` + dynamic `aria-expanded`
 * - disabled: `boardStore.data === null || boardStore.status === 'loading'`
 *   (isReloading === true は enabled — stale view の export を許す)
 * - dropdown: `role="menu"` + 3 個の `role="menuitem"` (JSON / Markdown / CSV)
 * - 入力集約: 7 つの store から SnapshotInput を組み立て、buildSnapshot →
 *   saveSnapshot に引き渡す
 * - toast: error のみ表示 (`スナップショットの保存に失敗しました: {error}`)、
 *   success / cancelled は silent
 * - keyboard: ArrowDown/ArrowUp で roving focus (wraparound)、Enter/Space で実行、
 *   ESC で close + focus restore
 */

interface MenuItem {
  format: SnapshotFormat;
  label: string;
}

const MENU_ITEMS: readonly MenuItem[] = [
  { format: 'json', label: 'JSON として保存' },
  { format: 'markdown', label: 'Markdown として保存' },
  { format: 'csv', label: 'CSV として保存' },
];

const TRIGGER_TITLE_ENABLED =
  'スナップショットをエクスポート (Ctrl+Shift+E で JSON 直保存)';
const TRIGGER_TITLE_DISABLED = 'データ読み込み後に利用できます';
const TRIGGER_ARIA_LABEL = 'スナップショットをエクスポート';
const PANEL_ID = 'export-menu-panel';

export function ExportButton(): JSX.Element {
  const data = useBoardStore((s) => s.data);
  const status = useBoardStore((s) => s.status);
  const revision = useBoardStore((s) => s.revision);

  const statusIds = useFilterStore((s) => s.statusIds);
  const assigneeIds = useFilterStore((s) => s.assigneeIds);
  const categoryIds = useFilterStore((s) => s.categoryIds);

  const sortField = useSortStore((s) => s.field);
  const sortDirection = useSortStore((s) => s.direction);

  const orderMap = useReorderStore((s) => s.orderMap);
  const groups = useGroupStore((s) => s.groups);
  const uiMode = useUiModeStore((s) => s.mode);
  const settings = useSettingsStore((s) => s.settings);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isDisabled = data === null || status === 'loading';

  const close = useCallback((restoreFocus: boolean): void => {
    setIsOpen(false);
    setFocusedIndex(-1);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // Click outside → close (no focus restore: mouse moved intentionally)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, close]);

  // Auto-focus panel on open (matches FilterDropdown pattern)
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  const handleTriggerClick = (): void => {
    if (isDisabled) return;
    setIsOpen((prev) => !prev);
    setFocusedIndex(-1);
  };

  const handleExport = useCallback(
    async (format: SnapshotFormat): Promise<void> => {
      if (!data) return;

      const content = buildSnapshot(
        {
          boardData: data,
          boardRevision: revision,
          filter: { statusIds, assigneeIds, categoryIds },
          sortField,
          sortDirection,
          orderMap,
          groups,
          uiMode,
          milestonePrefix: settings.milestonePrefix,
          projectKey: settings.projectKey,
        },
        format,
      );

      const result = await saveSnapshot(content, format, settings.projectKey);

      if (!result.success && result.reason === 'error') {
        toast.error(`スナップショットの保存に失敗しました: ${result.error}`);
      }
      // silent on success / cancelled (D-06)
    },
    [
      data,
      revision,
      statusIds,
      assigneeIds,
      categoryIds,
      sortField,
      sortDirection,
      orderMap,
      groups,
      uiMode,
      settings.milestonePrefix,
      settings.projectKey,
    ],
  );

  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % MENU_ITEMS.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev <= 0 ? MENU_ITEMS.length - 1 : prev - 1,
      );
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
      e.preventDefault();
      const item = MENU_ITEMS[focusedIndex];
      // close first (T-10-07-05 mitigation) then fire async export
      close(true);
      void handleExport(item.format);
    }
  };

  const handleItemClick = (format: SnapshotFormat): void => {
    // close first (T-10-07-05 mitigation) then fire async export
    close(true);
    void handleExport(format);
  };

  const titleText = isDisabled ? TRIGGER_TITLE_DISABLED : TRIGGER_TITLE_ENABLED;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={handleTriggerClick}
        disabled={isDisabled}
        aria-label={TRIGGER_ARIA_LABEL}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
        aria-disabled={isDisabled}
        title={titleText}
      >
        {'\u21A7'}
      </button>
      {isOpen && (
        <div
          ref={panelRef}
          id={PANEL_ID}
          role="menu"
          tabIndex={-1}
          className={styles.panel}
          onKeyDown={handlePanelKeyDown}
        >
          {MENU_ITEMS.map((item, index) => {
            const isFocused = focusedIndex === index;
            const className = isFocused
              ? `${styles.option} ${styles.optionFocused}`
              : styles.option;
            return (
              <div
                key={item.format}
                role="menuitem"
                tabIndex={isFocused ? 0 : -1}
                className={className}
                onClick={() => handleItemClick(item.format)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
