import { describe, it, expect } from 'vitest';
import { formatDuration } from './duration';

describe('formatDuration', () => {
  it('formats hours, minutes, seconds', () => {
    expect(formatDuration('PT1H2M3S')).toBe('1:02:03');
  });

  it('formats minutes and seconds without hours', () => {
    expect(formatDuration('PT5M30S')).toBe('5:30');
  });

  it('formats seconds only', () => {
    expect(formatDuration('PT45S')).toBe('0:45');
  });

  it('formats hours only', () => {
    expect(formatDuration('PT1H')).toBe('1:00:00');
  });

  it('formats hours and minutes without seconds', () => {
    expect(formatDuration('PT1H30M')).toBe('1:30:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration('PT3M5S')).toBe('3:05');
  });

  it('returns empty string for empty input', () => {
    expect(formatDuration('')).toBe('');
  });

  it('returns empty string for malformed input', () => {
    expect(formatDuration('invalid')).toBe('');
  });

  it('returns empty string for bare PT', () => {
    expect(formatDuration('PT')).toBe('');
  });
});
