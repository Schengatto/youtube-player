export interface TranscriptSegment {
  start: number;
  dur: number;
  text: string;
}

export type TranscriptStatus = 'loading' | 'pending' | 'ok' | 'empty' | 'quota' | 'error';

export function findActiveIndex(segments: TranscriptSegment[], t: number): number {
  let left = 0;
  let right = segments.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const segment = segments[mid];
    if (segment && segment.start <= t) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}

export function filterSegments(segments: TranscriptSegment[], query: string): TranscriptSegment[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return segments;
  return segments.filter(segment => segment.text.toLowerCase().includes(needle));
}

export function toPlainText(segments: TranscriptSegment[]): string {
  return segments.map(segment => segment.text).join('\n');
}
