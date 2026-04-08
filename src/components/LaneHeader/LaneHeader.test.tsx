import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LaneHeader } from './LaneHeader';

const defaultProps = {
  name: 'Sprint 2504',
  startDate: null as string | null,
  releaseDueDate: null as string | null,
  issueCount: 0,
  memberBreakdown: [] as Array<{ name: string; count: number }>,
};

describe('LaneHeader', () => {
  it('displays name with issue count in parentheses', () => {
    render(<LaneHeader {...defaultProps} name="Sprint 2504" issueCount={6} />);
    expect(screen.getByText(/Sprint 2504/)).toHaveTextContent('Sprint 2504 (6)');
  });

  it('shows toggle button when memberBreakdown has items', () => {
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    expect(
      screen.getByRole('button', { name: /内訳/ }),
    ).toBeInTheDocument();
  });

  it('does not show toggle button when memberBreakdown is empty', () => {
    render(<LaneHeader {...defaultProps} memberBreakdown={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('expands breakdown on toggle click', async () => {
    const user = userEvent.setup();
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /内訳/ }));
    expect(
      screen.getByRole('list', { name: 'メンバー別課題数' }),
    ).toBeInTheDocument();
  });

  it('collapses breakdown on second toggle click', async () => {
    const user = userEvent.setup();
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    const button = screen.getByRole('button', { name: /内訳/ });
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('toggle has aria-expanded=false initially', () => {
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('toggle has aria-expanded=true after click', async () => {
    const user = userEvent.setup();
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('toggle aria-label changes on expand', async () => {
    const user = userEvent.setup();
    render(
      <LaneHeader
        {...defaultProps}
        memberBreakdown={[{ name: 'Alice', count: 3 }]}
      />,
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', '内訳を開く');
    await user.click(button);
    expect(button).toHaveAttribute('aria-label', '内訳を閉じる');
  });

  it('preserves date range display', () => {
    render(
      <LaneHeader
        {...defaultProps}
        startDate="2025-04-01"
        releaseDueDate="2025-04-30"
        issueCount={3}
        memberBreakdown={[]}
      />,
    );
    expect(screen.getByText('4/1~4/30')).toBeInTheDocument();
  });
});
