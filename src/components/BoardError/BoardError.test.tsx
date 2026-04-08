import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BoardError } from './BoardError';

describe('BoardError', () => {
  it('renders error message', () => {
    render(<BoardError message="テストエラー" onRetry={() => {}} />);
    expect(
      screen.getByText('データの取得に失敗しました'),
    ).toBeInTheDocument();
    expect(screen.getByText('テストエラー')).toBeInTheDocument();
  });

  it('renders retry button that calls onRetry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<BoardError message="テストエラー" onRetry={onRetry} />);

    await user.click(screen.getByText('再試行'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has alert role', () => {
    render(<BoardError message="テストエラー" onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
