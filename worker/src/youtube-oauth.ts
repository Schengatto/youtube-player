import type { Env } from './types';
import { decodeHtmlEntities, selectThumbnail } from './html';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

const MAX_SUBSCRIPTIONS = 500;
const MAX_PLAYLISTS = 200;
const MAX_PLAYLIST_ITEMS = 500;
const YOUTUBE_API_MAX_RESULTS = '50';
const PLAYLIST_FETCH_BATCH_SIZE = 5;
const PRIVATE_VIDEO_TITLE = 'Private video';
const DELETED_VIDEO_TITLE = 'Deleted video';

export interface ImportedChannel {
  name: string;
  id: string;
}

export interface ImportedVideo {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  channelId?: string;
  publishedAt?: string;
}

export interface ImportedPlaylist {
  name: string;
  videos: ImportedVideo[];
}

export interface ImportResult {
  subscriptions: ImportedChannel[];
  playlists: ImportedPlaylist[];
}

function isAllowedOrigin(origin: string, env: Env): boolean {
  return origin === env.ALLOWED_ORIGIN
    || origin.startsWith('http://localhost:')
    || origin.startsWith('http://127.0.0.1:');
}

function getRedirectUri(requestUrl: URL): string {
  return `${requestUrl.origin}/auth/callback`;
}

export function handleLogin(url: URL, env: Env): Response {
  const frontendOrigin = url.searchParams.get('origin') || env.ALLOWED_ORIGIN;
  if (!isAllowedOrigin(frontendOrigin, env)) {
    return new Response('Invalid origin', { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(url),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'online',
    prompt: 'consent',
    state: frontendOrigin,
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params}`, 302);
}

export async function handleCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || env.ALLOWED_ORIGIN;
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(getErrorHtml(error, state), {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(url),
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Token exchange failed: ${res.status} - ${errBody}`);
    }

    const data = await res.json() as { access_token: string };

    return new Response(getSuccessHtml(data.access_token, state), {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(getErrorHtml(msg, state), {
      status: 200,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
}

function getSuccessHtml(accessToken: string, targetOrigin: string): string {
  return `<!DOCTYPE html><html><head><title>Authenticating...</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#e0e0e0;}</style>
</head><body><p>Authentication successful. This window will close automatically.</p>
<script>
if(window.opener){window.opener.postMessage({type:'youtube-oauth',accessToken:${JSON.stringify(accessToken)}},${JSON.stringify(targetOrigin)});}
setTimeout(function(){window.close();},1000);
</script></body></html>`;
}

function getErrorHtml(error: string, targetOrigin: string): string {
  return `<!DOCTYPE html><html><head><title>Error</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a1a2e;color:#ff6b6b;}</style>
</head><body><p>Authentication failed: ${error.replace(/[<>"'&]/g, '')}</p>
<script>
if(window.opener){window.opener.postMessage({type:'youtube-oauth-error',error:${JSON.stringify(error)}},${JSON.stringify(targetOrigin)});}
setTimeout(function(){window.close();},3000);
</script></body></html>`;
}

async function ytFetch(path: string, accessToken: string): Promise<Response> {
  return fetch(`${YOUTUBE_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function fetchAllSubscriptions(accessToken: string): Promise<ImportedChannel[]> {
  const channels: ImportedChannel[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: YOUTUBE_API_MAX_RESULTS,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await ytFetch(`/subscriptions?${params}`, accessToken);
    if (!res.ok) throw new Error(`YouTube API ${res.status}: subscriptions`);

    const data = await res.json() as {
      items?: { snippet: { title: string; resourceId: { channelId: string } } }[];
      nextPageToken?: string;
    };

    for (const item of data.items || []) {
      channels.push({
        name: decodeHtmlEntities(item.snippet.title),
        id: item.snippet.resourceId.channelId,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && channels.length < MAX_SUBSCRIPTIONS);

  return channels;
}

async function fetchAllPlaylists(accessToken: string): Promise<{ id: string; name: string }[]> {
  const playlists: { id: string; name: string }[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: YOUTUBE_API_MAX_RESULTS,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await ytFetch(`/playlists?${params}`, accessToken);
    if (!res.ok) throw new Error(`YouTube API ${res.status}: playlists`);

    const data = await res.json() as {
      items?: { id: string; snippet: { title: string } }[];
      nextPageToken?: string;
    };

    for (const item of data.items || []) {
      playlists.push({
        id: item.id,
        name: decodeHtmlEntities(item.snippet.title),
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && playlists.length < MAX_PLAYLISTS);

  return playlists;
}

async function fetchPlaylistItems(playlistId: string, accessToken: string): Promise<ImportedVideo[]> {
  const videos: ImportedVideo[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: YOUTUBE_API_MAX_RESULTS,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await ytFetch(`/playlistItems?${params}`, accessToken);
    if (!res.ok) break; // some playlists may be inaccessible

    const data = await res.json() as {
      items?: {
        snippet: {
          title: string;
          thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
          publishedAt: string;
          resourceId: { videoId: string };
          videoOwnerChannelTitle?: string;
          videoOwnerChannelId?: string;
          channelTitle: string;
          channelId: string;
        };
      }[];
      nextPageToken?: string;
    };

    for (const item of data.items || []) {
      if (item.snippet.title === PRIVATE_VIDEO_TITLE || item.snippet.title === DELETED_VIDEO_TITLE) continue;
      videos.push({
        title: decodeHtmlEntities(item.snippet.title),
        videoId: item.snippet.resourceId.videoId,
        thumbnail: selectThumbnail(item.snippet.thumbnails),
        channel: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
        channelId: item.snippet.videoOwnerChannelId || item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken && videos.length < MAX_PLAYLIST_ITEMS);

  return videos;
}

async function fetchLikedVideosPlaylistId(accessToken: string): Promise<string | null> {
  const res = await ytFetch('/channels?part=contentDetails&mine=true', accessToken);
  if (!res.ok) return null;

  const data = await res.json() as {
    items?: { contentDetails?: { relatedPlaylists?: { likes?: string } } }[];
  };

  return data.items?.[0]?.contentDetails?.relatedPlaylists?.likes || null;
}

export async function handleImport(request: Request): Promise<ImportResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing access token' };
  }

  const accessToken = authHeader.slice(7);

  const [subscriptions, playlistInfos, likedPlaylistId] = await Promise.all([
    fetchAllSubscriptions(accessToken),
    fetchAllPlaylists(accessToken),
    fetchLikedVideosPlaylistId(accessToken),
  ]);

  if (likedPlaylistId) {
    playlistInfos.unshift({ id: likedPlaylistId, name: 'Liked Videos' });
  }

  const playlists: ImportedPlaylist[] = [];

  for (let i = 0; i < playlistInfos.length; i += PLAYLIST_FETCH_BATCH_SIZE) {
    const batch = playlistInfos.slice(i, i + PLAYLIST_FETCH_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (pl) => ({
        name: pl.name,
        videos: await fetchPlaylistItems(pl.id, accessToken),
      }))
    );
    playlists.push(...results.filter(p => p.videos.length > 0));
  }

  return { subscriptions, playlists };
}
