import { useEffect, useState } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { SettingsCard } from './components/SettingsCard/SettingsCard';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { Board } from './components/Board/Board';
import { BoardHeader } from './components/BoardHeader/BoardHeader';

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
      <BoardHeader onSettingsOpen={() => setShowSettings(true)} />
      <Board />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

export default App;
