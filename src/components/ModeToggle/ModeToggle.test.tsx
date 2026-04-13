import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ModeToggle } from './ModeToggle';
import { useUiModeStore } from '../../stores/uiModeStore';

describe('ModeToggle', () => {
  beforeEach(() => {
    useUiModeStore.setState({ mode: 'sort' });
  });

  it('renders both mode options', () => {
    render(<ModeToggle />);
    expect(screen.getByTestId('mode-toggle-sort')).toBeInTheDocument();
    expect(screen.getByTestId('mode-toggle-group')).toBeInTheDocument();
  });

  it('marks the active mode (sort by default)', () => {
    render(<ModeToggle />);
    expect(screen.getByTestId('mode-toggle-sort')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('mode-toggle-group')).toHaveAttribute('aria-checked', 'false');
  });

  it('switches mode when group option is clicked', async () => {
    const user = userEvent.setup();
    render(<ModeToggle />);
    await user.click(screen.getByTestId('mode-toggle-group'));
    expect(useUiModeStore.getState().mode).toBe('group');
  });

  it('switches back to sort when sort option is clicked', async () => {
    const user = userEvent.setup();
    useUiModeStore.setState({ mode: 'group' });
    render(<ModeToggle />);
    await user.click(screen.getByTestId('mode-toggle-sort'));
    expect(useUiModeStore.getState().mode).toBe('sort');
  });

  it('reflects external store changes (re-render)', () => {
    const { rerender } = render(<ModeToggle />);
    act(() => {
      useUiModeStore.setState({ mode: 'group' });
    });
    rerender(<ModeToggle />);
    expect(screen.getByTestId('mode-toggle-group')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('mode-toggle-sort')).toHaveAttribute('aria-checked', 'false');
  });

  it('uses radiogroup role for accessibility', () => {
    render(<ModeToggle />);
    expect(screen.getByRole('radiogroup', { name: '操作モード' })).toBeInTheDocument();
  });

  it('exposes both options as radio role', () => {
    render(<ModeToggle />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('mentions the keyboard shortcut in the title', () => {
    render(<ModeToggle />);
    const sortBtn = screen.getByTestId('mode-toggle-sort');
    expect(sortBtn).toHaveAttribute('title', expect.stringContaining('Ctrl+Shift+M'));
  });
});
