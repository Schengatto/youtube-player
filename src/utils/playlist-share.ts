import type { Playlist, Video } from '@/types';

interface CompactPlaylist {
  name: string;
  videos: Array<{ videoId: string; title: string; channel: string }>;
}

const toUrlSafeBase64 = (input: string): string =>
  btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

const fromUrlSafeBase64 = (encoded: string): string => {
  const standard = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padding = standard.length % 4;
  return atob(padding ? standard + '='.repeat(4 - padding) : standard);
};

export function encodePlaylistForUrl(playlist: Playlist): string {
  const data: CompactPlaylist = {
    name: playlist.name,
    videos: playlist.videos.map(video => ({
      videoId: video.videoId,
      title: video.title,
      channel: video.channel,
    }))
  };
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return toUrlSafeBase64(binary);
}

export function decodePlaylistFromUrl(encoded: string): { name: string; videos: Video[] } | null {
  try {
    const binary = fromUrlSafeBase64(encoded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const data: CompactPlaylist = JSON.parse(new TextDecoder().decode(bytes));
    if (!data.name || !Array.isArray(data.videos)) return null;
    return {
      name: data.name,
      videos: data.videos.map(entry => ({
        videoId: entry.videoId,
        title: entry.title,
        channel: entry.channel,
        thumbnail: `https://i.ytimg.com/vi/${entry.videoId}/mqdefault.jpg`
      }))
    };
  } catch {
    return null;
  }
}

export function getPlaylistShareUrl(playlist: Playlist): string {
  const encoded = encodePlaylistForUrl(playlist);
  return `${window.location.origin}${window.location.pathname}?playlist=${encoded}`;
}
