import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BoardHeader } from './BoardHeader';

const mockFetchBoard = vi.fn();

vi.mock('../../stores/boardStore', () => ({
  useBoardStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      isReloading: false,
      fetchBoard: mockFetchBoard,
      status: 'loaded',
    }),
}));

describe('BoardHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mileboard title', () => {
    render(<BoardHeader onSettingsOpen={() => {}} />);
    expect(screen.getByText('mileboard')).toBeInTheDocument();
  });

  it('renders reload button with aria-label', () => {
    render(<BoardHeader onSettingsOpen={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'データを再読み込み' }),
    ).toBeInTheDocument();
  });

  it('calls fetchBoard on reload click', async () => {
    const user = userEvent.setup();
    render(<BoardHeader onSettingsOpen={() => {}} />);

    await user.click(
      screen.getByRole('button', { name: 'データを再読み込み' }),
    );
    expect(mockFetchBoard).toHaveBeenCalledTimes(1);
  });

  it('calls onSettingsOpen on settings button click', async () => {
    const onSettingsOpen = vi.fn();
    const user = userEvent.setup();
    render(<BoardHeader onSettingsOpen={onSettingsOpen} />);

    await user.click(screen.getByRole('button', { name: '設定を開く' }));
    expect(onSettingsOpen).toHaveBeenCalledTimes(1);
  });
});
