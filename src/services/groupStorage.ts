import { load } from '@tauri-apps/plugin-store';
import type { Group, GroupMap } from '../types/group';

const STORE_FILE = 'settings.json';
const GROUPS_KEY = 'groups';

/**
 * plugin-store から GroupMap を読み込む。
 *
 * バリデーション失敗時は null を返し、呼び出し側はデフォルト値 {} に
 * フォールバックする想定。reorderStorage と同じ load/validate/null パターン。
 *
 * バリデーション項目（T-09-01-01 — 永続化データ改ざん耐性）:
 *  - data が plain object（null/array は拒否）
 *  - 各 key が `group:` プレフィックスで始まる文字列
 *  - 各 value が `{ id, memberIds, laneId }` 形状
 *  - value.id が key と完全一致（key と group.id の一貫性）
 *  - value.memberIds が number[]
 *  - value.laneId が string
 */
export async function loadGroupConfig(): Promise<GroupMap | null> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  const data = await store.get<GroupMap>(GROUPS_KEY);

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!key.startsWith('group:')) return null;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const group = value as Partial<Group>;
    if (group.id !== key) return null;
    if (!Array.isArray(group.memberIds)) return null;
    if (!group.memberIds.every((m) => typeof m === 'number')) return null;
    if (typeof group.laneId !== 'string') return null;
  }

  return data;
}

/**
 * GroupMap を plugin-store に保存する。
 * 呼び出し側は fire-and-forget パターン（`.catch(() => {})`）で扱う。
 */
export async function saveGroupConfig(groups: GroupMap): Promise<void> {
  const store = await load(STORE_FILE, { defaults: {}, autoSave: false });
  await store.set(GROUPS_KEY, groups);
  await store.save();
}
