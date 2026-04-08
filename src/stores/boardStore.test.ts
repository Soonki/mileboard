import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BoardData } from '../types/board';

vi.mock('../services/tauriBridge');
vi.mock('./settingsStore');

import { useBoardStore } from './boardStore';
import { fetchBoardData } from '../services/tauriBridge';
import { useSettingsStore } from './settingsStore';

const mockFetchBoardData = vi.mocked(fetchBoardData);
const mockUseSettingsStore = vi.mocked(useSettingsStore);

const mockBoardData: BoardData = {
  milestones: [
    {
      milestone: {
        id: 1,
        projectId: 1,
        name: 'Sprint 2504',
        description: '',
        startDate: '2025-04-01',
        releaseDueDate: '2025-04-30',
        archived: false,
        displayOrder: 0,
      },
      issues: [
        {
          id: 100,
          projectId: 1,
          issueKey: 'TEST-1',
          keyId: 1,
          summary: 'Test issue',
          description: null,
          status: {
            id: 1,
            projectId: 1,
            name: '未対応',
            color: '#ed8077',
            displayOrder: 1000,
          },
          priority: { id: 3, name: '中' },
          assignee: {
            id: 1,
            userId: 'user1',
            name: '山田太郎',
            roleType: 1,
            mailAddress: 'test@test.com',
          },
          milestone: [],
          category: [],
          startDate: null,
          dueDate: null,
          created: '2025-04-01T00:00:00Z',
          updated: '2025-04-01T00:00:00Z',
        },
      ],
    },
  ],
  unassignedIssues: [],
};

const mockSettings = {
  hostUrl: 'test.backlog.com',
  apiKey: 'test-key',
  projectKey: 'TEST',
  milestonePrefix: 'Sprint',
  projectId: null,
};

describe('boardStore', () => {
  beforeEach(() => {
    useBoardStore.setState({
      status: 'idle',
      data: null,
      error: null,
      isReloading: false,
    });
    vi.clearAllMocks();

    mockUseSettingsStore.getState.mockReturnValue({
      settings: mockSettings,
    } as ReturnType<typeof useSettingsStore.getState>);
  });

  it('initial state is idle with null data and error', () => {
    const state = useBoardStore.getState();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from idle sets loading then loaded with data', async () => {
    mockFetchBoardData.mockResolvedValue(mockBoardData);

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('loaded');
    expect(state.data).toEqual(mockBoardData);
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from idle with error sets error status', async () => {
    mockFetchBoardData.mockRejectedValue('APIエラー');

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('APIエラー');
    expect(state.data).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from loaded (reload) preserves loaded status and sets isReloading', async () => {
    const updatedBoardData: BoardData = {
      ...mockBoardData,
      unassignedIssues: [
        {
          id: 200,
          projectId: 1,
          issueKey: 'TEST-2',
          keyId: 2,
          summary: 'New unassigned',
          description: null,
          status: {
            id: 1,
            projectId: 1,
            name: '未対応',
            color: '#ed8077',
            displayOrder: 1000,
          },
          priority: { id: 3, name: '中' },
          assignee: null,
          milestone: [],
          category: [],
          startDate: null,
          dueDate: null,
          created: '2025-04-02T00:00:00Z',
          updated: '2025-04-02T00:00:00Z',
        },
      ],
    };

    // Set to loaded state first
    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    mockFetchBoardData.mockResolvedValue(updatedBoardData);

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('loaded');
    expect(state.data).toEqual(updatedBoardData);
    expect(state.isReloading).toBe(false);
  });

  it('fetchBoard from loaded with error transitions to error', async () => {
    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    mockFetchBoardData.mockRejectedValue('サーバーエラー');

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.isReloading).toBe(false);
    expect(state.data).toBeNull();
  });

  it('fetchBoard passes settings from settingsStore', async () => {
    mockFetchBoardData.mockResolvedValue(mockBoardData);

    await useBoardStore.getState().fetchBoard();

    expect(mockFetchBoardData).toHaveBeenCalledWith(
      'test.backlog.com',
      'test-key',
      'TEST',
      'Sprint',
    );
  });

  it('reset returns to idle state', () => {
    useBoardStore.setState({
      status: 'loaded',
      data: mockBoardData,
      error: null,
      isReloading: false,
    });

    useBoardStore.getState().reset();

    const state = useBoardStore.getState();
    expect(state.status).toBe('idle');
    expect(state.data).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isReloading).toBe(false);
  });

  it('non-string error uses Japanese fallback message', async () => {
    mockFetchBoardData.mockRejectedValue(new Error('network'));

    await useBoardStore.getState().fetchBoard();

    const state = useBoardStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('データの取得に失敗しました');
  });
});
