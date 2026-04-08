import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { fetchBoardData, updateIssueMilestone } from './tauriBridge';
import type { BoardData } from '../types/board';

const mockInvoke = vi.mocked(invoke);

describe('tauriBridge', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  describe('fetchBoardData', () => {
    // Realistic fixture with full BoardData shape
    const mockBoardData: BoardData = {
      milestones: [
        {
          milestone: {
            id: 1,
            projectId: 100,
            name: 'Sprint 1',
            description: 'First sprint',
            startDate: '2026-04-01',
            releaseDueDate: '2026-04-30',
            archived: false,
            displayOrder: 0,
          },
          issues: [
            {
              id: 10,
              projectId: 100,
              issueKey: 'PROJ-10',
              keyId: 10,
              summary: 'Implement login',
              description: null,
              status: { id: 1, projectId: 100, name: 'Open', color: '#ed8077', displayOrder: 0 },
              priority: { id: 3, name: 'Normal' },
              assignee: { id: 5, userId: 'taro', name: 'Taro', roleType: 1, mailAddress: 'taro@example.com' },
              milestone: [
                { id: 1, projectId: 100, name: 'Sprint 1', description: '', startDate: '2026-04-01', releaseDueDate: '2026-04-30', archived: false, displayOrder: 0 },
              ],
              category: [],
              startDate: null,
              dueDate: null,
              created: '2026-01-01T00:00:00Z',
              updated: '2026-01-01T00:00:00Z',
            },
          ],
        },
      ],
      unassignedIssues: [],
    };

    it('calls invoke with fetch_board_data command', async () => {
      mockInvoke.mockResolvedValue(mockBoardData);
      await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint');
      expect(mockInvoke).toHaveBeenCalledWith('fetch_board_data', expect.any(Object));
    });

    it('passes all parameters correctly with categoryIds null', async () => {
      mockInvoke.mockResolvedValue(mockBoardData);
      await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint');
      expect(mockInvoke).toHaveBeenCalledWith('fetch_board_data', {
        host: 'example.backlog.com',
        apiKey: 'key123',
        projectId: 100,
        projectKey: 'PROJ',
        milestonePrefix: 'Sprint',
        categoryIds: null,
      });
    });

    it('converts undefined categoryIds to null', async () => {
      mockInvoke.mockResolvedValue(mockBoardData);
      await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint', undefined);
      expect(mockInvoke).toHaveBeenCalledWith('fetch_board_data', expect.objectContaining({
        categoryIds: null,
      }));
    });

    it('passes categoryIds array when provided', async () => {
      mockInvoke.mockResolvedValue(mockBoardData);
      await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint', [1, 2, 3]);
      expect(mockInvoke).toHaveBeenCalledWith('fetch_board_data', {
        host: 'example.backlog.com',
        apiKey: 'key123',
        projectId: 100,
        projectKey: 'PROJ',
        milestonePrefix: 'Sprint',
        categoryIds: [1, 2, 3],
      });
    });

    it('returns BoardData on success', async () => {
      mockInvoke.mockResolvedValue(mockBoardData);
      const result = await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint');
      expect(result).toEqual(mockBoardData);
      // Verify structure shape (realistic fixture test)
      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].milestone.name).toBe('Sprint 1');
      expect(result.milestones[0].issues).toHaveLength(1);
      expect(result.milestones[0].issues[0].milestone).toHaveLength(1);
      expect(result.unassignedIssues).toHaveLength(0);
    });

    it('throws string error on invoke rejection', async () => {
      mockInvoke.mockRejectedValue('APIキーが無効です');
      await expect(
        fetchBoardData('example.backlog.com', 'key123', 1, 'PROJ', 'Sprint'),
      ).rejects.toBe('APIキーが無効です');
    });

    it('validates realistic fixture BoardData shape with all field types', async () => {
      // Exercise full payload with null optional fields
      const minimalBoardData: BoardData = {
        milestones: [
          {
            milestone: {
              id: 2,
              projectId: 100,
              name: 'Sprint 2',
              description: '',
              startDate: null,
              releaseDueDate: null,
              archived: false,
              displayOrder: 1,
            },
            issues: [
              {
                id: 20,
                projectId: 100,
                issueKey: 'PROJ-20',
                keyId: 20,
                summary: 'Task with minimal fields',
                description: null,
                status: { id: 2, projectId: null, name: 'In Progress', color: '#4488c5', displayOrder: 1 },
                priority: null,
                assignee: null,
                milestone: [],
                category: [],
                startDate: null,
                dueDate: null,
                created: '2026-02-01T00:00:00Z',
                updated: '2026-02-01T00:00:00Z',
              },
            ],
          },
        ],
        unassignedIssues: [],
      };
      mockInvoke.mockResolvedValue(minimalBoardData);
      const result = await fetchBoardData('example.backlog.com', 'key123', 100, 'PROJ', 'Sprint');
      expect(result.milestones[0].issues[0].priority).toBeNull();
      expect(result.milestones[0].issues[0].assignee).toBeNull();
      expect(result.milestones[0].milestone.startDate).toBeNull();
    });
  });

  describe('updateIssueMilestone', () => {
    it('calls invoke with update_issue_milestone command and camelCase params', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await updateIssueMilestone(
        'example.backlog.com',
        'key123',
        'PROJ-42',
        99,
        'Sprint',
      );

      expect(mockInvoke).toHaveBeenCalledWith('update_issue_milestone', {
        host: 'example.backlog.com',
        apiKey: 'key123',
        issueIdOrKey: 'PROJ-42',
        newMilestoneId: 99,
        milestonePrefix: 'Sprint',
      });
    });

    it('passes null newMilestoneId for unassigned move', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await updateIssueMilestone(
        'example.backlog.com',
        'key123',
        'PROJ-42',
        null,
        'Sprint',
      );

      expect(mockInvoke).toHaveBeenCalledWith('update_issue_milestone', {
        host: 'example.backlog.com',
        apiKey: 'key123',
        issueIdOrKey: 'PROJ-42',
        newMilestoneId: null,
        milestonePrefix: 'Sprint',
      });
    });

    it('propagates error from invoke', async () => {
      mockInvoke.mockRejectedValue('マイルストーンの更新に失敗しました');

      await expect(
        updateIssueMilestone('host', 'key', 'PROJ-1', 42, 'Sprint'),
      ).rejects.toBe('マイルストーンの更新に失敗しました');
    });

    it('resolves void on success', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const result = await updateIssueMilestone(
        'host',
        'key',
        'PROJ-1',
        42,
        'Sprint',
      );

      expect(result).toBeUndefined();
    });
  });
});
