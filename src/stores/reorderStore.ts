import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { ReorderEntry, ReorderMap } from '../types/reorder';
import {
  loadReorderConfig,
  saveReorderConfig,
} from '../services/reorderStorage';

interface ReorderStoreState {
  orderMap: ReorderMap;
  reorder: (laneId: string, activeId: number, overId: number) => void;
  /**
   * レーンの並び順を上書き設定する。Phase 9 で ReorderEntry[]
   * （number | `group:${id}`）を受け取れるよう拡張。
   */
  setLaneOrder: (laneId: string, entries: ReorderEntry[]) => void;
  removeLaneOrder: (laneId: string) => void;
  updateOnCrossLaneMove: (
    issueId: number,
    fromLaneId: string,
    toLaneId: string,
  ) => void;
  loadFromStorage: () => Promise<void>;
}

export const useReorderStore = create<ReorderStoreState>()((set, get) => ({
  orderMap: {},

  reorder: (laneId, activeId, overId) => {
    const { orderMap } = get();
    const currentOrder = orderMap[laneId] ?? [];
    // Phase 9: ReorderEntry (number | `group:${id}`) を扱うため indexOf -> findIndex
    const fromIndex = currentOrder.findIndex((entry) => entry === activeId);
    const toIndex = currentOrder.findIndex((entry) => entry === overId);
    if (fromIndex === -1 || toIndex === -1) return;
    const newOrder = arrayMove(currentOrder, fromIndex, toIndex);
    const newMap = { ...orderMap, [laneId]: newOrder };
    set({ orderMap: newMap });
    saveReorderConfig(newMap).catch(() => {});
  },

  setLaneOrder: (laneId, entries) => {
    const { orderMap } = get();
    const newMap = { ...orderMap, [laneId]: entries };
    set({ orderMap: newMap });
    saveReorderConfig(newMap).catch(() => {});
  },

  removeLaneOrder: (laneId) => {
    const { orderMap } = get();
    const { [laneId]: _, ...rest } = orderMap;
    set({ orderMap: rest });
    saveReorderConfig(rest).catch(() => {});
  },

  updateOnCrossLaneMove: (issueId, fromLaneId, toLaneId) => {
    const { orderMap } = get();
    // Phase 9: ReorderEntry ベースの filter。group:${id} エントリは維持される
    const fromOrder = (orderMap[fromLaneId] ?? []).filter(
      (entry) => entry !== issueId,
    );
    const toOrder = [...(orderMap[toLaneId] ?? []), issueId];
    const newMap = {
      ...orderMap,
      [fromLaneId]: fromOrder,
      [toLaneId]: toOrder,
    };
    set({ orderMap: newMap });
    saveReorderConfig(newMap).catch(() => {});
  },

  loadFromStorage: async () => {
    const config = await loadReorderConfig();
    if (config) {
      set({ orderMap: config });
    }
  },
}));
