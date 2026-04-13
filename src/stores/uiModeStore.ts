import { create } from 'zustand';

/**
 * Phase 9: UI 操作モード。
 * - `'sort'` : ドラッグでレーン内並び替え + クロスレーン移動 (グループ化操作は発火しない)
 * - `'group'`: ドラッグでカード/グループ drop 時にグルーピング (intra-lane reorder は発火しない)
 *
 * cross-lane move と popover member drag-out は両モードで有効。
 * 永続化しない — 起動時は常に `'sort'` から始まる。
 */
export type UiMode = 'sort' | 'group';

interface UiModeStoreState {
  mode: UiMode;
  setMode: (mode: UiMode) => void;
  toggleMode: () => void;
}

export const useUiModeStore = create<UiModeStoreState>()((set, get) => ({
  mode: 'sort',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set({ mode: get().mode === 'sort' ? 'group' : 'sort' }),
}));
