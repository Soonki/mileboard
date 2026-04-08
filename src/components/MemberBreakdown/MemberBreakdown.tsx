import type { MemberCount } from '../../utils/memberBreakdown';
import styles from './MemberBreakdown.module.css';

interface MemberBreakdownProps {
  members: MemberCount[];
}

export function MemberBreakdown({ members }: MemberBreakdownProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list} role="list" aria-label="メンバー別課題数">
      {members.map((member) => (
        <li key={member.name} className={styles.item}>
          <span className={styles.memberName}>{member.name}</span>
          <span className={styles.count}>{member.count}</span>
        </li>
      ))}
    </ul>
  );
}
