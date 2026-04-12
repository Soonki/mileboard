import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Lane } from './Lane';
import type { BacklogIssue } from '../../types/backlog';
import type { GroupSlot } from '../../types/group';
import { useDroppable } from '@dnd-kit/core';

function createMockIssue(overrides?: Partial<BacklogIssue>): BacklogIssue {
  return {
    id: 1,
    projectId: 1,
    issueKey: 'TEST-1',
    keyId: 1,
    summary: 'テスト課題のサマリー',
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '未対応',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: { id: 3, name: '中' },
    assignee: {
      id: 1,
      userId: 'user1',
      name: '山田太郎',
      roleType: 1,
      mailAddress: 'test@test.com',
    },
    milestone: [],
    category: [],
    startDate: null,
    dueDate: null,
    created: '2025-04-01T00:00:00Z',
    updated: '2025-04-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = {
  laneId: 'milestone-1',
  milestonePrefix: 'Sprint',
};

describe('Lane', () => {
  it('renders lane header with milestone name', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(screen.getByText(/Sprint 2504/)).toBeInTheDocument();
  });

  it('renders date range in header', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate="2025-04-01"
        releaseDueDate="2025-04-30"
        items={[]}
      />,
    );
    expect(screen.getByText('4/1~4/30')).toBeInTheDocument();
  });

  it('renders issue cards for each issue', () => {
    const issues = [
      createMockIssue({ id: 1, issueKey: 'TEST-1' }),
      createMockIssue({ id: 2, issueKey: 'TEST-2' }),
    ];
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={issues}
      />,
    );
    expect(screen.getByText('TEST-1')).toBeInTheDocument();
    expect(screen.getByText('TEST-2')).toBeInTheDocument();
  });

  it('renders empty lane when no issues', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(screen.getByText('課題なし')).toBeInTheDocument();
  });

  it('has aria-label with lane name', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(screen.getByRole('region', { name: 'Sprint 2504' })).toBeInTheDocument();
  });

  it('displays issue count in lane header', () => {
    const issues = [
      createMockIssue({ id: 1, issueKey: 'TEST-1' }),
      createMockIssue({ id: 2, issueKey: 'TEST-2' }),
    ];
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={issues}
      />,
    );
    expect(screen.getByText(/Sprint 2504 \(2\)/)).toBeInTheDocument();
  });

  it('shows toggle button when issues have assignees', () => {
    const issues = [
      createMockIssue({
        id: 1,
        issueKey: 'TEST-1',
        assignee: { id: 1, userId: 'u1', name: 'Alice', roleType: 1, mailAddress: 'a@t.com' },
      }),
      createMockIssue({
        id: 2,
        issueKey: 'TEST-2',
        assignee: { id: 2, userId: 'u2', name: 'Bob', roleType: 1, mailAddress: 'b@t.com' },
      }),
    ];
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={issues}
      />,
    );
    expect(screen.getByRole('button', { name: /内訳/ })).toBeInTheDocument();
  });

  it('does not show toggle button when issues array is empty', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls useDroppable with laneId', () => {
    render(
      <Lane
        laneId="milestone-42"
        milestonePrefix="Sprint"
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(useDroppable).toHaveBeenCalledWith({ id: 'milestone-42' });
  });

  it('shows filtered-empty message when issues empty and hiddenCount > 0', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
        hiddenCount={5}
      />,
    );
    expect(screen.getByText('5件がフィルタで非表示')).toBeInTheDocument();
    expect(screen.queryByText('課題なし')).not.toBeInTheDocument();
  });

  it('shows EmptyLane when issues empty and hiddenCount is 0', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
        hiddenCount={0}
      />,
    );
    expect(screen.getByText('課題なし')).toBeInTheDocument();
  });

  it('shows EmptyLane when issues empty and hiddenCount not provided', () => {
    render(
      <Lane
        {...defaultProps}
        name="Sprint 2504"
        startDate={null}
        releaseDueDate={null}
        items={[]}
      />,
    );
    expect(screen.getByText('課題なし')).toBeInTheDocument();
  });

  // Phase 9 (09-02): GroupSlot rendering inside Lane
  describe('Phase 9: GroupSlot integration', () => {
    function makeGroupSlot(
      memberCount: number,
      visibleCount: number,
      groupId: `group:${string}` = 'group:lane-test',
    ): GroupSlot {
      const rep = createMockIssue({
        id: 50,
        keyId: 50,
        issueKey: 'GRP-50',
        summary: 'Group representative',
      });
      const visibleMembers = Array.from({ length: visibleCount }, (_, i) =>
        i === 0
          ? rep
          : createMockIssue({ id: 51 + i, keyId: 51 + i, issueKey: `GRP-${51 + i}` }),
      );
      return {
        kind: 'group',
        group: {
          id: groupId,
          memberIds: Array.from({ length: memberCount }, (_, i) => 50 + i),
          laneId: 'milestone-1',
        },
        representativeIssue: rep,
        visibleMembers,
        totalMembers: memberCount,
        badgeText:
          visibleCount === memberCount
            ? `${memberCount}`
            : `${visibleCount}/${memberCount}`,
      };
    }

    it('renders GroupCard when items contains a GroupSlot', () => {
      const slot = makeGroupSlot(3, 3);
      render(
        <Lane
          {...defaultProps}
          name="Sprint 2504"
          startDate={null}
          releaseDueDate={null}
          items={[slot]}
        />,
      );
      expect(screen.getByRole('button', { name: /グループ/ })).toBeInTheDocument();
    });

    it('renders IssueCard for non-group items', () => {
      const issues = [createMockIssue({ id: 1, issueKey: 'TEST-1' })];
      render(
        <Lane
          {...defaultProps}
          name="Sprint 2504"
          startDate={null}
          releaseDueDate={null}
          items={issues}
        />,
      );
      expect(screen.getByText('TEST-1')).toBeInTheDocument();
    });

    it('mixes GroupCard and IssueCard in the same lane (GRP-05)', () => {
      const issue = createMockIssue({ id: 10, issueKey: 'TEST-10' });
      const slot = makeGroupSlot(2, 2, 'group:mix-test');
      render(
        <Lane
          {...defaultProps}
          name="Sprint 2504"
          startDate={null}
          releaseDueDate={null}
          items={[issue, slot]}
        />,
      );
      expect(screen.getByText('TEST-10')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /グループ/ })).toBeInTheDocument();
    });

    it('issueCount aggregates visible members of groups + individual issues', () => {
      const issue = createMockIssue({ id: 10, issueKey: 'TEST-10' });
      const slot = makeGroupSlot(5, 3, 'group:count-test');
      render(
        <Lane
          {...defaultProps}
          name="Sprint 2504"
          startDate={null}
          releaseDueDate={null}
          items={[issue, slot]}
        />,
      );
      // 1 individual + 3 visibleMembers = 4
      expect(screen.getByText(/Sprint 2504 \(4\)/)).toBeInTheDocument();
    });

    it('still shows hiddenCount when items empty (regression guard)', () => {
      render(
        <Lane
          {...defaultProps}
          name="Sprint 2504"
          startDate={null}
          releaseDueDate={null}
          items={[]}
          hiddenCount={3}
        />,
      );
      expect(screen.getByText('3件がフィルタで非表示')).toBeInTheDocument();
    });
  });
});
