export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
  roleType: number;
  mailAddress: string;
}

export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
  archived: boolean;
}

export interface BacklogError {
  errors: Array<{
    message: string;
    code: number;
    moreInfo: string;
  }>;
}

export interface BacklogMilestone {
  id: number;
  projectId: number;
  name: string;
  description: string;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

export interface BacklogStatus {
  id: number;
  projectId: number | null;
  name: string;
  color: string;
  displayOrder: number;
}

export interface BacklogPriority {
  id: number;
  name: string;
}

export interface BacklogCategory {
  id: number;
  name: string;
  displayOrder: number | null;
}

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueKey: string;
  keyId: number;
  summary: string;
  description: string | null;
  status: BacklogStatus;
  priority: BacklogPriority | null;
  assignee: BacklogUser | null;
  /** Array of milestones -- NOT singular. Backlog issues can belong to multiple milestones.
   * This is critical for Phase 5 PATCH preservation (CLAUDE.md milestoneId[] gotcha). */
  milestone: BacklogMilestone[];
  category: BacklogCategory[];
  startDate: string | null;
  dueDate: string | null;
  created: string;
  updated: string;
}
