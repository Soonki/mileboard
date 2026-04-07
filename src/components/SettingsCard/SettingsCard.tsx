import styles from './SettingsCard.module.css';
import { SettingsForm } from '../SettingsForm/SettingsForm';

export function SettingsCard() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Backlog接続設定</h1>
        <SettingsForm mode="page" />
      </div>
    </div>
  );
}
