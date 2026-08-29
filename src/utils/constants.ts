export const DEFAULT_CATEGORIES = [
  'technology',
  'music',
  'gaming',
  'cooking',
  'sports',
  'science',
  'art',
  'travel',
  'fitness',
  'tutorial'
];

export const STORAGE_KEYS = {
  CHANNELS: 'savedChannels',
  PREFERENCES: 'userPreferences',
  BOOKMARKS: 'bookmarks',
  PLAYLISTS: 'user_playlists',
  SAVED_VIDEOS: 'savedVideos',
  LOCALE: 'app_locale',
  HOME_TAB: 'home_tab',
} as const;

export const MOBILE_BREAKPOINT = 768;

export const PAGE_SIZE = {
  DEFAULT: 12,
  CHANNEL: 50,
  COMMENTS: 20,
  KEYWORDS: 4,
} as const;

export const TOAST_DURATION_MS = 3000;
export const POPUP_CHECK_INTERVAL_MS = 500;
export const YOUTUBE_VIDEO_ID_LENGTH = 11;
export const PAGINATION_HAS_MORE = 'has-more';
export const FAVORITES_FEED_DAYS = 7;

/**
 * A Cloudflare Worker invocation may issue at most 50 subrequests, and the feed spends
 * one per channel (two when a channel falls back), so the channel list is requested in
 * chunks instead of all at once.
 */
export const FAVORITES_FEED_CHUNK_SIZE = 20;
export const FAVORITES_FEED_MAX_VIDEOS = 60;
export const RECOMMENDATION_BUFFER = 20;

/** Beyond this many attempts a transcript still being prepared is given up on. */
export const TRANSCRIPT_MAX_RETRIES = 12;
/** Milliseconds between two reads of the player position for highlighting. */
export const TRANSCRIPT_HIGHLIGHT_INTERVAL = 500;
/**
 * Seconds to wait before asking again when the server doesn't say how long. Doubles as the
 * shortest wait we accept from it: a smaller one would spend the whole retry budget in
 * milliseconds against a monthly request quota.
 */
export const TRANSCRIPT_DEFAULT_RETRY = 5;
