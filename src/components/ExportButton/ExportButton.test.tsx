import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { toast } from 'sonner';
import { ExportButton } from './ExportButton';
import { saveSnapshot } from '../../services/snapshotFile';
import { buildSnapshot } from '../../utils/snapshotBuilder';
import { useBoardStore } from '../../stores/boardStore';
import { useFilterStore } from '../../stores/filterStore';
import { useSortStore } from '../../stores/sortStore';
import { useReorderStore } from '../../stores/reorderStore';
import { useGroupStore } from '../../stores/groupStore';
import { useUiModeStore } from '../../stores/uiModeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { BoardData } from '../../types/board';
import type {
  BacklogIssue,
  BacklogStatus,
  BacklogMilestone,
} from '../../types/backlog';

// ----- Module mocks -------------------------------------------------------

vi.mock('../../services/snapshotFile', () => ({
  saveSnapshot: vi.fn(),
}));

vi.mock('../../utils/snapshotBuilder', () => ({
  buildSnapshot: vi.fn(() => 'mock-content'),
}));

const mockSaveSnapshot = vi.mocked(saveSnapshot);
const mockBuildSnapshot = vi.mocked(buildSnapshot);
const mockToastError = vi.mocked(toast.error);
const mockToastSuccess = vi.mocked(toast.success);

// ----- Fixtures -----------------------------------------------------------

const makeStatus = (id: number, name: string): BacklogStatus => ({
  id,
  projectId: 1,
  name,
  color: '#abcdef',
  displayOrder: id,
});

const makeMilestone = (id: number, name: string): BacklogMilestone => ({
  id,
  projectId: 1,
  name,
  description: null,
  startDate: null,
  releaseDueDate: null,
  archived: false,
  displayOrder: id,
});

const makeIssue = (id: number, summary: string): BacklogIssue => ({
  id,
  projectId: 999,
  issueKey: 'PROJ-' + id,
  keyId: id,
  summary,
  description: null,
  status: makeStatus(1, '未対応'),
  priority: null,
  assignee: null,
  milestone: [],
  category: [],
  startDate: null,
  dueDate: null,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-02-01T00:00:00Z',
});

const makeBoardData = (): BoardData => ({
  milestones: [
    {
      milestone: makeMilestone(10, 'v1.2'),
      issues: [makeIssue(2, 'second')],
    },
  ],
  unassignedIssues: [makeIssue(1, 'first')],
});

// ----- Test setup ---------------------------------------------------------

beforeEach(() => {
  mockSaveSnapshot.mockReset();
  mockSaveSnapshot.mockResolvedValue({
    success: true,
    path: '/mock/path/snapshot.json',
  });
  mockBuildSnapshot.mockClear();
  mockBuildSnapshot.mockReturnValue('mock-content');
  mockToastError.mockClear();
  mockToastSuccess.mockClear();

  useBoardStore.setState({
    status: 'loaded',
    data: makeBoardData(),
    error: null,
    isReloading: false,
    revision: 5,
  });
  useFilterStore.setState({
    statusIds: new Set<number>(),
    assigneeIds: new Set<number | null>(),
    categoryIds: new Set<number>(),
  });
  useSortStore.setState({
    field: 'none',
    direction: 'asc',
  });
  useReorderStore.setState({
    orderMap: {},
  });
  useGroupStore.setState({
    groups: {},
  });
  useUiModeStore.setState({
    mode: 'sort',
  });
  useSettingsStore.setState({
    settings: {
      hostUrl: 'https://example.backlog.com',
      apiKey: 'secret',
      projectId: 1,
      projectKey: 'KEY',
      milestonePrefix: 'v1.',
    },
    isConfigured: true,
    connectionStatus: 'success',
    connectionError: null,
    projects: [],
    isLoadingProjects: false,
  });
});

describe('ExportButton', () => {
  // --- trigger button aria / disabled state (Tests 1-9) ---

  it('Test 1: renders button with aria-label="スナップショットをエクスポート"', () => {
    render(<ExportButton />);
    expect(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    ).toBeInTheDocument();
  });

  it('Test 2: button has aria-haspopup="menu"', () => {
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('Test 3: button has aria-expanded="false" when closed', () => {
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('Test 4: button has aria-expanded="true" when open', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    expect(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('Test 5: button is disabled when boardStore.data === null', () => {
    useBoardStore.setState({ data: null, status: 'idle' });
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toBeDisabled();
  });

  it('Test 6: button is disabled when boardStore.status === "loading"', () => {
    useBoardStore.setState({ data: null, status: 'loading' });
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toBeDisabled();
  });

  it('Test 7: button is enabled when isReloading === true (stale view export allowed)', () => {
    useBoardStore.setState({
      data: makeBoardData(),
      status: 'loaded',
      isReloading: true,
    });
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).not.toBeDisabled();
  });

  it('Test 8: disabled button has title="データ読み込み後に利用できます"', () => {
    useBoardStore.setState({ data: null, status: 'loading' });
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toHaveAttribute('title', 'データ読み込み後に利用できます');
  });

  it('Test 9: enabled button has title with Ctrl+Shift+E hint', () => {
    render(<ExportButton />);
    const button = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    expect(button).toHaveAttribute(
      'title',
      'スナップショットをエクスポート (Ctrl+Shift+E で JSON 直保存)',
    );
  });

  // --- dropdown panel behavior (Tests 10-13) ---

  it('Test 10: click opens dropdown panel with role="menu"', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('Test 11: panel has 3 menuitem: JSON / Markdown / CSV', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    const menu = screen.getByRole('menu');
    const items = within(menu).getAllByRole('menuitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('JSON として保存');
    expect(items[1]).toHaveTextContent('Markdown として保存');
    expect(items[2]).toHaveTextContent('CSV として保存');
  });

  it('Test 12: ESC key closes panel and restores focus to trigger', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    const trigger = screen.getByRole('button', {
      name: 'スナップショットをエクスポート',
    });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('Test 13: click outside closes panel', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ExportButton />
        <div data-testid="outside">outside</div>
      </div>,
    );
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  // --- menu item click → saveSnapshot (Tests 14-18) ---

  it('Test 14: clicking JSON menuitem calls saveSnapshot with format="json"', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    expect(mockSaveSnapshot).toHaveBeenCalledTimes(1);
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      'json',
      expect.any(String),
    );
  });

  it('Test 15: clicking Markdown menuitem calls saveSnapshot with format="markdown"', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(
      screen.getByRole('menuitem', { name: 'Markdown として保存' }),
    );
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      'markdown',
      expect.any(String),
    );
  });

  it('Test 16: clicking CSV menuitem calls saveSnapshot with format="csv"', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'CSV として保存' }));
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      'csv',
      expect.any(String),
    );
  });

  it('Test 17: clicking menuitem passes buildSnapshot(input, format) result as content arg', async () => {
    mockBuildSnapshot.mockReturnValue('custom-built-content');
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    expect(mockBuildSnapshot).toHaveBeenCalledTimes(1);
    const [inputArg, formatArg] = mockBuildSnapshot.mock.calls[0];
    expect(formatArg).toBe('json');
    expect(inputArg.boardRevision).toBe(5);
    expect(inputArg.projectKey).toBe('KEY');
    expect(inputArg.milestonePrefix).toBe('v1.');
    expect(inputArg.uiMode).toBe('sort');
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      'custom-built-content',
      'json',
      'KEY',
    );
  });

  it('Test 18: clicking menuitem passes settingsStore projectKey as projectKey arg', async () => {
    useSettingsStore.setState({
      settings: {
        hostUrl: '',
        apiKey: '',
        projectId: 2,
        projectKey: 'MY_PROJECT',
        milestonePrefix: '',
      },
    });
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(
      screen.getByRole('menuitem', { name: 'Markdown として保存' }),
    );
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      'markdown',
      'MY_PROJECT',
    );
  });

  // --- keyboard navigation (Tests 19-21) ---

  it('Test 19: ArrowDown moves focus to next menu item (wraparound)', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    const items = screen.getAllByRole('menuitem');
    // First ArrowDown → focus first item (0)
    await user.keyboard('{ArrowDown}');
    expect(items[0].className).toContain('optionFocused');
    // Second → index 1
    await user.keyboard('{ArrowDown}');
    expect(items[1].className).toContain('optionFocused');
    // Third → index 2
    await user.keyboard('{ArrowDown}');
    expect(items[2].className).toContain('optionFocused');
    // Fourth → wraparound to index 0
    await user.keyboard('{ArrowDown}');
    expect(items[0].className).toContain('optionFocused');
  });

  it('Test 20: ArrowUp moves focus to previous item (wraparound)', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    const items = screen.getAllByRole('menuitem');
    // First ArrowUp from -1 → wrap to last item
    await user.keyboard('{ArrowUp}');
    expect(items[2].className).toContain('optionFocused');
    // Back to index 1
    await user.keyboard('{ArrowUp}');
    expect(items[1].className).toContain('optionFocused');
    // Index 0
    await user.keyboard('{ArrowUp}');
    expect(items[0].className).toContain('optionFocused');
    // Wraparound to last
    await user.keyboard('{ArrowUp}');
    expect(items[2].className).toContain('optionFocused');
  });

  it('Test 21: Enter on focused menu item fires format handler', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.keyboard('{ArrowDown}'); // focus JSON (index 0)
    await user.keyboard('{ArrowDown}'); // focus Markdown (index 1)
    await user.keyboard('{Enter}');
    expect(mockSaveSnapshot).toHaveBeenCalledWith(
      expect.any(String),
      'markdown',
      expect.any(String),
    );
  });

  // --- toast error handling (Tests 22-24) ---

  it('Test 22: error reason → toast.error called with prefixed message', async () => {
    mockSaveSnapshot.mockResolvedValue({
      success: false,
      reason: 'error',
      error: 'Disk full',
    });
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    // Wait microtask for async handler
    await Promise.resolve();
    expect(mockToastError).toHaveBeenCalledWith(
      'スナップショットの保存に失敗しました: Disk full',
    );
  });

  it('Test 23: cancelled reason → no toast.error', async () => {
    mockSaveSnapshot.mockResolvedValue({
      success: false,
      reason: 'cancelled',
    });
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    await Promise.resolve();
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('Test 24: success → no toast.error or toast.success (silent)', async () => {
    mockSaveSnapshot.mockResolvedValue({
      success: true,
      path: '/mock/path/snapshot.json',
    });
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    await Promise.resolve();
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  // --- post-click panel closure (Test 25) ---

  it('Test 25: after clicking menuitem, panel is closed (role="menu" not in DOM)', async () => {
    const user = userEvent.setup();
    render(<ExportButton />);
    await user.click(
      screen.getByRole('button', { name: 'スナップショットをエクスポート' }),
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'JSON として保存' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
