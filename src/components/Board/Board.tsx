import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Toaster } from 'sonner';
import { useBoardStore, findIssueInBoardData } from '../../stores/boardStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { BacklogIssue } from '../../types/backlog';
import type { BoardData } from '../../types/board';
import { Lane } from '../Lane/Lane';
import { DragOverlayCard } from '../DragOverlayCard/DragOverlayCard';
import { BoardSkeleton } from '../BoardSkeleton/BoardSkeleton';
import { BoardError } from '../BoardError/BoardError';
import styles from './Board.module.css';

/**
 * Find which lane contains an item by its ID.
 */
function findLaneContaining(
  data: BoardData,
  itemId: number | string,
): string | null {
  const id = typeof itemId === 'string' ? Number(itemId) : itemId;
  if (data.unassignedIssues.some((i) => i.id === id)) return 'unassigned';
  for (const mwi of data.milestones) {
    if (mwi.issues.some((i) => i.id === id))
      return `milestone-${mwi.milestone.id}`;
  }
  return null;
}

/**
 * Resolve over.id to a lane ID.
 * If overId is itself a lane ID, return it directly.
 * If overId is an item ID, find the lane containing it.
 */
function resolveOverLaneId(
  data: BoardData,
  overId: number | string,
): string | null {
  const overStr = String(overId);
  if (overStr === 'unassigned' || overStr.startsWith('milestone-'))
    return overStr;
  return findLaneContaining(data, overId);
}

export function Board() {
  const [activeIssue, setActiveIssue] = useState<BacklogIssue | null>(null);
  const status = useBoardStore((s) => s.status);
  const data = useBoardStore((s) => s.data);
  const error = useBoardStore((s) => s.error);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const moveIssue = useBoardStore((s) => s.moveIssue);
  const milestonePrefix = useSettingsStore((s) => s.settings.milestonePrefix);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!data) return;
    const issueId = event.active.id as number;
    const found = findIssueInBoardData(data, issueId);
    setActiveIssue(found);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveIssue(null);
    if (!data || !event.over) return;

    const fromLaneId = findLaneContaining(data, event.active.id as number);
    const toLaneId = resolveOverLaneId(data, event.over.id);

    if (fromLaneId && toLaneId && fromLaneId !== toLaneId) {
      moveIssue(event.active.id as number, fromLaneId, toLaneId);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  if (status === 'idle' || status === 'loading') {
    return <BoardSkeleton />;
  }

  if (status === 'error') {
    return (
      <BoardError
        message={error ?? 'エラーが発生しました'}
        onRetry={fetchBoard}
      />
    );
  }

  if (status === 'loaded' && data !== null) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className={styles.board}
          role="region"
          aria-label="カンバンボード"
        >
          <Lane
            laneId="unassigned"
            name="未割り当て"
            startDate={null}
            releaseDueDate={null}
            issues={data.unassignedIssues}
            milestonePrefix={milestonePrefix}
          />
          {data.milestones.map(({ milestone, issues }) => (
            <Lane
              key={milestone.id}
              laneId={`milestone-${milestone.id}`}
              name={milestone.name}
              startDate={milestone.startDate}
              releaseDueDate={milestone.releaseDueDate}
              issues={issues}
              milestonePrefix={milestonePrefix}
            />
          ))}
        </div>
        <DragOverlay>
          {activeIssue ? <DragOverlayCard issue={activeIssue} /> : null}
        </DragOverlay>
        <Toaster
          position="bottom-right"
          duration={5000}
          closeButton
          toastOptions={{ style: { maxWidth: '400px' } }}
        />
      </DndContext>
    );
  }

  return null;
}
