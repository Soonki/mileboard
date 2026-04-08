import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { useSettingsStore } from './stores/settingsStore';

// Mock the child components to isolate App routing logic
vi.mock('./components/SettingsCard/SettingsCard', () => ({
  SettingsCard: () => <div data-testid="settings-card">SettingsCard</div>,
}));

vi.mock('./components/SettingsModal/SettingsModal', () => ({
  SettingsModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('./components/Board/Board', () => ({
  Board: () => <div data-testid="board">Board</div>,
}));

vi.mock('./components/BoardHeader/BoardHeader', () => ({
  BoardHeader: ({ onSettingsOpen }: { onSettingsOpen: () => void }) => (
    <div data-testid="board-header">
      <button aria-label="設定を開く" onClick={onSettingsOpen}>
        ⚙
      </button>
    </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      isConfigured: false,
      settings: {
        hostUrl: '',
        apiKey: '',
        projectId: null,
        projectKey: '',
        milestonePrefix: '',
      },
      connectionStatus: 'idle',
      connectionError: null,
      projects: [],
      isLoadingProjects: false,
    });
  });

  it('renders SettingsCard when isConfigured is false', () => {
    useSettingsStore.setState({ isConfigured: false });

    render(<App />);

    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).not.toBeInTheDocument();
  });

  it('renders Board when isConfigured is true', () => {
    useSettingsStore.setState({ isConfigured: true });

    render(<App />);

    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.getByTestId('board-header')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-card')).not.toBeInTheDocument();
  });

  it('calls loadFromStorage on mount', () => {
    const loadFromStorage = vi.fn();
    useSettingsStore.setState({ loadFromStorage });

    render(<App />);

    expect(loadFromStorage).toHaveBeenCalled();
  });

  it('renders SettingsModal when gear icon is clicked', () => {
    useSettingsStore.setState({ isConfigured: true });

    render(<App />);

    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

    const gearButton = screen.getByLabelText('設定を開く');
    fireEvent.click(gearButton);

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
  });

  it('closes SettingsModal when onClose is called', () => {
    useSettingsStore.setState({ isConfigured: true });

    render(<App />);

    const gearButton = screen.getByLabelText('設定を開く');
    fireEvent.click(gearButton);

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });
});
