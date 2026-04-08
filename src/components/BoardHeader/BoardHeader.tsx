import { useBoardStore } from '../../stores/boardStore';
import styles from './BoardHeader.module.css';

interface BoardHeaderProps {
  onSettingsOpen: () => void;
}

export function BoardHeader({ onSettingsOpen }: BoardHeaderProps) {
  const isReloading = useBoardStore((s) => s.isReloading);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);
  const status = useBoardStore((s) => s.status);

  const isLoading = status === 'loading' || isReloading;

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>mileboard</h1>
      <div className={styles.actions}>
        <button
          className={styles.reloadButton}
          onClick={fetchBoard}
          disabled={isLoading}
          aria-label="データを再読み込み"
          aria-busy={isLoading}
        >
          <span className={isLoading ? styles.spinning : ''}>↻</span>
        </button>
        <button
          className={styles.settingsButton}
          onClick={onSettingsOpen}
          aria-label="設定を開く"
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
