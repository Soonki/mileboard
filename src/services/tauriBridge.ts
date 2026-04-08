import { invoke } from '@tauri-apps/api/core';
import type {
  BoardData,
  FetchBoardParams,
  UpdateIssueMilestoneParams,
} from '../types/board';

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
  projectId: number,
  projectKey: string,
  milestonePrefix: string,
  categoryIds?: number[],
): Promise<BoardData> {
  const params: FetchBoardParams = {
    host,
    apiKey,
    projectId,
    projectKey,
    milestonePrefix,
    categoryIds: categoryIds ?? null,
  };
  return invoke<BoardData>('fetch_board_data', { ...params });
}

/**
 * Update an issue's milestone via Rust IPC command.
 * Per D-09: React components NEVER call invoke() directly -- all IPC goes through tauriBridge.
 *
 * Preserves non-prefix milestones while swapping the prefix-matching one.
 *
 * @param host - Backlog host (e.g., "example.backlog.com")
 * @param apiKey - Backlog API key
 * @param issueIdOrKey - Issue ID or key (e.g., "PROJ-123")
 * @param newMilestoneId - Target milestone ID, or null to move to unassigned
 * @param milestonePrefix - Prefix to identify managed milestones (e.g., "Sprint")
 * @throws string - Japanese error message from Rust BacklogError
 */
export async function updateIssueMilestone(
  host: string,
  apiKey: string,
  issueIdOrKey: string,
  newMilestoneId: number | null,
  milestonePrefix: string,
): Promise<void> {
  const params: UpdateIssueMilestoneParams = {
    host,
    apiKey,
    issueIdOrKey,
    newMilestoneId,
    milestonePrefix,
  };
  return invoke<void>('update_issue_milestone', { ...params });
}
