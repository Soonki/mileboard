import { fetch } from '@tauri-apps/plugin-http';
import type { BacklogUser, BacklogProject, BacklogError } from '../types/backlog';

function buildApiUrl(host: string, path: string, apiKey: string): string {
  return `https://${host}/api/v2${path}?apiKey=${apiKey}`;
}

export async function testConnection(
  host: string,
  apiKey: string,
): Promise<{ success: true; user: BacklogUser } | { success: false; error: string }> {
  try {
    const url = buildApiUrl(host, '/users/myself', apiKey);
    const response = await fetch(url, { method: 'GET' });

    if (response.ok) {
      const user: BacklogUser = await response.json();
      return { success: true, user };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
      };
    }

    const errorBody: BacklogError = await response.json();
    const backlogError = errorBody.errors?.[0];

    if (backlogError?.code === 11) {
      return {
        success: false,
        error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
      };
    }

    return {
      success: false,
      error: '予期しないエラーが発生しました。しばらくしてから再試行してください。',
    };
  } catch {
    return {
      success: false,
      error: 'ホストに接続できません。URLを確認してください。',
    };
  }
}

export async function fetchProjects(
  host: string,
  apiKey: string,
): Promise<BacklogProject[]> {
  const url = buildApiUrl(host, '/projects', apiKey);
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    throw new Error('プロジェクト一覧の取得に失敗しました。');
  }

  const projects: BacklogProject[] = await response.json();
  return projects.filter((p) => !p.archived);
}
