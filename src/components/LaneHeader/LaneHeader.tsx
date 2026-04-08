import styles from './LaneHeader.module.css';

interface LaneHeaderProps {
  name: string;
  startDate: string | null;
  releaseDueDate: string | null;
}

function formatDateRange(
  startDate: string | null,
  releaseDueDate: string | null,
): string | null {
  if (startDate === null && releaseDueDate === null) {
    return null;
  }

  const formatDate = (dateStr: string): string => {
    const parts = dateStr.split('-');
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${month}/${day}`;
  };

  if (startDate !== null && releaseDueDate !== null) {
    return `${formatDate(startDate)}~${formatDate(releaseDueDate)}`;
  }
  if (startDate !== null) {
    return `${formatDate(startDate)}~`;
  }
  return `~${formatDate(releaseDueDate!)}`;
}

export function LaneHeader({ name, startDate, releaseDueDate }: LaneHeaderProps) {
  const dateRange = formatDateRange(startDate, releaseDueDate);

  return (
    <div className={styles.header}>
      <div className={styles.name}>{name}</div>
      {dateRange !== null && (
        <div className={styles.dateRange}>{dateRange}</div>
      )}
    </div>
  );
}
