import { describe, it, expect } from 'vitest';
import type { Video } from '@/types';
import { chunkChannels, mergeRecentVideos } from './feed';
import { FAVORITES_FEED_CHUNK_SIZE, FAVORITES_FEED_MAX_VIDEOS } from './constants';

const video = (videoId: string, publishedAt?: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel',
  publishedAt
});

describe('chunkChannels', () => {
  it('keeps a short list in a single chunk', () => {
    expect(chunkChannels(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
  });

  it('splits a long list so no chunk exceeds the limit', () => {
    const ids = Array.from({ length: 60 }, (_, i) => `id${i}`);
    const chunks = chunkChannels(ids);

    expect(chunks).toHaveLength(3);
    expect(chunks.every(chunk => chunk.length <= FAVORITES_FEED_CHUNK_SIZE)).toBe(true);
    expect(chunks.flat()).toEqual(ids);
  });

  it('leaves the remainder in a smaller last chunk', () => {
    const ids = Array.from({ length: FAVORITES_FEED_CHUNK_SIZE + 1 }, (_, i) => `id${i}`);
    const chunks = chunkChannels(ids);

    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toEqual([`id${FAVORITES_FEED_CHUNK_SIZE}`]);
  });

  it('returns no chunks for an empty list', () => {
    expect(chunkChannels([])).toEqual([]);
  });
});

describe('mergeRecentVideos', () => {
  it('sorts videos from every chunk by publish date, newest first', () => {
    const merged = mergeRecentVideos([
      [video('old', '2026-08-01T00:00:00Z'), video('new', '2026-08-20T00:00:00Z')],
      [video('mid', '2026-08-10T00:00:00Z')]
    ]);

    expect(merged.map(v => v.videoId)).toEqual(['new', 'mid', 'old']);
  });

  it('keeps a single copy of a video returned by more than one chunk', () => {
    const merged = mergeRecentVideos([
      [video('dup', '2026-08-20T00:00:00Z')],
      [video('dup', '2026-08-20T00:00:00Z')]
    ]);

    expect(merged).toHaveLength(1);
  });

  it('drops videos without a usable publish date', () => {
    const merged = mergeRecentVideos([
      [video('good', '2026-08-20T00:00:00Z'), video('undated'), video('broken', 'not-a-date')]
    ]);

    expect(merged.map(v => v.videoId)).toEqual(['good']);
  });

  it('caps the merged feed', () => {
    const many = Array.from({ length: FAVORITES_FEED_MAX_VIDEOS + 10 }, (_, i) =>
      video(`id${i}`, `2026-08-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`));

    expect(mergeRecentVideos([many])).toHaveLength(FAVORITES_FEED_MAX_VIDEOS);
  });

  it('returns an empty feed when there is nothing to merge', () => {
    expect(mergeRecentVideos([])).toEqual([]);
    expect(mergeRecentVideos([[], []])).toEqual([]);
  });
});
