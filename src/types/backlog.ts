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
