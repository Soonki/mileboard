import { load } from '@tauri-apps/plugin-store';
import type { ReorderMap } from '../types/reorder';

const STORE_FILE = 'settings.json';
const REORDER_KEY = 'reorder';

/**
 * plugin-storeからReorderMapを読み込む。
 * 不正値の場合はnullを返す（デフォルト値にフォールバック）。
 */
export async function loadReorderConfig(): Promise<ReorderMap | null> {
  const store = await load(STORE_FILE, { autoSave: false });
  const data = await store.get<ReorderMap>(REORDER_KEY);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  // T-08-01: バリデーション -- 各値が number[] であることを確認
  for (const [, value] of Object.entries(data)) {
    if (!Array.isArray(value) || !value.every((v) => typeof v === 'number')) {
      return null;
    }
  }

  return data;
}

/**
 * ReorderMapをplugin-storeに保存する。
 */
export async function saveReorderConfig(orderMap: ReorderMap): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: false });
  await store.set(REORDER_KEY, orderMap);
  await store.save();
}
