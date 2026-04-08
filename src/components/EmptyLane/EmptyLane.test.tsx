import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyLane } from './EmptyLane';

describe('EmptyLane', () => {
  it('renders empty lane text', () => {
    render(<EmptyLane />);
    expect(screen.getByText('課題なし')).toBeInTheDocument();
  });
});
