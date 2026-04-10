import { create } from 'zustand';
import type { SortField, SortDirection } from '../types/sort';
import { loadSortConfig, saveSortConfig } from '../services/sortStorage';

interface SortStoreState {
  field: SortField;
  direction: SortDirection;
  setField: (field: SortField) => void;
  toggleDirection: () => void;
  loadFromStorage: () => Promise<void>;
}

export const useSortStore = create<SortStoreState>()((set, get) => ({
  field: 'none',
  direction: 'asc',

  setField: (field) => {
    set({ field });
    saveSortConfig({ field, direction: get().direction });
  },

  toggleDirection: () => {
    const next = get().direction === 'asc' ? 'desc' : 'asc';
    set({ direction: next });
    saveSortConfig({ field: get().field, direction: next });
  },

  loadFromStorage: async () => {
    const config = await loadSortConfig();
    if (config) {
      set({ field: config.field, direction: config.direction });
    }
  },
}));
