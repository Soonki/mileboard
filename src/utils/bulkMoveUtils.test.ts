import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runWithConcurrency, bulkMoveIssues } from './bulkMoveUtils';
import { updateIssueMilestone } from '../services/tauriBridge';
import type { BacklogIssue } from '../types/backlog';

vi.mock('../services/tauriBridge', () => ({
  updateIssueMilestone: vi.fn(),
}));

function makeIssue(id: number, keyId: number): BacklogIssue {
  return {
    id,
    projectId: 1,
    issueKey: `TEST-${id}`,
    keyId,
    summary: `Issue ${id}`,
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '未対応',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: null,
    assignee: null,
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
  };
}

describe('runWithConcurrency', () => {
  it('returns empty result for empty tasks', async () => {
    const result = await runWithConcurrency<number>([], 3);
    expect(result).toEqual([]);
  });

  it('returns single fulfilled result for one successful task', async () => {
    const tasks = [async () => 42];
    const result = await runWithConcurrency(tasks, 1);
    expect(result).toEqual([{ status: 'fulfilled', value: 42 }]);
  });

  it('returns single rejected result for one failing task', async () => {
    const tasks = [
      async () => {
        throw new Error('boom');
      },
    ];
    const result = await runWithConcurrency(tasks, 1);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('rejected');
    if (result[0].status === 'rejected') {
      expect(result[0].reason).toBeInstanceOf(Error);
    }
  });

  it('returns fulfilled array when all tasks succeed', async () => {
    const tasks = [1, 2, 3].map((n) => async () => n * 10);
    const result = await runWithConcurrency(tasks, 2);
    expect(result).toEqual([
      { status: 'fulfilled', value: 10 },
      { status: 'fulfilled', value: 20 },
      { status: 'fulfilled', value: 30 },
    ]);
  });

  it('returns rejected array when all tasks fail', async () => {
    const tasks = [new Error('a'), new Error('b')].map((e) => async () => {
      throw e;
    });
    const result = await runWithConcurrency(tasks, 2);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('rejected');
    expect(result[1].status).toBe('rejected');
  });

  it('preserves input order in mixed success/failure', async () => {
    const tasks = [
      async () => 'a',
      async () => {
        throw new Error('fail-b');
      },
      async () => 'c',
    ];
    const result = await runWithConcurrency(tasks, 3);
    expect(result[0]).toEqual({ status: 'fulfilled', value: 'a' });
    expect(result[1].status).toBe('rejected');
    expect(result[2]).toEqual({ status: 'fulfilled', value: 'c' });
  });

  it('caps worker count at tasks.length when concurrency > tasks.length', async () => {
    const tasks = [async () => 1];
    const result = await runWithConcurrency(tasks, 100);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ status: 'fulfilled', value: 1 });
  });

  it('runs sequentially when concurrency === 1', async () => {
    const order: number[] = [];
    const tasks = [1, 2, 3].map((n) => async () => {
      order.push(n);
      await Promise.resolve();
      return n;
    });
    await runWithConcurrency(tasks, 1);
    expect(order).toEqual([1, 2, 3]);
  });

  it('captures non-Error throws (e.g. string) as reason', async () => {
    const tasks = [
      async () => {
        throw 'string-error';
      },
    ];
    const result = await runWithConcurrency(tasks, 1);
    expect(result[0]).toEqual({ status: 'rejected', reason: 'string-error' });
  });

  it('respects concurrency limit during execution', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      inFlight += 1;
      if (inFlight > maxInFlight) maxInFlight = inFlight;
      await Promise.resolve();
      await Promise.resolve();
      inFlight -= 1;
      return 1;
    });
    await runWithConcurrency(tasks, 3);
    expect(maxInFlight).toBeLessThanOrEqual(3);
    expect(maxInFlight).toBeGreaterThan(0);
  });
});

describe('bulkMoveIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all succeeded when all API calls succeed', async () => {
    vi.mocked(updateIssueMilestone).mockResolvedValue(undefined);
    const members = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const result = await bulkMoveIssues({
      members,
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);
    expect(updateIssueMilestone).toHaveBeenCalledTimes(3);
  });

  it('separates succeeded and failed in partial failure', async () => {
    vi.mocked(updateIssueMilestone)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('rate limit'))
      .mockResolvedValueOnce(undefined);
    const members = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const result = await bulkMoveIssues({
      members,
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].issue.id).toBe(2);
    expect(result.failed[0].error).toBeInstanceOf(Error);
  });

  it('returns all failed when all API calls fail', async () => {
    vi.mocked(updateIssueMilestone).mockRejectedValue(new Error('network'));
    const members = [makeIssue(1, 1), makeIssue(2, 2)];
    const result = await bulkMoveIssues({
      members,
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(2);
  });

  it('passes correct newMilestoneId for milestone-N lane', async () => {
    vi.mocked(updateIssueMilestone).mockResolvedValue(undefined);
    const members = [makeIssue(1, 1)];
    await bulkMoveIssues({
      members,
      toLaneId: 'milestone-42',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(updateIssueMilestone).toHaveBeenCalledWith(
      'https://example.com',
      'key',
      'TEST-1',
      42,
      'Sprint',
    );
  });

  it('passes null milestoneId for unassigned lane', async () => {
    vi.mocked(updateIssueMilestone).mockResolvedValue(undefined);
    const members = [makeIssue(1, 1)];
    await bulkMoveIssues({
      members,
      toLaneId: 'unassigned',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(updateIssueMilestone).toHaveBeenCalledWith(
      'https://example.com',
      'key',
      'TEST-1',
      null,
      'Sprint',
    );
  });

  it('calls onProgress with (completed, total) on each success', async () => {
    vi.mocked(updateIssueMilestone).mockResolvedValue(undefined);
    const members = [makeIssue(1, 1), makeIssue(2, 2), makeIssue(3, 3)];
    const onProgress = vi.fn();
    await bulkMoveIssues({
      members,
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
      onProgress,
    });
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenCalledWith(1, 3);
    expect(onProgress).toHaveBeenCalledWith(2, 3);
    expect(onProgress).toHaveBeenCalledWith(3, 3);
  });

  it('does not throw when onProgress is undefined', async () => {
    vi.mocked(updateIssueMilestone).mockResolvedValue(undefined);
    const members = [makeIssue(1, 1)];
    await expect(
      bulkMoveIssues({
        members,
        toLaneId: 'milestone-5',
        hostUrl: 'https://example.com',
        apiKey: 'key',
        milestonePrefix: 'Sprint',
      }),
    ).resolves.toBeDefined();
  });

  it('returns empty result for empty members array', async () => {
    const result = await bulkMoveIssues({
      members: [],
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
    expect(updateIssueMilestone).not.toHaveBeenCalled();
  });

  it('respects 3-parallel concurrency limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(updateIssueMilestone).mockImplementation(async () => {
      inFlight += 1;
      if (inFlight > maxInFlight) maxInFlight = inFlight;
      await Promise.resolve();
      await Promise.resolve();
      inFlight -= 1;
    });
    const members = Array.from({ length: 10 }, (_, i) =>
      makeIssue(i + 1, i + 1),
    );
    await bulkMoveIssues({
      members,
      toLaneId: 'milestone-5',
      hostUrl: 'https://example.com',
      apiKey: 'key',
      milestonePrefix: 'Sprint',
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
