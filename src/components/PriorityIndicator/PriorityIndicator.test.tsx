import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PriorityIndicator } from './PriorityIndicator';

describe('PriorityIndicator', () => {
  it('renders nothing when priority is null', () => {
    const { container } = render(<PriorityIndicator priority={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 3 arrows for high priority (id=2)', () => {
    render(<PriorityIndicator priority={{ id: 2, name: '高' }} />);
    expect(screen.getByText('▲▲▲')).toBeInTheDocument();
  });

  it('renders 2 arrows for medium priority (id=3)', () => {
    render(<PriorityIndicator priority={{ id: 3, name: '中' }} />);
    expect(screen.getByText('▲▲')).toBeInTheDocument();
  });

  it('renders 1 arrow for low priority (id=4)', () => {
    render(<PriorityIndicator priority={{ id: 4, name: '低' }} />);
    expect(screen.getByText('▲')).toBeInTheDocument();
  });

  it('renders nothing for unknown priority id', () => {
    const { container } = render(
      <PriorityIndicator priority={{ id: 99, name: 'unknown' }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('has aria-label with priority name', () => {
    render(<PriorityIndicator priority={{ id: 2, name: '高' }} />);
    expect(screen.getByLabelText('高')).toBeInTheDocument();
  });
});
