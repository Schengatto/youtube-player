export interface Video {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
}

export interface SavedChannel {
  name: string;
  id: string;
}

export interface UserPreferences {
  interests: string[];
  language: string;
}

export interface YouTubeSearchResponse {
  items: Array<{
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      thumbnails: {
        medium: {
          url: string;
        };
      };
    };
  }>;
  nextPageToken?: string;
}
