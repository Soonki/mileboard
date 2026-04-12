import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import { loadReorderConfig, saveReorderConfig } from './reorderStorage';
import type { ReorderMap } from '../types/reorder';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(load).mockResolvedValue(mockStore as never);
});

describe('loadReorderConfig', () => {
  it('returns ReorderMap when plugin-store has valid data', async () => {
    const data: ReorderMap = { lane1: [1, 2, 3], lane2: [4, 5] };
    mockStore.get.mockResolvedValue(data);

    const result = await loadReorderConfig();
    expect(result).toEqual(data);
    expect(mockStore.get).toHaveBeenCalledWith('reorder');
  });

  it('returns null when plugin-store has no data', async () => {
    mockStore.get.mockResolvedValue(undefined);

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  it('returns null for invalid data where values are string arrays', async () => {
    mockStore.get.mockResolvedValue({ lane1: ['a', 'b'] });

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockStore.get.mockResolvedValue(null);

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  it('returns null when data is an array (not object)', async () => {
    mockStore.get.mockResolvedValue([1, 2, 3]);

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  // Phase 9: 後方互換 (T-09-00-02) + 新形式 (T-09-00-01)
  it('returns ReorderMap for Phase 8 legacy format { lane1: [1, 2, 3] } (backward compat)', async () => {
    const legacyData = { lane1: [1, 2, 3] };
    mockStore.get.mockResolvedValue(legacyData);

    const result = await loadReorderConfig();
    expect(result).toEqual(legacyData);
  });

  it('returns ReorderMap for Phase 9 new format { lane1: [1, "group:abc", 2] }', async () => {
    const newData = { lane1: [1, 'group:abc', 2] };
    mockStore.get.mockResolvedValue(newData);

    const result = await loadReorderConfig();
    expect(result).toEqual(newData);
  });

  it('returns null when array contains invalid string without group: prefix', async () => {
    mockStore.get.mockResolvedValue({ lane1: ['invalid-prefix', 1] });

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  it('returns null when array contains boolean value', async () => {
    mockStore.get.mockResolvedValue({ lane1: [true, 1] });

    const result = await loadReorderConfig();
    expect(result).toBeNull();
  });

  it('accepts strings that start with "group:" prefix', async () => {
    const data = { lane1: ['group:1712930400000-a1b2c3', 'group:abc', 42] };
    mockStore.get.mockResolvedValue(data);

    const result = await loadReorderConfig();
    expect(result).toEqual(data);
  });
});

describe('saveReorderConfig', () => {
  it('calls store.set with key reorder and orderMap, then calls store.save()', async () => {
    const orderMap: ReorderMap = { lane1: [1, 2, 3] };
    mockStore.set.mockResolvedValue(undefined);
    mockStore.save.mockResolvedValue(undefined);

    await saveReorderConfig(orderMap);

    expect(mockStore.set).toHaveBeenCalledWith('reorder', orderMap);
    expect(mockStore.save).toHaveBeenCalled();
    // save must be called after set
    const setOrder = mockStore.set.mock.invocationCallOrder[0];
    const saveOrder = mockStore.save.mock.invocationCallOrder[0];
    expect(saveOrder).toBeGreaterThan(setOrder);
  });
});
