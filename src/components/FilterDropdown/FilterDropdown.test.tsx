import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FilterDropdown } from './FilterDropdown';
import type { FilterOption } from '../../types/filter';

const mockOptions: FilterOption[] = [
  { id: 1, label: '未対応', sortOrder: 1000 },
  { id: 2, label: '処理中', sortOrder: 2000 },
  { id: 3, label: '処理済み', sortOrder: 3000 },
];

describe('FilterDropdown', () => {
  const defaultProps = {
    label: 'ステータス',
    options: mockOptions,
    selectedIds: new Set<number | null>(),
    onToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders trigger button with label', () => {
      render(<FilterDropdown {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'ステータスフィルタ' })).toBeInTheDocument();
    });

    it('renders trigger with down triangle', () => {
      render(<FilterDropdown {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'ステータスフィルタ' });
      expect(button.textContent).toContain('\u25BE');
    });

    it('does not render dropdown panel initially', () => {
      render(<FilterDropdown {...defaultProps} />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('sets aria-haspopup="listbox" on trigger', () => {
      render(<FilterDropdown {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'ステータスフィルタ' });
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('sets aria-expanded="false" on trigger when closed', () => {
      render(<FilterDropdown {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'ステータスフィルタ' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('opening and closing', () => {
    it('opens dropdown panel on trigger click', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('sets aria-expanded="true" when open', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByRole('button', { name: 'ステータスフィルタ' })).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes dropdown on second trigger click', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      const trigger = screen.getByRole('button', { name: 'ステータスフィルタ' });
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.click(trigger);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <FilterDropdown {...defaultProps} />
          <div data-testid="outside">outside</div>
        </div>,
      );
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.click(screen.getByTestId('outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('options rendering', () => {
    it('renders all options when open', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('renders option labels', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByText('未対応')).toBeInTheDocument();
      expect(screen.getByText('処理中')).toBeInTheDocument();
      expect(screen.getByText('処理済み')).toBeInTheDocument();
    });

    it('sets aria-multiselectable="true" on listbox', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });

    it('shows empty message when options are empty', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} options={[]} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      expect(screen.getByText('選択肢なし')).toBeInTheDocument();
    });
  });

  describe('checkbox toggling', () => {
    it('calls onToggle when option is clicked', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} onToggle={onToggle} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.click(screen.getByText('処理中'));
      expect(onToggle).toHaveBeenCalledWith(2);
    });

    it('keeps dropdown open after toggle (check-and-stay D-04)', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} onToggle={vi.fn()} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.click(screen.getByText('処理中'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('shows checked state for selected options', async () => {
      const user = userEvent.setup();
      render(
        <FilterDropdown
          {...defaultProps}
          selectedIds={new Set<number | null>([2])}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      const option = screen.getByRole('option', { name: /処理中/ });
      expect(option).toHaveAttribute('aria-selected', 'true');
    });

    it('shows unchecked state for unselected options', async () => {
      const user = userEvent.setup();
      render(
        <FilterDropdown
          {...defaultProps}
          selectedIds={new Set<number | null>([2])}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      const option = screen.getByRole('option', { name: /未対応/ });
      expect(option).toHaveAttribute('aria-selected', 'false');
    });

    it('handles null id option (unassigned)', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      const optionsWithNull: FilterOption[] = [
        { id: 1, label: '山田', sortOrder: 0 },
        { id: null, label: '未割り当て', sortOrder: Number.MAX_SAFE_INTEGER },
      ];
      render(
        <FilterDropdown
          {...defaultProps}
          options={optionsWithNull}
          onToggle={onToggle}
        />,
      );
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.click(screen.getByText('未割り当て'));
      expect(onToggle).toHaveBeenCalledWith(null);
    });
  });

  describe('trigger text styling', () => {
    it('uses active style when selections exist', () => {
      const { container } = render(
        <FilterDropdown
          {...defaultProps}
          selectedIds={new Set<number | null>([1])}
        />,
      );
      const trigger = container.querySelector('button');
      expect(trigger?.className).toContain('active');
    });

    it('uses inactive style when no selections', () => {
      const { container } = render(<FilterDropdown {...defaultProps} />);
      const trigger = container.querySelector('button');
      expect(trigger?.className).toContain('inactive');
    });
  });

  describe('keyboard navigation', () => {
    it('opens dropdown with Enter key on trigger', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      screen.getByRole('button', { name: 'ステータスフィルタ' }).focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown with Space key on trigger', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      screen.getByRole('button', { name: 'ステータスフィルタ' }).focus();
      await user.keyboard(' ');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('navigates options with ArrowDown', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      const listbox = screen.getByRole('listbox');
      await user.keyboard('{ArrowDown}');
      const options = within(listbox).getAllByRole('option');
      expect(options[0].className).toContain('optionFocused');
    });

    it('navigates options with ArrowUp (circular)', async () => {
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.keyboard('{ArrowUp}');
      const options = screen.getAllByRole('option');
      expect(options[options.length - 1].className).toContain('optionFocused');
    });

    it('toggles focused option with Enter', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} onToggle={onToggle} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      expect(onToggle).toHaveBeenCalledWith(1);
    });

    it('toggles focused option with Space', async () => {
      const onToggle = vi.fn();
      const user = userEvent.setup();
      render(<FilterDropdown {...defaultProps} onToggle={onToggle} />);
      await user.click(screen.getByRole('button', { name: 'ステータスフィルタ' }));
      await user.keyboard('{ArrowDown}');
      await user.keyboard(' ');
      expect(onToggle).toHaveBeenCalledWith(1);
    });
  });
});
