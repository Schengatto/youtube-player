import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import type { Video } from '@/types';
import { useAppState } from './useAppState';

const getSimilarTracks = vi.fn();
const alertSpy = vi.fn(() => Promise.resolve());

vi.mock('@/composables/useYouTubeAPI', () => ({
  useYouTubeAPI: () => ({
    getSimilarTracks,
    getRecommendedPopular: () => Promise.resolve({ videos: [], hasMore: false }),
    getRecentFromChannels: () => Promise.resolve([]),
    searchVideos: () => Promise.resolve({ videos: [] }),
    searchByChannel: () => Promise.resolve({ videos: [] }),
    getVideoDetails: () => Promise.resolve(null),
    getVideoComments: () => Promise.resolve({ comments: [] }),
  }),
}));

vi.mock('@/composables/useDialog', () => ({
  useDialog: () => ({ alert: alertSpy, confirm: () => Promise.resolve(true) }),
}));

const video = (videoId: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel',
});

/** useAppState registers onMounted hooks, so it needs a real component instance. */
const mountAppState = () => {
  let state!: ReturnType<typeof useAppState>;
  mount(defineComponent({
    setup() {
      state = useAppState();
      return () => h('div');
    },
  }));
  return state;
};

// The open video lives in the query, so a test that plays one leaves it there for the next mount.
beforeEach(() => {
  window.history.replaceState({}, '', '/');
});

/** jsdom fires popstate asynchronously, so wait for the event instead of a fixed tick. */
const goBack = () => new Promise<void>((resolve) => {
  window.addEventListener('popstate', () => resolve(), { once: true });
  window.history.back();
});

describe('startRadio', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('replaces the queue with the similar tracks and plays the first', async () => {
    const radio = [video('a'), video('b'), video('c')];
    getSimilarTracks.mockResolvedValue({ seed: { artist: 'Daft Punk', track: 'Da Funk' }, videos: radio });

    const state = mountAppState();
    state.videos.value = [video('old')];

    await state.startRadio({ artist: 'daft punk', track: 'da funk' });

    expect(state.videos.value).toEqual(radio);
    expect(state.selectedVideo.value).toEqual(video('a'));
    expect(state.playbackQueue.value).toEqual(radio);
    expect(state.viewMode.value).toBe('radio');
    expect(state.radioSeed.value).toEqual({ artist: 'Daft Punk', track: 'Da Funk' });
  });

  it('drops the pagination of the list it replaced', async () => {
    getSimilarTracks.mockResolvedValue({ seed: { artist: 'A', track: 'T' }, videos: [video('a')] });

    const state = mountAppState();
    state.searchQuery.value = 'old search';
    await state.startRadio({ artist: 'A', track: 'T' });

    // Scrolling to the bottom must not append the old search results to the radio.
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();

    expect(state.videos.value).toEqual([video('a')]);
    expect(state.searchQuery.value).toBe('');
  });

  it('leaves the list untouched and warns when nothing similar was found', async () => {
    getSimilarTracks.mockResolvedValue({ seed: { artist: 'A', track: 'T' }, videos: [] });

    const state = mountAppState();
    const feed = [video('old')];
    state.videos.value = feed;

    await state.startRadio({ artist: 'A', track: 'T' });

    expect(state.videos.value).toEqual(feed);
    expect(state.selectedVideo.value).toBeNull();
    expect(state.viewMode.value).not.toBe('radio');
    expect(alertSpy).toHaveBeenCalledOnce();
  });

  it('leaves the list untouched and warns when the request fails', async () => {
    getSimilarTracks.mockRejectedValue(new Error('API error: 500'));

    const state = mountAppState();
    const feed = [video('old')];
    state.videos.value = feed;

    await state.startRadio({ artist: 'A', track: 'T' });

    expect(state.videos.value).toEqual(feed);
    expect(state.selectedVideo.value).toBeNull();
    expect(alertSpy).toHaveBeenCalledOnce();
  });

  it('clears the loading flag once done', async () => {
    getSimilarTracks.mockResolvedValue({ seed: { artist: 'A', track: 'T' }, videos: [video('a')] });

    const state = mountAppState();
    const pending = state.startRadio({ artist: 'A', track: 'T' });
    expect(state.isLoadingRadio.value).toBe(true);

    await pending;
    expect(state.isLoadingRadio.value).toBe(false);
  });

  it('clears the loading flag when the request fails', async () => {
    getSimilarTracks.mockRejectedValue(new Error('API error: 500'));

    const state = mountAppState();
    await state.startRadio({ artist: 'A', track: 'T' });

    expect(state.isLoadingRadio.value).toBe(false);
  });

  it('ignores a second request while one is in flight', async () => {
    getSimilarTracks.mockResolvedValue({ seed: { artist: 'A', track: 'T' }, videos: [video('a')] });

    const state = mountAppState();
    const first = state.startRadio({ artist: 'A', track: 'T' });
    await state.startRadio({ artist: 'B', track: 'U' });
    await first;

    expect(getSimilarTracks).toHaveBeenCalledOnce();
  });
});

describe('video URL', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('puts the open video in the query so a reload reopens it', async () => {
    const state = mountAppState();
    await flushPromises();

    state.handlePlayVideo(video('abc'));
    await flushPromises();

    expect(window.location.search).toBe('?v=abc');
  });

  it('adds a history entry per video, so Back walks the queue', async () => {
    const state = mountAppState();
    await flushPromises();
    const before = window.history.length;

    state.handlePlayVideo(video('abc'));
    await flushPromises();
    state.handlePlayVideo(video('def'));
    await flushPromises();

    expect(window.history.length).toBe(before + 2);
  });

  it('clears the query when the player is closed', async () => {
    const state = mountAppState();
    await flushPromises();
    state.handlePlayVideo(video('abc'));
    await flushPromises();
    const afterOpen = window.history.length;

    state.handleCloseVideo();
    await flushPromises();

    expect(window.location.search).toBe('');
    // Replaced, not pushed: otherwise the first Back would reopen what was just closed.
    expect(window.history.length).toBe(afterOpen);
  });

  it('does not duplicate the history entry when starting on ?v=', async () => {
    window.history.replaceState({}, '', '/?v=abc');
    const before = window.history.length;

    const state = mountAppState();
    await flushPromises();

    expect(state.selectedVideo.value?.videoId).toBe('abc');
    expect(window.history.length).toBe(before);
  });

  it('reopens the video the URL went back to', async () => {
    const state = mountAppState();
    await flushPromises();
    state.handlePlayVideo(video('abc'));
    await flushPromises();
    state.handlePlayVideo(video('def'));
    await flushPromises();

    await goBack();

    expect(window.location.search).toBe('?v=abc');
    expect(state.selectedVideo.value?.videoId).toBe('abc');
  });

  it('closes the player when the URL goes back to a page without a video', async () => {
    const state = mountAppState();
    await flushPromises();
    state.handlePlayVideo(video('abc'));
    await flushPromises();

    await goBack();

    expect(state.selectedVideo.value).toBeNull();
  });
});
