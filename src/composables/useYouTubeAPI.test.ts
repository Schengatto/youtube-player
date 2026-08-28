import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Video } from '@/types';
import { useYouTubeAPI } from './useYouTubeAPI';

const video = (videoId: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel',
});

const respondWith = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const requestedUrl = (fetchMock: ReturnType<typeof vi.fn>): URL =>
  new URL(fetchMock.mock.calls[0]![0] as string);

describe('getSimilarTracks', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the videos and the canonical seed', async () => {
    respondWith({
      seed: { artist: 'Daft Punk', track: 'Around the World' },
      videos: [video('a'), video('b')],
    });

    const result = await useYouTubeAPI().getSimilarTracks({ artist: 'daft punk', track: 'around the world' });

    expect(result.seed).toEqual({ artist: 'Daft Punk', track: 'Around the World' });
    expect(result.videos.map(v => v.videoId)).toEqual(['a', 'b']);
  });

  it('sends the artist and track as query parameters', async () => {
    const fetchMock = respondWith({ seed: { artist: 'A', track: 'T' }, videos: [] });

    await useYouTubeAPI().getSimilarTracks({ artist: 'Sigur Rós', track: 'Hoppípolla' });

    const url = requestedUrl(fetchMock);
    expect(url.pathname).toBe('/radio');
    expect(url.searchParams.get('artist')).toBe('Sigur Rós');
    expect(url.searchParams.get('track')).toBe('Hoppípolla');
  });

  it('omits the artist parameter when the seed has none', async () => {
    const fetchMock = respondWith({ seed: { artist: 'New Order', track: 'Blue Monday' }, videos: [] });

    await useYouTubeAPI().getSimilarTracks({ track: 'Blue Monday' });

    const url = requestedUrl(fetchMock);
    expect(url.searchParams.has('artist')).toBe(false);
    expect(url.searchParams.get('track')).toBe('Blue Monday');
  });

  it('passes the limit through', async () => {
    const fetchMock = respondWith({ seed: { artist: 'A', track: 'T' }, videos: [] });

    await useYouTubeAPI().getSimilarTracks({ artist: 'A', track: 'T' }, 5);

    expect(requestedUrl(fetchMock).searchParams.get('limit')).toBe('5');
  });

  it('returns an empty list when nothing was found', async () => {
    respondWith({ seed: { artist: 'A', track: 'T' }, videos: [] });

    const result = await useYouTubeAPI().getSimilarTracks({ artist: 'A', track: 'T' });

    expect(result.videos).toEqual([]);
  });

  it('throws when the request fails', async () => {
    respondWith({ error: 'boom' }, false, 500);

    await expect(useYouTubeAPI().getSimilarTracks({ artist: 'A', track: 'T' }))
      .rejects.toThrow('API error: 500');
  });
});
