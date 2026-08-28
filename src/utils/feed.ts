import type { Video } from '@/types';
import { FAVORITES_FEED_CHUNK_SIZE, FAVORITES_FEED_MAX_VIDEOS } from './constants';

export const chunkChannels = (channelIds: string[], size = FAVORITES_FEED_CHUNK_SIZE): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < channelIds.length; i += size) {
    chunks.push(channelIds.slice(i, i + size));
  }
  return chunks;
};

export const mergeRecentVideos = (lists: Video[][], limit = FAVORITES_FEED_MAX_VIDEOS): Video[] => {
  const byId = new Map<string, { video: Video; publishedMs: number }>();

  for (const videos of lists) {
    for (const video of videos) {
      if (byId.has(video.videoId)) continue;
      const publishedMs = Date.parse(video.publishedAt || '');
      if (Number.isNaN(publishedMs)) continue;
      byId.set(video.videoId, { video, publishedMs });
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .slice(0, limit)
    .map(entry => entry.video);
};
