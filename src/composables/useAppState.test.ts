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
