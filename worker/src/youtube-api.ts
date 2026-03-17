import type { Video, VideoDetails, VideoComment, SearchResult, CommentsResult } from './types';
import { decodeHtmlEntities, selectThumbnail } from './html';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const PRIVATE_VIDEO_TITLE = 'Private video';
const DELETED_VIDEO_TITLE = 'Deleted video';

interface YTSearchItem {
  id: { videoId?: string; kind: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    publishedAt: string;
    liveBroadcastContent?: string;
  };
}

interface YTVideoItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    description: string;
    thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    publishedAt: string;
    liveBroadcastContent?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YTPlaylistItem {
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    publishedAt: string;
    resourceId: { kind: string; videoId: string };
    videoOwnerChannelTitle?: string;
    videoOwnerChannelId?: string;
  };
}

interface YTCommentItem {
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
      };
    };
  };
}

function mapSearchItem(item: YTSearchItem): Video {
  return {
    title: decodeHtmlEntities(item.snippet.title),
    videoId: item.id.videoId!,
    thumbnail: selectThumbnail(item.snippet.thumbnails),
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
  };
}

function mapPlaylistItem(item: YTPlaylistItem): Video {
  return {
    title: decodeHtmlEntities(item.snippet.title),
    videoId: item.snippet.resourceId.videoId,
    thumbnail: selectThumbnail(item.snippet.thumbnails),
    channel: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
    channelId: item.snippet.videoOwnerChannelId || item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
  };
}

function mapVideoItem(item: YTVideoItem): Video {
  return {
    title: decodeHtmlEntities(item.snippet.title),
    videoId: item.id,
    thumbnail: selectThumbnail(item.snippet.thumbnails),
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    publishedAt: item.snippet.publishedAt,
  };
}

async function ytFetch(path: string, apiKey: string): Promise<Response> {
  const sep = path.includes('?') ? '&' : '?';
  return fetch(`${YOUTUBE_API_BASE}${path}${sep}key=${apiKey}`);
}

export async function searchVideos(apiKey: string, query: string, maxResults: number, pageToken?: string): Promise<SearchResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    videoEmbeddable: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await ytFetch(`/search?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTSearchItem[]; nextPageToken?: string };

  const videos = (data.items || [])
    .filter(item => item.id.videoId && item.snippet.liveBroadcastContent !== 'live')
    .map(mapSearchItem);

  return { videos, nextPageToken: data.nextPageToken };
}

function deriveUploadsPlaylistId(channelId: string): string {
  return channelId.startsWith('UC') ? 'UU' + channelId.slice(2) : channelId;
}

export async function searchByChannel(apiKey: string, channelId: string, maxResults: number, pageToken?: string): Promise<SearchResult> {
  const uploadsPlaylistId = deriveUploadsPlaylistId(channelId);

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await ytFetch(`/playlistItems?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTPlaylistItem[]; nextPageToken?: string };

  const videos = (data.items || [])
    .filter(item => item.snippet.resourceId.kind === 'youtube#video' && item.snippet.title !== PRIVATE_VIDEO_TITLE && item.snippet.title !== DELETED_VIDEO_TITLE)
    .map(mapPlaylistItem);

  return { videos, nextPageToken: data.nextPageToken };
}

export async function getTrending(apiKey: string, regionCode: string, maxResults: number): Promise<SearchResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    chart: 'mostPopular',
    regionCode,
    maxResults: String(maxResults),
  });

  const res = await ytFetch(`/videos?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTVideoItem[] };

  const videos = (data.items || []).map(mapVideoItem);
  return { videos };
}

export async function getVideoDetails(apiKey: string, videoId: string): Promise<VideoDetails | null> {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: videoId,
  });

  const res = await ytFetch(`/videos?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTVideoItem[] };

  const item = data.items?.[0];
  if (!item) return null;

  return {
    description: item.snippet.description,
    viewCount: item.statistics?.viewCount || '0',
    likeCount: item.statistics?.likeCount || '0',
    commentCount: item.statistics?.commentCount || '0',
  };
}

export async function getVideoMeta(apiKey: string, videoId: string): Promise<{ title: string; description: string } | null> {
  const params = new URLSearchParams({ part: 'snippet', id: videoId });
  const res = await ytFetch(`/videos?${params}`, apiKey);
  if (!res.ok) return null;
  const data = await res.json() as { items?: YTVideoItem[] };
  const item = data.items?.[0];
  if (!item) return null;
  return { title: decodeHtmlEntities(item.snippet.title), description: item.snippet.description };
}

export async function getVideoComments(apiKey: string, videoId: string, maxResults: number, pageToken?: string): Promise<CommentsResult> {
  const params = new URLSearchParams({
    part: 'snippet',
    videoId,
    maxResults: String(maxResults),
    order: 'relevance',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await ytFetch(`/commentThreads?${params}`, apiKey);
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const data = await res.json() as { items?: YTCommentItem[]; nextPageToken?: string };

  const comments: VideoComment[] = (data.items || []).map(item => {
    const s = item.snippet.topLevelComment.snippet;
    return {
      authorName: s.authorDisplayName,
      authorAvatar: s.authorProfileImageUrl,
      text: s.textDisplay,
      likeCount: s.likeCount,
      publishedAt: s.publishedAt,
    };
  });

  return { comments, nextPageToken: data.nextPageToken };
}
