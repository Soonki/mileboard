export interface FilterState {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;
}

export interface FilterOption {
  id: number | null;
  label: string;
  sortOrder: number;
}
