import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { FilterChip } from './FilterChip';

describe('FilterChip', () => {
  const defaultProps = {
    label: '処理中',
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders label text', () => {
      render(<FilterChip {...defaultProps} />);
      expect(screen.getByText('処理中')).toBeInTheDocument();
    });

    it('renders remove button with multiplication sign', () => {
      render(<FilterChip {...defaultProps} />);
      const removeButton = screen.getByRole('button');
      expect(removeButton.textContent).toBe('\u00D7');
    });

    it('sets aria-label on remove button', () => {
      render(<FilterChip {...defaultProps} />);
      const removeButton = screen.getByRole('button', {
        name: '処理中のフィルタを解除',
      });
      expect(removeButton).toBeInTheDocument();
    });

    it('is focusable via tabIndex', () => {
      const { container } = render(<FilterChip {...defaultProps} />);
      const chip = container.firstChild as HTMLElement;
      expect(chip.tabIndex).toBe(0);
    });
  });

  describe('interactions', () => {
    it('calls onRemove when remove button is clicked', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      render(<FilterChip {...defaultProps} onRemove={onRemove} />);
      await user.click(
        screen.getByRole('button', { name: '処理中のフィルタを解除' }),
      );
      expect(onRemove).toHaveBeenCalledOnce();
    });

    it('calls onRemove on Enter key when chip is focused', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <FilterChip {...defaultProps} onRemove={onRemove} />,
      );
      const chip = container.firstChild as HTMLElement;
      chip.focus();
      await user.keyboard('{Enter}');
      expect(onRemove).toHaveBeenCalledOnce();
    });

    it('calls onRemove on Delete key when chip is focused', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <FilterChip {...defaultProps} onRemove={onRemove} />,
      );
      const chip = container.firstChild as HTMLElement;
      chip.focus();
      await user.keyboard('{Delete}');
      expect(onRemove).toHaveBeenCalledOnce();
    });

    it('does not call onRemove on other keys', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <FilterChip {...defaultProps} onRemove={onRemove} />,
      );
      const chip = container.firstChild as HTMLElement;
      chip.focus();
      await user.keyboard('{Tab}');
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('does not call onRemove twice when Enter is pressed on inner button', async () => {
      const onRemove = vi.fn();
      const user = userEvent.setup();
      render(<FilterChip {...defaultProps} onRemove={onRemove} />);
      const removeButton = screen.getByRole('button', {
        name: '処理中のフィルタを解除',
      });
      removeButton.focus();
      await user.keyboard('{Enter}');
      expect(onRemove).toHaveBeenCalledTimes(1);
    });
  });
});
