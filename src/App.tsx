import { useEffect, useState } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { SettingsCard } from './components/SettingsCard/SettingsCard';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { BoardPlaceholder } from './components/BoardPlaceholder/BoardPlaceholder';

function App() {
  const isConfigured = useSettingsStore((s) => s.isConfigured);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  if (!isConfigured) {
    return <SettingsCard />;
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowSettings(true)}
          aria-label="設定を開く"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⚙
        </button>
      </div>
      <BoardPlaceholder />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

export default App;
