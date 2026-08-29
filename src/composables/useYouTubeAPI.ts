import type { Video, VideoDetails, VideoComment } from '@/types';
import type { TrackSeed } from '@/utils/music';
import type { TranscriptSegment } from '@/utils/transcript';
import { INTEREST_CONFIG } from '@/utils/youtube-categories';
import { PAGE_SIZE, RECOMMENDATION_BUFFER, FAVORITES_FEED_DAYS, TRANSCRIPT_DEFAULT_RETRY } from '@/utils/constants';
import { chunkChannels, mergeRecentVideos } from '@/utils/feed';

const API_BASE = import.meta.env.VITE_API_PROXY_URL as string || 'http://localhost:8787';

interface SearchResult {
  videos: Video[];
  nextPageToken?: string;
}

interface ProxySearchResponse {
  videos: Video[];
  nextPageToken?: string;
}

interface ProxyCommentsResponse {
  comments: VideoComment[];
  nextPageToken?: string;
}

interface RadioResult {
  /** The seed as the server resolved it, which is what to show in the UI: it fills in the
   *  artist when the request went out with the track name alone. */
  seed: TrackSeed;
  videos: Video[];
}

export type TranscriptResponse =
  | { status: 'ok'; segments: TranscriptSegment[] }
  | { status: 'pending'; retryAfter: number }
  | { status: 'quota' }
  | { status: 'error' };

/**
 * The server's wait hint is untrusted input: `0`, a negative number or a non-number would turn
 * the retry budget into a burst of requests against a monthly quota, so anything below the
 * default wait — including a value that isn't a number at all — becomes the default wait.
 */
const sanitizeRetryAfter = (value: unknown): number => {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(seconds, TRANSCRIPT_DEFAULT_RETRY) : TRANSCRIPT_DEFAULT_RETRY;
};

const fetchApi = async (path: string): Promise<Response> => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response;
};

export const useYouTubeAPI = () => {
  const searchVideos = async (query: string, maxResults: number = PAGE_SIZE.DEFAULT, pageToken?: string): Promise<SearchResult> => {
    const params = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
    });
    if (pageToken) params.set('page', pageToken);

    const response = await fetchApi(`/search?${params}`);
    const data: ProxySearchResponse = await response.json();

    return {
      videos: data.videos || [],
      nextPageToken: data.nextPageToken,
    };
  };

  const searchByChannel = async (channelId: string, maxResults = PAGE_SIZE.CHANNEL, pageToken?: string): Promise<SearchResult> => {
    const params = new URLSearchParams({
      maxResults: String(maxResults),
    });
    if (pageToken) params.set('page', pageToken);

    const response = await fetchApi(`/channel/${channelId}/videos?${params}`);
    const data: ProxySearchResponse = await response.json();

    return {
      videos: data.videos || [],
      nextPageToken: data.nextPageToken,
    };
  };

  const getRecentFromChannels = async (channelIds: string[], days = FAVORITES_FEED_DAYS): Promise<Video[]> => {
    if (channelIds.length === 0) return [];

    const fetchChunk = async (ids: string[]): Promise<Video[]> => {
      const params = new URLSearchParams({ ids: ids.join(','), days: String(days) });
      const response = await fetchApi(`/channels/recent?${params}`);
      const data: ProxySearchResponse = await response.json();

      return data.videos || [];
    };

    // The worker cannot fan out over every channel in one invocation, so the list is
    // split. A partial feed still beats no feed, but if every chunk fails, so does this.
    const results = await Promise.allSettled(chunkChannels(channelIds).map(fetchChunk));
    const loaded = results.filter(result => result.status === 'fulfilled');

    if (loaded.length === 0) {
      throw (results[0] as PromiseRejectedResult).reason;
    }

    for (const failed of results.filter(result => result.status === 'rejected')) {
      console.error('Favorite channels feed: a chunk failed', failed.reason);
    }

    return mergeRecentVideos(loaded.map(result => result.value));
  };

  const getMostPopular = async (
    maxResults = PAGE_SIZE.DEFAULT,
    regionCode = 'IT',
  ): Promise<SearchResult> => {
    const params = new URLSearchParams({
      region: regionCode,
      maxResults: String(maxResults),
    });

    const response = await fetchApi(`/trending?${params}`);
    const data: ProxySearchResponse = await response.json();

    return {
      videos: data.videos || [],
      nextPageToken: undefined,
    };
  };

  const searchPopularByKeywords = async (
    keywords: string[],
    maxResults: number = PAGE_SIZE.KEYWORDS,
  ): Promise<Video[]> => {
    const allVideos: Video[] = [];

    for (const keyword of keywords) {
      try {
        const result = await searchVideos(keyword, maxResults);
        allVideos.push(...result.videos);
      } catch (error) {
        console.error(`Error searching for ${keyword}:`, error);
      }
    }

    return allVideos;
  };

  const getRecommendedPopular = async (
    interests: string[],
    language = 'it',
    maxResults = PAGE_SIZE.DEFAULT,
    offset = 0
  ): Promise<{ videos: Video[], hasMore: boolean }> => {
    const regionCode = language.toUpperCase();
    const allVideos: Video[] = [];
    const searchInterests: string[] = [];

    interests.forEach(interest => {
      const normalizedInterest = interest.toLowerCase().trim();
      const config = INTEREST_CONFIG[normalizedInterest];
      if (config) {
        searchInterests.push(normalizedInterest);
      }
    });

    if (searchInterests.length === 0) {
      const result = await getMostPopular(maxResults, regionCode);
      return { videos: result.videos, hasMore: false };
    }

    const totalVideosToFetch = maxResults + offset + RECOMMENDATION_BUFFER;
    const videosPerSource = Math.ceil(totalVideosToFetch / searchInterests.length);

    for (const interest of searchInterests) {
      const config = INTEREST_CONFIG[interest];
      const keywords = config?.searchKeywords || [interest];
      try {
        const videos = await searchPopularByKeywords(keywords, videosPerSource);
        allVideos.push(...videos);
      } catch (error) {
        console.error(`Error loading videos for ${interest}:`, error);
      }
    }

    const uniqueVideos = allVideos.filter((video, index, self) =>
      index === self.findIndex(v => v.videoId === video.videoId)
    );

    const shuffled = uniqueVideos.sort(() => Math.random() - 0.5);
    const paginated = shuffled.slice(offset, offset + maxResults);
    const hasMore = shuffled.length > offset + maxResults;

    return { videos: paginated, hasMore };
  };

  const getVideoDetails = async (videoId: string): Promise<VideoDetails | null> => {
    try {
      const response = await fetchApi(`/video/${videoId}`);
      return await response.json();
    } catch {
      return null;
    }
  };

  const getVideoComments = async (videoId: string, maxResults = PAGE_SIZE.COMMENTS, pageToken?: string): Promise<{ comments: VideoComment[], nextPageToken?: string }> => {
    try {
      const params = new URLSearchParams({
        maxResults: String(maxResults),
      });
      if (pageToken) params.set('page', pageToken);

      const response = await fetchApi(`/video/${videoId}/comments?${params}`);
      const data: ProxyCommentsResponse = await response.json();

      return {
        comments: data.comments || [],
        nextPageToken: data.nextPageToken,
      };
    } catch {
      return { comments: [] };
    }
  };

  const getSimilarTracks = async (seed: TrackSeed, limit?: number): Promise<RadioResult> => {
    const params = new URLSearchParams({ track: seed.track });
    if (seed.artist) params.set('artist', seed.artist);
    if (limit !== undefined) params.set('limit', String(limit));

    const response = await fetchApi(`/radio?${params}`);
    const data: RadioResult = await response.json();

    return {
      seed: data.seed ?? seed,
      videos: data.videos || [],
    };
  };

  /**
   * Does not go through `fetchApi`: here 202, 429 and 503 are not failures but states the
   * panel shows the user, and `fetchApi` would turn them into indistinguishable exceptions.
   */
  const getTranscript = async (videoId: string): Promise<TranscriptResponse> => {
    try {
      const params = new URLSearchParams({ videoId });
      const response = await fetch(`${API_BASE}/transcript?${params}`);

      if (response.status === 202) {
        const data = await response.json() as { retryAfter?: unknown };
        return { status: 'pending', retryAfter: sanitizeRetryAfter(data.retryAfter) };
      }
      if (response.status === 429) return { status: 'quota' };
      if (!response.ok) return { status: 'error' };

      const data = await response.json() as { segments?: TranscriptSegment[] };
      return { status: 'ok', segments: data.segments || [] };
    } catch {
      return { status: 'error' };
    }
  };

  return {
    searchVideos,
    searchByChannel,
    getRecentFromChannels,
    getMostPopular,
    getRecommendedPopular,
    getVideoDetails,
    getVideoComments,
    getSimilarTracks,
    getTranscript,
  };
};
