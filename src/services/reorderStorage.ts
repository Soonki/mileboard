import { load } from '@tauri-apps/plugin-store';
import type { ReorderMap } from '../types/reorder';

const STORE_FILE = 'settings.json';
const REORDER_KEY = 'reorder';

/**
 * plugin-storeからReorderMapを読み込む。
 * 不正値の場合はnullを返す（デフォルト値にフォールバック）。
 */
export async function loadReorderConfig(): Promise<ReorderMap | null> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  const data = await store.get<ReorderMap>(REORDER_KEY);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  // T-09-00-01: バリデーション -- Phase 9 後方互換 -- number と group:${id} の両形式を accept
  // 旧 Phase 8 形式 `{ laneId: [1,2,3] }` は新形式 `(number | string)[]` のサブセットなので
  // 暗黙的に upgrade される（マイグレーションコード不要）
  for (const [, value] of Object.entries(data)) {
    if (!Array.isArray(value)) return null;
    const allValid = value.every(
      (v) =>
        typeof v === 'number' ||
        (typeof v === 'string' && v.startsWith('group:')),
    );
    if (!allValid) return null;
  }

  return data;
}

/**
 * ReorderMapをplugin-storeに保存する。
 */
export async function saveReorderConfig(orderMap: ReorderMap): Promise<void> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  await store.set(REORDER_KEY, orderMap);
  await store.save();
}
