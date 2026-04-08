import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders status name text', () => {
    render(<StatusBadge name="未対応" />);
    expect(screen.getByText('未対応')).toBeInTheDocument();
  });

  it('has aria-label matching status name', () => {
    render(<StatusBadge name="未対応" />);
    expect(screen.getByLabelText('未対応')).toBeInTheDocument();
  });

  it('renders long status name with badge element', () => {
    render(<StatusBadge name="とても長いステータス名称テスト" />);
    expect(screen.getByText('とても長いステータス名称テスト')).toBeInTheDocument();
  });
});
