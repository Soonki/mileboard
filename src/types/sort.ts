export type SortField = 'none' | 'assignee' | 'dueDate';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}
