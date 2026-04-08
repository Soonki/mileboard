import { useMemo } from 'react';
import { useBoardStore } from '../../stores/boardStore';
import { useFilterStore } from '../../stores/filterStore';
import {
  extractStatusOptions,
  extractAssigneeOptions,
  extractCategoryOptions,
} from '../../utils/filterUtils';
import { FilterDropdown } from '../FilterDropdown/FilterDropdown';
import { FilterChip } from '../FilterChip/FilterChip';
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
  const hasActiveFilters = useFilterStore((s) => s.hasActiveFilters);

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

  const activeFilters = hasActiveFilters();

  return (
    <div className={styles.filterBar} role="toolbar" aria-label="フィルタ">
      <div className={styles.dropdowns}>
        <FilterDropdown
          label="ステータス"
          options={statusOptions}
          selectedIds={statusIds}
          onToggle={toggleStatus}
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
          onToggle={toggleCategory}
        />
      </div>
      <div className={styles.chips}>
        {statusOptions
          .filter((o) => statusIds.has(o.id as number))
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
          .filter((o) => categoryIds.has(o.id as number))
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
