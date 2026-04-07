import type { BacklogMilestone, BacklogIssue } from './backlog';

export interface MilestoneWithIssues {
  milestone: BacklogMilestone;
  issues: BacklogIssue[];
}

export interface BoardData {
  milestones: MilestoneWithIssues[];
  unassignedIssues: BacklogIssue[];
}

/** Parameters for the fetch_board_data IPC command.
 * Field names use camelCase -- Tauri auto-converts to snake_case for Rust. */
export interface FetchBoardParams {
  host: string;
  apiKey: string;
  projectKey: string;
  milestonePrefix: string;
  categoryIds: number[] | null;
}
