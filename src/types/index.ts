export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  duration?: string;
  /**
   * Nothing in this video came from YouTube: it stands in for a video opened from a bare id,
   * until the details arrive and `VideoIdentity` completes it.
   */
  isPlaceholder?: true;
}

/** What a video opened from a bare id is missing, as the details report it. */
export interface VideoIdentity {
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
}

export interface SavedChannel {
  name: string;
  id: string;
}

export interface UserPreferences {
  interests: string[];
  language: string;
  autoplay: boolean;
}

export interface VideoDetails {
  description: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  /** YouTube category, '10' being Music. Absent when the details came from the fallback path. */
  categoryId?: string;
  /**
   * Identity of the video, for one opened from a bare id that knows nothing else about itself.
   * All three ride along in the snippet the worker already asks for. Absent on the fallback path.
   */
  title?: string;
  channel?: string;
  channelId?: string;
}

export interface VideoComment {
  authorName: string;
  authorAvatar: string;
  text: string;
  likeCount: number;
  publishedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  videos: Video[];
  createdAt: string;
}

export interface Bookmark {
  id: string;
  videoId: string;
  videoTitle: string;
  channel: string;
  thumbnail: string;
  timestamp: number; // seconds
  label: string;
  createdAt: string;
}

