import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import type { Video, VideoDetails } from '@/types';
import { useSettings } from '@/composables/useSettings';
import type { TranscriptResponse } from '@/composables/useYouTubeAPI';
import { TRANSCRIPT_MAX_RETRIES } from '@/utils/constants';
import VideoPlayer from './VideoPlayer.vue';

let onVideoEnd: () => void;
let currentTime = 0;
let seeked: number[] = [];
/** A spy so a test can prove the highlight interval really stopped, not merely that some
 *  clearInterval ran somewhere. */
const getCurrentTimeMock = vi.fn(() => currentTime);
const createPlayerMock = vi.fn();

vi.mock('@/composables/useYTPlayer', () => ({
  useYTPlayer: (onEnd: () => void) => {
    onVideoEnd = onEnd;
    return {
      loadYTApi: () => Promise.resolve(),
      createPlayer: createPlayerMock,
      destroyPlayer: () => {},
      getCurrentTime: getCurrentTimeMock,
      seekTo: (seconds: number) => { seeked.push(seconds); }
    };
  }
}));

let videoDetails: VideoDetails | null = null;
let transcriptResponses: unknown[] = [];
const getTranscriptMock = vi.fn(() => Promise.resolve(transcriptResponses.shift() ?? { status: 'ok', segments: [] }));

vi.mock('@/composables/useYouTubeAPI', () => ({
  useYouTubeAPI: () => ({
    getVideoDetails: () => Promise.resolve(videoDetails),
    getVideoComments: () => Promise.resolve({ comments: [], nextPageToken: undefined }),
    getTranscript: getTranscriptMock
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

describe('VideoPlayer share menu', () => {
  const openShareMenu = async (wrapper: VueWrapper) => {
    await wrapper.find('[data-test="share-btn"]').trigger('click');
  };
  const startTimeToggle = (wrapper: VueWrapper) => wrapper.find('[data-test="share-start-toggle"]');
  const sharedUrl = (wrapper: VueWrapper) => wrapper.emitted('share')?.[0]?.[0];

  beforeEach(() => {
    videoDetails = null;
    currentTime = 0;
  });

  it('shares from the start of the video by default', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);

    await wrapper.find('[data-test="share-youtube"]').trigger('click');

    expect(sharedUrl(wrapper)).toBe('https://www.youtube.com/watch?v=a');
  });

  it('shares a youtube link at the current time once the toggle is on', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);
    await startTimeToggle(wrapper).trigger('click');

    await wrapper.find('[data-test="share-youtube"]').trigger('click');

    expect(sharedUrl(wrapper)).toBe('https://www.youtube.com/watch?v=a&t=134s');
  });

  it('shares an app link at the current time once the toggle is on', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);
    await startTimeToggle(wrapper).trigger('click');

    await wrapper.find('[data-test="share-app"]').trigger('click');

    expect(sharedUrl(wrapper)).toBe(`${window.location.origin}/?v=a&t=134`);
  });

  it('labels the toggle with the time the menu was opened at', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });

    await openShareMenu(wrapper);

    expect(startTimeToggle(wrapper).text()).toContain('2:14');
  });

  it('shares the time the menu was opened at, not the time it was clicked at', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);
    currentTime = 900;
    await startTimeToggle(wrapper).trigger('click');

    await wrapper.find('[data-test="share-youtube"]').trigger('click');

    expect(sharedUrl(wrapper)).toBe('https://www.youtube.com/watch?v=a&t=134s');
  });

  it('forgets the toggle when the menu is reopened', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);
    await startTimeToggle(wrapper).trigger('click');
    await wrapper.find('[data-test="share-youtube"]').trigger('click');

    await openShareMenu(wrapper);

    expect(startTimeToggle(wrapper).attributes('aria-checked')).toBe('false');
  });

  it('closes the menu when the video changes, so the frozen time cannot outlive it', async () => {
    currentTime = 134;
    const wrapper = await mountPlayer({ video: video('a') });
    await openShareMenu(wrapper);
    await startTimeToggle(wrapper).trigger('click');

    await wrapper.setProps({ video: video('b') });

    expect(wrapper.find('[data-test="share-youtube"]').exists()).toBe(false);
  });
});

describe('transcript tab', () => {
  const openTranscript = async (wrapper: VueWrapper) => {
    const tab = wrapper.findAll('.tab').find(button => button.text().includes('Transcript'));
    await tab!.trigger('click');
    await flushPromises();
  };

  beforeEach(() => {
    videoDetails = null;
    currentTime = 0;
    transcriptResponses = [];
    seeked = [];
    getTranscriptMock.mockClear();
  });

  it('does not ask for the transcript until the tab is opened', async () => {
    transcriptResponses = [];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    expect(wrapper.find('.transcript-panel').exists()).toBe(false);
    expect(getTranscriptMock).not.toHaveBeenCalled();
  });

  it('shows the lines once the tab is opened', async () => {
    transcriptResponses = [{ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    await openTranscript(wrapper);

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('maps a successful response with zero segments to the empty state, not the ok state', async () => {
    transcriptResponses = [{ status: 'ok', segments: [] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();

    await openTranscript(wrapper);

    expect(wrapper.text()).toContain('No transcript available');
    // The toolbar (search box, copy button) only renders in the 'ok' state: its absence
    // proves the empty segments array landed in 'empty', not 'ok' with an empty list.
    expect(wrapper.find('.transcript-search').exists()).toBe(false);
  });

  it('retries a transcript still being prepared and then shows it', async () => {
    vi.useFakeTimers();
    transcriptResponses = [
      { status: 'pending', retryAfter: 1 },
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] },
    ];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    expect(wrapper.text()).toContain('Preparing transcript');

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
    vi.useRealTimers();
  });

  it('gives up after too many retries instead of waiting for ever', async () => {
    vi.useFakeTimers();
    transcriptResponses = Array.from({ length: 20 }, () => ({ status: 'pending', retryAfter: 1 }));
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await vi.advanceTimersByTimeAsync(20000);
    await flushPromises();

    expect(wrapper.text()).toContain('Could not load the transcript');
    // The cap is what protects the monthly request budget, so the exact number matters: the
    // first attempt plus TRANSCRIPT_MAX_RETRIES retries, and then it stops for good.
    expect(getTranscriptMock).toHaveBeenCalledTimes(TRANSCRIPT_MAX_RETRIES + 1);
    vi.useRealTimers();
  });

  it('discards a pending retry if the video changes before the in-flight response arrives', async () => {
    vi.useFakeTimers();
    let resolvePending!: (value: TranscriptResponse) => void;
    const pendingResponse = new Promise<TranscriptResponse>(resolve => { resolvePending = resolve; });
    getTranscriptMock.mockImplementationOnce(() => pendingResponse);

    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    // The video changes while the very first getTranscript call is still in flight, before
    // it has resolved into a 'pending' state and before any retry timer exists to cancel.
    await wrapper.setProps({ video: video('b') });
    await flushPromises();

    resolvePending({ status: 'pending', retryAfter: 1 });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(20000);
    await flushPromises();

    // If the stale continuation were allowed to schedule its own retry, it would have kept
    // calling getTranscript for video b even though nobody opened its transcript tab.
    expect(getTranscriptMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('seeks the player when a line is clicked', async () => {
    transcriptResponses = [{ status: 'ok', segments: [{ start: 42, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await wrapper.find('.transcript-line').trigger('click');

    expect(seeked).toEqual([42]);
  });

  it('goes back to the comments and forgets the transcript on a new video', async () => {
    transcriptResponses = [
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] },
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'hello' }] },
    ];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await wrapper.setProps({ video: video('b') });
    await flushPromises();

    expect(wrapper.find('.transcript-panel').exists()).toBe(false);

    // Reopening the tab on the new video must not still show the previous video's lines:
    // proves the transcript state was actually cleared, not just the active tab.
    await openTranscript(wrapper);

    expect(wrapper.text()).not.toContain('ciao');
    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('stops polling the player position when the tab is left', async () => {
    vi.useFakeTimers();
    transcriptResponses = [{ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    // The interval really is running while the tab is open, or the second half proves nothing.
    getCurrentTimeMock.mockClear();
    await vi.advanceTimersByTimeAsync(2000);
    expect(getCurrentTimeMock).toHaveBeenCalled();

    const commentsTab = wrapper.findAll('.tab').find(button => button.text().includes('comments'));
    await commentsTab!.trigger('click');

    getCurrentTimeMock.mockClear();
    await vi.advanceTimersByTimeAsync(10000);

    expect(getCurrentTimeMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('stops polling while the player is minimized and resumes when it is restored', async () => {
    vi.useFakeTimers();
    transcriptResponses = [{ status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    await wrapper.setProps({ isMinimized: true });
    getCurrentTimeMock.mockClear();
    await vi.advanceTimersByTimeAsync(10000);

    // No panel is mounted while minimized, so the poll has nothing to feed.
    expect(getCurrentTimeMock).not.toHaveBeenCalled();

    await wrapper.setProps({ isMinimized: false });
    getCurrentTimeMock.mockClear();
    await vi.advanceTimersByTimeAsync(2000);

    expect(getCurrentTimeMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not fire an armed transcript retry after unmount', async () => {
    vi.useFakeTimers();
    transcriptResponses = [{ status: 'pending', retryAfter: 1 }];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    // A retry is armed at this point: the assertion below is about that specific timer.
    expect(getTranscriptMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(30000);
    await flushPromises();

    // A leaked timeout would keep fetching for a player nobody is looking at any more.
    expect(getTranscriptMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('retries when the user reopens the tab after a failure', async () => {
    transcriptResponses = [
      { status: 'error' },
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] },
    ];
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);

    expect(wrapper.text()).toContain('Could not load the transcript');
    expect(getTranscriptMock).toHaveBeenCalledTimes(1);

    const commentsTab = wrapper.findAll('.tab').find(button => button.text().includes('comments'));
    await commentsTab!.trigger('click');
    await openTranscript(wrapper);

    // Reopening the tab is a real user action, so it is allowed to spend one more request.
    expect(getTranscriptMock).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).not.toContain('Could not load the transcript');
    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
  });

  it('gives the retry a full budget instead of the exhausted one', async () => {
    vi.useFakeTimers();
    // The first visit burns every retry and lands on the error message.
    transcriptResponses = Array.from({ length: 20 }, () => ({ status: 'pending', retryAfter: 1 }));
    const wrapper = mount(VideoPlayer, { props: { video: video('a'), isMinimized: false } });
    await flushPromises();
    await openTranscript(wrapper);
    await vi.advanceTimersByTimeAsync(30000);
    await flushPromises();
    expect(wrapper.text()).toContain('Could not load the transcript');

    const commentsTab = wrapper.findAll('.tab').find(button => button.text().includes('comments'));
    await commentsTab!.trigger('click');

    // If the retry counter were not reset, this attempt would give up on its first 'pending'
    // answer instead of waiting for the transcript that is about to be ready.
    transcriptResponses = [
      { status: 'pending', retryAfter: 1 },
      { status: 'ok', segments: [{ start: 0, dur: 1, text: 'ciao' }] },
    ];
    await openTranscript(wrapper);
    expect(wrapper.text()).toContain('Preparing transcript');

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(wrapper.findAll('.transcript-line')).toHaveLength(1);
    vi.useRealTimers();
  });
});

describe('VideoPlayer playback rate', () => {
  beforeEach(() => {
    createPlayerMock.mockClear();
  });

  afterEach(() => {
    useSettings().setPlaybackRate(1);
  });

  it('opens a video at the speed chosen in the settings', async () => {
    useSettings().setPlaybackRate(1.5);
    await mountPlayer({ video: video('abc') });
    expect(createPlayerMock).toHaveBeenCalledWith('abc', undefined, 1.5);
  });
});

/**
 * A video opened from a bare ?v= id knows nothing about itself. The details call the player
 * already makes carries the real identity, so the player passes it up rather than letting the
 * app show a placeholder title and hide the channel buttons.
 */
describe('VideoPlayer identity', () => {
  it('hands up the identity the details carry', async () => {
    videoDetails = { ...detailsWith(), title: 'Real title', channel: 'Real channel', channelId: 'UC1' };
    const wrapper = await mountPlayer({ video: video('abc') });
    expect(wrapper.emitted('identity-resolved')?.[0]).toEqual([
      { videoId: 'abc', title: 'Real title', channel: 'Real channel', channelId: 'UC1' }
    ]);
  });

  // The fallback path does not report the channel, and half an identity is worse than none.
  it('stays quiet when the details carry no channel', async () => {
    videoDetails = detailsWith();
    const wrapper = await mountPlayer({ video: video('abc') });
    expect(wrapper.emitted('identity-resolved')).toBeUndefined();
  });
});
