import { load } from '@tauri-apps/plugin-store';
import type { ConnectionSettings } from '../types/settings';

const STORE_FILE = 'settings.json';
const SETTINGS_KEY = 'connection';

export async function loadSettings(): Promise<ConnectionSettings | null> {
  const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
  const settings = await store.get<ConnectionSettings>(SETTINGS_KEY);
  return settings ?? null;
}

export async function saveSettings(settings: ConnectionSettings): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: false, defaults: {} });
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}
