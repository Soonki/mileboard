import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemberBreakdown } from './MemberBreakdown';

describe('MemberBreakdown', () => {
  it('renders each member name and count', () => {
    const members = [
      { name: '山田太郎', count: 3 },
      { name: '田中花子', count: 1 },
    ];
    render(<MemberBreakdown members={members} />);
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('田中花子')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('has role="list" and aria-label="メンバー別課題数"', () => {
    const members = [{ name: '山田太郎', count: 2 }];
    render(<MemberBreakdown members={members} />);
    const list = screen.getByRole('list', { name: 'メンバー別課題数' });
    expect(list).toBeInTheDocument();
  });

  it('renders nothing when members array is empty', () => {
    const { container } = render(<MemberBreakdown members={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('applies memberName class for ellipsis truncation', () => {
    const members = [{ name: 'とても長い名前のメンバーテスト用表示名', count: 5 }];
    render(<MemberBreakdown members={members} />);
    const nameEl = screen.getByText('とても長い名前のメンバーテスト用表示名');
    expect(nameEl.className).toMatch(/memberName/);
  });
});
