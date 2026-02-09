import type { Video, YouTubeSearchResponse } from '@/types';
import { INTEREST_CONFIG } from '@/utils/youtube-categories';

interface SearchResult {
  videos: Video[];
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items: Array<{
    id: string;
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

export const useYouTubeAPI = (apiKey: string) => {
  const searchVideos = async (query: string, maxResults = 12, pageToken?: string): Promise<SearchResult> => {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('key', apiKey);

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data: YouTubeSearchResponse = await response.json();
    return {
      videos: mapVideos(data),
      nextPageToken: data.nextPageToken
    };
  };

  const searchByChannel = async (channelId: string, maxResults = 12, pageToken?: string): Promise<SearchResult> => {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('channelId', channelId);
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('order', 'date');
    url.searchParams.append('type', 'video');
    url.searchParams.append('key', apiKey);

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Channel search failed');
    }

    const data: YouTubeSearchResponse = await response.json();
    return {
      videos: mapVideos(data),
      nextPageToken: data.nextPageToken
    };
  };

  const getMostPopular = async (
    maxResults = 12,
    regionCode = 'IT',
    pageToken?: string,
    videoCategoryId?: string
  ): Promise<SearchResult> => {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('chart', 'mostPopular');
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('regionCode', regionCode);
    url.searchParams.append('key', apiKey);

    if (videoCategoryId) {
      url.searchParams.append('videoCategoryId', videoCategoryId);
    }

    if (pageToken) {
      url.searchParams.append('pageToken', pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error('Failed to fetch popular videos');
    }

    const data: YouTubeVideosResponse = await response.json();
    return {
      videos: mapPopularVideos(data),
      nextPageToken: data.nextPageToken
    };
  };

  const searchPopularByKeywords = async (
    keywords: string[],
    maxResults = 4,
    regionCode = 'IT'
  ): Promise<Video[]> => {
    const allVideos: Video[] = [];

    for (const keyword of keywords) {
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.append('part', 'snippet');
        url.searchParams.append('maxResults', maxResults.toString());
        url.searchParams.append('q', keyword);
        url.searchParams.append('type', 'video');
        url.searchParams.append('order', 'viewCount'); // Ordina per visualizzazioni
        url.searchParams.append('relevanceLanguage', regionCode.toLowerCase());
        url.searchParams.append('key', apiKey);

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        url.searchParams.append('publishedAfter', oneYearAgo.toISOString());

        const response = await fetch(url.toString());

        if (response.ok) {
          const data: YouTubeSearchResponse = await response.json();
          allVideos.push(...mapVideos(data));
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error searching for ${keyword}:`, error);
      }
    }

    return allVideos;
  };

  const getRecommendedPopular = async (
    interests: string[],
    language = 'it',
    maxResults = 12,
    offset = 0
  ): Promise<{ videos: Video[], hasMore: boolean }> => {
    const regionCode = language.toUpperCase();
    const allVideos: Video[] = [];
    const categoryIds = new Set<string>();
    const searchInterests: string[] = [];

    interests.forEach(interest => {
      const normalizedInterest = interest.toLowerCase().trim();
      const config = INTEREST_CONFIG[normalizedInterest];

      if (config) {
        if (config.searchKeywords) {
          searchInterests.push(normalizedInterest);
        } else if (config.categories) {
          config.categories.forEach(cat => categoryIds.add(cat));
        }
      }
    });

    if (categoryIds.size === 0 && searchInterests.length === 0) {
      const result = await getMostPopular(maxResults, regionCode);
      return { videos: result.videos, hasMore: !!result.nextPageToken };
    }

    const totalVideosToFetch = maxResults + offset + 20;
    const videosPerSource = Math.ceil(totalVideosToFetch / (categoryIds.size + searchInterests.length));

    for (const categoryId of Array.from(categoryIds)) {
      try {
        const result = await getMostPopular(videosPerSource, regionCode, undefined, categoryId);
        allVideos.push(...result.videos);
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error loading videos for category ${categoryId}:`, error);
      }
    }

    for (const interest of searchInterests) {
      const config = INTEREST_CONFIG[interest];
      if (config?.searchKeywords) {
        try {
          const videos = await searchPopularByKeywords(
            config.searchKeywords,
            videosPerSource,
            regionCode
          );
          allVideos.push(...videos);
        } catch (error) {
          console.error(`Error loading videos for ${interest}:`, error);
        }
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

  const mapVideos = (data: YouTubeSearchResponse): Video[] => {
    if (!data.items) return [];

    return data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt
    }));
  };

  const mapPopularVideos = (data: YouTubeVideosResponse): Video[] => {
    if (!data.items) return [];

    return data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt
    }));
  };

  return {
    searchVideos,
    searchByChannel,
    getMostPopular,
    getRecommendedPopular
  };
};
