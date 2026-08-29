import type { Video } from '@/types';

const YOUTUBE_PATH_ID_PATTERN = /^\/(?:shorts|live|embed)\/([^/]+)/;
const URL_IN_TEXT_PATTERN = /https?:\/\/\S+/g;
const TRAILING_PUNCTUATION_PATTERN = /[.,;:!?)\]]+$/;

export const parseYouTubeUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v') ?? urlObj.pathname.match(YOUTUBE_PATH_ID_PATTERN)?.[1] ?? null;
    }

    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    return null;
  } catch {
    return null;
  }
};

export const extractVideoIdFromUrl = (input: string): string | null => {
  const trimmed = input.trim();

  const YOUTUBE_VIDEO_ID_LENGTH = 11;
  const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
  if (trimmed.length === YOUTUBE_VIDEO_ID_LENGTH && YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return parseYouTubeUrl(trimmed);
};

/**
 * Extracts a video id from free-form shared text. The YouTube Android app shares
 * the link wrapped in a sentence, so the url has to be fished out of the text.
 */
export const extractVideoIdFromSharedText = (text: string): string | null => {
  const direct = extractVideoIdFromUrl(text);
  if (direct) return direct;

  for (const url of text.match(URL_IN_TEXT_PATTERN) ?? []) {
    const videoId = parseYouTubeUrl(url.replace(TRAILING_PUNCTUATION_PATTERN, ''));
    if (videoId) return videoId;
  }

  return null;
};

export const getChannelUrl = (channelId: string): string =>
  `https://www.youtube.com/channel/${channelId}`;

/**
 * YouTube opens its own subscribe confirmation dialog for this url. The app has no
 * write access to the user's YouTube account (the OAuth scope is read-only), so
 * subscribing has to happen on YouTube itself.
 */
export const getChannelSubscribeUrl = (channelId: string): string =>
  `${getChannelUrl(channelId)}?sub_confirmation=1`;

/**
 * Builds a shareable link to a video, optionally resuming at `startSeconds`.
 * YouTube wants the seconds suffixed with `s`; our own links use bare seconds,
 * the format the `t` param is read back with on startup.
 */
export const buildVideoShareUrl = (
  videoId: string,
  target: 'youtube' | 'app',
  startSeconds?: number | null
): string => {
  const seconds = Math.floor(startSeconds ?? 0);
  const base = target === 'youtube'
    ? `https://www.youtube.com/watch?v=${videoId}`
    : `${window.location.origin}${window.location.pathname}?v=${videoId}`;

  if (seconds <= 0) return base;

  return `${base}&t=${seconds}${target === 'youtube' ? 's' : ''}`;
};

export const getVideoFromId = (videoId: string): Video => {
  return {
    title: 'Video YouTube',
    videoId,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    channel: 'YouTube',
    channelId: undefined,
    publishedAt: undefined,
    isPlaceholder: true
  };
};
