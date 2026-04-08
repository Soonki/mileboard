import { describe, it, expect } from 'vitest';
import { getContrastTextColor } from './colorContrast';

describe('getContrastTextColor', () => {
  it('returns black text for light-red background (#ed8077)', () => {
    // luminance ~0.348 > 0.179 threshold -> black text for readability
    expect(getContrastTextColor('#ed8077')).toBe('#000000');
  });

  it('returns black text for green-ish background (#4caf93)', () => {
    // luminance ~0.343 > 0.179 threshold -> black text for readability
    expect(getContrastTextColor('#4caf93')).toBe('#000000');
  });

  it('returns black text for light gray background (#f2f2f2)', () => {
    expect(getContrastTextColor('#f2f2f2')).toBe('#000000');
  });

  it('returns black text for white background (#ffffff)', () => {
    expect(getContrastTextColor('#ffffff')).toBe('#000000');
  });

  it('returns white text for black background (#000000)', () => {
    expect(getContrastTextColor('#000000')).toBe('#ffffff');
  });

  it('returns white text for blue background (#2779bd)', () => {
    expect(getContrastTextColor('#2779bd')).toBe('#ffffff');
  });
});
