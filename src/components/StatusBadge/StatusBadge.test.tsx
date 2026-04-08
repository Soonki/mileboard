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

  it('applies background color from color prop', () => {
    render(<StatusBadge name="未対応" color="#ed8077" />);
    const badge = screen.getByLabelText('未対応');
    expect(badge.style.backgroundColor).toBe('rgb(237, 128, 119)');
  });

  it('applies contrast text color for given background', () => {
    render(<StatusBadge name="未対応" color="#ed8077" />);
    const badge = screen.getByLabelText('未対応');
    // #ed8077 luminance ~0.348 > 0.179 -> black text
    expect(badge.style.color).toBe('rgb(0, 0, 0)');
  });

  it('renders without inline style when color is undefined', () => {
    render(<StatusBadge name="未対応" />);
    const badge = screen.getByLabelText('未対応');
    expect(badge.style.backgroundColor).toBe('');
  });

  it('sets transparent border when color is provided', () => {
    render(<StatusBadge name="未対応" color="#ed8077" />);
    const badge = screen.getByLabelText('未対応');
    expect(badge.style.borderColor).toBe('transparent');
  });
});
