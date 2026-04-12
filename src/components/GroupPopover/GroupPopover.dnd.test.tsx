import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { DndContext, useDraggable } from '@dnd-kit/core';
import '@testing-library/jest-dom';

/**
 * R6 PoC: React Portal で mount されたコンポーネント内の useDraggable が、
 * Portal 外ツリーの DndContext を正しく継承できることを verify する。
 *
 * tests/setup.ts の @dnd-kit/core モックは DndContext を pass-through、
 * useDraggable を `{ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null }`
 * スタブとして返す。そのため本 PoC は以下を確認するのみ:
 *   1. Portal 内のコンポーネントが document.body に mount される
 *   2. Portal 内の useDraggable 呼び出しが throw しない（モック経由で OK）
 *   3. Portal 内の要素が DnDContext 子ツリーから普通に accessible
 *
 * 実機での DnD context 継承は React の公式仕様に依存しており、
 * Wave 0 ではモック環境での mount 成功を verify するのが最低限。
 */

function DraggableMember({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`member-${id}`}
    >
      {label}
    </div>
  );
}

function PortalPopover({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div data-testid="popover-portal" role="dialog" aria-label="グループの内訳">
      {children}
    </div>,
    document.body,
  );
}

describe('GroupPopover DnD PoC (R6)', () => {
  it('React Portal inside DndContext mounts to document.body', () => {
    render(
      <DndContext>
        <div data-testid="board-root">board</div>
        <PortalPopover>
          <DraggableMember id="member-1" label="課題 A" />
        </PortalPopover>
      </DndContext>,
    );

    // Portal が mount されている
    expect(screen.getByTestId('popover-portal')).toBeInTheDocument();
    // Portal 内の DraggableMember が accessible
    expect(screen.getByTestId('member-member-1')).toBeInTheDocument();
    expect(screen.getByText('課題 A')).toBeInTheDocument();
  });

  it('Portal content is mounted as body child (escape overflow clipping)', () => {
    render(
      <DndContext>
        <div style={{ overflow: 'hidden' }} data-testid="clipped-container">
          <PortalPopover>
            <DraggableMember id="member-2" label="課題 B" />
          </PortalPopover>
        </div>
      </DndContext>,
    );

    // Portal 要素は clipped-container の子孫ではない（body 直下にある）
    const portal = screen.getByTestId('popover-portal');
    const clipped = screen.getByTestId('clipped-container');
    expect(clipped.contains(portal)).toBe(false);
  });

  it('multiple DraggableMembers inside popover each receive useDraggable refs', () => {
    render(
      <DndContext>
        <PortalPopover>
          <DraggableMember id="a" label="A" />
          <DraggableMember id="b" label="B" />
          <DraggableMember id="c" label="C" />
        </PortalPopover>
      </DndContext>,
    );

    // 3 つの独立した draggable メンバーが同じ Portal 内に render される
    expect(screen.getByTestId('member-a')).toBeInTheDocument();
    expect(screen.getByTestId('member-b')).toBeInTheDocument();
    expect(screen.getByTestId('member-c')).toBeInTheDocument();
  });
});
