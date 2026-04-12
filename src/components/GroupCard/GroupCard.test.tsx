import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GroupCard } from './GroupCard';
import type { BacklogIssue } from '../../types/backlog';
import type { GroupSlot, GroupId } from '../../types/group';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

vi.mock('../../stores/sortStore', () => ({
  useSortStore: vi.fn(
    (selector: (s: { field: string; direction: string }) => unknown) =>
      selector({ field: 'none', direction: 'asc' }),
  ),
}));

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
    created: '2026-04-01T00:00:00Z',
    updated: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeSlot(
  totalMembers: number,
  visibleCount: number,
  representative: BacklogIssue,
  groupId: GroupId = 'group:test-id',
): GroupSlot {
  const visibleMembers = Array.from({ length: visibleCount }, (_, i) =>
    i === 0
      ? representative
      : createMockIssue({ id: i + 100, keyId: i + 100, issueKey: `TEST-${i + 100}` }),
  );
  return {
    kind: 'group',
    group: {
      id: groupId,
      memberIds: Array.from({ length: totalMembers }, (_, i) =>
        i === 0 ? representative.id : i + 100,
      ),
      laneId: 'milestone-1',
    },
    representativeIssue: representative,
    visibleMembers,
    totalMembers,
    badgeText:
      visibleCount === totalMembers ? `${totalMembers}` : `${visibleCount}/${totalMembers}`,
  };
}

const defaultProps = {
  laneId: 'milestone-1',
  milestonePrefix: 'Sprint',
  isExpanded: false,
};

describe('GroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    } as unknown as ReturnType<typeof useSortable>);
    vi.mocked(useDroppable).mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    } as unknown as ReturnType<typeof useDroppable>);
  });

  it('renders representative card with issueKey and summary', () => {
    const rep = createMockIssue({
      id: 5,
      keyId: 5,
      issueKey: 'TEST-5',
      summary: '代表カードのサマリー',
    });
    const slot = makeSlot(3, 3, rep);
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    expect(screen.getByText('TEST-5')).toBeInTheDocument();
    expect(screen.getByText('代表カードのサマリー')).toBeInTheDocument();
  });

  it("renders count badge with 'N' when visibleCount === totalMembers", () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(4, 4, rep);
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    // badge has aria-hidden so query by text only
    const badges = screen.getAllByText('4');
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders count badge with 'V/T' when visibleCount < totalMembers", () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(5, 2, rep);
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it("applies countBadgePill class when badgeText contains '/'", () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(5, 2, rep);
    const { container } = render(
      <GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />,
    );
    const badge = container.querySelector('span[class*="countBadge"]');
    expect(badge?.className).toMatch(/countBadgePill/);
  });

  it('renders 2 shadow layers with aria-hidden="true"', () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    const { container } = render(
      <GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />,
    );
    const shadowLayers = container.querySelectorAll('div[aria-hidden="true"]');
    // 2 shadow layers (countBadge is span, not div)
    expect(shadowLayers.length).toBeGreaterThanOrEqual(2);
  });

  it('has role="button" and aria-haspopup="true"', () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(2, 2, rep);
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    const root = screen.getByRole('button');
    expect(root).toHaveAttribute('aria-haspopup', 'true');
  });

  it('aria-label contains "グループ (N件)、クリックで展開"', () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(7, 5, rep);
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: 'グループ (7件)、クリックで展開' }),
    ).toBeInTheDocument();
  });

  it("aria-expanded='true' when isExpanded prop is true", () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    render(
      <GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} isExpanded />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it("aria-expanded='false' when isExpanded prop is false", () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    render(
      <GroupCard
        slot={slot}
        onExpand={vi.fn()}
        {...defaultProps}
        isExpanded={false}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('onExpand callback fires with groupId and DOMRect on click (Plan 04)', async () => {
    const onExpand = vi.fn();
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep, 'group:click-test');
    const user = userEvent.setup();
    render(<GroupCard slot={slot} onExpand={onExpand} {...defaultProps} />);
    await user.click(screen.getByRole('button'));
    // Plan 04: signature is (groupId, rect) — second arg is a DOMRect (or fallback DOMRect)
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith(
      'group:click-test',
      expect.any(Object),
    );
    // The second argument should look like a DOMRect (have top/left/right/bottom)
    const rectArg = onExpand.mock.calls[0][1];
    expect(typeof rectArg.top).toBe('number');
    expect(typeof rectArg.left).toBe('number');
    expect(typeof rectArg.right).toBe('number');
    expect(typeof rectArg.bottom).toBe('number');
  });

  it('onExpand does NOT fire when useSortable.isDragging is true', async () => {
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: true,
    } as unknown as ReturnType<typeof useSortable>);
    const onExpand = vi.fn();
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    const user = userEvent.setup();
    render(<GroupCard slot={slot} onExpand={onExpand} {...defaultProps} />);
    await user.click(screen.getByRole('button'));
    expect(onExpand).not.toHaveBeenCalled();
  });

  it('renders with dropTargetGroup class when useDroppable.isOver returns true', () => {
    vi.mocked(useDroppable).mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: true,
    } as unknown as ReturnType<typeof useDroppable>);
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    const { container } = render(
      <GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/dropTargetGroup/);
  });

  it('calls useSortable with the group id', () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep, 'group:sortable-test');
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    expect(useSortable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'group:sortable-test' }),
    );
  });

  it('calls useDroppable with group-target- prefix and group id', () => {
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep, 'group:droppable-test');
    render(<GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />);
    expect(useDroppable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'group-target-group:droppable-test' }),
    );
  });

  it('applies cardDragging class when sortable.isDragging is true', () => {
    vi.mocked(useSortable).mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: true,
    } as unknown as ReturnType<typeof useSortable>);
    const rep = createMockIssue({ id: 1, keyId: 1, issueKey: 'TEST-1' });
    const slot = makeSlot(3, 3, rep);
    const { container } = render(
      <GroupCard slot={slot} onExpand={vi.fn()} {...defaultProps} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/cardDragging/);
  });
});
