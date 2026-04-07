import { invoke } from '@tauri-apps/api/core';
import type { BoardData, FetchBoardParams } from '../types/board';

/**
 * Fetch complete board data from Backlog via Rust IPC command.
 * Per D-09: React components NEVER call invoke() directly -- all IPC goes through tauriBridge.
 *
 * @param host - Backlog host (e.g., "example.backlog.com")
 * @param apiKey - Backlog API key
 * @param projectKey - Backlog project key (e.g., "PROJ")
 * @param milestonePrefix - Prefix to filter milestones (e.g., "Sprint")
 * @param categoryIds - Optional category IDs to filter unassigned issues
 * @returns Complete board data (milestones with issues + unassigned issues)
 * @throws string - Japanese error message from Rust BacklogError
 */
export async function fetchBoardData(
  host: string,
  apiKey: string,
  projectKey: string,
  milestonePrefix: string,
  categoryIds?: number[],
): Promise<BoardData> {
  const params: FetchBoardParams = {
    host,
    apiKey,
    projectKey,
    milestonePrefix,
    categoryIds: categoryIds ?? null,
  };
  return invoke<BoardData>('fetch_board_data', { ...params });
}
