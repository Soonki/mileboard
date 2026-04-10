import { useMemo } from 'react';
import { useBoardStore } from '../../stores/boardStore';
import { useFilterStore } from '../../stores/filterStore';
import { useSortStore } from '../../stores/sortStore';
import {
  extractStatusOptions,
  extractAssigneeOptions,
  extractCategoryOptions,
} from '../../utils/filterUtils';
import type { FilterOption } from '../../types/filter';
import { FilterDropdown } from '../FilterDropdown/FilterDropdown';
import { FilterChip } from '../FilterChip/FilterChip';
import { SortDropdown } from '../SortDropdown/SortDropdown';
import styles from './FilterBar.module.css';

export function FilterBar() {
  const data = useBoardStore((s) => s.data);
  const statusIds = useFilterStore((s) => s.statusIds);
  const assigneeIds = useFilterStore((s) => s.assigneeIds);
  const categoryIds = useFilterStore((s) => s.categoryIds);
  const toggleStatus = useFilterStore((s) => s.toggleStatus);
  const toggleAssignee = useFilterStore((s) => s.toggleAssignee);
  const toggleCategory = useFilterStore((s) => s.toggleCategory);
  const removeFilter = useFilterStore((s) => s.removeFilter);
  const clearAll = useFilterStore((s) => s.clearAll);

  const sortField = useSortStore((s) => s.field);
  const sortDirection = useSortStore((s) => s.direction);
  const toggleDirection = useSortStore((s) => s.toggleDirection);

  const allIssues = useMemo(() => {
    if (!data) return [];
    return [
      ...data.unassignedIssues,
      ...data.milestones.flatMap((mwi) => mwi.issues),
    ];
  }, [data]);

  const statusOptions = useMemo(
    () => extractStatusOptions(allIssues),
    [allIssues],
  );

  const assigneeOptions = useMemo(
    () => extractAssigneeOptions(allIssues),
    [allIssues],
  );

  const categoryOptions = useMemo(
    () => extractCategoryOptions(allIssues),
    [allIssues],
  );

  if (!data) return null;

  const activeFilters =
    statusIds.size > 0 || assigneeIds.size > 0 || categoryIds.size > 0;

  return (
    <div className={styles.filterBar} role="toolbar" aria-label="フィルタとソート">
      <div className={styles.dropdowns}>
        <FilterDropdown
          label="ステータス"
          options={statusOptions}
          selectedIds={statusIds}
          onToggle={(id) => { if (id !== null) toggleStatus(id); }}
        />
        <FilterDropdown
          label="担当者"
          options={assigneeOptions}
          selectedIds={assigneeIds}
          onToggle={toggleAssignee}
        />
        <FilterDropdown
          label="カテゴリ"
          options={categoryOptions}
          selectedIds={categoryIds}
          onToggle={(id) => { if (id !== null) toggleCategory(id); }}
        />
        <div className={styles.separator} role="separator" aria-orientation="vertical" />
        <div className={styles.sortControls}>
          <SortDropdown />
          <button
            type="button"
            className={`${styles.directionToggle} ${sortField !== 'none' ? styles.directionActive : styles.directionInactive}`}
            onClick={toggleDirection}
            aria-label={sortDirection === 'asc' ? '降順に切り替え' : '昇順に切り替え'}
          >
            {sortDirection === 'asc' ? '\u2191' : '\u2193'}
          </button>
        </div>
      </div>
      <div className={styles.chips}>
        {statusOptions
          .filter(
            (o): o is FilterOption & { id: number } =>
              o.id !== null && statusIds.has(o.id),
          )
          .map((o) => (
            <FilterChip
              key={`status-${o.id}`}
              label={o.label}
              onRemove={() => removeFilter('status', o.id)}
            />
          ))}
        {assigneeOptions
          .filter((o) => assigneeIds.has(o.id))
          .map((o) => (
            <FilterChip
              key={`assignee-${o.id}`}
              label={o.label}
              onRemove={() => removeFilter('assignee', o.id)}
            />
          ))}
        {categoryOptions
          .filter(
            (o): o is FilterOption & { id: number } =>
              o.id !== null && categoryIds.has(o.id),
          )
          .map((o) => (
            <FilterChip
              key={`category-${o.id}`}
              label={o.label}
              onRemove={() => removeFilter('category', o.id)}
            />
          ))}
        {activeFilters && (
          <button
            type="button"
            className={styles.clearAll}
            onClick={clearAll}
            aria-label="すべてのフィルタをクリア"
          >
            すべてクリア
          </button>
        )}
      </div>
    </div>
  );
}
