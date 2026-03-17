import type { Video, VideoDetails, VideoComment } from '@/types';
import { INTEREST_CONFIG } from '@/utils/youtube-categories';
import { PAGE_SIZE, RECOMMENDATION_BUFFER } from '@/utils/constants';

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

const fetchApi = async (path: string): Promise<Response> => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response;
};

export const useYouTubeAPI = () => {
  const searchVideos = async (query: string, maxResults = PAGE_SIZE.DEFAULT, pageToken?: string): Promise<SearchResult> => {
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
    maxResults = PAGE_SIZE.KEYWORDS,
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

  return {
    searchVideos,
    searchByChannel,
    getMostPopular,
    getRecommendedPopular,
    getVideoDetails,
    getVideoComments,
  };
};
