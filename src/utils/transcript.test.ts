import { describe, it, expect } from 'vitest';
import { findActiveIndex, filterSegments, toPlainText, type TranscriptSegment } from './transcript';

const segments: TranscriptSegment[] = [
  { start: 0, dur: 2, text: 'Benvenuti nel video' },
  { start: 2, dur: 3, text: 'Oggi parliamo di CUCINA' },
  { start: 5, dur: 4, text: 'Iniziamo dagli ingredienti' },
];

describe('findActiveIndex', () => {
  it('returns the segment that has already started', () => {
    expect(findActiveIndex(segments, 3)).toBe(1);
  });

  it('switches exactly on the start of a segment', () => {
    expect(findActiveIndex(segments, 5)).toBe(2);
  });

  it('stays on the last segment past the end', () => {
    expect(findActiveIndex(segments, 999)).toBe(2);
  });

  it('returns -1 before the first segment starts', () => {
    expect(findActiveIndex([{ start: 4, dur: 1, text: 'tardi' }], 1)).toBe(-1);
  });

  it('returns -1 on an empty list', () => {
    expect(findActiveIndex([], 10)).toBe(-1);
  });
});

describe('filterSegments', () => {
  it('matches regardless of case', () => {
    expect(filterSegments(segments, 'cucina')).toEqual([segments[1]]);
  });

  it('returns everything for an empty query', () => {
    expect(filterSegments(segments, '')).toEqual(segments);
  });

  it('returns everything for a query of only spaces', () => {
    expect(filterSegments(segments, '   ')).toEqual(segments);
  });

  it('returns nothing when there is no match', () => {
    expect(filterSegments(segments, 'astronavi')).toEqual([]);
  });
});

describe('toPlainText', () => {
  it('joins the lines without timestamps', () => {
    expect(toPlainText(segments)).toBe(
      'Benvenuti nel video\nOggi parliamo di CUCINA\nIniziamo dagli ingredienti',
    );
  });

  it('returns an empty string for an empty list', () => {
    expect(toPlainText([])).toBe('');
  });
});
