import { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, MouseEvent } from 'react';
import type { GroupSlot, GroupId } from '../../types/group';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import { PriorityIndicator } from '../PriorityIndicator/PriorityIndicator';
import styles from './GroupCard.module.css';

interface GroupCardProps {
  slot: GroupSlot;
  laneId: string;
  milestonePrefix: string;
  /**
   * Plan 04: signature widened to (groupId, DOMRect). The DOMRect is the
   * GroupCard root's bounding rect at the moment of click — used by Board.tsx
   * to position the GroupPopover anchor.
   */
  onExpand: (groupId: GroupId, rect: DOMRect) => void;
  isExpanded: boolean;
}

/**
 * Phase 9 GroupCard — 付箋スタック表現でグループを 1 枚のカードとして描画する。
 *
 * - 2 枚の影レイヤー（real DOM sibling）+ 代表カード + 件数バッジ（D-06, D-07）
 * - useSortable + useDroppable を両方装着（card-on-group drop, D-01/D-02）
 * - クリックで onExpand を発火（drag 中は抑制 — D-08 click vs drag 区別）
 * - ARIA: role="button", aria-haspopup="true", aria-expanded={isExpanded}
 *
 * onExpand の本体実装は Plan 04（GroupPopover）まで no-op stub。
 */
export function GroupCard({
  slot,
  laneId: _laneId,
  milestonePrefix: _milestonePrefix,
  onExpand,
  isExpanded,
}: GroupCardProps) {
  const sortable = useSortable({
    id: slot.group.id,
    disabled: false,
  });
  const droppable = useDroppable({
    id: `group-target-${slot.group.id}`,
    disabled: sortable.isDragging,
  });

  // Plan 04: keep our own ref to the root so we can call getBoundingClientRect()
  // on click and pass the anchor rect to the GroupPopover via onExpand.
  const groupRootRef = useRef<HTMLDivElement | null>(null);

  const setRefs = (el: HTMLElement | null): void => {
    sortable.setNodeRef(el);
    droppable.setNodeRef(el);
    if (el instanceof HTMLDivElement) {
      groupRootRef.current = el;
    }
  };

  const style: CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition ?? undefined,
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (sortable.isDragging) return;
    e.stopPropagation();
    const rect = groupRootRef.current?.getBoundingClientRect() ?? new DOMRect();
    onExpand(slot.group.id, rect);
  };

  const rep = slot.representativeIssue;
  const isVSlashT = slot.badgeText.includes('/');

  return (
    <div
      ref={setRefs}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      className={`${styles.groupSlot} ${
        sortable.isDragging ? styles.cardDragging : ''
      } ${droppable.isOver ? styles.dropTargetGroup : ''}`}
      onClick={handleClick}
      role="button"
      aria-label={`グループ (${slot.totalMembers}件)、クリックで展開`}
      aria-haspopup="true"
      aria-expanded={isExpanded ? 'true' : 'false'}
    >
      <div className={styles.shadowLayer2} aria-hidden="true" />
      <div className={styles.shadowLayer1} aria-hidden="true" />
      <div className={styles.representativeCard}>
        <div className={styles.line1}>
          <span className={styles.issueKey}>{rep.issueKey}</span>
          <StatusBadge name={rep.status.name} color={rep.status.color} />
        </div>
        <div className={styles.summary}>{rep.summary}</div>
        <div className={styles.line3}>
          {rep.assignee !== null ? (
            <span className={styles.assignee}>{rep.assignee.name}</span>
          ) : (
            <span className={styles.noAssignee}>---</span>
          )}
          <PriorityIndicator priority={rep.priority} />
        </div>
      </div>
      <span
        className={`${styles.countBadge} ${
          isVSlashT ? styles.countBadgePill : ''
        }`}
        aria-hidden="true"
      >
        {slot.badgeText}
      </span>
    </div>
  );
}
