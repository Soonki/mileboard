import { useUiModeStore, type UiMode } from '../../stores/uiModeStore';
import styles from './ModeToggle.module.css';

const OPTIONS: { value: UiMode; label: string; title: string }[] = [
  { value: 'sort', label: '並び替え', title: '並び替えモード — ドラッグでカードを並び替え/移動' },
  { value: 'group', label: 'グルーピング', title: 'グルーピングモード — ドラッグでカード同士をグループ化' },
];

/**
 * Phase 9: 操作モード切替トグル。
 * BoardHeader 内に配置され、ドラッグ操作の意味 (並び替え vs グルーピング) を切り替える。
 * 永続化なし — 起動毎に sort モードから始まる。
 * キーボードショートカット Ctrl+Shift+M で切替 (Board.tsx で実装)。
 */
export function ModeToggle() {
  const mode = useUiModeStore((s) => s.mode);
  const setMode = useUiModeStore((s) => s.setMode);

  return (
    <div
      className={styles.toggle}
      role="radiogroup"
      aria-label="操作モード"
      data-testid="mode-toggle"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.option} ${active ? styles.optionActive : ''}`}
            onClick={() => setMode(opt.value)}
            title={`${opt.title} (Ctrl+Shift+M で切替)`}
            data-testid={`mode-toggle-${opt.value}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
