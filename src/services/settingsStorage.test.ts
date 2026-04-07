import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import type { ConnectionSettings } from '../types/settings';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

vi.mocked(load).mockResolvedValue(mockStore as never);

describe('settingsStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(load).mockResolvedValue(mockStore as never);
  });

  it('loadSettings returns null when store.get() returns undefined', async () => {
    mockStore.get.mockResolvedValue(undefined);

    const { loadSettings } = await import('./settingsStorage');
    const result = await loadSettings();

    expect(result).toBeNull();
    expect(load).toHaveBeenCalledWith('settings.json', { autoSave: false });
    expect(mockStore.get).toHaveBeenCalledWith('connection');
  });

  it('saveSettings calls store.set then store.save', async () => {
    const settings: ConnectionSettings = {
      hostUrl: 'https://test.backlog.com',
      apiKey: 'test-api-key',
      projectId: 1,
      projectKey: 'TEST',
      milestonePrefix: 'Sprint',
    };

    const { saveSettings } = await import('./settingsStorage');
    await saveSettings(settings);

    expect(load).toHaveBeenCalledWith('settings.json', { autoSave: false });
    expect(mockStore.set).toHaveBeenCalledWith('connection', settings);
    expect(mockStore.save).toHaveBeenCalled();
    // Verify save is called after set
    const setCallOrder = mockStore.set.mock.invocationCallOrder[0];
    const saveCallOrder = mockStore.save.mock.invocationCallOrder[0];
    expect(saveCallOrder).toBeGreaterThan(setCallOrder);
  });

  it('loadSettings after saveSettings returns the saved settings', async () => {
    const settings: ConnectionSettings = {
      hostUrl: 'https://test.backlog.com',
      apiKey: 'test-api-key',
      projectId: 1,
      projectKey: 'TEST',
      milestonePrefix: 'Sprint',
    };

    mockStore.get.mockResolvedValue(settings);

    const { loadSettings } = await import('./settingsStorage');
    const result = await loadSettings();

    expect(result).toEqual(settings);
  });

  it('saveSettings stores milestonePrefix field correctly', async () => {
    const settings: ConnectionSettings = {
      hostUrl: 'https://test.backlog.com',
      apiKey: 'test-api-key',
      projectId: 1,
      projectKey: 'TEST',
      milestonePrefix: 'v2025-Sprint',
    };

    const { saveSettings } = await import('./settingsStorage');
    await saveSettings(settings);

    const savedArg = mockStore.set.mock.calls[0][1] as ConnectionSettings;
    expect(savedArg.milestonePrefix).toBe('v2025-Sprint');
  });
});
