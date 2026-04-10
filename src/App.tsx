import { useEffect, useState } from 'react';
import { useSettingsStore } from './stores/settingsStore';
import { useSortStore } from './stores/sortStore';
import { useReorderStore } from './stores/reorderStore';
import { SettingsCard } from './components/SettingsCard/SettingsCard';
import { SettingsModal } from './components/SettingsModal/SettingsModal';
import { Board } from './components/Board/Board';
import { BoardHeader } from './components/BoardHeader/BoardHeader';
import { FilterBar } from './components/FilterBar/FilterBar';
import styles from './App.module.css';

function App() {
  const isConfigured = useSettingsStore((s) => s.isConfigured);
  const loadFromStorage = useSettingsStore((s) => s.loadFromStorage);
  const loadSortFromStorage = useSortStore((s) => s.loadFromStorage);
  const loadReorderFromStorage = useReorderStore((s) => s.loadFromStorage);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    loadSortFromStorage();
  }, [loadSortFromStorage]);

  useEffect(() => {
    loadReorderFromStorage();
  }, [loadReorderFromStorage]);

  if (!isConfigured) {
    return <SettingsCard />;
  }

  return (
    <div className={styles.appLayout}>
      <BoardHeader onSettingsOpen={() => setShowSettings(true)} />
      <FilterBar />
      <Board />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
