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

describe('getTranscript', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the segments of a video that has a transcript', async () => {
    respondWith({ videoId: 'abc', lang: 'it', segments: [{ start: 0, dur: 1, text: 'ciao' }] });

    const result = await useYouTubeAPI().getTranscript('abc');

    expect(result).toEqual({ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] });
  });

  it('sends the video id as a query parameter', async () => {
    const fetchMock = respondWith({ videoId: 'abc', lang: 'it', segments: [] });

    await useYouTubeAPI().getTranscript('abc');

    expect(requestedUrl(fetchMock).searchParams.get('videoId')).toBe('abc');
  });

  it('returns an empty list for a video without subtitles', async () => {
    respondWith({ videoId: 'abc', lang: '', segments: [] });

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'ok', segments: [] });
  });

  it('reports a transcript still being prepared, with the wait it was given', async () => {
    respondWith({ status: 'pending', retryAfter: 7 }, true, 202);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'pending', retryAfter: 7 });
  });

  it('falls back to a default wait when none is given', async () => {
    respondWith({ status: 'pending' }, true, 202);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'pending', retryAfter: 5 });
  });

  it('distinguishes an exhausted quota from a failure', async () => {
    respondWith({ error: 'quota' }, false, 429);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'quota' });
  });

  it('reports any other failure as an error', async () => {
    respondWith({ error: 'unavailable' }, false, 503);

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'error' });
  });

  it('reports a network failure as an error instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await useYouTubeAPI().getTranscript('abc')).toEqual({ status: 'error' });
  });
});
