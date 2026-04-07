export interface ConnectionSettings {
  hostUrl: string;
  apiKey: string;
  projectId: number | null;
  projectKey: string;
  milestonePrefix: string;
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';
