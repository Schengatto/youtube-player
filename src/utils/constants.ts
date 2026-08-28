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
export const RECOMMENDATION_BUFFER = 20;
