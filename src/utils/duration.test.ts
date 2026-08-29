import { describe, it, expect } from 'vitest';
import { formatDuration, formatSeconds } from './duration';

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

describe('formatSeconds', () => {
  it('formats minutes and seconds', () => {
    expect(formatSeconds(90)).toBe('1:30');
  });

  it('pads single-digit seconds', () => {
    expect(formatSeconds(65)).toBe('1:05');
  });

  it('adds hours past the hour mark', () => {
    expect(formatSeconds(3661)).toBe('1:01:01');
  });

  it('formats the start of the video', () => {
    expect(formatSeconds(0)).toBe('0:00');
  });

  it('truncates fractions of a second', () => {
    expect(formatSeconds(12.9)).toBe('0:12');
  });
});
