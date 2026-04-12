import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { GroupSlot } from '../../types/group';
import { useGroupStore } from '../../stores/groupStore';
import { IssueCard } from '../IssueCard/IssueCard';
import styles from './GroupPopover.module.css';

interface GroupPopoverProps {
  /** Group slot data (from applyGroupExpansion) */
  slot: GroupSlot;
  /** Anchor rect (typically GroupCard.getBoundingClientRect()). null hides the popover. */
  anchorRect: DOMRect | null;
  /** Milestone prefix used by member IssueCards */
  milestonePrefix: string;
  /** Called when the popover should close (outside click / Escape / × button) */
  onClose: () => void;
  /** Called after dissolveGroup runs so the parent can clean up orderMap */
  onDissolve: () => void;
}

const POPOVER_WIDTH = 260;
const MARGIN = 8;

interface PopoverPosition {
  top: number;
  left: number;
}

/**
 * Phase 9 GroupPopover — グループ内訳を表示する展開ポップオーバー（D-08, D-09, GRP-03）。
 *
 * 主な責務:
 * - React Portal で document.body に mount してレーンの overflow を escape
 * - 配置アルゴリズム: 右 default → viewport 右端で左 flip → viewport 下端で上シフト
 * - 外クリック / Escape / × ボタンで onClose 発火
 * - メンバーカードのクリックは既存 IssueCard の onClick で Backlog URL を開く（D-09）
 * - 「グループを解除する」で useGroupStore.dissolveGroup → onDissolve → onClose
 *
 * 注: useEffect の cleanup で document リスナーを必ず解除する（T-09-04-05 mitigation）。
 */
export function GroupPopover({
  slot,
  anchorRect,
  milestonePrefix,
  onClose,
  onDissolve,
}: GroupPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: 0,
  });

  // Placement algorithm — recompute on anchor change.
  useLayoutEffect(() => {
    if (!anchorRect) return;

    const popoverMaxHeight = Math.min(400, window.innerHeight - 48);

    // 1. Default: open to the RIGHT of the anchor.
    let left = anchorRect.right + MARGIN;
    // 2. If right placement overflows the viewport, FLIP to the LEFT.
    if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
      left = anchorRect.left - POPOVER_WIDTH - MARGIN;
    }
    // 3. If left placement still overflows, clamp to the viewport left edge.
    if (left < MARGIN) {
      left = MARGIN;
    }

    // 4. Top: align with the anchor top, shift up if bottom would overflow.
    let top = anchorRect.top;
    if (top + popoverMaxHeight > window.innerHeight - MARGIN) {
      top = window.innerHeight - popoverMaxHeight - MARGIN;
    }
    if (top < MARGIN) {
      top = MARGIN;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  // Outside click + Escape — both wired with explicit cleanup to prevent leaks.
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent): void => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleDissolveClick = (
    _e: ReactMouseEvent<HTMLButtonElement>,
  ): void => {
    useGroupStore.getState().dissolveGroup(slot.group.id);
    onDissolve();
    onClose();
  };

  if (!anchorRect) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={styles.popover}
      style={{ position: 'fixed', top: position.top, left: position.left }}
      role="dialog"
      aria-label="グループの内訳"
    >
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          グループ ({slot.totalMembers}件)
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className={styles.closeButton}
        >
          ×
        </button>
      </div>

      <div className={styles.memberList}>
        {slot.visibleMembers.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            laneId={slot.group.laneId}
            milestonePrefix={milestonePrefix}
          />
        ))}
        {slot.visibleMembers.length > 1 && (
          <div className={styles.dragOutHint}>ドラッグで個別に外せます</div>
        )}
      </div>

      <button
        type="button"
        onClick={handleDissolveClick}
        className={styles.dissolveButton}
      >
        グループを解除する
      </button>
    </div>,
    document.body,
  );
}
