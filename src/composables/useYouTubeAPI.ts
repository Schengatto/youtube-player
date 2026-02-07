import type { Video, YouTubeSearchResponse } from '@/types';

export const useYouTubeAPI = (apiKey: string) => {
  const searchVideos = async (query: string, maxResults = 12): Promise<Video[]> => {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data: YouTubeSearchResponse = await response.json();
    return mapVideos(data);
  };

  const searchByChannel = async (channelId: string, maxResults = 12): Promise<Video[]> => {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error('Channel search failed');
    }

    const data: YouTubeSearchResponse = await response.json();
    return mapVideos(data);
  };

  const searchRecommended = async (interests: string[], language = 'it'): Promise<Video[]> => {
    const allVideos: Video[] = [];

    for (const interest of interests.slice(0, 3)) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(interest)}&type=video&relevanceLanguage=${language}&order=relevance&key=${apiKey}`
        );

        if (response.ok) {
          const data: YouTubeSearchResponse = await response.json();
          allVideos.push(...mapVideos(data));
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error loading videos for ${interest}:`, error);
      }
    }

    const uniqueVideos = allVideos.filter((video, index, self) =>
      index === self.findIndex(v => v.videoId === video.videoId)
    );

    return uniqueVideos.sort(() => Math.random() - 0.5).slice(0, 12);
  };

  const mapVideos = (data: YouTubeSearchResponse): Video[] => {
    if (!data.items) return [];

    return data.items.map(item => ({
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId
    }));
  };

  return {
    searchVideos,
    searchByChannel,
    searchRecommended
  };
};
