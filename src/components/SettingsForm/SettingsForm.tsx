import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { testConnection, fetchProjects } from '../../services/backlogApi';
import styles from './SettingsForm.module.css';

interface SettingsFormProps {
  mode?: 'page' | 'modal';
  onSaved?: () => void;
}

export function SettingsForm({ onSaved }: SettingsFormProps) {
  const settings = useSettingsStore((s) => s.settings);
  const connectionStatus = useSettingsStore((s) => s.connectionStatus);
  const connectionError = useSettingsStore((s) => s.connectionError);
  const projects = useSettingsStore((s) => s.projects);
  const isLoadingProjects = useSettingsStore((s) => s.isLoadingProjects);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const setConnectionStatus = useSettingsStore((s) => s.setConnectionStatus);
  const setProjects = useSettingsStore((s) => s.setProjects);
  const setIsLoadingProjects = useSettingsStore((s) => s.setIsLoadingProjects);
  const markConfigured = useSettingsStore((s) => s.markConfigured);
  const saveToStorage = useSettingsStore((s) => s.saveToStorage);

  const [showApiKey, setShowApiKey] = useState(false);

  const isTesting = connectionStatus === 'testing';
  const connectionTestEnabled = settings.hostUrl.trim() !== '' && settings.apiKey.trim() !== '';
  const postTestEnabled = connectionStatus === 'success';
  const saveEnabled = postTestEnabled && settings.projectKey !== '';

  const handleConnectionTest = async () => {
    if (!connectionTestEnabled || isTesting) return;

    setConnectionStatus('testing');

    const result = await testConnection(settings.hostUrl, settings.apiKey);

    if (!result.success) {
      setConnectionStatus('error', result.error);
      return;
    }

    setConnectionStatus('success');

    // Fetch project list after successful auth (per D-10)
    setIsLoadingProjects(true);
    try {
      const projectList = await fetchProjects(settings.hostUrl, settings.apiKey);
      setProjects(projectList.map((p) => ({ id: p.id, projectKey: p.projectKey, name: p.name })));
    } catch {
      setProjects([]);
    }
  };

  const handleSave = async () => {
    if (!saveEnabled) return;
    await saveToStorage();
    markConfigured();
    if (onSaved) onSaved();
  };

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      {/* Host URL field */}
      <div className={styles.field}>
        <label htmlFor="hostUrl" className={styles.label}>ホストURL</label>
        <input
          id="hostUrl"
          type="text"
          className={styles.input}
          placeholder="例: your-space.backlog.com"
          value={settings.hostUrl}
          onChange={(e) => updateSettings({ hostUrl: e.target.value })}
          disabled={isTesting}
          autoComplete="off"
        />
      </div>

      {/* API Key field */}
      <div className={styles.field}>
        <label htmlFor="apiKey" className={styles.label}>APIキー</label>
        <div className={styles.inputWrapper}>
          <input
            id="apiKey"
            type={showApiKey ? 'text' : 'password'}
            className={styles.input}
            placeholder="Backlogの個人設定から取得"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            disabled={isTesting}
            autoComplete="off"
          />
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setShowApiKey((v) => !v)}
            aria-label={showApiKey ? 'APIキーを隠す' : 'APIキーを表示する'}
            tabIndex={-1}
          >
            {showApiKey ? '\u{1F441}' : '\u25CF'}
          </button>
        </div>
      </div>

      {/* Connection test button + validation message */}
      <div className={styles.testSection}>
        <button
          type="button"
          className={`${styles.button} ${styles.testButton}`}
          onClick={handleConnectionTest}
          disabled={!connectionTestEnabled || isTesting}
        >
          {isTesting ? <span className={styles.spinner} aria-label="テスト中" /> : '接続テスト'}
        </button>

        {connectionStatus === 'success' && (
          <p className={styles.successMessage}>
            <span aria-hidden="true">{'\u2713'}</span> 接続に成功しました
          </p>
        )}
        {connectionStatus === 'error' && connectionError && (
          <p className={styles.errorMessage} role="alert">
            {connectionError}
          </p>
        )}
      </div>

      {/* Project dropdown (per D-10) */}
      <div className={styles.field}>
        <label htmlFor="projectSelect" className={styles.label}>プロジェクト</label>
        <select
          id="projectSelect"
          className={styles.select}
          disabled={!postTestEnabled || isLoadingProjects}
          value={settings.projectKey}
          onChange={(e) => {
            const selected = projects.find((p) => p.projectKey === e.target.value);
            if (selected) {
              updateSettings({ projectKey: selected.projectKey, projectId: selected.id });
            }
          }}
        >
          {!postTestEnabled && (
            <option value="">先に接続テストを実行してください</option>
          )}
          {postTestEnabled && isLoadingProjects && (
            <option value="">プロジェクト一覧を取得中...</option>
          )}
          {postTestEnabled && !isLoadingProjects && (
            <>
              <option value="">プロジェクトを選択してください</option>
              {projects.map((p) => (
                <option key={p.id} value={p.projectKey}>
                  {p.projectKey} - {p.name}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {/* Milestone prefix field (CONN-03) */}
      <div className={styles.field}>
        <label htmlFor="milestonePrefix" className={styles.label}>マイルストーン接頭辞</label>
        <input
          id="milestonePrefix"
          type="text"
          className={styles.input}
          placeholder="例: Sprint-, 2026-"
          value={settings.milestonePrefix}
          onChange={(e) => updateSettings({ milestonePrefix: e.target.value })}
          disabled={!postTestEnabled}
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        className={`${styles.button} ${styles.saveButton}`}
        onClick={handleSave}
        disabled={!saveEnabled}
      >
        保存
      </button>
    </form>
  );
}
