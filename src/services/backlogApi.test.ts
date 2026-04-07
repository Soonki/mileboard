import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetch } from '@tauri-apps/plugin-http';
import { testConnection, fetchProjects } from './backlogApi';
import type { BacklogUser, BacklogProject, BacklogError } from '../types/backlog';

const mockedFetch = vi.mocked(fetch);

const mockUser: BacklogUser = {
  id: 1,
  userId: 'testuser',
  name: 'Test User',
  roleType: 1,
  mailAddress: 'test@example.com',
};

describe('testConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with user object when API key is valid', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockUser),
    } as Response);

    const result = await testConnection('test.backlog.com', 'valid-key');

    expect(result).toEqual({ success: true, user: mockUser });
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://test.backlog.com/api/v2/users/myself?apiKey=valid-key',
      { method: 'GET' },
    );
  });

  it('returns specific Japanese error message for 401', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await testConnection('test.backlog.com', 'invalid-key');

    expect(result).toEqual({
      success: false,
      error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
    });
  });

  it('returns specific Japanese error message for BacklogError code 11', async () => {
    const backlogError: BacklogError = {
      errors: [
        {
          message: 'Authentication error',
          code: 11,
          moreInfo: '',
        },
      ],
    };

    mockedFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve(backlogError),
    } as Response);

    const result = await testConnection('test.backlog.com', 'bad-key');

    expect(result).toEqual({
      success: false,
      error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
    });
  });

  it('returns specific Japanese error message for network failure', async () => {
    mockedFetch.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await testConnection('invalid-host.example.com', 'some-key');

    expect(result).toEqual({
      success: false,
      error: 'ホストに接続できません。URLを確認してください。',
    });
  });

  it('returns unexpected error message for non-401 HTTP errors', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          errors: [{ message: 'Internal Error', code: 1, moreInfo: '' }],
        }),
    } as Response);

    const result = await testConnection('test.backlog.com', 'some-key');

    expect(result).toEqual({
      success: false,
      error: '予期しないエラーが発生しました。しばらくしてから再試行してください。',
    });
  });
});

describe('fetchProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only non-archived projects', async () => {
    const projects: BacklogProject[] = [
      { id: 1, projectKey: 'PROJ1', name: 'Active Project', archived: false },
      { id: 2, projectKey: 'PROJ2', name: 'Archived Project', archived: true },
      { id: 3, projectKey: 'PROJ3', name: 'Another Active', archived: false },
    ];

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(projects),
    } as Response);

    const result = await fetchProjects('test.backlog.com', 'valid-key');

    expect(result).toEqual([
      { id: 1, projectKey: 'PROJ1', name: 'Active Project', archived: false },
      { id: 3, projectKey: 'PROJ3', name: 'Another Active', archived: false },
    ]);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://test.backlog.com/api/v2/projects?apiKey=valid-key',
      { method: 'GET' },
    );
  });

  it('throws Error when response is not OK', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(
      fetchProjects('test.backlog.com', 'invalid-key'),
    ).rejects.toThrow('プロジェクト一覧の取得に失敗しました。');
  });
});
