import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { SortField, SortDirection } from '../../types/sort';

const mockSortState = {
  field: 'none' as SortField,
  direction: 'asc' as SortDirection,
  setField: vi.fn(),
  toggleDirection: vi.fn(),
  loadFromStorage: vi.fn(),
};

vi.mock('../../stores/sortStore', () => ({
  useSortStore: (selector: (s: typeof mockSortState) => unknown) =>
    selector(mockSortState),
}));

import { SortDropdown } from './SortDropdown';

describe('SortDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSortState.field = 'none';
    mockSortState.direction = 'asc';
    mockSortState.setField = vi.fn();
    mockSortState.toggleDirection = vi.fn();
  });

  describe('trigger button', () => {
    it('renders trigger with text "ソートなし" when field is none', () => {
      render(<SortDropdown />);
      expect(screen.getByRole('button', { name: 'ソート基準' })).toHaveTextContent('ソートなし');
    });

    it('renders trigger with text "担当者順" when field is assignee', () => {
      mockSortState.field = 'assignee';
      render(<SortDropdown />);
      expect(screen.getByRole('button', { name: 'ソート基準' })).toHaveTextContent('担当者順');
    });

    it('renders trigger with text "期限日順" when field is dueDate', () => {
      mockSortState.field = 'dueDate';
      render(<SortDropdown />);
      expect(screen.getByRole('button', { name: 'ソート基準' })).toHaveTextContent('期限日順');
    });

    it('has aria-haspopup="listbox" and aria-expanded="false"', () => {
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'ソート基準' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('panel open/close', () => {
    it('clicking trigger opens panel with 3 options', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('panel has role="listbox" without aria-multiselectable', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      const listbox = screen.getByRole('listbox');
      expect(listbox).not.toHaveAttribute('aria-multiselectable');
    });

    it('each option has role="option"', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('ソートなし');
      expect(options[1]).toHaveTextContent('担当者順');
      expect(options[2]).toHaveTextContent('期限日順');
    });

    it('clicking option calls setField and closes panel', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      await user.click(screen.getByText('担当者順'));
      expect(mockSortState.setField).toHaveBeenCalledWith('assignee');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selected option has aria-selected="true"', async () => {
      mockSortState.field = 'assignee';
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(options[2]).toHaveAttribute('aria-selected', 'false');
    });

    it('clicking outside closes panel', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      // Click outside the dropdown
      await user.click(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('Escape key closes panel and returns focus to trigger', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      const trigger = screen.getByRole('button', { name: 'ソート基準' });
      await user.click(trigger);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('ArrowDown/Up navigates options, Enter selects', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      // Navigate down to first option
      await user.keyboard('{ArrowDown}');
      // Navigate down to second option
      await user.keyboard('{ArrowDown}');
      // Select with Enter
      await user.keyboard('{Enter}');
      expect(mockSortState.setField).toHaveBeenCalledWith('assignee');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('ArrowUp wraps around to last option', async () => {
      const user = userEvent.setup();
      render(<SortDropdown />);
      await user.click(screen.getByRole('button', { name: 'ソート基準' }));
      // Navigate up from initial position (should wrap to last)
      await user.keyboard('{ArrowUp}');
      // Select with Enter
      await user.keyboard('{Enter}');
      expect(mockSortState.setField).toHaveBeenCalledWith('dueDate');
    });
  });
});
