import { create } from 'zustand';
import type { BoardData } from '../types/board';
import { fetchBoardData } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';

type BoardStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface BoardStoreState {
  status: BoardStatus;
  data: BoardData | null;
  error: string | null;
  isReloading: boolean;

  fetchBoard: () => Promise<void>;
  reset: () => void;
}

export const useBoardStore = create<BoardStoreState>()((set, get) => ({
  status: 'idle',
  data: null,
  error: null,
  isReloading: false,

  fetchBoard: async () => {
    const { settings } = useSettingsStore.getState();

    if (get().status === 'loaded') {
      set({ isReloading: true, error: null });
    } else {
      set({ status: 'loading', error: null, isReloading: false });
    }

    try {
      const data = await fetchBoardData(
        settings.hostUrl,
        settings.apiKey,
        settings.projectKey,
        settings.milestonePrefix,
      );
      set({ status: 'loaded', data, error: null, isReloading: false });
    } catch (err: unknown) {
      const message =
        typeof err === 'string' ? err : 'データの取得に失敗しました';
      set({ status: 'error', data: null, error: message, isReloading: false });
    }
  },

  reset: () => {
    set({ status: 'idle', data: null, error: null, isReloading: false });
  },
}));
