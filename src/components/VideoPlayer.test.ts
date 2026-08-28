import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import type { Video, VideoDetails } from '@/types';
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

let videoDetails: VideoDetails | null = null;

vi.mock('@/composables/useYouTubeAPI', () => ({
  useYouTubeAPI: () => ({
    getVideoDetails: () => Promise.resolve(videoDetails),
    getVideoComments: () => Promise.resolve({ comments: [], nextPageToken: undefined })
  })
}));

const video = (videoId: string): Video => ({
  title: `Video ${videoId}`,
  videoId,
  thumbnail: '',
  channel: 'Channel'
});

const song = (title: string, channel = 'Channel'): Video => ({
  title,
  videoId: 'song',
  thumbnail: '',
  channel
});

const detailsWith = (categoryId?: string): VideoDetails => ({
  description: 'A description',
  viewCount: '0',
  likeCount: '0',
  commentCount: '0',
  categoryId
});

const queue = [video('a'), video('b')];

const mountPlayer = async (props: { video: Video | null; queue?: Video[] }) => {
  const wrapper = mount(VideoPlayer, { props });
  await flushPromises();
  return wrapper;
};

const radioButton = (wrapper: VueWrapper) => wrapper.find('[data-test="radio-btn"]');

describe('VideoPlayer radio button', () => {
  beforeEach(() => {
    videoDetails = detailsWith();
  });

  it('offers the radio on a title that names an artist', async () => {
    const wrapper = await mountPlayer({ video: song('Daft Punk - Around the World') });
    expect(radioButton(wrapper).exists()).toBe(true);
  });

  it('offers the radio on a music video whose title has no separator', async () => {
    videoDetails = detailsWith('10');
    const wrapper = await mountPlayer({ video: song('Blue Monday') });
    expect(radioButton(wrapper).exists()).toBe(true);
  });

  it('hides the radio on a video that is not a song', async () => {
    videoDetails = detailsWith('22');
    const wrapper = await mountPlayer({ video: song('How to bake sourdough') });
    expect(radioButton(wrapper).exists()).toBe(false);
  });

  it('emits the parsed seed when clicked', async () => {
    const wrapper = await mountPlayer({ video: song('Daft Punk - Around the World') });

    await radioButton(wrapper).trigger('click');

    expect(wrapper.emitted('radio-requested')).toEqual([
      [{ artist: 'Daft Punk', track: 'Around the World' }]
    ]);
  });

  it('emits an artist-less seed for a music video that does not split', async () => {
    videoDetails = detailsWith('10');
    const wrapper = await mountPlayer({ video: song('Blue Monday (Official Video)') });

    await radioButton(wrapper).trigger('click');

    expect(wrapper.emitted('radio-requested')).toEqual([[{ track: 'Blue Monday' }]]);
  });

  it('does not emit again while a radio is loading', async () => {
    const wrapper = await mountPlayer({ video: song('Daft Punk - Around the World') });
    await wrapper.setProps({ radioLoading: true });

    await radioButton(wrapper).trigger('click');

    expect(wrapper.emitted('radio-requested')).toBeUndefined();
  });
});

describe('VideoPlayer autoplay', () => {
  beforeEach(() => {
    videoDetails = null;
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
