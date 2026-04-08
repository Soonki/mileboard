import { create } from 'zustand';

interface FilterStoreState {
  statusIds: Set<number>;
  assigneeIds: Set<number | null>;
  categoryIds: Set<number>;

  toggleStatus: (id: number) => void;
  toggleAssignee: (id: number | null) => void;
  toggleCategory: (id: number) => void;
  removeFilter: (axis: 'status' | 'assignee' | 'category', id: number | null) => void;
  clearAll: () => void;
  hasActiveFilters: () => boolean;
}

export const useFilterStore = create<FilterStoreState>()((set, get) => ({
  statusIds: new Set(),
  assigneeIds: new Set(),
  categoryIds: new Set(),

  toggleStatus: (id) =>
    set((state) => {
      const next = new Set(state.statusIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { statusIds: next };
    }),

  toggleAssignee: (id) =>
    set((state) => {
      const next = new Set(state.assigneeIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { assigneeIds: next };
    }),

  toggleCategory: (id) =>
    set((state) => {
      const next = new Set(state.categoryIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { categoryIds: next };
    }),

  removeFilter: (axis, id) =>
    set((state) => {
      if (axis === 'status') {
        const next = new Set(state.statusIds);
        next.delete(id as number);
        return { statusIds: next };
      }
      if (axis === 'assignee') {
        const next = new Set(state.assigneeIds);
        next.delete(id);
        return { assigneeIds: next };
      }
      const next = new Set(state.categoryIds);
      next.delete(id as number);
      return { categoryIds: next };
    }),

  clearAll: () =>
    set({
      statusIds: new Set(),
      assigneeIds: new Set(),
      categoryIds: new Set(),
    }),

  hasActiveFilters: () => {
    const state = get();
    return (
      state.statusIds.size > 0 ||
      state.assigneeIds.size > 0 ||
      state.categoryIds.size > 0
    );
  },
}));
