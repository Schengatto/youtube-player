export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  duration?: string;
}

export interface SavedChannel {
  name: string;
  id: string;
}

export interface UserPreferences {
  interests: string[];
  language: string;
}

export interface VideoDetails {
  description: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
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

