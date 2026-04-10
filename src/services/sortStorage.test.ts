import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import { loadSortConfig, saveSortConfig } from './sortStorage';
import type { SortConfig } from '../types/sort';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(load).mockResolvedValue(mockStore as never);
});

describe('loadSortConfig', () => {
  it('returns SortConfig when plugin-store has valid data', async () => {
    const config: SortConfig = { field: 'assignee', direction: 'desc' };
    mockStore.get.mockResolvedValue(config);

    const result = await loadSortConfig();
    expect(result).toEqual(config);
    expect(mockStore.get).toHaveBeenCalledWith('sort');
  });

  it('returns null when plugin-store has no data', async () => {
    mockStore.get.mockResolvedValue(undefined);

    const result = await loadSortConfig();
    expect(result).toBeNull();
  });

  it('returns null when plugin-store data has invalid field value', async () => {
    mockStore.get.mockResolvedValue({ field: 'invalidField', direction: 'asc' });

    const result = await loadSortConfig();
    expect(result).toBeNull();
  });

  it('returns null when plugin-store data has invalid direction value', async () => {
    mockStore.get.mockResolvedValue({ field: 'assignee', direction: 'invalid' });

    const result = await loadSortConfig();
    expect(result).toBeNull();
  });
});

describe('saveSortConfig', () => {
  it('calls store.set with key sort and config, then calls store.save()', async () => {
    const config: SortConfig = { field: 'dueDate', direction: 'asc' };
    mockStore.set.mockResolvedValue(undefined);
    mockStore.save.mockResolvedValue(undefined);

    await saveSortConfig(config);

    expect(mockStore.set).toHaveBeenCalledWith('sort', config);
    expect(mockStore.save).toHaveBeenCalled();
    // save must be called after set
    const setOrder = mockStore.set.mock.invocationCallOrder[0];
    const saveOrder = mockStore.save.mock.invocationCallOrder[0];
    expect(saveOrder).toBeGreaterThan(setOrder);
  });
});
