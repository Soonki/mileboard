import { useEffect } from 'react';
import { useBoardStore } from '../../stores/boardStore';
import { Lane } from '../Lane/Lane';
import { BoardSkeleton } from '../BoardSkeleton/BoardSkeleton';
import { BoardError } from '../BoardError/BoardError';
import styles from './Board.module.css';

export function Board() {
  const status = useBoardStore((s) => s.status);
  const data = useBoardStore((s) => s.data);
  const error = useBoardStore((s) => s.error);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);

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
      <div
        className={styles.board}
        role="region"
        aria-label="カンバンボード"
      >
        <Lane
          name="未割り当て"
          startDate={null}
          releaseDueDate={null}
          issues={data.unassignedIssues}
        />
        {data.milestones.map(({ milestone, issues }) => (
          <Lane
            key={milestone.id}
            name={milestone.name}
            startDate={milestone.startDate}
            releaseDueDate={milestone.releaseDueDate}
            issues={issues}
          />
        ))}
      </div>
    );
  }

  return null;
}
