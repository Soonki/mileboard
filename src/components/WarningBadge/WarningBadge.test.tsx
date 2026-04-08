import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WarningBadge } from './WarningBadge';

describe('WarningBadge', () => {
  it('renders Unicode warning sign character', () => {
    render(<WarningBadge otherMilestones={['Sprint-2505']} />);
    expect(screen.getByText('\u26A0')).toBeInTheDocument();
  });

  it('sets data-tooltip attribute with milestone names', () => {
    render(
      <WarningBadge otherMilestones={['Sprint-2505', 'Release-v2.1']} />,
    );
    const badge = screen.getByText('\u26A0');
    expect(badge).toHaveAttribute(
      'data-tooltip',
      '他のマイルストーン: Sprint-2505, Release-v2.1',
    );
  });

  it('sets aria-label with milestone names', () => {
    render(
      <WarningBadge otherMilestones={['Sprint-2505', 'Release-v2.1']} />,
    );
    const badge = screen.getByText('\u26A0');
    expect(badge).toHaveAttribute(
      'aria-label',
      '他のマイルストーン: Sprint-2505, Release-v2.1',
    );
  });

  it('formats tooltip as "他のマイルストーン: Sprint-2505, Release-v2.1"', () => {
    render(
      <WarningBadge otherMilestones={['Sprint-2505', 'Release-v2.1']} />,
    );
    const badge = screen.getByText('\u26A0');
    expect(badge.getAttribute('data-tooltip')).toBe(
      '他のマイルストーン: Sprint-2505, Release-v2.1',
    );
  });

  it('handles single milestone name', () => {
    render(<WarningBadge otherMilestones={['Sprint-2505']} />);
    const badge = screen.getByText('\u26A0');
    expect(badge).toHaveAttribute(
      'data-tooltip',
      '他のマイルストーン: Sprint-2505',
    );
  });
});
