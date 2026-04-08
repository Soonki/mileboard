import styles from './BoardError.module.css';

interface BoardErrorProps {
  message: string;
  onRetry: () => void;
}

export function BoardError({ message, onRetry }: BoardErrorProps) {
  return (
    <div className={styles.container} role="alert">
      <div className={styles.icon}>!</div>
      <p className={styles.heading}>データの取得に失敗しました</p>
      <p className={styles.detail}>{message}</p>
      <p className={styles.subtext}>
        接続設定を確認するか、しばらく待ってから再試行してください
      </p>
      <button className={styles.retryButton} onClick={onRetry}>
        再試行
      </button>
    </div>
  );
}
