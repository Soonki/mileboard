import styles from './BoardSkeleton.module.css';

function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.skeleton} ${styles.cardLine1}`} />
      <div className={`${styles.skeleton} ${styles.cardLine2}`} />
      <div className={`${styles.skeleton} ${styles.cardLine3}`} />
    </div>
  );
}

function SkeletonLane() {
  return (
    <div className={styles.lane}>
      <div className={`${styles.skeleton} ${styles.headerLine1}`} />
      <div className={`${styles.skeleton} ${styles.headerLine2}`} />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className={styles.container}>
      <SkeletonLane />
      <SkeletonLane />
      <SkeletonLane />
      <SkeletonLane />
    </div>
  );
}
