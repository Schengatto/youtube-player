import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { Video } from '@/types';
import { useSettings } from '@/composables/useSettings';
import VideoPlayer from './VideoPlayer.vue';

let onVideoEnd: () => void;

vi.mock('@/composables/useYTPlayer', () => ({
  useYTPlayer: (onEnd: () => void) => {
    onVideoEnd = onEnd;
    return {
      loadYTApi: () => Promise.resolve(),
      createPlayer: () => {},
      destroyPlayer: () => {},
      getCurrentTime: () => 0,
      seekTo: () => {}
    };
  }
}));

vi.mock('@/composables/useYouTubeAPI', () => ({
  useYouTubeAPI: () => ({
    getVideoDetails: () => Promise.resolve(null),
    getVideoComments: () => Promise.resolve({ comments: [], nextPageToken: undefined })
  })
}));

const video = (videoId: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel'
});

const queue = [video('a'), video('b')];

const mountPlayer = async (props: { video: Video | null; queue?: Video[] }) => {
  const wrapper = mount(VideoPlayer, { props });
  await flushPromises();
  return wrapper;
};

describe('VideoPlayer autoplay', () => {
  beforeEach(() => {
    useSettings().setAutoplay(true);
  });

  it('plays the next video in the queue when one ends', async () => {
    const wrapper = await mountPlayer({ video: video('a'), queue });
    onVideoEnd();
    expect(wrapper.emitted('play-next')).toHaveLength(1);
  });

  it('does nothing when autoplay is disabled', async () => {
    useSettings().setAutoplay(false);
    const wrapper = await mountPlayer({ video: video('a'), queue });
    onVideoEnd();
    expect(wrapper.emitted('play-next')).toBeUndefined();
  });

  it('does nothing on the last video of the queue', async () => {
    const wrapper = await mountPlayer({ video: video('b'), queue });
    onVideoEnd();
    expect(wrapper.emitted('play-next')).toBeUndefined();
  });

  it('does nothing when there is no queue', async () => {
    const wrapper = await mountPlayer({ video: video('a') });
    onVideoEnd();
    expect(wrapper.emitted('play-next')).toBeUndefined();
  });
});
