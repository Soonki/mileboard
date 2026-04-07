import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SettingsForm } from './SettingsForm';
import { useSettingsStore } from '../../stores/settingsStore';
import { testConnection, fetchProjects } from '../../services/backlogApi';

vi.mock('../../services/backlogApi', () => ({
  testConnection: vi.fn(),
  fetchProjects: vi.fn(),
}));

const mockedTestConnection = vi.mocked(testConnection);
const mockedFetchProjects = vi.mocked(fetchProjects);

const defaultSettings = {
  hostUrl: '',
  apiKey: '',
  projectId: null,
  projectKey: '',
  milestonePrefix: '',
};

describe('SettingsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      settings: { ...defaultSettings },
      isConfigured: false,
      connectionStatus: 'idle',
      connectionError: null,
      projects: [],
      isLoadingProjects: false,
    });
  });

  it('disables connection test button when hostUrl is empty', () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: '', apiKey: 'some-key' },
    });

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    expect(testButton).toBeDisabled();
  });

  it('disables connection test button when apiKey is empty', () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: '' },
    });

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    expect(testButton).toBeDisabled();
  });

  it('enables connection test button when both hostUrl and apiKey are filled', () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
    });

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    expect(testButton).not.toBeDisabled();
  });

  it('calls testConnection when clicking connection test button', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
    });

    mockedTestConnection.mockResolvedValue({
      success: true,
      user: { id: 1, userId: 'user1', name: 'Test User', roleType: 1, mailAddress: 'test@example.com' },
    });
    mockedFetchProjects.mockResolvedValue([]);

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockedTestConnection).toHaveBeenCalledWith('test.backlog.com', 'valid-key');
    });
  });

  it('enables project dropdown after successful connection test', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
    });

    mockedTestConnection.mockResolvedValue({
      success: true,
      user: { id: 1, userId: 'user1', name: 'Test User', roleType: 1, mailAddress: 'test@example.com' },
    });
    mockedFetchProjects.mockResolvedValue([
      { id: 1, projectKey: 'PROJ1', name: 'Project One', archived: false },
    ]);

    render(<SettingsForm />);

    const projectSelect = screen.getByLabelText('プロジェクト');
    expect(projectSelect).toBeDisabled();

    const testButton = screen.getByText('接続テスト');
    fireEvent.click(testButton);

    await waitFor(() => {
      const updatedSelect = screen.getByLabelText('プロジェクト');
      expect(updatedSelect).not.toBeDisabled();
    });
  });

  it('enables milestone prefix input after successful connection test', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
    });

    mockedTestConnection.mockResolvedValue({
      success: true,
      user: { id: 1, userId: 'user1', name: 'Test User', roleType: 1, mailAddress: 'test@example.com' },
    });
    mockedFetchProjects.mockResolvedValue([]);

    render(<SettingsForm />);

    const prefixInput = screen.getByLabelText('マイルストーン接頭辞');
    expect(prefixInput).toBeDisabled();

    const testButton = screen.getByText('接続テスト');
    fireEvent.click(testButton);

    await waitFor(() => {
      const updatedPrefix = screen.getByLabelText('マイルストーン接頭辞');
      expect(updatedPrefix).not.toBeDisabled();
    });
  });

  it('shows error message after connection test failure', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'bad-key' },
    });

    mockedTestConnection.mockResolvedValue({
      success: false,
      error: 'APIキーが無効です。Backlogの個人設定で確認してください。',
    });

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'APIキーが無効です。Backlogの個人設定で確認してください。'
      );
    });
  });

  it('disables save button until project is selected', () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
      connectionStatus: 'success',
    });

    render(<SettingsForm />);

    const saveButton = screen.getByText('保存');
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when connectionStatus is success AND projectKey is non-empty', () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key', projectKey: 'PROJ1' },
      connectionStatus: 'success',
    });

    render(<SettingsForm />);

    const saveButton = screen.getByText('保存');
    expect(saveButton).not.toBeDisabled();
  });

  it('calls saveToStorage and markConfigured when clicking save', async () => {
    const saveToStorage = vi.fn().mockResolvedValue(undefined);
    const markConfigured = vi.fn();

    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key', projectKey: 'PROJ1' },
      connectionStatus: 'success',
      saveToStorage,
      markConfigured,
    });

    render(<SettingsForm />);

    const saveButton = screen.getByText('保存');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveToStorage).toHaveBeenCalled();
      expect(markConfigured).toHaveBeenCalled();
    });
  });

  it('has API key input with type password by default', () => {
    render(<SettingsForm />);

    const apiKeyInput = screen.getByLabelText('APIキー');
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('toggles API key visibility when toggle button is clicked', async () => {
    const user = userEvent.setup();

    render(<SettingsForm />);

    const apiKeyInput = screen.getByLabelText('APIキー');
    expect(apiKeyInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('APIキーを表示する');
    await user.click(toggleButton);

    expect(apiKeyInput).toHaveAttribute('type', 'text');
  });

  it('shows success message with checkmark after successful connection test', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, hostUrl: 'test.backlog.com', apiKey: 'valid-key' },
    });

    mockedTestConnection.mockResolvedValue({
      success: true,
      user: { id: 1, userId: 'user1', name: 'Test User', roleType: 1, mailAddress: 'test@example.com' },
    });
    mockedFetchProjects.mockResolvedValue([]);

    render(<SettingsForm />);

    const testButton = screen.getByText('接続テスト');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/接続に成功しました/)).toBeInTheDocument();
      expect(screen.getByText('\u2713')).toBeInTheDocument();
    });
  });
});
