import { create } from 'zustand';
import type { ConnectionSettings, ConnectionStatus } from '../types/settings';
import { loadSettings, saveSettings } from '../services/settingsStorage';

interface Project {
  id: number;
  projectKey: string;
  name: string;
}

interface SettingsStoreState {
  settings: ConnectionSettings;
  isConfigured: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  projects: Project[];
  isLoadingProjects: boolean;

  updateSettings: (partial: Partial<ConnectionSettings>) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string) => void;
  setProjects: (projects: Project[]) => void;
  setIsLoadingProjects: (loading: boolean) => void;
  markConfigured: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const defaultSettings: ConnectionSettings = {
  hostUrl: '',
  apiKey: '',
  projectId: null,
  projectKey: '',
  milestonePrefix: '',
};

export const useSettingsStore = create<SettingsStoreState>()((set, get) => ({
  settings: defaultSettings,
  isConfigured: false,
  connectionStatus: 'idle',
  connectionError: null,
  projects: [],
  isLoadingProjects: false,

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  setConnectionStatus: (status, error) =>
    set({ connectionStatus: status, connectionError: error ?? null }),

  setProjects: (projects) => set({ projects, isLoadingProjects: false }),

  setIsLoadingProjects: (loading) => set({ isLoadingProjects: loading }),

  markConfigured: () => set({ isConfigured: true }),

  loadFromStorage: async () => {
    const saved = await loadSettings();
    if (saved && saved.hostUrl && saved.apiKey && saved.projectKey) {
      set({ settings: saved, isConfigured: true });
    }
  },

  saveToStorage: async () => {
    await saveSettings(get().settings);
  },
}));
