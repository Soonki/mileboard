import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GroupPopover } from './GroupPopover';
import type { BacklogIssue } from '../../types/backlog';
import type { GroupSlot, GroupId } from '../../types/group';

// Mock IssueCard so we can identify popover members independently from real DnD logic.
vi.mock('../IssueCard/IssueCard', () => ({
  IssueCard: ({ issue }: { issue: BacklogIssue }) => (
    <div data-testid={`popover-member-${issue.id}`}>{issue.issueKey}</div>
  ),
}));

// Mock useGroupStore.getState().dissolveGroup so we can spy on the dissolve action.
const mockDissolveGroup = vi.fn();
vi.mock('../../stores/groupStore', () => ({
  useGroupStore: {
    getState: () => ({ dissolveGroup: mockDissolveGroup }),
  },
}));

function createMockIssue(overrides?: Partial<BacklogIssue>): BacklogIssue {
  return {
    id: 1,
    projectId: 1,
    issueKey: 'TEST-1',
    keyId: 1,
    summary: 'メンバー課題',
    description: null,
    status: {
      id: 1,
      projectId: 1,
      name: '未対応',
      color: '#ed8077',
      displayOrder: 1000,
    },
    priority: { id: 3, name: '中' },
    assignee: null,
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
  groupId: GroupId = 'group:popover-test',
): GroupSlot {
  const visibleMembers: BacklogIssue[] = Array.from(
    { length: visibleCount },
    (_, i) =>
      createMockIssue({
        id: i + 1,
        keyId: i + 1,
        issueKey: `TEST-${i + 1}`,
      }),
  );
  return {
    kind: 'group',
    group: {
      id: groupId,
      memberIds: Array.from({ length: totalMembers }, (_, i) => i + 1),
      laneId: 'milestone-1',
    },
    representativeIssue: visibleMembers[0] ?? createMockIssue(),
    visibleMembers,
    totalMembers,
    badgeText:
      visibleCount === totalMembers
        ? `${totalMembers}`
        : `${visibleCount}/${totalMembers}`,
  };
}

const sampleAnchorRect: DOMRect = {
  top: 100,
  left: 200,
  right: 300,
  bottom: 150,
  width: 100,
  height: 50,
  x: 200,
  y: 100,
  toJSON: () => ({}),
} as DOMRect;

beforeEach(() => {
  mockDissolveGroup.mockClear();
  Object.defineProperty(window, 'innerWidth', {
    value: 1920,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: 1080,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  // Each test renders a portal — clean up document.body manually if needed
});

describe('GroupPopover', () => {
  it('renders header with "グループ (N件)"', () => {
    const slot = makeSlot(5, 5);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(screen.getByText('グループ (5件)')).toBeInTheDocument();
  });

  it('renders close button with aria-label="閉じる"', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument();
  });

  it('renders each visibleMember as IssueCard', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(screen.getByTestId('popover-member-1')).toBeInTheDocument();
    expect(screen.getByTestId('popover-member-2')).toBeInTheDocument();
    expect(screen.getByTestId('popover-member-3')).toBeInTheDocument();
  });

  it('renders "ドラッグで個別に外せます" hint when visibleMembers.length > 1', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(screen.getByText('ドラッグで個別に外せます')).toBeInTheDocument();
  });

  it('does NOT render the drag-out hint when visibleMembers.length === 1', () => {
    const slot = makeSlot(2, 1);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(screen.queryByText('ドラッグで個別に外せます')).toBeNull();
  });

  it('renders "グループを解除する" button', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'グループを解除する' }),
    ).toBeInTheDocument();
  });

  it('onClose fires when close button clicked', async () => {
    const onClose = vi.fn();
    const slot = makeSlot(3, 3);
    const user = userEvent.setup();
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onClose fires when clicking outside the popover (document mousedown)', () => {
    const onClose = vi.fn();
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={vi.fn()}
      />,
    );
    // Simulate a mousedown outside the popover element
    const outsideDiv = document.createElement('div');
    document.body.appendChild(outsideDiv);
    fireEvent.mouseDown(outsideDiv);
    expect(onClose).toHaveBeenCalled();
    document.body.removeChild(outsideDiv);
  });

  it('onClose does NOT fire when clicking inside the popover', () => {
    const onClose = vi.fn();
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={vi.fn()}
      />,
    );
    // mousedown inside the popover should not trigger close
    const popover = screen.getByRole('dialog');
    fireEvent.mouseDown(popover);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('onClose fires when Escape key pressed', () => {
    const onClose = vi.fn();
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call onClose when a non-Escape key is pressed', () => {
    const onClose = vi.fn();
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={vi.fn()}
      />,
    );
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('handleDissolveClick calls useGroupStore.dissolveGroup with group.id then onDissolve then onClose', async () => {
    const onClose = vi.fn();
    const onDissolve = vi.fn();
    const slot = makeSlot(3, 3, 'group:dissolve-target');
    const user = userEvent.setup();
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={onClose}
        onDissolve={onDissolve}
      />,
    );
    await user.click(
      screen.getByRole('button', { name: 'グループを解除する' }),
    );
    expect(mockDissolveGroup).toHaveBeenCalledWith('group:dissolve-target');
    expect(onDissolve).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when anchorRect is null', () => {
    const slot = makeSlot(3, 3);
    const { container } = render(
      <GroupPopover
        slot={slot}
        anchorRect={null}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    // Render container should be empty (no portal mount)
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('uses createPortal to mount into document.body (parent !== render container)', () => {
    const slot = makeSlot(3, 3);
    const { container } = render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    // Portal target is document.body, not the test container
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('renders dialog with role="dialog" and aria-label="グループの内訳"', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('dialog', { name: 'グループの内訳' }),
    ).toBeInTheDocument();
  });

  it('positions the popover with position: fixed (escapes lane overflow)', () => {
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ position: 'fixed' });
  });

  it('flips to the LEFT side when right placement would overflow viewport right edge', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 350,
      configurable: true,
      writable: true,
    });
    // anchorRect.right (300) + MARGIN(8) + POPOVER_WIDTH(260) = 568 > 350-8
    const slot = makeSlot(3, 3);
    render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog') as HTMLElement;
    // When flipped, left = anchorRect.left(200) - POPOVER_WIDTH(260) - MARGIN(8) = -68,
    // which is < MARGIN(8), so clamped to MARGIN(8).
    expect(dialog.style.left).toBe('8px');
  });

  it('removes document event listeners on unmount (memory leak prevention)', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const slot = makeSlot(3, 3);
    const { unmount } = render(
      <GroupPopover
        slot={slot}
        anchorRect={sampleAnchorRect}
        milestonePrefix="Sprint"
        onClose={vi.fn()}
        onDissolve={vi.fn()}
      />,
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });
});
