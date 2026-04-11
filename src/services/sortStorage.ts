import { load } from '@tauri-apps/plugin-store';
import type { SortConfig, SortField, SortDirection } from '../types/sort';

const STORE_FILE = 'settings.json';
const SORT_KEY = 'sort';

const VALID_FIELDS: readonly SortField[] = ['none', 'assignee', 'dueDate'];
const VALID_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

/**
 * plugin-storeからSortConfigを読み込む。
 * 不正値の場合はnullを返す（デフォルト値にフォールバック）。
 */
export async function loadSortConfig(): Promise<SortConfig | null> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  const config = await store.get<SortConfig>(SORT_KEY);

  if (!config) {
    return null;
  }

  // T-07-01: バリデーション -- 不正値はnullを返す
  if (
    !VALID_FIELDS.includes(config.field as SortField) ||
    !VALID_DIRECTIONS.includes(config.direction as SortDirection)
  ) {
    return null;
  }

  return config;
}

/**
 * SortConfigをplugin-storeに保存する。
 */
export async function saveSortConfig(config: SortConfig): Promise<void> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  await store.set(SORT_KEY, config);
  await store.save();
}
