import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '@tauri-apps/plugin-store';
import { loadGroupConfig, saveGroupConfig } from './groupStorage';
import type { GroupMap } from '../types/group';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  save: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(load).mockResolvedValue(mockStore as never);
  mockStore.set.mockResolvedValue(undefined);
  mockStore.save.mockResolvedValue(undefined);
});

describe('loadGroupConfig', () => {
  it('returns GroupMap for valid data', async () => {
    const valid: GroupMap = {
      'group:abc': {
        id: 'group:abc',
        memberIds: [1, 2, 3],
        laneId: 'milestone-1',
      },
    };
    mockStore.get.mockResolvedValue(valid);

    const result = await loadGroupConfig();
    expect(result).toEqual(valid);
    expect(mockStore.get).toHaveBeenCalledWith('groups');
  });

  it('returns null when no data', async () => {
    mockStore.get.mockResolvedValue(undefined);

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when data is null', async () => {
    mockStore.get.mockResolvedValue(null);

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when data is an array (not object)', async () => {
    mockStore.get.mockResolvedValue([]);

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when key does not start with group:', async () => {
    mockStore.get.mockResolvedValue({
      foo: { id: 'foo', memberIds: [1, 2], laneId: 'lane-1' },
    });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when group.id mismatches the key', async () => {
    mockStore.get.mockResolvedValue({
      'group:abc': {
        id: 'group:xyz',
        memberIds: [1, 2],
        laneId: 'lane-1',
      },
    });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when memberIds is not an array', async () => {
    mockStore.get.mockResolvedValue({
      'group:abc': { id: 'group:abc', memberIds: 'nope', laneId: 'lane-1' },
    });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when memberIds contains non-number', async () => {
    mockStore.get.mockResolvedValue({
      'group:abc': { id: 'group:abc', memberIds: [1, 'x'], laneId: 'lane-1' },
    });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when laneId is not a string', async () => {
    mockStore.get.mockResolvedValue({
      'group:abc': { id: 'group:abc', memberIds: [1, 2], laneId: 42 },
    });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when value is not an object', async () => {
    mockStore.get.mockResolvedValue({ 'group:abc': 'not-an-object' });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('returns null when value is null', async () => {
    mockStore.get.mockResolvedValue({ 'group:abc': null });

    const result = await loadGroupConfig();
    expect(result).toBeNull();
  });

  it('accepts valid GroupMap with multiple groups', async () => {
    const valid: GroupMap = {
      'group:abc': { id: 'group:abc', memberIds: [1, 2], laneId: 'lane-1' },
      'group:def': {
        id: 'group:def',
        memberIds: [10, 20, 30],
        laneId: 'lane-2',
      },
    };
    mockStore.get.mockResolvedValue(valid);

    const result = await loadGroupConfig();
    expect(result).toEqual(valid);
  });
});

describe('saveGroupConfig', () => {
  it('calls store.set with key groups and the GroupMap, then store.save()', async () => {
    const groups: GroupMap = {
      'group:abc': {
        id: 'group:abc',
        memberIds: [1, 2],
        laneId: 'milestone-1',
      },
    };

    await saveGroupConfig(groups);

    expect(mockStore.set).toHaveBeenCalledWith('groups', groups);
    expect(mockStore.save).toHaveBeenCalled();

    const setOrder = mockStore.set.mock.invocationCallOrder[0];
    const saveOrder = mockStore.save.mock.invocationCallOrder[0];
    expect(saveOrder).toBeGreaterThan(setOrder);
  });

  it('saves an empty GroupMap correctly', async () => {
    await saveGroupConfig({});
    expect(mockStore.set).toHaveBeenCalledWith('groups', {});
    expect(mockStore.save).toHaveBeenCalled();
  });
});
