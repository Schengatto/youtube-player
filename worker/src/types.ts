export interface Env {
  YOUTUBE_API_KEY: string;
  ALLOWED_ORIGIN: string;
  CACHE_TTL: string;
  RATE_LIMIT_MAX: string;
  RATE_LIMIT_WINDOW: string;
  TOKEN_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
  duration?: string;
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

export interface SearchResult {
  videos: Video[];
  nextPageToken?: string;
}

export interface RecommendedResult {
  videos: Video[];
  hasMore: boolean;
}

export interface CommentsResult {
  comments: VideoComment[];
  nextPageToken?: string;
}
