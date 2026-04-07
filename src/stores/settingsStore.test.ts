import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

vi.mock('../services/settingsStorage', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store to initial state between tests
    useSettingsStore.setState({
      settings: {
        hostUrl: '',
        apiKey: '',
        projectId: null,
        projectKey: '',
        milestonePrefix: '',
      },
      isConfigured: false,
      connectionStatus: 'idle',
      connectionError: null,
      projects: [],
      isLoadingProjects: false,
    });
  });

  it('initializes with isConfigured: false', () => {
    const state = useSettingsStore.getState();
    expect(state.isConfigured).toBe(false);
  });

  it('initializes with connectionStatus idle', () => {
    const state = useSettingsStore.getState();
    expect(state.connectionStatus).toBe('idle');
  });

  it('updateSettings merges partial update without mutating original', () => {
    const originalSettings = useSettingsStore.getState().settings;
    const originalRef = originalSettings;

    useSettingsStore.getState().updateSettings({
      hostUrl: 'https://test.backlog.com',
      apiKey: 'new-key',
    });

    const newState = useSettingsStore.getState();
    expect(newState.settings.hostUrl).toBe('https://test.backlog.com');
    expect(newState.settings.apiKey).toBe('new-key');
    // Other fields remain default
    expect(newState.settings.projectKey).toBe('');
    expect(newState.settings.milestonePrefix).toBe('');
    // Original reference should not have been mutated
    expect(originalRef.hostUrl).toBe('');
  });

  it('setConnectionStatus sets error message', () => {
    useSettingsStore
      .getState()
      .setConnectionStatus('error', 'Connection failed');

    const state = useSettingsStore.getState();
    expect(state.connectionStatus).toBe('error');
    expect(state.connectionError).toBe('Connection failed');
  });

  it('markConfigured sets isConfigured to true', () => {
    expect(useSettingsStore.getState().isConfigured).toBe(false);

    useSettingsStore.getState().markConfigured();

    expect(useSettingsStore.getState().isConfigured).toBe(true);
  });
});
